package store

import (
	"database/sql"
	"fmt"
	"strings"
)

type Category struct {
	Name  string `json:"name"`
	Blurb string `json:"blurb"`
	Image string `json:"image"`
}

type Banner struct {
	ID       int    `json:"id"`
	Title    string `json:"title"`
	Subtitle string `json:"subtitle,omitempty"`
	Image    string `json:"image"`
	CTALabel string `json:"ctaLabel,omitempty"`
	CTAHref  string `json:"ctaHref,omitempty"`
}

type SiteImage struct {
	Slot  string `json:"slot"`
	Image string `json:"image"`
	Alt   string `json:"alt"`
}

func (s *Store) ListCategories() ([]Category, error) {
	rows, err := s.db.Query(`SELECT name, blurb, image FROM categories ORDER BY sort_order ASC`)
	if err != nil {
		return nil, fmt.Errorf("query categories: %w", err)
	}
	defer rows.Close()

	categories := []Category{}
	for rows.Next() {
		var c Category
		if err := rows.Scan(&c.Name, &c.Blurb, &c.Image); err != nil {
			return nil, fmt.Errorf("scan category: %w", err)
		}
		categories = append(categories, c)
	}
	return categories, rows.Err()
}

var ErrCategoryTaken = fmt.Errorf("category already exists")

// CreateCategory adds a new product category from heyfreak-admin's product
// form. blurb/image stay empty — those are only used by the storefront's
// browse-by-category cards, which admin doesn't manage yet — the name is
// all a product's `category` field actually needs.
func (s *Store) CreateCategory(name string) (Category, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return Category{}, validationError("nama kategori wajib diisi")
	}

	var exists int
	if err := s.db.QueryRow(`SELECT COUNT(*) FROM categories WHERE name = ?`, name).Scan(&exists); err != nil {
		return Category{}, fmt.Errorf("check existing category: %w", err)
	}
	if exists > 0 {
		return Category{}, ErrCategoryTaken
	}

	var nextSort sql.NullInt64
	if err := s.db.QueryRow(`SELECT MAX(sort_order) FROM categories`).Scan(&nextSort); err != nil {
		return Category{}, fmt.Errorf("get next sort order: %w", err)
	}

	if _, err := s.db.Exec(
		`INSERT INTO categories (name, blurb, image, sort_order) VALUES (?, '', '', ?)`,
		name, int(nextSort.Int64)+1,
	); err != nil {
		return Category{}, fmt.Errorf("insert category: %w", err)
	}

	return Category{Name: name}, nil
}

func (s *Store) ListBanners() ([]Banner, error) {
	rows, err := s.db.Query(
		`SELECT id, title, subtitle, image, cta_label, cta_href FROM banners ORDER BY sort_order ASC`,
	)
	if err != nil {
		return nil, fmt.Errorf("query banners: %w", err)
	}
	defer rows.Close()

	banners := []Banner{}
	for rows.Next() {
		var b Banner
		var subtitle, ctaLabel, ctaHref sql.NullString
		if err := rows.Scan(&b.ID, &b.Title, &subtitle, &b.Image, &ctaLabel, &ctaHref); err != nil {
			return nil, fmt.Errorf("scan banner: %w", err)
		}
		b.Subtitle = subtitle.String
		b.CTALabel = ctaLabel.String
		b.CTAHref = ctaHref.String
		banners = append(banners, b)
	}
	return banners, rows.Err()
}

func (s *Store) ListSiteImages() (map[string]SiteImage, error) {
	rows, err := s.db.Query(`SELECT slot, image, alt FROM site_images`)
	if err != nil {
		return nil, fmt.Errorf("query site_images: %w", err)
	}
	defer rows.Close()

	images := map[string]SiteImage{}
	for rows.Next() {
		var img SiteImage
		if err := rows.Scan(&img.Slot, &img.Image, &img.Alt); err != nil {
			return nil, fmt.Errorf("scan site_image: %w", err)
		}
		images[img.Slot] = img
	}
	return images, rows.Err()
}
