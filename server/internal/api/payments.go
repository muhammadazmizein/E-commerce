package api

import (
	"database/sql"
	"encoding/json"
	"errors"
	"log"
	"net/http"

	"heyfreak-server/internal/midtrans"
	"heyfreak-server/internal/store"
)

func (a *API) loadOrderForPayment(w http.ResponseWriter, r *http.Request) (store.Order, bool) {
	if !a.midtrans.Configured() {
		writeError(w, http.StatusServiceUnavailable, "Midtrans belum dikonfigurasi di server")
		return store.Order{}, false
	}

	id := r.PathValue("id")
	order, err := a.store.GetOrder(id)
	if errors.Is(err, sql.ErrNoRows) {
		writeError(w, http.StatusNotFound, "order not found")
		return store.Order{}, false
	}
	if err != nil {
		log.Printf("get order for payment: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to load order")
		return store.Order{}, false
	}
	return order, true
}

// handleCreateQRPayment generates a QRIS code for an existing order, shown
// directly on our own checkout page.
func (a *API) handleCreateQRPayment(w http.ResponseWriter, r *http.Request) {
	order, ok := a.loadOrderForPayment(w, r)
	if !ok {
		return
	}

	qr, err := a.midtrans.ChargeQRIS(order.ID, order.Total)
	if err != nil {
		log.Printf("create midtrans qris charge: %v", err)
		writeError(w, http.StatusBadGateway, "gagal membuat QRIS")
		return
	}

	if err := a.store.SetOrderPayment(order.ID, "qris", qr.TransactionID); err != nil {
		log.Printf("set order payment reference: %v", err)
	}

	writeJSON(w, http.StatusOK, map[string]string{
		"id":         qr.TransactionID,
		"qr_string":  qr.QRString,
		"expires_at": qr.ExpiresAt,
	})
}

type createVAInput struct {
	BankCode string `json:"bankCode"`
}

// handleCreateVAPayment generates a Virtual Account for an existing order,
// shown directly on our own checkout page.
func (a *API) handleCreateVAPayment(w http.ResponseWriter, r *http.Request) {
	order, ok := a.loadOrderForPayment(w, r)
	if !ok {
		return
	}

	var input createVAInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil || input.BankCode == "" {
		writeError(w, http.StatusBadRequest, "bankCode wajib diisi")
		return
	}

	va, err := a.midtrans.ChargeVA(order.ID, order.Total, input.BankCode, order.Name)
	if err != nil {
		log.Printf("create midtrans va charge: %v", err)
		writeError(w, http.StatusBadGateway, "gagal membuat Virtual Account")
		return
	}

	if err := a.store.SetOrderPayment(order.ID, "va_"+input.BankCode, va.TransactionID); err != nil {
		log.Printf("set order payment reference: %v", err)
	}

	writeJSON(w, http.StatusOK, map[string]string{
		"id":              va.TransactionID,
		"external_id":     order.ID,
		"bank_code":       va.BankCode,
		"account_number":  va.AccountNumber,
		"name":            order.Name,
		"expiration_date": va.ExpirationDate,
	})
}

// walletPayments are the e-wallet channels Snap can charge directly without
// extra linking flows (OVO/DANA/LinkAja need a phone-number push-notif or
// account-linking step that doesn't fit a guest checkout).
var walletPayments = []string{"gopay", "shopeepay"}

// handleCreateInvoicePayment starts a Midtrans Snap hosted-payment session
// for methods that inherently require leaving our page (cards need a 3D
// Secure redirect, e-wallets deep-link into their own app) — scoped by the
// "channel" path segment to either "card" or "ewallet" so the buyer lands
// on a focused page instead of the full channel list.
func (a *API) handleCreateInvoicePayment(w http.ResponseWriter, r *http.Request) {
	order, ok := a.loadOrderForPayment(w, r)
	if !ok {
		return
	}

	channel := r.PathValue("channel")
	var enabledPayments []string
	switch channel {
	case "card":
		enabledPayments = []string{"credit_card"}
	case "ewallet":
		enabledPayments = walletPayments
	default:
		writeError(w, http.StatusBadRequest, "channel tidak dikenali")
		return
	}

	snap, err := a.midtrans.CreateSnapTransaction(
		order.ID,
		order.Total,
		midtrans.SnapCustomer{FirstName: order.Name, Email: order.Email, Phone: order.Phone},
		enabledPayments,
		a.siteURL+"/order/"+order.ID,
	)
	if err != nil {
		log.Printf("create midtrans snap transaction: %v", err)
		writeError(w, http.StatusBadGateway, "gagal membuat sesi pembayaran")
		return
	}

	if err := a.store.SetOrderPayment(order.ID, "invoice_"+channel, snap.Token); err != nil {
		log.Printf("set order payment reference: %v", err)
	}

	writeJSON(w, http.StatusOK, map[string]string{
		"id":          snap.Token,
		"invoice_url": snap.RedirectURL,
		"status":      "pending",
	})
}

// handleSimulatePayment marks a test-mode order as paid directly in our own
// database — Midtrans's sandbox "payment" flow is a web form simulator
// meant for a human to click through, not a REST call we can trigger
// server-side, so this dev-only shortcut just fast-forwards the order
// status without round-tripping to Midtrans at all. Never available once
// Midtrans is running in production mode.
func (a *API) handleSimulatePayment(w http.ResponseWriter, r *http.Request) {
	if !a.midtrans.Configured() || !a.midtrans.TestMode() {
		writeError(w, http.StatusForbidden, "simulasi pembayaran cuma tersedia di mode testing")
		return
	}

	id := r.PathValue("id")
	order, err := a.store.GetOrder(id)
	if errors.Is(err, sql.ErrNoRows) {
		writeError(w, http.StatusNotFound, "order not found")
		return
	}
	if err != nil {
		log.Printf("get order for simulate payment: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to load order")
		return
	}

	channel, _, err := a.store.GetOrderPayment(order.ID)
	if err != nil {
		log.Printf("get order payment reference: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to load payment reference")
		return
	}
	if channel == "" {
		writeError(w, http.StatusBadRequest, "metode pembayaran order ini nggak bisa disimulasikan")
		return
	}

	if err := a.store.UpdateOrderStatus(order.ID, "paid"); err != nil {
		log.Printf("update order status after simulate: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to update order")
		return
	}

	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

// handleMidtransNotification receives Midtrans's async payment-status
// webhook (configured as the account's "Payment Notification URL" in the
// Midtrans dashboard, rather than passed per-request like Xendit's
// callback_url was) and updates the matching order's status.
func (a *API) handleMidtransNotification(w http.ResponseWriter, r *http.Request) {
	var n midtrans.Notification
	if err := json.NewDecoder(r.Body).Decode(&n); err != nil {
		writeError(w, http.StatusBadRequest, "invalid notification body")
		return
	}

	if !a.midtrans.VerifySignature(n) {
		writeError(w, http.StatusForbidden, "invalid signature")
		return
	}

	status := midtrans.ResolveStatus(n)
	if status == "" || n.OrderID == "" {
		writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
		return
	}

	if err := a.store.UpdateOrderStatus(n.OrderID, status); err != nil {
		log.Printf("update order status from midtrans notification: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to update order")
		return
	}

	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}
