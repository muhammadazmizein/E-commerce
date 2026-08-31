// Package midtrans is a minimal client for Midtrans's Core API (direct
// charges for QRIS and bank-transfer Virtual Accounts, shown on our own
// checkout page) and Snap API (hosted payment page, used for credit cards
// and e-wallets which inherently need to leave our page).
//
// https://docs.midtrans.com/reference/core-api-overview
// https://docs.midtrans.com/reference/snap-api-overview
package midtrans

import (
	"bytes"
	"crypto/sha512"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"time"
)

var ErrNotConfigured = errors.New("midtrans is not configured")

type Client struct {
	ServerKey    string
	ClientKey    string
	IsProduction bool
	httpClient   *http.Client
}

func New(serverKey, clientKey string, isProduction bool) *Client {
	return &Client{
		ServerKey:    serverKey,
		ClientKey:    clientKey,
		IsProduction: isProduction,
		httpClient:   &http.Client{Timeout: 15 * time.Second},
	}
}

func (c *Client) Configured() bool {
	return c.ServerKey != ""
}

// TestMode reports whether this client is talking to the sandbox
// environment — the only one where a "simulate payment" dev shortcut makes
// sense. Named to match the same call sites the previous Xendit client had.
func (c *Client) TestMode() bool {
	return c.Configured() && !c.IsProduction
}

func (c *Client) coreAPIBase() string {
	if c.IsProduction {
		return "https://api.midtrans.com"
	}
	return "https://api.sandbox.midtrans.com"
}

func (c *Client) snapAPIBase() string {
	if c.IsProduction {
		return "https://app.midtrans.com"
	}
	return "https://app.sandbox.midtrans.com"
}

// do sends a Basic-authenticated JSON request (server key as username, no
// password — same scheme Midtrans's own SDKs use) and returns the raw
// response body, or an error including the body text if the status isn't
// 2xx. Midtrans's Core API returns 4xx with a JSON error body even for
// "expected" failures (e.g. a declined charge), so callers that need those
// details should inspect the body themselves rather than only checking err.
func (c *Client) do(method, url string, payload any) ([]byte, int, error) {
	var reqBody io.Reader
	if payload != nil {
		body, err := json.Marshal(payload)
		if err != nil {
			return nil, 0, fmt.Errorf("encode request: %w", err)
		}
		reqBody = bytes.NewReader(body)
	}

	req, err := http.NewRequest(method, url, reqBody)
	if err != nil {
		return nil, 0, fmt.Errorf("build request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Authorization", "Basic "+base64.StdEncoding.EncodeToString([]byte(c.ServerKey+":")))

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, 0, fmt.Errorf("call midtrans: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, 0, fmt.Errorf("read response: %w", err)
	}
	if resp.StatusCode >= 300 {
		return respBody, resp.StatusCode, fmt.Errorf("midtrans returned status %d: %s", resp.StatusCode, respBody)
	}
	return respBody, resp.StatusCode, nil
}

type transactionDetails struct {
	OrderID     string `json:"order_id"`
	GrossAmount int    `json:"gross_amount"`
}

var jakartaLocation = time.FixedZone("WIB", 7*60*60)

// formatExpiry normalizes Midtrans's expiry_time — "2006-01-02 15:04:05" in
// WIB with no timezone marker — into a proper RFC3339 timestamp, so the
// frontend can hand it to `new Date(...)` and get the right absolute time
// regardless of the buyer's own browser timezone. Falls back to "now plus
// fallback" if Midtrans didn't send one or it's unparseable.
func formatExpiry(raw string, fallback time.Duration) string {
	if raw != "" {
		if t, err := time.ParseInLocation("2006-01-02 15:04:05", raw, jakartaLocation); err == nil {
			return t.Format(time.RFC3339)
		}
	}
	return time.Now().Add(fallback).Format(time.RFC3339)
}

type chargeAction struct {
	Name   string `json:"name"`
	Method string `json:"method"`
	URL    string `json:"url"`
}

// QRIS

type QRPayment struct {
	TransactionID string
	QRString      string
	ExpiresAt     string
}

// ChargeQRIS creates a QRIS charge via the Core API and returns the raw
// EMV QR payload string (react-qr-code on the frontend renders this
// itself — Midtrans's "actions[].url" is an alternative pre-rendered QR
// *image* we don't need since we render our own).
func (c *Client) ChargeQRIS(orderID string, amount int) (QRPayment, error) {
	if !c.Configured() {
		return QRPayment{}, ErrNotConfigured
	}

	body, _, err := c.do(http.MethodPost, c.coreAPIBase()+"/v2/charge", map[string]any{
		"payment_type":        "qris",
		"transaction_details": transactionDetails{OrderID: orderID, GrossAmount: amount},
		"qris":                map[string]any{"acquirer": "gopay"},
	})
	if err != nil {
		return QRPayment{}, err
	}

	var parsed struct {
		TransactionID string         `json:"transaction_id"`
		QRString      string         `json:"qr_string"`
		ExpiryTime    string         `json:"expiry_time"`
		Actions       []chargeAction `json:"actions"`
	}
	if err := json.Unmarshal(body, &parsed); err != nil {
		return QRPayment{}, fmt.Errorf("decode response: %w", err)
	}
	if parsed.QRString == "" {
		return QRPayment{}, errors.New("midtrans response missing qr_string")
	}

	expiresAt := formatExpiry(parsed.ExpiryTime, 15*time.Minute)

	return QRPayment{TransactionID: parsed.TransactionID, QRString: parsed.QRString, ExpiresAt: expiresAt}, nil
}

// Bank transfer (Virtual Account)

type VirtualAccount struct {
	TransactionID  string
	BankCode       string
	AccountNumber  string
	ExpirationDate string
}

// bankTransferBanks are the banks that use Core API's uniform
// "bank_transfer" charge shape, returning a plain va_numbers[].va_number —
// Mandiri and Permata each need their own handling below.
var bankTransferBanks = map[string]bool{"bca": true, "bni": true, "bri": true}

// ChargeVA creates a Virtual Account for the given bank. bankCode is one of
// "BCA", "BNI", "BRI", "PERMATA", "MANDIRI" (case-insensitive) — matching
// the labels already used in the checkout UI's bank picker.
func (c *Client) ChargeVA(orderID string, amount int, bankCode, customerName string) (VirtualAccount, error) {
	if !c.Configured() {
		return VirtualAccount{}, ErrNotConfigured
	}

	bank := toLower(bankCode)
	details := transactionDetails{OrderID: orderID, GrossAmount: amount}

	switch {
	case bankTransferBanks[bank]:
		body, _, err := c.do(http.MethodPost, c.coreAPIBase()+"/v2/charge", map[string]any{
			"payment_type":        "bank_transfer",
			"transaction_details": details,
			"bank_transfer":       map[string]any{"bank": bank},
			"customer_details":    map[string]any{"first_name": customerName},
		})
		if err != nil {
			return VirtualAccount{}, err
		}
		var parsed struct {
			TransactionID string `json:"transaction_id"`
			ExpiryTime    string `json:"expiry_time"`
			VANumbers     []struct {
				Bank     string `json:"bank"`
				VANumber string `json:"va_number"`
			} `json:"va_numbers"`
		}
		if err := json.Unmarshal(body, &parsed); err != nil {
			return VirtualAccount{}, fmt.Errorf("decode response: %w", err)
		}
		if len(parsed.VANumbers) == 0 || parsed.VANumbers[0].VANumber == "" {
			return VirtualAccount{}, errors.New("midtrans response missing va_numbers")
		}
		return VirtualAccount{
			TransactionID:  parsed.TransactionID,
			BankCode:       bankCode,
			AccountNumber:  parsed.VANumbers[0].VANumber,
			ExpirationDate: formatExpiry(parsed.ExpiryTime, 24*time.Hour),
		}, nil

	case bank == "permata":
		body, _, err := c.do(http.MethodPost, c.coreAPIBase()+"/v2/charge", map[string]any{
			"payment_type":        "permata",
			"transaction_details": details,
			"permata":             map[string]any{"recipient_name": customerName},
		})
		if err != nil {
			return VirtualAccount{}, err
		}
		var parsed struct {
			TransactionID   string `json:"transaction_id"`
			ExpiryTime      string `json:"expiry_time"`
			PermataVANumber string `json:"permata_va_number"`
		}
		if err := json.Unmarshal(body, &parsed); err != nil {
			return VirtualAccount{}, fmt.Errorf("decode response: %w", err)
		}
		if parsed.PermataVANumber == "" {
			return VirtualAccount{}, errors.New("midtrans response missing permata_va_number")
		}
		return VirtualAccount{
			TransactionID:  parsed.TransactionID,
			BankCode:       bankCode,
			AccountNumber:  parsed.PermataVANumber,
			ExpirationDate: formatExpiry(parsed.ExpiryTime, 24*time.Hour),
		}, nil

	case bank == "mandiri":
		// Mandiri Bill Payment (echannel) isn't a single account number —
		// the customer keys in a company/biller code plus a bill key
		// separately in their Mandiri app/ATM, so we present both packed
		// into one string ("<biller_code> <bill_key>").
		body, _, err := c.do(http.MethodPost, c.coreAPIBase()+"/v2/charge", map[string]any{
			"payment_type":        "echannel",
			"transaction_details": details,
			"echannel": map[string]any{
				"bill_info1": "Pembayaran",
				"bill_info2": "HEYFREAK " + orderID,
			},
		})
		if err != nil {
			return VirtualAccount{}, err
		}
		var parsed struct {
			TransactionID string `json:"transaction_id"`
			ExpiryTime    string `json:"expiry_time"`
			BillerCode    string `json:"biller_code"`
			BillKey       string `json:"bill_key"`
		}
		if err := json.Unmarshal(body, &parsed); err != nil {
			return VirtualAccount{}, fmt.Errorf("decode response: %w", err)
		}
		if parsed.BillKey == "" {
			return VirtualAccount{}, errors.New("midtrans response missing bill_key")
		}
		return VirtualAccount{
			TransactionID:  parsed.TransactionID,
			BankCode:       bankCode,
			AccountNumber:  parsed.BillerCode + " " + parsed.BillKey,
			ExpirationDate: formatExpiry(parsed.ExpiryTime, 24*time.Hour),
		}, nil

	default:
		return VirtualAccount{}, fmt.Errorf("unsupported bank code %q", bankCode)
	}
}

// Snap (hosted redirect — credit card, e-wallets)

type SnapTransaction struct {
	Token       string
	RedirectURL string
}

type SnapCustomer struct {
	FirstName string
	Email     string
	Phone     string
}

// CreateSnapTransaction opens a Snap hosted-payment session scoped to
// enabledPayments (e.g. []string{"credit_card"} or []string{"gopay",
// "shopeepay"}), analogous to Xendit's Invoice product.
func (c *Client) CreateSnapTransaction(orderID string, amount int, customer SnapCustomer, enabledPayments []string, finishRedirectURL string) (SnapTransaction, error) {
	if !c.Configured() {
		return SnapTransaction{}, ErrNotConfigured
	}

	body, _, err := c.do(http.MethodPost, c.snapAPIBase()+"/snap/v1/transactions", map[string]any{
		"transaction_details": transactionDetails{OrderID: orderID, GrossAmount: amount},
		"customer_details": map[string]any{
			"first_name": customer.FirstName,
			"email":      customer.Email,
			"phone":      customer.Phone,
		},
		"enabled_payments": enabledPayments,
		"callbacks":        map[string]any{"finish": finishRedirectURL},
	})
	if err != nil {
		return SnapTransaction{}, err
	}

	var parsed struct {
		Token       string `json:"token"`
		RedirectURL string `json:"redirect_url"`
	}
	if err := json.Unmarshal(body, &parsed); err != nil {
		return SnapTransaction{}, fmt.Errorf("decode response: %w", err)
	}
	if parsed.RedirectURL == "" {
		return SnapTransaction{}, errors.New("midtrans response missing redirect_url")
	}
	return SnapTransaction{Token: parsed.Token, RedirectURL: parsed.RedirectURL}, nil
}

// Notification webhook

// Notification is Midtrans's asynchronous payment-status callback body.
// Every field arrives as a JSON string (even gross_amount), per Midtrans's
// convention.
type Notification struct {
	OrderID           string `json:"order_id"`
	StatusCode        string `json:"status_code"`
	GrossAmount       string `json:"gross_amount"`
	SignatureKey      string `json:"signature_key"`
	TransactionStatus string `json:"transaction_status"`
	PaymentType       string `json:"payment_type"`
	FraudStatus       string `json:"fraud_status"`
}

// VerifySignature checks Midtrans's SHA-512 notification signature:
// sha512(order_id + status_code + gross_amount + server_key).
// https://docs.midtrans.com/reference/http-notification
func (c *Client) VerifySignature(n Notification) bool {
	sum := sha512.Sum512([]byte(n.OrderID + n.StatusCode + n.GrossAmount + c.ServerKey))
	return hex.EncodeToString(sum[:]) == n.SignatureKey
}

// ResolveStatus maps a notification to one of our own order statuses
// ("paid", "failed", or "" if the order should stay pending / be ignored).
func ResolveStatus(n Notification) string {
	switch n.TransactionStatus {
	case "capture":
		if n.PaymentType == "credit_card" && n.FraudStatus != "accept" {
			return ""
		}
		return "paid"
	case "settlement":
		return "paid"
	case "deny", "cancel", "expire":
		return "failed"
	default: // "pending", or anything unrecognized
		return ""
	}
}

func toLower(s string) string {
	b := []byte(s)
	for i, c := range b {
		if c >= 'A' && c <= 'Z' {
			b[i] = c + ('a' - 'A')
		}
	}
	return string(b)
}
