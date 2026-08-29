package api

import (
	"net/http"

	"heyfreak-server/internal/rajaongkir"
	"heyfreak-server/internal/store"
	"heyfreak-server/internal/xendit"
)

type API struct {
	store        *store.Store
	xendit       *xendit.Client
	rajaongkir   *rajaongkir.Client
	siteURL      string
	publicAPIURL string
}

func New(s *store.Store, xd *xendit.Client, ro *rajaongkir.Client, siteURL, publicAPIURL string) *API {
	return &API{store: s, xendit: xd, rajaongkir: ro, siteURL: siteURL, publicAPIURL: publicAPIURL}
}

func (a *API) Router(allowedOrigin string) http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})

	mux.HandleFunc("GET /config/status", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]any{
			"xenditConfigured":     a.xendit.Configured(),
			"xenditTestMode":       a.xendit.TestMode(),
			"rajaongkirConfigured": a.rajaongkir.Configured(),
		})
	})

	mux.HandleFunc("GET /products", a.handleListProducts)
	mux.HandleFunc("GET /products/{id}", a.handleGetProduct)
	mux.HandleFunc("GET /products/{id}/reviews", a.handleListReviews)
	mux.HandleFunc("POST /products/{id}/reviews", requireAuth(a.handleCreateReview))
	mux.HandleFunc("POST /orders", a.handleCreateOrder)
	mux.HandleFunc("GET /orders/mine", requireAuth(a.handleListMyOrders))
	mux.HandleFunc("GET /orders/{id}", a.handleGetOrder)
	mux.HandleFunc("GET /categories", a.handleListCategories)
	mux.HandleFunc("GET /banners", a.handleListBanners)
	mux.HandleFunc("GET /site-images", a.handleListSiteImages)

	mux.HandleFunc("POST /auth/register", a.handleRegister)
	mux.HandleFunc("POST /auth/login", a.handleLogin)
	mux.HandleFunc("POST /auth/logout", a.handleLogout)
	mux.HandleFunc("GET /auth/me", a.handleMe)

	mux.HandleFunc("GET /addresses", requireAuth(a.handleListAddresses))
	mux.HandleFunc("POST /addresses", requireAuth(a.handleCreateAddress))
	mux.HandleFunc("PUT /addresses/{id}", requireAuth(a.handleUpdateAddress))
	mux.HandleFunc("DELETE /addresses/{id}", requireAuth(a.handleDeleteAddress))

	mux.HandleFunc("POST /orders/{id}/pay/qris", a.handleCreateQRPayment)
	mux.HandleFunc("POST /orders/{id}/pay/va", a.handleCreateVAPayment)
	mux.HandleFunc("POST /orders/{id}/pay/invoice/{channel}", a.handleCreateInvoicePayment)
	mux.HandleFunc("POST /orders/{id}/simulate-payment", a.handleSimulatePayment)
	mux.HandleFunc("POST /xendit/callback", a.handleXenditCallback)

	mux.HandleFunc("GET /shipping/cities", a.handleSearchCities)
	mux.HandleFunc("POST /shipping/cost", a.handleShippingCost)

	return withLogging(withCORS(allowedOrigin, a.withUser(mux)))
}
