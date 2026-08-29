// Package xendit is a minimal client for the Xendit Invoices API
// (https://developers.xendit.co/api-reference/#create-invoice), used to
// create a hosted payment page and verify asynchronous webhook callbacks.
package xendit

import (
	"bytes"
	"crypto/subtle"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

var ErrNotConfigured = errors.New("xendit is not configured")

const invoiceURL = "https://api.xendit.co/v2/invoices"

type Client struct {
	SecretKey    string
	WebhookToken string
	httpClient   *http.Client
}

func New(secretKey, webhookToken string) *Client {
	return &Client{
		SecretKey:    secretKey,
		WebhookToken: webhookToken,
		httpClient:   &http.Client{Timeout: 15 * time.Second},
	}
}

func (c *Client) Configured() bool {
	return c.SecretKey != ""
}

// TestMode reports whether the configured key is a Xendit development
// (sandbox) key, which is the only kind the payment-simulation endpoints
// accept.
func (c *Client) TestMode() bool {
	return strings.HasPrefix(c.SecretKey, "xnd_development_")
}

// do sends a Basic-authenticated JSON request and returns the raw response
// body, or an error including the body text if the status isn't 2xx.
func (c *Client) do(method, url string, payload any) ([]byte, error) {
	var reqBody io.Reader
	if payload != nil {
		body, err := json.Marshal(payload)
		if err != nil {
			return nil, fmt.Errorf("encode request: %w", err)
		}
		reqBody = bytes.NewReader(body)
	}

	req, err := http.NewRequest(method, url, reqBody)
	if err != nil {
		return nil, fmt.Errorf("build request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Basic "+base64.StdEncoding.EncodeToString([]byte(c.SecretKey+":")))

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("call xendit: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response: %w", err)
	}
	if resp.StatusCode >= 300 {
		return nil, fmt.Errorf("xendit returned status %d: %s", resp.StatusCode, respBody)
	}
	return respBody, nil
}

type Customer struct {
	GivenNames   string `json:"given_names,omitempty"`
	Email        string `json:"email,omitempty"`
	MobileNumber string `json:"mobile_number,omitempty"`
}

type CreateInvoiceInput struct {
	ExternalID         string
	Amount             int
	PayerEmail         string
	Description        string
	Customer           Customer
	SuccessRedirectURL string
	FailureRedirectURL string
	// PaymentMethods restricts which channels appear on the hosted page
	// (e.g. []string{"CREDIT_CARD"} or []string{"OVO", "DANA", "SHOPEEPAY"}).
	// Leave empty to show every channel Xendit supports.
	PaymentMethods []string
}

type Invoice struct {
	ID         string `json:"id"`
	InvoiceURL string `json:"invoice_url"`
	Status     string `json:"status"`
}

func (c *Client) CreateInvoice(input CreateInvoiceInput) (Invoice, error) {
	if !c.Configured() {
		return Invoice{}, ErrNotConfigured
	}

	payload := map[string]any{
		"external_id":          input.ExternalID,
		"amount":               input.Amount,
		"payer_email":          input.PayerEmail,
		"description":          input.Description,
		"customer":             input.Customer,
		"success_redirect_url": input.SuccessRedirectURL,
		"failure_redirect_url": input.FailureRedirectURL,
	}
	if len(input.PaymentMethods) > 0 {
		payload["payment_methods"] = input.PaymentMethods
	}

	respBody, err := c.do(http.MethodPost, invoiceURL, payload)
	if err != nil {
		return Invoice{}, err
	}

	var result Invoice
	if err := json.Unmarshal(respBody, &result); err != nil {
		return Invoice{}, fmt.Errorf("decode response: %w", err)
	}
	if result.InvoiceURL == "" {
		return Invoice{}, errors.New("xendit response missing invoice_url")
	}

	return result, nil
}

type CreateQRCodeInput struct {
	ExternalID  string
	Amount      int
	CallbackURL string
}

type QRCode struct {
	ID        string `json:"id"`
	QRString  string `json:"qr_string"`
	ExpiresAt string `json:"expires_at"`
}

const qrCodeURL = "https://api.xendit.co/qr_codes"

func (c *Client) CreateQRCode(input CreateQRCodeInput) (QRCode, error) {
	if !c.Configured() {
		return QRCode{}, ErrNotConfigured
	}

	respBody, err := c.do(http.MethodPost, qrCodeURL, map[string]any{
		"external_id":  input.ExternalID,
		"type":         "DYNAMIC",
		"currency":     "IDR",
		"amount":       input.Amount,
		"callback_url": input.CallbackURL,
	})
	if err != nil {
		return QRCode{}, err
	}

	var result QRCode
	if err := json.Unmarshal(respBody, &result); err != nil {
		return QRCode{}, fmt.Errorf("decode response: %w", err)
	}
	if result.QRString == "" {
		return QRCode{}, errors.New("xendit response missing qr_string")
	}
	return result, nil
}

// SimulateQRPayment marks a test-mode QR code as paid, for local
// verification since Xendit's webhook can't reach an unpublished dev
// server. Only works with a development (sandbox) key. externalID is the
// order ID the QR code was created with (not the QR object's own ID).
func (c *Client) SimulateQRPayment(externalID string, amount int) error {
	if !c.Configured() {
		return ErrNotConfigured
	}
	_, err := c.do(http.MethodPost, qrCodeURL+"/"+externalID+"/payments/simulate", map[string]any{
		"amount": amount,
	})
	return err
}

type CreateVirtualAccountInput struct {
	ExternalID     string
	BankCode       string
	Name           string
	ExpectedAmount int
}

type VirtualAccount struct {
	ID             string `json:"id"`
	ExternalID     string `json:"external_id"`
	BankCode       string `json:"bank_code"`
	AccountNumber  string `json:"account_number"`
	Name           string `json:"name"`
	ExpirationDate string `json:"expiration_date"`
}

const virtualAccountURL = "https://api.xendit.co/callback_virtual_accounts"

func (c *Client) CreateVirtualAccount(input CreateVirtualAccountInput) (VirtualAccount, error) {
	if !c.Configured() {
		return VirtualAccount{}, ErrNotConfigured
	}

	respBody, err := c.do(http.MethodPost, virtualAccountURL, map[string]any{
		"external_id":     input.ExternalID,
		"bank_code":       input.BankCode,
		"name":            input.Name,
		"is_closed":       true,
		"expected_amount": input.ExpectedAmount,
	})
	if err != nil {
		return VirtualAccount{}, err
	}

	var result VirtualAccount
	if err := json.Unmarshal(respBody, &result); err != nil {
		return VirtualAccount{}, fmt.Errorf("decode response: %w", err)
	}
	if result.AccountNumber == "" {
		return VirtualAccount{}, errors.New("xendit response missing account_number")
	}
	return result, nil
}

// SimulateVAPayment marks a test-mode virtual account as paid, for local
// verification. Only works with a development (sandbox) key.
func (c *Client) SimulateVAPayment(externalID string, amount int) error {
	if !c.Configured() {
		return ErrNotConfigured
	}
	url := virtualAccountURL + "/external_id=" + externalID + "/simulate_payment"
	_, err := c.do(http.MethodPost, url, map[string]any{
		"amount": amount,
	})
	return err
}

// VerifyToken checks the x-callback-token header Xendit sends against the
// webhook verification token configured in the dashboard. If no token has
// been configured yet, verification is skipped (returns true) so the
// integration still works before that setup step is done.
func (c *Client) VerifyToken(headerToken string) bool {
	if c.WebhookToken == "" {
		return true
	}
	return subtle.ConstantTimeCompare([]byte(headerToken), []byte(c.WebhookToken)) == 1
}

// ParseCallback resolves a decoded webhook body — which can be an Invoice,
// QR Code, or Virtual Account callback, each with a different shape — into
// the order ID it's about and one of our own order statuses ("paid",
// "failed", or "" if it should be ignored).
//
// Shapes:
//   - Invoice: flat body with "external_id" and "status" ("PAID"/"EXPIRED"/...).
//   - QR Code: {"event": "qr.payment", "data": {"external_id": ..., ...}} —
//     only ever sent on a successful payment.
//   - Virtual Account (classic): flat body with "external_id" and
//     "account_number"/"bank_code" but no "status" field — also only ever
//     sent on a successful payment.
func ParseCallback(body map[string]any) (orderID string, status string) {
	if event, _ := body["event"].(string); strings.HasPrefix(event, "qr.") {
		data, _ := body["data"].(map[string]any)
		extID, _ := data["external_id"].(string)
		return extID, "paid"
	}

	externalID, _ := body["external_id"].(string)

	if statusRaw, ok := body["status"].(string); ok {
		switch statusRaw {
		case "PAID", "SETTLED":
			return externalID, "paid"
		case "EXPIRED":
			return externalID, "failed"
		default:
			return externalID, ""
		}
	}

	if _, ok := body["account_number"]; ok {
		return externalID, "paid"
	}

	return externalID, ""
}
