package store

import (
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"
)

type Review struct {
	ID               string    `json:"id"`
	ProductID        string    `json:"productId"`
	UserName         string    `json:"userName"`
	Rating           int       `json:"rating"`
	Comment          string    `json:"comment"`
	VerifiedPurchase bool      `json:"verifiedPurchase"`
	CreatedAt        time.Time `json:"createdAt"`
}

type ReviewInput struct {
	Rating  int    `json:"rating"`
	Comment string `json:"comment"`
}

type ReviewSummary struct {
	Average float64  `json:"average"`
	Count   int      `json:"count"`
	Reviews []Review `json:"reviews"`
}

func (s *Store) ListReviews(productID string) (ReviewSummary, error) {
	rows, err := s.db.Query(
		`SELECT id, product_id, user_name, rating, comment, verified_purchase, created_at
		 FROM reviews WHERE product_id = ? ORDER BY created_at DESC`,
		productID,
	)
	if err != nil {
		return ReviewSummary{}, fmt.Errorf("query reviews: %w", err)
	}
	defer rows.Close()

	reviews := []Review{}
	var ratingSum int
	for rows.Next() {
		var rv Review
		if err := rows.Scan(&rv.ID, &rv.ProductID, &rv.UserName, &rv.Rating, &rv.Comment, &rv.VerifiedPurchase, &rv.CreatedAt); err != nil {
			return ReviewSummary{}, fmt.Errorf("scan review: %w", err)
		}
		reviews = append(reviews, rv)
		ratingSum += rv.Rating
	}
	if err := rows.Err(); err != nil {
		return ReviewSummary{}, err
	}

	summary := ReviewSummary{Reviews: reviews, Count: len(reviews)}
	if len(reviews) > 0 {
		summary.Average = float64(ratingSum) / float64(len(reviews))
	}
	return summary, nil
}

func (s *Store) CreateReview(userID, userName, productID string, input ReviewInput) (Review, error) {
	if input.Rating < 1 || input.Rating > 5 {
		return Review{}, validationError("rating harus antara 1-5")
	}
	comment := strings.TrimSpace(input.Comment)
	if comment == "" {
		return Review{}, validationError("ulasan tidak boleh kosong")
	}
	if len(comment) > 2000 {
		return Review{}, validationError("ulasan terlalu panjang")
	}

	var exists int
	if err := s.db.QueryRow(`SELECT 1 FROM products WHERE id = ?`, productID).Scan(&exists); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Review{}, validationError("produk tidak ditemukan")
		}
		return Review{}, fmt.Errorf("check product: %w", err)
	}

	var dummy int
	err := s.db.QueryRow(
		`SELECT 1 FROM orders o
		 JOIN order_items oi ON oi.order_id = o.id
		 WHERE o.user_id = ? AND oi.product_id = ? AND o.status = 'paid' LIMIT 1`,
		userID, productID,
	).Scan(&dummy)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return Review{}, fmt.Errorf("check purchase: %w", err)
	}
	verified := err == nil

	id, err := newID()
	if err != nil {
		return Review{}, fmt.Errorf("generate review id: %w", err)
	}

	_, err = s.db.Exec(
		`INSERT INTO reviews (id, product_id, user_id, user_name, rating, comment, verified_purchase)
		 VALUES (?, ?, ?, ?, ?, ?, ?)`,
		id, productID, userID, userName, input.Rating, comment, verified,
	)
	if err != nil {
		if strings.Contains(err.Error(), "Duplicate entry") {
			return Review{}, validationError("kamu sudah pernah memberi ulasan untuk produk ini")
		}
		return Review{}, fmt.Errorf("insert review: %w", err)
	}

	return Review{
		ID:               id,
		ProductID:        productID,
		UserName:         userName,
		Rating:           input.Rating,
		Comment:          comment,
		VerifiedPurchase: verified,
		CreatedAt:        time.Now(),
	}, nil
}
