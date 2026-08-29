package store

import (
	"database/sql"
	"fmt"
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
