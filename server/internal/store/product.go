package store

import (
	"crypto/rand"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
)

func scanProduct(row interface {
	Scan(dest ...any) error
}) (Product, error) {
	var p Product
	var compareAt sql.NullInt64
	var badge sql.NullString
	var color1, color2 string
	var colorsJSON sql.NullString
	var imagesJSON sql.NullString
	var sizesJSON sql.NullString
	var description sql.NullString
	var highlightsJSON sql.NullString
	var avgRating sql.NullFloat64
	var reviewCount sql.NullInt64

	err := row.Scan(&p.ID, &p.Name, &p.Category, &p.Price, &compareAt, &badge,
		&color1, &color2, &colorsJSON, &p.Image, &imagesJSON, &sizesJSON, &description, &highlightsJSON,
		&p.Stock, &p.IsActive, &avgRating, &reviewCount)
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
	if colorsJSON.Valid && colorsJSON.String != "" {
		if err := json.Unmarshal([]byte(colorsJSON.String), &p.Colors); err != nil {
			return Product{}, fmt.Errorf("decode colors: %w", err)
		}
	}
	if len(p.Colors) == 0 {
		// Products created before `colors` existed only have color_1/
		// color_2 — fall back to those so old rows still return usable
		// swatches instead of an empty list.
		p.Colors = []string{color1, color2}
	}
	if imagesJSON.Valid && imagesJSON.String != "" {
		if err := json.Unmarshal([]byte(imagesJSON.String), &p.Images); err != nil {
			return Product{}, fmt.Errorf("decode images: %w", err)
		}
	}
	if len(p.Images) == 0 && p.Image != "" {
		// Products created before `images` existed only have the single
		// `image` column — fall back to that as a one-photo gallery.
		p.Images = []string{p.Image}
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

const productColumns = `p.id, p.name, p.category, p.price, p.compare_at, p.badge, p.color_1, p.color_2, p.colors, p.image, p.images, p.sizes, p.description, p.highlights, p.stock, p.is_active, r.avg_rating, r.review_count`

const productRatingsJoin = ` LEFT JOIN (
		SELECT product_id, AVG(rating) AS avg_rating, COUNT(*) AS review_count
		FROM reviews GROUP BY product_id
	) r ON r.product_id = p.id`

// ListProducts is the public storefront catalog — archived products
// (is_active = 0) never appear here.
func (s *Store) ListProducts(category string) ([]Product, error) {
	query := `SELECT ` + productColumns + ` FROM products p` + productRatingsJoin + ` WHERE p.is_active = 1`
	args := []any{}
	if category != "" {
		query += ` AND p.category = ?`
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

// ListProductsAdmin is heyfreak-admin's product list — includes archived
// products so staff can still find and reactivate them.
func (s *Store) ListProductsAdmin() ([]Product, error) {
	rows, err := s.db.Query(`SELECT ` + productColumns + ` FROM products p` + productRatingsJoin + ` ORDER BY p.name`)
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

func generateProductID() (string, error) {
	const alphabet = "0123456789"
	buf := make([]byte, 6)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	code := make([]byte, 6)
	for i, b := range buf {
		code[i] = alphabet[int(b)%len(alphabet)]
	}
	return "hf" + string(code), nil
}

// legacyColorPair fills the (still NOT NULL) color_1/color_2 columns from
// whatever `colors` holds — one color repeats into both slots, three or
// more just contribute their first two.
func legacyColorPair(colors []string) (string, string) {
	c1, c2 := "#1a1a1a", "#2c2c2c"
	if len(colors) > 0 && colors[0] != "" {
		c1 = colors[0]
		c2 = colors[0]
	}
	if len(colors) > 1 && colors[1] != "" {
		c2 = colors[1]
	}
	return c1, c2
}

func validateProductInput(input ProductInput) error {
	if strings.TrimSpace(input.Name) == "" || strings.TrimSpace(input.Category) == "" {
		return validationError("nama dan kategori produk wajib diisi")
	}
	if input.Price <= 0 {
		return validationError("harga produk harus lebih dari 0")
	}
	if len(input.Images) == 0 || input.Images[0] == "" {
		return validationError("minimal 1 gambar produk wajib diisi")
	}
	return nil
}

// CreateProduct adds a new SKU and gives it a zero-stock inventory_levels
// row — one per (existing location × size, or just "" if the product has
// no sizes) — so it shows up immediately in heyfreak-admin's inventory
// view. If InitialStock was given, that quantity is then credited at the
// default online location per size (a real stock-in, ledgered the same as
// any other receipt).
func (s *Store) CreateProduct(input ProductInput) (Product, error) {
	if err := validateProductInput(input); err != nil {
		return Product{}, err
	}

	colorsJSON, err := json.Marshal(input.Colors)
	if err != nil {
		return Product{}, fmt.Errorf("encode colors: %w", err)
	}
	color1, color2 := legacyColorPair(input.Colors)
	imagesJSON, err := json.Marshal(input.Images)
	if err != nil {
		return Product{}, fmt.Errorf("encode images: %w", err)
	}
	sizesJSON, err := json.Marshal(input.Sizes)
	if err != nil {
		return Product{}, fmt.Errorf("encode sizes: %w", err)
	}
	highlightsJSON, err := json.Marshal(input.Highlights)
	if err != nil {
		return Product{}, fmt.Errorf("encode highlights: %w", err)
	}

	var id string
	for attempt := 0; attempt < 5; attempt++ {
		candidate, err := generateProductID()
		if err != nil {
			return Product{}, fmt.Errorf("generate product id: %w", err)
		}
		_, err = s.db.Exec(
			`INSERT INTO products (id, name, category, price, compare_at, badge, color_1, color_2, colors, image, images, sizes, description, highlights, stock, is_active)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1)`,
			candidate, input.Name, input.Category, input.Price, input.CompareAt, input.Badge,
			color1, color2, string(colorsJSON), input.Images[0], string(imagesJSON), string(sizesJSON), input.Description, string(highlightsJSON),
		)
		if err == nil {
			id = candidate
			break
		}
		if !strings.Contains(err.Error(), "Duplicate entry") {
			return Product{}, fmt.Errorf("insert product: %w", err)
		}
	}
	if id == "" {
		return Product{}, fmt.Errorf("generate unique product id: exhausted retries")
	}

	sizes := input.Sizes
	if len(sizes) == 0 {
		sizes = []string{""}
	}

	locations, err := s.ListLocations()
	if err != nil {
		return Product{}, fmt.Errorf("list locations for new product: %w", err)
	}
	for _, loc := range locations {
		for _, size := range sizes {
			if _, err := s.db.Exec(
				`INSERT IGNORE INTO inventory_levels (location_id, product_id, size, qty) VALUES (?, ?, ?, 0)`,
				loc.ID, id, size,
			); err != nil {
				return Product{}, fmt.Errorf("seed inventory row: %w", err)
			}
		}
	}

	if len(input.InitialStock) > 0 {
		if err := s.applyInitialStock(id, input.InitialStock); err != nil {
			return Product{}, err
		}
	}

	return s.GetProduct(id)
}

// applyInitialStock credits the default online location per size — used
// right after creating a product (or editing one) when the admin form's
// "stok awal per ukuran" fields were filled in.
func (s *Store) applyInitialStock(productID string, stock []SizeStockInput) error {
	locationID, err := s.DefaultOnlineLocationID()
	if err != nil {
		return fmt.Errorf("resolve default location for initial stock: %w", err)
	}

	tx, err := s.db.Begin()
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback()

	for _, s := range stock {
		if s.Qty <= 0 {
			continue
		}
		if err := receiveStockTx(tx, locationID, productID, s.Size, s.Qty, "adjustment", "product_form", "", nil); err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (s *Store) UpdateProduct(id string, input ProductInput) (Product, error) {
	if err := validateProductInput(input); err != nil {
		return Product{}, err
	}

	colorsJSON, err := json.Marshal(input.Colors)
	if err != nil {
		return Product{}, fmt.Errorf("encode colors: %w", err)
	}
	color1, color2 := legacyColorPair(input.Colors)
	imagesJSON, err := json.Marshal(input.Images)
	if err != nil {
		return Product{}, fmt.Errorf("encode images: %w", err)
	}
	sizesJSON, err := json.Marshal(input.Sizes)
	if err != nil {
		return Product{}, fmt.Errorf("encode sizes: %w", err)
	}
	highlightsJSON, err := json.Marshal(input.Highlights)
	if err != nil {
		return Product{}, fmt.Errorf("encode highlights: %w", err)
	}

	result, err := s.db.Exec(
		`UPDATE products SET name = ?, category = ?, price = ?, compare_at = ?, badge = ?,
		 color_1 = ?, color_2 = ?, colors = ?, image = ?, images = ?, sizes = ?, description = ?, highlights = ?
		 WHERE id = ?`,
		input.Name, input.Category, input.Price, input.CompareAt, input.Badge,
		color1, color2, string(colorsJSON), input.Images[0], string(imagesJSON), string(sizesJSON), input.Description, string(highlightsJSON),
		id,
	)
	if err != nil {
		return Product{}, fmt.Errorf("update product: %w", err)
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return Product{}, fmt.Errorf("update product: %w", err)
	}
	if affected == 0 {
		return Product{}, sql.ErrNoRows
	}

	if len(input.InitialStock) > 0 {
		if err := s.applyInitialStock(id, input.InitialStock); err != nil {
			return Product{}, err
		}
	}

	return s.GetProduct(id)
}

func (s *Store) SetProductActive(id string, active bool) error {
	result, err := s.db.Exec(`UPDATE products SET is_active = ? WHERE id = ?`, active, id)
	if err != nil {
		return fmt.Errorf("set product active: %w", err)
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("set product active: %w", err)
	}
	if affected == 0 {
		return sql.ErrNoRows
	}
	return nil
}
