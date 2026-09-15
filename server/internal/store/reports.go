package store

import (
	"fmt"
	"time"
)

type ChannelSales struct {
	Channel     string `json:"channel"`
	OrdersCount int    `json:"ordersCount"`
	Revenue     int    `json:"revenue"`
}

type DailySales struct {
	Date        string `json:"date"`
	OrdersCount int    `json:"ordersCount"`
	Revenue     int    `json:"revenue"`
}

type TopProduct struct {
	ProductID   string `json:"productId"`
	ProductName string `json:"productName"`
	QtySold     int    `json:"qtySold"`
	Revenue     int    `json:"revenue"`
}

// SalesByChannel sums paid orders (either channel) between from/to,
// grouped by channel — the headline number showing online vs in-store mix.
func (s *Store) SalesByChannel(from, to time.Time) ([]ChannelSales, error) {
	rows, err := s.db.Query(
		`SELECT channel, COUNT(*), COALESCE(SUM(total), 0)
		 FROM orders WHERE status = 'paid' AND created_at BETWEEN ? AND ?
		 GROUP BY channel`,
		from, to,
	)
	if err != nil {
		return nil, fmt.Errorf("query sales by channel: %w", err)
	}
	defer rows.Close()

	result := []ChannelSales{}
	for rows.Next() {
		var c ChannelSales
		if err := rows.Scan(&c.Channel, &c.OrdersCount, &c.Revenue); err != nil {
			return nil, fmt.Errorf("scan sales by channel: %w", err)
		}
		result = append(result, c)
	}
	return result, rows.Err()
}

func (s *Store) SalesByDay(from, to time.Time) ([]DailySales, error) {
	rows, err := s.db.Query(
		`SELECT DATE(created_at), COUNT(*), COALESCE(SUM(total), 0)
		 FROM orders WHERE status = 'paid' AND created_at BETWEEN ? AND ?
		 GROUP BY DATE(created_at) ORDER BY DATE(created_at)`,
		from, to,
	)
	if err != nil {
		return nil, fmt.Errorf("query sales by day: %w", err)
	}
	defer rows.Close()

	result := []DailySales{}
	for rows.Next() {
		var d DailySales
		if err := rows.Scan(&d.Date, &d.OrdersCount, &d.Revenue); err != nil {
			return nil, fmt.Errorf("scan sales by day: %w", err)
		}
		result = append(result, d)
	}
	return result, rows.Err()
}

func (s *Store) TopProducts(from, to time.Time, limit int) ([]TopProduct, error) {
	if limit <= 0 || limit > 50 {
		limit = 10
	}
	rows, err := s.db.Query(
		`SELECT oi.product_id, oi.product_name, SUM(oi.qty), SUM(oi.qty * oi.price)
		 FROM order_items oi
		 JOIN orders o ON o.id = oi.order_id
		 WHERE o.status = 'paid' AND o.created_at BETWEEN ? AND ?
		 GROUP BY oi.product_id, oi.product_name
		 ORDER BY SUM(oi.qty) DESC
		 LIMIT ?`,
		from, to, limit,
	)
	if err != nil {
		return nil, fmt.Errorf("query top products: %w", err)
	}
	defer rows.Close()

	result := []TopProduct{}
	for rows.Next() {
		var t TopProduct
		if err := rows.Scan(&t.ProductID, &t.ProductName, &t.QtySold, &t.Revenue); err != nil {
			return nil, fmt.Errorf("scan top product: %w", err)
		}
		result = append(result, t)
	}
	return result, rows.Err()
}
