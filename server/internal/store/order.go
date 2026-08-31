package store

import (
	"crypto/rand"
	"database/sql"
	"errors"
	"fmt"
	"strings"
)

const shippingFlatRate = 15000

var ErrValidation = errors.New("validation error")

// validationErr carries a clean, user-facing message while still matching
// errors.Is(err, ErrValidation) — handlers write err.Error() straight back
// to the client, so it must not carry the "validation error: " wrapper text
// fmt.Errorf("%w: ...") would otherwise bake in.
type validationErr struct{ msg string }

func (e *validationErr) Error() string { return e.msg }
func (e *validationErr) Unwrap() error { return ErrValidation }

func validationError(format string, args ...any) error {
	return &validationErr{msg: fmt.Sprintf(format, args...)}
}

func generateOrderID() (string, error) {
	const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	buf := make([]byte, 6)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	code := make([]byte, 6)
	for i, b := range buf {
		code[i] = alphabet[int(b)%len(alphabet)]
	}
	return "HF-" + string(code), nil
}

func (s *Store) CreateOrder(input CreateOrderInput, userID string) (Order, error) {
	if input.Name == "" || input.Phone == "" || input.Email == "" ||
		input.Address == "" || input.City == "" || input.PostalCode == "" {
		return Order{}, validationError("missing required buyer fields")
	}
	if len(input.Items) == 0 {
		return Order{}, validationError("order must contain at least one item")
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

		if len(product.Sizes) > 0 {
			if in.Size == "" || !contains(product.Sizes, in.Size) {
				return Order{}, validationError("invalid size for product %s", in.ProductID)
			}
		}

		// Atomic within this transaction: the WHERE guard means a second
		// line item for the same product (e.g. two sizes) — or a
		// concurrent order racing this one — can't both succeed past
		// what's actually left in stock.
		result, err := tx.Exec(
			`UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?`,
			in.Qty, in.ProductID, in.Qty,
		)
		if err != nil {
			return Order{}, fmt.Errorf("reserve stock for %s: %w", in.ProductID, err)
		}
		affected, err := result.RowsAffected()
		if err != nil {
			return Order{}, fmt.Errorf("reserve stock for %s: %w", in.ProductID, err)
		}
		if affected == 0 {
			return Order{}, validationError("stok %s tinggal %d, kurangi jumlahnya ya", product.Name, product.Stock)
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

	shipping := input.Shipping
	if shipping <= 0 {
		shipping = shippingFlatRate
	}
	total := subtotal + shipping

	orderID, err := generateOrderID()
	if err != nil {
		return Order{}, fmt.Errorf("generate order id: %w", err)
	}

	var userIDArg any
	if userID != "" {
		userIDArg = userID
	}

	_, err = tx.Exec(
		`INSERT INTO orders (id, user_id, name, phone, email, address, city, postal_code, notes, payment_method, subtotal, shipping, total, status)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
		orderID, userIDArg, input.Name, input.Phone, input.Email, input.Address, input.City,
		input.PostalCode, input.Notes, input.PaymentMethod, subtotal, shipping, total,
	)
	if err != nil {
		return Order{}, fmt.Errorf("insert order: %w", err)
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

	if err := tx.Commit(); err != nil {
		return Order{}, fmt.Errorf("commit tx: %w", err)
	}

	return Order{
		ID:            orderID,
		Name:          input.Name,
		Phone:         input.Phone,
		Email:         input.Email,
		Address:       input.Address,
		City:          input.City,
		PostalCode:    input.PostalCode,
		Notes:         input.Notes,
		PaymentMethod: input.PaymentMethod,
		Subtotal:      subtotal,
		Shipping:      shipping,
		Total:         total,
		Status:        "pending",
		Items:         items,
	}, nil
}

func (s *Store) UpdateOrderStatus(orderID, status string) error {
	_, err := s.db.Exec(`UPDATE orders SET status = ? WHERE id = ?`, status, orderID)
	return err
}

// SetOrderPayment records which payment channel (e.g. "qris", "va_BCA",
// "invoice") and provider reference ID (QR code ID, VA ID, invoice ID) an
// order used, so simulate-payment and support lookups know what to act on.
func (s *Store) SetOrderPayment(orderID, channel, reference string) error {
	_, err := s.db.Exec(
		`UPDATE orders SET payment_channel = ?, payment_reference = ? WHERE id = ?`,
		channel, reference, orderID,
	)
	return err
}

func (s *Store) GetOrderPayment(orderID string) (channel string, reference string, err error) {
	var channelNull, referenceNull sql.NullString
	row := s.db.QueryRow(`SELECT payment_channel, payment_reference FROM orders WHERE id = ?`, orderID)
	if err := row.Scan(&channelNull, &referenceNull); err != nil {
		return "", "", err
	}
	return channelNull.String, referenceNull.String, nil
}

func (s *Store) GetOrder(id string) (Order, error) {
	row := s.db.QueryRow(
		`SELECT id, name, phone, email, address, city, postal_code, notes, payment_method,
		        subtotal, shipping, total, status, payment_channel, created_at
		 FROM orders WHERE id = ?`, id,
	)

	var o Order
	var notes, paymentChannel sql.NullString
	err := row.Scan(&o.ID, &o.Name, &o.Phone, &o.Email, &o.Address, &o.City, &o.PostalCode,
		&notes, &o.PaymentMethod, &o.Subtotal, &o.Shipping, &o.Total, &o.Status, &paymentChannel, &o.CreatedAt)
	if err != nil {
		return Order{}, err
	}
	o.Notes = notes.String
	o.PaymentChannel = paymentChannel.String

	rows, err := s.db.Query(
		`SELECT product_id, product_name, size, price, qty FROM order_items WHERE order_id = ?`, id,
	)
	if err != nil {
		return Order{}, fmt.Errorf("query order items: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var item OrderItem
		var size sql.NullString
		if err := rows.Scan(&item.ProductID, &item.ProductName, &size, &item.Price, &item.Qty); err != nil {
			return Order{}, fmt.Errorf("scan order item: %w", err)
		}
		item.Size = size.String
		o.Items = append(o.Items, item)
	}

	return o, rows.Err()
}

// ListOrdersByUser returns the order history for a logged-in user, most
// recent first, including line items for each order.
func (s *Store) ListOrdersByUser(userID string) ([]Order, error) {
	rows, err := s.db.Query(
		`SELECT id, name, phone, email, address, city, postal_code, notes, payment_method,
		        subtotal, shipping, total, status, payment_channel, created_at
		 FROM orders WHERE user_id = ? ORDER BY created_at DESC`,
		userID,
	)
	if err != nil {
		return nil, fmt.Errorf("query orders: %w", err)
	}
	defer rows.Close()

	orders := []Order{}
	orderIDs := []string{}
	for rows.Next() {
		var o Order
		var notes, paymentChannel sql.NullString
		if err := rows.Scan(&o.ID, &o.Name, &o.Phone, &o.Email, &o.Address, &o.City, &o.PostalCode,
			&notes, &o.PaymentMethod, &o.Subtotal, &o.Shipping, &o.Total, &o.Status, &paymentChannel, &o.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan order: %w", err)
		}
		o.Notes = notes.String
		o.PaymentChannel = paymentChannel.String
		o.Items = []OrderItem{}
		orders = append(orders, o)
		orderIDs = append(orderIDs, o.ID)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if len(orderIDs) == 0 {
		return orders, nil
	}

	placeholders := strings.Repeat("?,", len(orderIDs))
	placeholders = placeholders[:len(placeholders)-1]
	args := make([]any, len(orderIDs))
	for i, id := range orderIDs {
		args[i] = id
	}

	itemRows, err := s.db.Query(
		`SELECT order_id, product_id, product_name, size, price, qty
		 FROM order_items WHERE order_id IN (`+placeholders+`)`,
		args...,
	)
	if err != nil {
		return nil, fmt.Errorf("query order items: %w", err)
	}
	defer itemRows.Close()

	itemsByOrder := make(map[string][]OrderItem, len(orderIDs))
	for itemRows.Next() {
		var orderID string
		var item OrderItem
		var size sql.NullString
		if err := itemRows.Scan(&orderID, &item.ProductID, &item.ProductName, &size, &item.Price, &item.Qty); err != nil {
			return nil, fmt.Errorf("scan order item: %w", err)
		}
		item.Size = size.String
		itemsByOrder[orderID] = append(itemsByOrder[orderID], item)
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

func contains(list []string, target string) bool {
	for _, v := range list {
		if v == target {
			return true
		}
	}
	return false
}
