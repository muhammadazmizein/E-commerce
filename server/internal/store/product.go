package store

import (
	"database/sql"
	"encoding/json"
	"fmt"
)

func scanProduct(row interface {
	Scan(dest ...any) error
}) (Product, error) {
	var p Product
	var compareAt sql.NullInt64
	var badge sql.NullString
	var sizesJSON sql.NullString
	var description sql.NullString
	var highlightsJSON sql.NullString
	var avgRating sql.NullFloat64
	var reviewCount sql.NullInt64

	err := row.Scan(&p.ID, &p.Name, &p.Category, &p.Price, &compareAt, &badge,
		&p.Colorway[0], &p.Colorway[1], &p.Image, &sizesJSON, &description, &highlightsJSON,
		&avgRating, &reviewCount)
	if err != nil {
		return Product{}, err
	}

	if compareAt.Valid {
		v := int(compareAt.Int64)
		p.CompareAt = &v
	}
	if badge.Valid {
		p.Badge = &badge.String
	}
	if sizesJSON.Valid && sizesJSON.String != "" {
		if err := json.Unmarshal([]byte(sizesJSON.String), &p.Sizes); err != nil {
			return Product{}, fmt.Errorf("decode sizes: %w", err)
		}
	}
	if description.Valid {
		p.Description = description.String
	}
	if highlightsJSON.Valid && highlightsJSON.String != "" {
		if err := json.Unmarshal([]byte(highlightsJSON.String), &p.Highlights); err != nil {
			return Product{}, fmt.Errorf("decode highlights: %w", err)
		}
	}
	if avgRating.Valid {
		v := avgRating.Float64
		p.Rating = &v
		p.ReviewCount = int(reviewCount.Int64)
	}

	return p, nil
}

const productColumns = `p.id, p.name, p.category, p.price, p.compare_at, p.badge, p.color_1, p.color_2, p.image, p.sizes, p.description, p.highlights, r.avg_rating, r.review_count`

const productRatingsJoin = ` LEFT JOIN (
		SELECT product_id, AVG(rating) AS avg_rating, COUNT(*) AS review_count
		FROM reviews GROUP BY product_id
	) r ON r.product_id = p.id`

func (s *Store) ListProducts(category string) ([]Product, error) {
	query := `SELECT ` + productColumns + ` FROM products p` + productRatingsJoin
	args := []any{}
	if category != "" {
		query += ` WHERE p.category = ?`
		args = append(args, category)
	}
	query += ` ORDER BY p.created_at ASC`

	rows, err := s.db.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("query products: %w", err)
	}
	defer rows.Close()

	products := []Product{}
	for rows.Next() {
		p, err := scanProduct(rows)
		if err != nil {
			return nil, fmt.Errorf("scan product: %w", err)
		}
		products = append(products, p)
	}
	return products, rows.Err()
}

func (s *Store) GetProduct(id string) (Product, error) {
	row := s.db.QueryRow(`SELECT `+productColumns+` FROM products p`+productRatingsJoin+` WHERE p.id = ?`, id)
	return scanProduct(row)
}
