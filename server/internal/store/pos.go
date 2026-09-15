package store

import (
	"database/sql"
	"errors"
	"fmt"
	"time"
)

var (
	ErrRegisterBusy    = errors.New("register already has an open session")
	ErrNoOpenSession   = errors.New("register session not found or not open")
	ErrSessionNotYours = errors.New("register session belongs to a different staff member")
)

func (s *Store) ListRegisters() ([]Register, error) {
	rows, err := s.db.Query(`SELECT id, location_id, name FROM pos_registers ORDER BY name`)
	if err != nil {
		return nil, fmt.Errorf("query registers: %w", err)
	}
	defer rows.Close()

	registers := []Register{}
	for rows.Next() {
		var r Register
		if err := rows.Scan(&r.ID, &r.LocationID, &r.Name); err != nil {
			return nil, fmt.Errorf("scan register: %w", err)
		}
		registers = append(registers, r)
	}
	return registers, rows.Err()
}

func scanRegisterSession(row interface{ Scan(dest ...any) error }) (RegisterSession, error) {
	var rs RegisterSession
	var closingCash, expectedCash sql.NullInt64
	var closedAt sql.NullTime
	err := row.Scan(&rs.ID, &rs.RegisterID, &rs.StaffID, &rs.OpeningCash, &closingCash,
		&expectedCash, &rs.OpenedAt, &closedAt, &rs.Status)
	if err != nil {
		return RegisterSession{}, err
	}
	if closingCash.Valid {
		v := int(closingCash.Int64)
		rs.ClosingCash = &v
	}
	if expectedCash.Valid {
		v := int(expectedCash.Int64)
		rs.ExpectedCash = &v
	}
	if closedAt.Valid {
		rs.ClosedAt = &closedAt.Time
	}
	return rs, nil
}

const registerSessionColumns = `id, register_id, staff_id, opening_cash, closing_cash, expected_cash, opened_at, closed_at, status`

// GetOpenRegisterSession returns the currently open session for a register,
// if any — heyfreak-admin's /pos screen calls this on load to decide
// whether to show "open register" or jump straight into selling.
func (s *Store) GetOpenRegisterSession(registerID string) (*RegisterSession, error) {
	row := s.db.QueryRow(
		`SELECT `+registerSessionColumns+` FROM register_sessions WHERE register_id = ? AND status = 'open' LIMIT 1`,
		registerID,
	)
	rs, err := scanRegisterSession(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get open register session: %w", err)
	}
	return &rs, nil
}

func (s *Store) OpenRegisterSession(registerID, staffID string, openingCash int) (RegisterSession, error) {
	if openingCash < 0 {
		return RegisterSession{}, validationError("modal awal kasir tidak boleh negatif")
	}

	existing, err := s.GetOpenRegisterSession(registerID)
	if err != nil {
		return RegisterSession{}, err
	}
	if existing != nil {
		return RegisterSession{}, ErrRegisterBusy
	}

	result, err := s.db.Exec(
		`INSERT INTO register_sessions (register_id, staff_id, opening_cash, status) VALUES (?, ?, ?, 'open')`,
		registerID, staffID, openingCash,
	)
	if err != nil {
		return RegisterSession{}, fmt.Errorf("insert register session: %w", err)
	}
	id, err := result.LastInsertId()
	if err != nil {
		return RegisterSession{}, fmt.Errorf("insert register session: %w", err)
	}

	row := s.db.QueryRow(`SELECT `+registerSessionColumns+` FROM register_sessions WHERE id = ?`, id)
	return scanRegisterSession(row)
}

func (s *Store) GetRegisterSession(id int64) (RegisterSession, error) {
	row := s.db.QueryRow(`SELECT `+registerSessionColumns+` FROM register_sessions WHERE id = ?`, id)
	return scanRegisterSession(row)
}

// CloseRegisterSession settles a shift: expected_cash is opening_cash plus
// every cash POS sale rung up under this session (change already handed
// back to customers isn't part of the drawer, only the sale total is), so
// the cashier can be told exactly how far closingCash is off.
func (s *Store) CloseRegisterSession(id int64, staffID string, closingCash int) (RegisterSession, error) {
	session, err := s.GetRegisterSession(id)
	if errors.Is(err, sql.ErrNoRows) {
		return RegisterSession{}, ErrNoOpenSession
	}
	if err != nil {
		return RegisterSession{}, fmt.Errorf("get register session: %w", err)
	}
	if session.Status != "open" {
		return RegisterSession{}, ErrNoOpenSession
	}
	if session.StaffID != staffID {
		return RegisterSession{}, ErrSessionNotYours
	}

	var cashSalesTotal sql.NullInt64
	err = s.db.QueryRow(
		`SELECT SUM(total) FROM orders WHERE register_session_id = ? AND payment_method = 'cash' AND status = 'paid'`,
		id,
	).Scan(&cashSalesTotal)
	if err != nil {
		return RegisterSession{}, fmt.Errorf("sum cash sales: %w", err)
	}
	expectedCash := session.OpeningCash + int(cashSalesTotal.Int64)

	if _, err := s.db.Exec(
		`UPDATE register_sessions SET closing_cash = ?, expected_cash = ?, closed_at = NOW(), status = 'closed' WHERE id = ?`,
		closingCash, expectedCash, id,
	); err != nil {
		return RegisterSession{}, fmt.Errorf("close register session: %w", err)
	}

	return s.GetRegisterSession(id)
}

// CreatePOSSale rings up a walk-in sale. It's CreateOrder's counterpart:
// same guarded-reservation pattern via reserveStockTx, same orders/
// order_items tables (channel="pos" instead of "online"), so receipts,
// GetOrder, and reporting all work unchanged for either channel.
func (s *Store) CreatePOSSale(input POSSaleInput, staffID string) (Order, error) {
	if len(input.Items) == 0 {
		return Order{}, validationError("penjualan harus punya minimal 1 item")
	}

	session, err := s.GetRegisterSession(input.RegisterSessionID)
	if errors.Is(err, sql.ErrNoRows) {
		return Order{}, ErrNoOpenSession
	}
	if err != nil {
		return Order{}, fmt.Errorf("get register session: %w", err)
	}
	if session.Status != "open" {
		return Order{}, ErrNoOpenSession
	}
	if session.StaffID != staffID {
		return Order{}, ErrSessionNotYours
	}

	var locationID string
	if err := s.db.QueryRow(`SELECT location_id FROM pos_registers WHERE id = ?`, session.RegisterID).Scan(&locationID); err != nil {
		return Order{}, fmt.Errorf("resolve register location: %w", err)
	}

	orderID, err := generateOrderID()
	if err != nil {
		return Order{}, fmt.Errorf("generate order id: %w", err)
	}

	tx, err := s.db.Begin()
	if err != nil {
		return Order{}, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback()

	items := make([]OrderItem, 0, len(input.Items))
	subtotal := 0

	for _, in := range input.Items {
		if in.Qty <= 0 {
			return Order{}, validationError("invalid quantity for product %s", in.ProductID)
		}

		row := tx.QueryRow(`SELECT `+productColumns+` FROM products p`+productRatingsJoin+` WHERE p.id = ?`, in.ProductID)
		product, err := scanProduct(row)
		if errors.Is(err, sql.ErrNoRows) {
			return Order{}, validationError("product %s not found", in.ProductID)
		}
		if err != nil {
			return Order{}, fmt.Errorf("lookup product %s: %w", in.ProductID, err)
		}

		if !product.IsActive {
			return Order{}, validationError("product %s is no longer available", in.ProductID)
		}
		size := in.Size
		if len(product.Sizes) > 0 {
			if size == "" || !contains(product.Sizes, size) {
				return Order{}, validationError("invalid size for product %s", in.ProductID)
			}
		} else {
			size = ""
		}

		ok, available, err := reserveStockTx(tx, locationID, in.ProductID, size, in.Qty, "sale_pos", "order", orderID, &staffID)
		if err != nil {
			return Order{}, fmt.Errorf("reserve stock for %s: %w", in.ProductID, err)
		}
		if !ok {
			if size != "" {
				return Order{}, validationError("stok %s ukuran %s tinggal %d, kurangi jumlahnya ya", product.Name, size, available)
			}
			return Order{}, validationError("stok %s tinggal %d, kurangi jumlahnya ya", product.Name, available)
		}

		items = append(items, OrderItem{
			ProductID:   product.ID,
			ProductName: product.Name,
			Size:        in.Size,
			Price:       product.Price,
			Qty:         in.Qty,
		})
		subtotal += product.Price * in.Qty
	}

	total := subtotal

	var status string
	var cashReceivedArg, changeDueArg any
	switch input.PaymentMethod {
	case "cash":
		if input.CashReceived == nil || *input.CashReceived < total {
			return Order{}, validationError("uang yang diterima kurang dari total belanja")
		}
		status = "paid"
		change := *input.CashReceived - total
		cashReceivedArg = *input.CashReceived
		changeDueArg = change
	case "qris":
		status = "pending"
	default:
		return Order{}, validationError("metode pembayaran tidak dikenali")
	}

	customerName := input.CustomerName
	if customerName == "" {
		customerName = "Walk-in Customer"
	}

	_, err = tx.Exec(
		`INSERT INTO orders (id, name, phone, email, address, city, postal_code, payment_method,
		 subtotal, shipping, total, status, channel, location_id, register_session_id,
		 served_by_staff_id, cash_received, change_due)
		 VALUES (?, ?, '', '', '', '', '', ?, ?, 0, ?, ?, 'pos', ?, ?, ?, ?, ?)`,
		orderID, customerName, input.PaymentMethod, subtotal, total, status,
		locationID, input.RegisterSessionID, staffID, cashReceivedArg, changeDueArg,
	)
	if err != nil {
		return Order{}, fmt.Errorf("insert pos sale: %w", err)
	}

	for _, item := range items {
		var size any
		if item.Size != "" {
			size = item.Size
		}
		_, err = tx.Exec(
			`INSERT INTO order_items (order_id, product_id, product_name, size, price, qty)
			 VALUES (?, ?, ?, ?, ?, ?)`,
			orderID, item.ProductID, item.ProductName, size, item.Price, item.Qty,
		)
		if err != nil {
			return Order{}, fmt.Errorf("insert order item: %w", err)
		}
	}

	if status == "paid" {
		if err := postSaleRevenueJournal(tx, orderID, total); err != nil {
			return Order{}, err
		}
	}

	if err := tx.Commit(); err != nil {
		return Order{}, fmt.Errorf("commit tx: %w", err)
	}

	order := Order{
		ID:            orderID,
		Name:          customerName,
		PaymentMethod: input.PaymentMethod,
		Subtotal:      subtotal,
		Shipping:      0,
		Total:         total,
		Status:        status,
		Channel:       "pos",
		LocationID:    locationID,
		CreatedAt:     time.Now(),
		Items:         items,
	}
	if cashReceivedArg != nil {
		v := cashReceivedArg.(int)
		order.CashReceived = &v
	}
	if changeDueArg != nil {
		v := changeDueArg.(int)
		order.ChangeDue = &v
	}
	return order, nil
}
