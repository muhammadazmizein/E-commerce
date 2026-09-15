package store

import "time"

type Location struct {
	ID              string `json:"id"`
	Name            string `json:"name"`
	Type            string `json:"type"`
	Address         string `json:"address,omitempty"`
	IsPOSEnabled    bool   `json:"isPosEnabled"`
	IsOnlineDefault bool   `json:"isOnlineDefault"`
}

type InventoryLevel struct {
	LocationID  string `json:"locationId"`
	ProductID   string `json:"productId"`
	ProductName string `json:"productName"`
	// Size is "" for a product with no sizes at all.
	Size string `json:"size"`
	Qty  int    `json:"qty"`
}

type StockMovement struct {
	ID            int64     `json:"id"`
	ProductID     string    `json:"productId"`
	LocationID    string    `json:"locationId"`
	Size          string    `json:"size"`
	DeltaQty      int       `json:"deltaQty"`
	Reason        string    `json:"reason"`
	ReferenceType string    `json:"referenceType,omitempty"`
	ReferenceID   string    `json:"referenceId,omitempty"`
	CreatedAt     time.Time `json:"createdAt"`
}

type Staff struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Email    string `json:"email"`
	Role     string `json:"role"`
	IsActive bool   `json:"isActive"`
}

type RegisterStaffInput struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"`
	Role     string `json:"role"`
}

type StaffLoginInput struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type Register struct {
	ID         string `json:"id"`
	LocationID string `json:"locationId"`
	Name       string `json:"name"`
}

type RegisterSession struct {
	ID           int64      `json:"id"`
	RegisterID   string     `json:"registerId"`
	StaffID      string     `json:"staffId"`
	OpeningCash  int        `json:"openingCash"`
	ClosingCash  *int       `json:"closingCash,omitempty"`
	ExpectedCash *int       `json:"expectedCash,omitempty"`
	OpenedAt     time.Time  `json:"openedAt"`
	ClosedAt     *time.Time `json:"closedAt,omitempty"`
	Status       string     `json:"status"`
}

type POSSaleItemInput struct {
	ProductID string `json:"productId"`
	Size      string `json:"size"`
	Qty       int    `json:"qty"`
}

// POSSaleInput describes a walk-in sale rung up at a register. Unlike an
// online CreateOrderInput there's no buyer address/shipping — cash is
// collected (or a QRIS code is shown) right at the counter.
type POSSaleInput struct {
	RegisterSessionID int64              `json:"registerSessionId"`
	PaymentMethod     string             `json:"paymentMethod"` // "cash" | "qris"
	CashReceived      *int               `json:"cashReceived,omitempty"`
	CustomerName      string             `json:"customerName"`
	Items             []POSSaleItemInput `json:"items"`
}
