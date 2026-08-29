package store

import "time"

type Highlight struct {
	Title string `json:"title"`
	Desc  string `json:"desc"`
}

type Product struct {
	ID          string      `json:"id"`
	Name        string      `json:"name"`
	Category    string      `json:"category"`
	Price       int         `json:"price"`
	CompareAt   *int        `json:"compareAt,omitempty"`
	Badge       *string     `json:"badge,omitempty"`
	Colorway    [2]string   `json:"colorway"`
	Sizes       []string    `json:"sizes,omitempty"`
	Image       string      `json:"image"`
	Description string      `json:"description,omitempty"`
	Highlights  []Highlight `json:"highlights,omitempty"`
	Rating      *float64    `json:"rating,omitempty"`
	ReviewCount int         `json:"reviewCount,omitempty"`
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
	ID             string      `json:"id"`
	Name           string      `json:"name"`
	Phone          string      `json:"phone"`
	Email          string      `json:"email"`
	Address        string      `json:"address"`
	City           string      `json:"city"`
	PostalCode     string      `json:"postalCode"`
	Notes          string      `json:"notes,omitempty"`
	PaymentMethod  string      `json:"paymentMethod"`
	Subtotal       int         `json:"subtotal"`
	Shipping       int         `json:"shipping"`
	Total          int         `json:"total"`
	Status         string      `json:"status"`
	PaymentChannel string      `json:"paymentChannel,omitempty"`
	CreatedAt      time.Time   `json:"createdAt"`
	Items          []OrderItem `json:"items"`
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
