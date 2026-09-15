package store

import (
	"database/sql"
	"errors"
	"fmt"
)

// ErrNoDefaultLocation means no location is flagged is_online_default —
// the online storefront has nowhere to reserve stock from. Should never
// happen once seed.sql has run.
var ErrNoDefaultLocation = fmt.Errorf("no default online location configured")

func (s *Store) ListLocations() ([]Location, error) {
	rows, err := s.db.Query(`SELECT id, name, type, address, is_pos_enabled, is_online_default FROM locations ORDER BY name`)
	if err != nil {
		return nil, fmt.Errorf("query locations: %w", err)
	}
	defer rows.Close()

	locations := []Location{}
	for rows.Next() {
		var l Location
		var address sql.NullString
		if err := rows.Scan(&l.ID, &l.Name, &l.Type, &address, &l.IsPOSEnabled, &l.IsOnlineDefault); err != nil {
			return nil, fmt.Errorf("scan location: %w", err)
		}
		l.Address = address.String
		locations = append(locations, l)
	}
	return locations, rows.Err()
}

// DefaultOnlineLocationID returns the location online orders reserve stock
// from. Returns ErrNoDefaultLocation if none is configured.
func (s *Store) DefaultOnlineLocationID() (string, error) {
	var id string
	err := s.db.QueryRow(`SELECT id FROM locations WHERE is_online_default = 1 LIMIT 1`).Scan(&id)
	if errors.Is(err, sql.ErrNoRows) {
		return "", ErrNoDefaultLocation
	}
	if err != nil {
		return "", fmt.Errorf("lookup default location: %w", err)
	}
	return id, nil
}

// ListInventoryByLocation returns one row per product **per size** at a
// location — a product with sizes S/M/L/XL shows up as up to four rows
// (size="" is the bucket for products without sizes at all, and for
// pre-per-size demo data that was seeded as one pooled total).
func (s *Store) ListInventoryByLocation(locationID string) ([]InventoryLevel, error) {
	rows, err := s.db.Query(
		`SELECT il.location_id, il.product_id, p.name, il.size, il.qty
		 FROM inventory_levels il
		 JOIN products p ON p.id = il.product_id
		 WHERE il.location_id = ?
		 ORDER BY p.name, il.size`,
		locationID,
	)
	if err != nil {
		return nil, fmt.Errorf("query inventory: %w", err)
	}
	defer rows.Close()

	levels := []InventoryLevel{}
	for rows.Next() {
		var l InventoryLevel
		if err := rows.Scan(&l.LocationID, &l.ProductID, &l.ProductName, &l.Size, &l.Qty); err != nil {
			return nil, fmt.Errorf("scan inventory level: %w", err)
		}
		levels = append(levels, l)
	}
	return levels, rows.Err()
}

func (s *Store) ListStockMovements(productID string, limit int) ([]StockMovement, error) {
	if limit <= 0 || limit > 500 {
		limit = 100
	}
	rows, err := s.db.Query(
		`SELECT id, product_id, location_id, size, delta_qty, reason,
		        COALESCE(reference_type, ''), COALESCE(reference_id, ''), created_at
		 FROM stock_movements WHERE product_id = ? ORDER BY id DESC LIMIT ?`,
		productID, limit,
	)
	if err != nil {
		return nil, fmt.Errorf("query stock movements: %w", err)
	}
	defer rows.Close()

	movements := []StockMovement{}
	for rows.Next() {
		var m StockMovement
		if err := rows.Scan(&m.ID, &m.ProductID, &m.LocationID, &m.Size, &m.DeltaQty, &m.Reason,
			&m.ReferenceType, &m.ReferenceID, &m.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan stock movement: %w", err)
		}
		movements = append(movements, m)
	}
	return movements, rows.Err()
}

// recomputeProductStock keeps products.stock (the aggregate every existing
// catalog/order query reads) in sync with the per-location, per-size
// ledger. Must be called, inside the same tx, after any inventory_levels
// mutation.
func recomputeProductStock(tx *sql.Tx, productID string) error {
	_, err := tx.Exec(
		`UPDATE products SET stock = (SELECT COALESCE(SUM(qty), 0) FROM inventory_levels WHERE product_id = ?) WHERE id = ?`,
		productID, productID,
	)
	if err != nil {
		return fmt.Errorf("recompute product stock for %s: %w", productID, err)
	}
	return nil
}

func insertStockMovement(tx *sql.Tx, productID, locationID, size string, deltaQty int, reason, referenceType, referenceID string, staffID *string) error {
	var refType, refID any
	if referenceType != "" {
		refType = referenceType
	}
	if referenceID != "" {
		refID = referenceID
	}
	var staffArg any
	if staffID != nil && *staffID != "" {
		staffArg = *staffID
	}
	_, err := tx.Exec(
		`INSERT INTO stock_movements (product_id, location_id, size, delta_qty, reason, reference_type, reference_id, created_by_staff_id)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		productID, locationID, size, deltaQty, reason, refType, refID, staffArg,
	)
	if err != nil {
		return fmt.Errorf("insert stock movement: %w", err)
	}
	return nil
}

// reserveStockTx atomically decrements inventory_levels for one product,
// one size, at one location, guarded so it can never go negative (same
// guarded-UPDATE pattern CreateOrder already used directly on
// products.stock). size is "" for a product with no sizes at all. Returns
// ok=false — not an error — when there isn't enough stock, along with the
// size's actual remaining qty so callers can surface a precise message
// ("size L only has 3 left") instead of the product's overall total.
func reserveStockTx(tx *sql.Tx, locationID, productID, size string, qty int, reason, referenceType, referenceID string, staffID *string) (ok bool, available int, err error) {
	result, err := tx.Exec(
		`UPDATE inventory_levels SET qty = qty - ? WHERE location_id = ? AND product_id = ? AND size = ? AND qty >= ?`,
		qty, locationID, productID, size, qty,
	)
	if err != nil {
		return false, 0, fmt.Errorf("reserve stock for %s (%s) at %s: %w", productID, size, locationID, err)
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return false, 0, fmt.Errorf("reserve stock for %s (%s) at %s: %w", productID, size, locationID, err)
	}
	if affected == 0 {
		var current sql.NullInt64
		if err := tx.QueryRow(
			`SELECT qty FROM inventory_levels WHERE location_id = ? AND product_id = ? AND size = ?`,
			locationID, productID, size,
		).Scan(&current); err != nil && !errors.Is(err, sql.ErrNoRows) {
			return false, 0, fmt.Errorf("lookup available stock for %s (%s) at %s: %w", productID, size, locationID, err)
		}
		return false, int(current.Int64), nil
	}

	if err := insertStockMovement(tx, productID, locationID, size, -qty, reason, referenceType, referenceID, staffID); err != nil {
		return false, 0, err
	}
	if err := recomputeProductStock(tx, productID); err != nil {
		return false, 0, err
	}
	return true, 0, nil
}

// receiveStockTx credits qty back into inventory_levels for one size
// (purchase receipts, adjustments, transfer-in, initial stock on product
// creation) — an upsert since a product may not have a row yet for that
// (location, size).
func receiveStockTx(tx *sql.Tx, locationID, productID, size string, qty int, reason, referenceType, referenceID string, staffID *string) error {
	_, err := tx.Exec(
		`INSERT INTO inventory_levels (location_id, product_id, size, qty) VALUES (?, ?, ?, ?)
		 ON DUPLICATE KEY UPDATE qty = qty + VALUES(qty)`,
		locationID, productID, size, qty,
	)
	if err != nil {
		return fmt.Errorf("receive stock for %s (%s) at %s: %w", productID, size, locationID, err)
	}
	if err := insertStockMovement(tx, productID, locationID, size, qty, reason, referenceType, referenceID, staffID); err != nil {
		return err
	}
	return recomputeProductStock(tx, productID)
}

// AdjustStock applies a manual +/- correction to one product+size at one
// location (stock opname, damage write-off, etc).
func (s *Store) AdjustStock(locationID, productID, size string, delta int, staffID string) error {
	if delta == 0 {
		return validationError("jumlah penyesuaian tidak boleh 0")
	}

	tx, err := s.db.Begin()
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback()

	if delta > 0 {
		if err := receiveStockTx(tx, locationID, productID, size, delta, "adjustment", "manual", "", &staffID); err != nil {
			return err
		}
	} else {
		ok, _, err := reserveStockTx(tx, locationID, productID, size, -delta, "adjustment", "manual", "", &staffID)
		if err != nil {
			return err
		}
		if !ok {
			return validationError("stok tidak cukup untuk penyesuaian sebesar itu")
		}
	}

	return tx.Commit()
}

// TransferStock moves qty of one product+size from one location to another
// as a single unit of work: either both legs land, or neither does.
func (s *Store) TransferStock(fromLocationID, toLocationID, productID, size string, qty int, staffID string) error {
	if qty <= 0 {
		return validationError("jumlah transfer harus lebih dari 0")
	}
	if fromLocationID == toLocationID {
		return validationError("lokasi asal dan tujuan tidak boleh sama")
	}

	tx, err := s.db.Begin()
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback()

	ok, _, err := reserveStockTx(tx, fromLocationID, productID, size, qty, "transfer_out", "transfer", "", &staffID)
	if err != nil {
		return err
	}
	if !ok {
		return validationError("stok di lokasi asal tidak cukup")
	}
	if err := receiveStockTx(tx, toLocationID, productID, size, qty, "transfer_in", "transfer", "", &staffID); err != nil {
		return err
	}

	return tx.Commit()
}
