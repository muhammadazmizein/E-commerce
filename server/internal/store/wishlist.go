package store

import "fmt"

// ListWishlist returns the full products a user has saved, most recently
// added first.
func (s *Store) ListWishlist(userID string) ([]Product, error) {
	query := `SELECT ` + productColumns + `
		FROM wishlists w
		JOIN products p ON p.id = w.product_id` + productRatingsJoin + `
		WHERE w.user_id = ?
		ORDER BY w.created_at DESC`

	rows, err := s.db.Query(query, userID)
	if err != nil {
		return nil, fmt.Errorf("query wishlist: %w", err)
	}
	defer rows.Close()

	products := []Product{}
	for rows.Next() {
		p, err := scanProduct(rows)
		if err != nil {
			return nil, fmt.Errorf("scan wishlist product: %w", err)
		}
		products = append(products, p)
	}
	return products, rows.Err()
}

// AddToWishlist is idempotent — saving an already-saved product is a no-op,
// not an error.
func (s *Store) AddToWishlist(userID, productID string) error {
	_, err := s.db.Exec(
		`INSERT INTO wishlists (user_id, product_id) VALUES (?, ?)
		 ON DUPLICATE KEY UPDATE user_id = user_id`,
		userID, productID,
	)
	if err != nil {
		return fmt.Errorf("add to wishlist: %w", err)
	}
	return nil
}

func (s *Store) RemoveFromWishlist(userID, productID string) error {
	_, err := s.db.Exec(`DELETE FROM wishlists WHERE user_id = ? AND product_id = ?`, userID, productID)
	if err != nil {
		return fmt.Errorf("remove from wishlist: %w", err)
	}
	return nil
}
