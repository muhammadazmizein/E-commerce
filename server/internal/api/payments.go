package api

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"

	"heyfreak-server/internal/store"
	"heyfreak-server/internal/xendit"
)

func (a *API) loadOrderForPayment(w http.ResponseWriter, r *http.Request) (store.Order, bool) {
	if !a.xendit.Configured() {
		writeError(w, http.StatusServiceUnavailable, "Xendit belum dikonfigurasi di server")
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

	qr, err := a.xendit.CreateQRCode(xendit.CreateQRCodeInput{
		ExternalID:  order.ID,
		Amount:      order.Total,
		CallbackURL: a.publicAPIURL + "/xendit/callback",
	})
	if err != nil {
		log.Printf("create xendit qr code: %v", err)
		writeError(w, http.StatusBadGateway, "gagal membuat QRIS")
		return
	}

	if err := a.store.SetOrderPayment(order.ID, "qris", qr.ID); err != nil {
		log.Printf("set order payment reference: %v", err)
	}

	writeJSON(w, http.StatusOK, qr)
}

type createVAInput struct {
	BankCode string `json:"bankCode"`
}

// handleCreateVAPayment generates a fixed Virtual Account number for an
// existing order, shown directly on our own checkout page.
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

	va, err := a.xendit.CreateVirtualAccount(xendit.CreateVirtualAccountInput{
		ExternalID:     order.ID,
		BankCode:       input.BankCode,
		Name:           order.Name,
		ExpectedAmount: order.Total,
	})
	if err != nil {
		log.Printf("create xendit virtual account: %v", err)
		writeError(w, http.StatusBadGateway, "gagal membuat Virtual Account")
		return
	}

	if err := a.store.SetOrderPayment(order.ID, "va_"+input.BankCode, va.ID); err != nil {
		log.Printf("set order payment reference: %v", err)
	}

	writeJSON(w, http.StatusOK, va)
}

// eWalletMethods are the e-wallet channels Xendit's Invoice product
// supports; scoping an invoice to just these skips straight to the
// deep-link picker instead of showing every channel (cards, VA, retail).
var eWalletMethods = []string{"OVO", "DANA", "SHOPEEPAY", "LINKAJA"}

// handleCreateInvoicePayment starts a Xendit hosted-payment session for
// methods that inherently require leaving our page (cards need a 3D Secure
// redirect, e-wallets deep-link into their own app) — scoped by the
// "channel" path segment to either "card" or "ewallet" so the buyer lands
// on a focused page instead of the full channel list.
func (a *API) handleCreateInvoicePayment(w http.ResponseWriter, r *http.Request) {
	order, ok := a.loadOrderForPayment(w, r)
	if !ok {
		return
	}

	channel := r.PathValue("channel")
	var paymentMethods []string
	switch channel {
	case "card":
		paymentMethods = []string{"CREDIT_CARD"}
	case "ewallet":
		paymentMethods = eWalletMethods
	default:
		writeError(w, http.StatusBadRequest, "channel tidak dikenali")
		return
	}

	invoice, err := a.xendit.CreateInvoice(xendit.CreateInvoiceInput{
		ExternalID:  order.ID,
		Amount:      order.Total,
		PayerEmail:  order.Email,
		Description: fmt.Sprintf("Pesanan HEYFREAK %s", order.ID),
		Customer: xendit.Customer{
			GivenNames:   order.Name,
			Email:        order.Email,
			MobileNumber: order.Phone,
		},
		SuccessRedirectURL: a.siteURL + "/order/" + order.ID,
		FailureRedirectURL: a.siteURL + "/order/" + order.ID,
		PaymentMethods:     paymentMethods,
	})
	if err != nil {
		log.Printf("create xendit invoice: %v", err)
		writeError(w, http.StatusBadGateway, "gagal membuat sesi pembayaran")
		return
	}

	if err := a.store.SetOrderPayment(order.ID, "invoice_"+channel, invoice.ID); err != nil {
		log.Printf("set order payment reference: %v", err)
	}

	writeJSON(w, http.StatusOK, invoice)
}

// handleSimulatePayment marks a test-mode order as paid via Xendit's
// sandbox payment-simulation endpoints, since Xendit's real webhook can't
// reach an unpublished local dev server. Only works with a development key.
func (a *API) handleSimulatePayment(w http.ResponseWriter, r *http.Request) {
	if !a.xendit.Configured() || !a.xendit.TestMode() {
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

	switch {
	case channel == "qris":
		err = a.xendit.SimulateQRPayment(order.ID, order.Total)
	case len(channel) > 3 && channel[:3] == "va_":
		err = a.xendit.SimulateVAPayment(order.ID, order.Total)
	default:
		writeError(w, http.StatusBadRequest, "metode pembayaran order ini nggak bisa disimulasikan")
		return
	}
	if err != nil {
		log.Printf("simulate payment: %v", err)
		writeError(w, http.StatusBadGateway, "gagal simulasi pembayaran")
		return
	}

	if err := a.store.UpdateOrderStatus(order.ID, "paid"); err != nil {
		log.Printf("update order status after simulate: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to update order")
		return
	}

	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

// handleXenditCallback receives Xendit's async payment-status webhook —
// Invoice, QR Code, or Virtual Account, each with a different payload
// shape — and updates the matching order's status.
func (a *API) handleXenditCallback(w http.ResponseWriter, r *http.Request) {
	if !a.xendit.VerifyToken(r.Header.Get("x-callback-token")) {
		writeError(w, http.StatusForbidden, "invalid callback token")
		return
	}

	var body map[string]any
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid callback body")
		return
	}

	orderID, status := xendit.ParseCallback(body)
	if status == "" || orderID == "" {
		writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
		return
	}

	if err := a.store.UpdateOrderStatus(orderID, status); err != nil {
		log.Printf("update order status from xendit callback: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to update order")
		return
	}

	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}
