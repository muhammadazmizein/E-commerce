package store

import (
	"database/sql"
	"errors"
	"fmt"
	"strings"
)

type Supplier struct {
	ID      string `json:"id"`
	Name    string `json:"name"`
	Phone   string `json:"phone,omitempty"`
	Email   string `json:"email,omitempty"`
	Address string `json:"address,omitempty"`
}

type SupplierInput struct {
	Name    string `json:"name"`
	Phone   string `json:"phone"`
	Email   string `json:"email"`
	Address string `json:"address"`
}

func (s *Store) CreateSupplier(input SupplierInput) (Supplier, error) {
	name := strings.TrimSpace(input.Name)
	if name == "" {
		return Supplier{}, validationError("nama supplier wajib diisi")
	}

	id, err := newID()
	if err != nil {
		return Supplier{}, fmt.Errorf("generate supplier id: %w", err)
	}

	if _, err := s.db.Exec(
		`INSERT INTO suppliers (id, name, phone, email, address) VALUES (?, ?, ?, ?, ?)`,
		id, name, input.Phone, input.Email, input.Address,
	); err != nil {
		return Supplier{}, fmt.Errorf("insert supplier: %w", err)
	}

	return Supplier{ID: id, Name: name, Phone: input.Phone, Email: input.Email, Address: input.Address}, nil
}

func (s *Store) ListSuppliers() ([]Supplier, error) {
	rows, err := s.db.Query(`SELECT id, name, COALESCE(phone,''), COALESCE(email,''), COALESCE(address,'') FROM suppliers ORDER BY name`)
	if err != nil {
		return nil, fmt.Errorf("query suppliers: %w", err)
	}
	defer rows.Close()

	suppliers := []Supplier{}
	for rows.Next() {
		var sup Supplier
		if err := rows.Scan(&sup.ID, &sup.Name, &sup.Phone, &sup.Email, &sup.Address); err != nil {
			return nil, fmt.Errorf("scan supplier: %w", err)
		}
		suppliers = append(suppliers, sup)
	}
	return suppliers, rows.Err()
}

type PurchaseOrderItemInput struct {
	ProductID string `json:"productId"`
	Qty       int    `json:"qty"`
	UnitCost  int    `json:"unitCost"`
}

type CreatePurchaseOrderInput struct {
	SupplierID string                   `json:"supplierId"`
	LocationID string                   `json:"locationId"`
	Items      []PurchaseOrderItemInput `json:"items"`
}

type PurchaseOrderItem struct {
	ID          int64  `json:"id"`
	ProductID   string `json:"productId"`
	ProductName string `json:"productName"`
	QtyOrdered  int    `json:"qtyOrdered"`
	QtyReceived int    `json:"qtyReceived"`
	UnitCost    int    `json:"unitCost"`
}

type PurchaseOrder struct {
	ID           string              `json:"id"`
	SupplierID   string              `json:"supplierId"`
	SupplierName string              `json:"supplierName,omitempty"`
	LocationID   string              `json:"locationId"`
	Status       string              `json:"status"`
	CreatedAt    string              `json:"createdAt"`
	Items        []PurchaseOrderItem `json:"items"`
}

func generatePurchaseOrderID() (string, error) {
	id, err := newSessionToken()
	if err != nil {
		return "", err
	}
	return "PO-" + strings.ToUpper(id[:8]), nil
}

// CreatePurchaseOrder starts a PO in "ordered" status — nothing touches
// inventory yet, that only happens on ReceivePurchaseOrder.
func (s *Store) CreatePurchaseOrder(input CreatePurchaseOrderInput, staffID string) (PurchaseOrder, error) {
	if input.SupplierID == "" || input.LocationID == "" {
		return PurchaseOrder{}, validationError("supplier dan lokasi wajib diisi")
	}
	if len(input.Items) == 0 {
		return PurchaseOrder{}, validationError("purchase order harus punya minimal 1 item")
	}

	id, err := generatePurchaseOrderID()
	if err != nil {
		return PurchaseOrder{}, fmt.Errorf("generate po id: %w", err)
	}

	tx, err := s.db.Begin()
	if err != nil {
		return PurchaseOrder{}, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback()

	if _, err := tx.Exec(
		`INSERT INTO purchase_orders (id, supplier_id, location_id, status, created_by_staff_id) VALUES (?, ?, ?, 'ordered', ?)`,
		id, input.SupplierID, input.LocationID, staffID,
	); err != nil {
		return PurchaseOrder{}, fmt.Errorf("insert purchase order: %w", err)
	}

	for _, item := range input.Items {
		if item.Qty <= 0 || item.UnitCost < 0 {
			return PurchaseOrder{}, validationError("qty dan harga satuan harus valid")
		}
		if _, err := tx.Exec(
			`INSERT INTO purchase_order_items (purchase_order_id, product_id, qty_ordered, unit_cost) VALUES (?, ?, ?, ?)`,
			id, item.ProductID, item.Qty, item.UnitCost,
		); err != nil {
			return PurchaseOrder{}, fmt.Errorf("insert po item: %w", err)
		}
	}

	if err := tx.Commit(); err != nil {
		return PurchaseOrder{}, fmt.Errorf("commit tx: %w", err)
	}

	return s.GetPurchaseOrder(id)
}

// ListPurchaseOrders includes each order's line items (not just the header
// row) — heyfreak-admin's list view reuses these objects directly when a
// row is clicked, so a caller expecting po.Items to be a real (possibly
// empty) slice would otherwise get JSON null and crash on .map().
func (s *Store) ListPurchaseOrders() ([]PurchaseOrder, error) {
	rows, err := s.db.Query(
		`SELECT po.id, po.supplier_id, s.name, po.location_id, po.status, po.created_at
		 FROM purchase_orders po JOIN suppliers s ON s.id = po.supplier_id
		 ORDER BY po.created_at DESC`,
	)
	if err != nil {
		return nil, fmt.Errorf("query purchase orders: %w", err)
	}
	defer rows.Close()

	orders := []PurchaseOrder{}
	orderIDs := []string{}
	for rows.Next() {
		var po PurchaseOrder
		if err := rows.Scan(&po.ID, &po.SupplierID, &po.SupplierName, &po.LocationID, &po.Status, &po.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan purchase order: %w", err)
		}
		po.Items = []PurchaseOrderItem{}
		orders = append(orders, po)
		orderIDs = append(orderIDs, po.ID)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if len(orderIDs) == 0 {
		return orders, nil
	}

	placeholders := strings.TrimSuffix(strings.Repeat("?,", len(orderIDs)), ",")
	args := make([]any, len(orderIDs))
	for i, id := range orderIDs {
		args[i] = id
	}

	itemRows, err := s.db.Query(
		`SELECT poi.purchase_order_id, poi.id, poi.product_id, p.name, poi.qty_ordered, poi.qty_received, poi.unit_cost
		 FROM purchase_order_items poi JOIN products p ON p.id = poi.product_id
		 WHERE poi.purchase_order_id IN (`+placeholders+`)`,
		args...,
	)
	if err != nil {
		return nil, fmt.Errorf("query purchase order items: %w", err)
	}
	defer itemRows.Close()

	itemsByOrder := make(map[string][]PurchaseOrderItem, len(orderIDs))
	for itemRows.Next() {
		var poID string
		var item PurchaseOrderItem
		if err := itemRows.Scan(&poID, &item.ID, &item.ProductID, &item.ProductName, &item.QtyOrdered, &item.QtyReceived, &item.UnitCost); err != nil {
			return nil, fmt.Errorf("scan purchase order item: %w", err)
		}
		itemsByOrder[poID] = append(itemsByOrder[poID], item)
	}
	if err := itemRows.Err(); err != nil {
		return nil, err
	}

	for i := range orders {
		if items, ok := itemsByOrder[orders[i].ID]; ok {
			orders[i].Items = items
		}
	}

	return orders, nil
}

func (s *Store) GetPurchaseOrder(id string) (PurchaseOrder, error) {
	row := s.db.QueryRow(
		`SELECT po.id, po.supplier_id, s.name, po.location_id, po.status, po.created_at
		 FROM purchase_orders po JOIN suppliers s ON s.id = po.supplier_id
		 WHERE po.id = ?`,
		id,
	)
	var po PurchaseOrder
	if err := row.Scan(&po.ID, &po.SupplierID, &po.SupplierName, &po.LocationID, &po.Status, &po.CreatedAt); err != nil {
		return PurchaseOrder{}, err
	}
	po.Items = []PurchaseOrderItem{}

	rows, err := s.db.Query(
		`SELECT poi.id, poi.product_id, p.name, poi.qty_ordered, poi.qty_received, poi.unit_cost
		 FROM purchase_order_items poi JOIN products p ON p.id = poi.product_id
		 WHERE poi.purchase_order_id = ?`,
		id,
	)
	if err != nil {
		return PurchaseOrder{}, fmt.Errorf("query po items: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var item PurchaseOrderItem
		if err := rows.Scan(&item.ID, &item.ProductID, &item.ProductName, &item.QtyOrdered, &item.QtyReceived, &item.UnitCost); err != nil {
			return PurchaseOrder{}, fmt.Errorf("scan po item: %w", err)
		}
		po.Items = append(po.Items, item)
	}

	return po, rows.Err()
}

type ReceiveItemInput struct {
	PurchaseOrderItemID int64 `json:"purchaseOrderItemId"`
	Qty                 int   `json:"qty"`
}

// ReceivePurchaseOrder credits inventory_levels for whatever arrived (can
// be partial), posts a stock_movement per line, marks each item's
// qty_received, and rolls the PO's status up to partially_received/
// received once every line is fully in. Also posts an inventory/payable
// journal entry for the batch (see store/accounting.go).
func (s *Store) ReceivePurchaseOrder(poID string, items []ReceiveItemInput, staffID string) (PurchaseOrder, error) {
	if len(items) == 0 {
		return PurchaseOrder{}, validationError("pilih minimal 1 item yang diterima")
	}

	po, err := s.GetPurchaseOrder(poID)
	if errors.Is(err, sql.ErrNoRows) {
		return PurchaseOrder{}, validationError("purchase order tidak ditemukan")
	}
	if err != nil {
		return PurchaseOrder{}, fmt.Errorf("get purchase order: %w", err)
	}
	if po.Status == "received" || po.Status == "cancelled" {
		return PurchaseOrder{}, validationError("purchase order ini sudah selesai/dibatalkan")
	}

	itemsByID := make(map[int64]PurchaseOrderItem, len(po.Items))
	for _, it := range po.Items {
		itemsByID[it.ID] = it
	}

	tx, err := s.db.Begin()
	if err != nil {
		return PurchaseOrder{}, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback()

	receivedValue := 0
	for _, in := range items {
		poItem, ok := itemsByID[in.PurchaseOrderItemID]
		if !ok {
			return PurchaseOrder{}, validationError("item purchase order tidak ditemukan")
		}
		if in.Qty <= 0 {
			continue
		}
		remaining := poItem.QtyOrdered - poItem.QtyReceived
		if in.Qty > remaining {
			return PurchaseOrder{}, validationError("qty diterima untuk %s melebihi sisa pesanan (%d)", poItem.ProductName, remaining)
		}

		// Purchase orders don't break line items down by size yet, so
		// receiving credits the unsized ("") bucket — split it into real
		// per-size stock afterwards via an inventory adjustment.
		if err := receiveStockTx(tx, po.LocationID, poItem.ProductID, "", in.Qty, "purchase_receipt", "purchase_order", poID, &staffID); err != nil {
			return PurchaseOrder{}, err
		}
		if _, err := tx.Exec(
			`UPDATE purchase_order_items SET qty_received = qty_received + ? WHERE id = ?`,
			in.Qty, in.PurchaseOrderItemID,
		); err != nil {
			return PurchaseOrder{}, fmt.Errorf("update po item received: %w", err)
		}
		receivedValue += in.Qty * poItem.UnitCost
	}

	var totalOrdered, totalReceived int
	row := tx.QueryRow(`SELECT COALESCE(SUM(qty_ordered),0), COALESCE(SUM(qty_received),0) FROM purchase_order_items WHERE purchase_order_id = ?`, poID)
	if err := row.Scan(&totalOrdered, &totalReceived); err != nil {
		return PurchaseOrder{}, fmt.Errorf("sum po items: %w", err)
	}
	newStatus := "partially_received"
	if totalReceived >= totalOrdered {
		newStatus = "received"
	}
	if _, err := tx.Exec(`UPDATE purchase_orders SET status = ? WHERE id = ?`, newStatus, poID); err != nil {
		return PurchaseOrder{}, fmt.Errorf("update po status: %w", err)
	}

	if receivedValue > 0 {
		receiptRef, err := newSessionToken()
		if err != nil {
			return PurchaseOrder{}, fmt.Errorf("generate receipt ref: %w", err)
		}
		if err := postInventoryReceiptJournal(tx, poID, poID+"-"+receiptRef[:12], receivedValue); err != nil {
			return PurchaseOrder{}, err
		}
	}

	if err := tx.Commit(); err != nil {
		return PurchaseOrder{}, fmt.Errorf("commit tx: %w", err)
	}

	return s.GetPurchaseOrder(poID)
}
