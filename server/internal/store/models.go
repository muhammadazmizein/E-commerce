package store

import "time"

type Highlight struct {
	Title string `json:"title"`
	Desc  string `json:"desc"`
}

type Product struct {
	ID        string  `json:"id"`
	Name      string  `json:"name"`
	Category  string  `json:"category"`
	Price     int     `json:"price"`
	CompareAt *int    `json:"compareAt,omitempty"`
	Badge     *string `json:"badge,omitempty"`
	// Colors is any number of swatches (not fixed at two) — color_1/
	// color_2 in the DB still get the first couple written for backward
	// compatibility, but this is the field that actually round-trips.
	Colors []string `json:"colors"`
	Sizes  []string `json:"sizes,omitempty"`
	// Image is the primary/cover photo (always Images[0]) — every
	// storefront view that only shows one photo (cards, cart, etc) keeps
	// reading this field unchanged. Images is the full gallery.
	Image       string      `json:"image"`
	Images      []string    `json:"images"`
	Description string      `json:"description,omitempty"`
	Highlights  []Highlight `json:"highlights,omitempty"`
	Rating      *float64    `json:"rating,omitempty"`
	ReviewCount int         `json:"reviewCount,omitempty"`
	Stock       int         `json:"stock"`
	IsActive    bool        `json:"isActive"`
}

// SizeStockInput sets how much stock a size should start with (Create) or
// gain (Update) at the default online location — see CreateProduct.
type SizeStockInput struct {
	Size string `json:"size"`
	Qty  int    `json:"qty"`
}

// ProductInput is the admin-facing create/update payload for a product —
// unlike Product it has no derived fields (stock, rating) since those come
// from inventory_levels/reviews, not from the admin form.
type ProductInput struct {
	Name         string           `json:"name"`
	Category     string           `json:"category"`
	Price        int              `json:"price"`
	CompareAt    *int             `json:"compareAt,omitempty"`
	Badge        *string          `json:"badge,omitempty"`
	Colors       []string         `json:"colors"`
	Sizes        []string         `json:"sizes,omitempty"`
	Images       []string         `json:"images"`
	Description  string           `json:"description,omitempty"`
	Highlights   []Highlight      `json:"highlights,omitempty"`
	InitialStock []SizeStockInput `json:"initialStock,omitempty"`
}

type OrderItemInput struct {
	ProductID string `json:"productId"`
	Size      string `json:"size"`
	Qty       int    `json:"qty"`
}

type CreateOrderInput struct {
	Name          string           `json:"name"`
	Phone         string           `json:"phone"`
	Email         string           `json:"email"`
	Address       string           `json:"address"`
	City          string           `json:"city"`
	PostalCode    string           `json:"postalCode"`
	Notes         string           `json:"notes"`
	PaymentMethod string           `json:"paymentMethod"`
	Shipping      int              `json:"shipping"`
	Items         []OrderItemInput `json:"items"`
}

type OrderItem struct {
	ProductID   string `json:"productId"`
	ProductName string `json:"productName"`
	Size        string `json:"size,omitempty"`
	Price       int    `json:"price"`
	Qty         int    `json:"qty"`
}

type Order struct {
	ID             string `json:"id"`
	Name           string `json:"name"`
	Phone          string `json:"phone"`
	Email          string `json:"email"`
	Address        string `json:"address"`
	City           string `json:"city"`
	PostalCode     string `json:"postalCode"`
	Notes          string `json:"notes,omitempty"`
	PaymentMethod  string `json:"paymentMethod"`
	Subtotal       int    `json:"subtotal"`
	Shipping       int    `json:"shipping"`
	Total          int    `json:"total"`
	Status         string `json:"status"`
	PaymentChannel string `json:"paymentChannel,omitempty"`
	// Channel distinguishes an online storefront order ("online") from a
	// POS sale rung up in-store ("pos") — both live in this same table.
	Channel      string      `json:"channel"`
	LocationID   string      `json:"locationId,omitempty"`
	CashReceived *int        `json:"cashReceived,omitempty"`
	ChangeDue    *int        `json:"changeDue,omitempty"`
	CreatedAt    time.Time   `json:"createdAt"`
	Items        []OrderItem `json:"items"`
}

type User struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
}

type RegisterInput struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginInput struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type Address struct {
	ID            string `json:"id"`
	Label         string `json:"label"`
	RecipientName string `json:"recipientName"`
	Phone         string `json:"phone"`
	Address       string `json:"address"`
	City          string `json:"city"`
	PostalCode    string `json:"postalCode"`
	IsDefault     bool   `json:"isDefault"`
}

type AddressInput struct {
	Label         string `json:"label"`
	RecipientName string `json:"recipientName"`
	Phone         string `json:"phone"`
	Address       string `json:"address"`
	City          string `json:"city"`
	PostalCode    string `json:"postalCode"`
	IsDefault     bool   `json:"isDefault"`
}
