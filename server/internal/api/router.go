package api

import (
	"net/http"

	"heyfreak-server/internal/midtrans"
	"heyfreak-server/internal/rajaongkir"
	"heyfreak-server/internal/store"
)

type API struct {
	store      *store.Store
	midtrans   *midtrans.Client
	rajaongkir *rajaongkir.Client
	// siteURL is the frontend's own public origin — used to build the
	// redirect Midtrans Snap sends the buyer back to after a card/e-wallet
	// payment (e.g. "<siteURL>/order/<id>").
	siteURL string
}

func New(s *store.Store, mt *midtrans.Client, ro *rajaongkir.Client, siteURL string) *API {
	return &API{store: s, midtrans: mt, rajaongkir: ro, siteURL: siteURL}
}

func (a *API) Router(allowedOrigins []string) http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})

	mux.HandleFunc("GET /config/status", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]any{
			"paymentConfigured":    a.midtrans.Configured(),
			"paymentTestMode":      a.midtrans.TestMode(),
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

	mux.HandleFunc("GET /wishlist", requireAuth(a.handleListWishlist))
	mux.HandleFunc("POST /wishlist", requireAuth(a.handleAddWishlist))
	mux.HandleFunc("DELETE /wishlist/{productId}", requireAuth(a.handleRemoveWishlist))

	mux.HandleFunc("POST /orders/{id}/pay/qris", a.handleCreateQRPayment)
	mux.HandleFunc("POST /orders/{id}/pay/va", a.handleCreateVAPayment)
	mux.HandleFunc("POST /orders/{id}/pay/invoice/{channel}", a.handleCreateInvoicePayment)
	mux.HandleFunc("POST /orders/{id}/simulate-payment", a.handleSimulatePayment)
	mux.HandleFunc("POST /midtrans/notification", a.handleMidtransNotification)

	mux.HandleFunc("GET /shipping/cities", a.handleSearchCities)
	mux.HandleFunc("POST /shipping/cost", a.handleShippingCost)

	// --- heyfreak-admin (ERP/POS), staff-authenticated -------------------
	mux.HandleFunc("POST /staff/auth/bootstrap", a.handleStaffBootstrap)
	mux.HandleFunc("POST /staff/auth/login", a.handleStaffLogin)
	mux.HandleFunc("POST /staff/auth/logout", a.handleStaffLogout)
	mux.HandleFunc("GET /staff/auth/me", a.handleStaffMe)
	mux.HandleFunc("GET /staff", requireStaffRole("owner", "admin")(a.handleListStaff))
	mux.HandleFunc("POST /staff", requireStaffRole("owner", "admin")(a.handleCreateStaff))

	mux.HandleFunc("GET /locations", requireStaffAuth(a.handleListLocations))
	mux.HandleFunc("GET /inventory", requireStaffAuth(a.handleListInventory))
	mux.HandleFunc("GET /inventory/movements/{productId}", requireStaffAuth(a.handleListStockMovements))
	mux.HandleFunc("POST /inventory/adjust", requireStaffAuth(a.handleAdjustStock))
	mux.HandleFunc("POST /inventory/transfer", requireStaffAuth(a.handleTransferStock))

	mux.HandleFunc("GET /pos/registers", requireStaffAuth(a.handleListRegisters))
	mux.HandleFunc("GET /pos/registers/{id}/session", requireStaffAuth(a.handleGetActiveRegisterSession))
	mux.HandleFunc("POST /pos/registers/{id}/open", requireStaffAuth(a.handleOpenRegisterSession))
	mux.HandleFunc("POST /pos/register-sessions/{id}/close", requireStaffAuth(a.handleCloseRegisterSession))
	mux.HandleFunc("POST /pos/sales", requireStaffAuth(a.handleCreatePOSSale))

	// --- Phase 3: product management + reports ---------------------------
	mux.HandleFunc("GET /admin/products", requireStaffAuth(a.handleListProductsAdmin))
	mux.HandleFunc("POST /admin/products", requireStaffRole("owner", "admin")(a.handleCreateProduct))
	mux.HandleFunc("PUT /admin/products/{id}", requireStaffRole("owner", "admin")(a.handleUpdateProduct))
	mux.HandleFunc("PUT /admin/products/{id}/active", requireStaffRole("owner", "admin")(a.handleSetProductActive))
	mux.HandleFunc("POST /admin/categories", requireStaffRole("owner", "admin")(a.handleCreateCategory))
	mux.HandleFunc("GET /reports/sales", requireStaffAuth(a.handleSalesReport))

	// --- Phase 4: purchasing ---------------------------------------------
	mux.HandleFunc("GET /purchasing/suppliers", requireStaffAuth(a.handleListSuppliers))
	mux.HandleFunc("POST /purchasing/suppliers", requireStaffAuth(a.handleCreateSupplier))
	mux.HandleFunc("GET /purchasing/orders", requireStaffAuth(a.handleListPurchaseOrders))
	mux.HandleFunc("POST /purchasing/orders", requireStaffAuth(a.handleCreatePurchaseOrder))
	mux.HandleFunc("GET /purchasing/orders/{id}", requireStaffAuth(a.handleGetPurchaseOrder))
	mux.HandleFunc("POST /purchasing/orders/{id}/receive", requireStaffAuth(a.handleReceivePurchaseOrder))

	// --- Phase 5: accounting ----------------------------------------------
	mux.HandleFunc("GET /accounting/accounts", requireStaffAuth(a.handleListAccounts))
	mux.HandleFunc("GET /accounting/trial-balance", requireStaffAuth(a.handleTrialBalance))
	mux.HandleFunc("GET /accounting/journal", requireStaffAuth(a.handleListJournalEntries))

	// --- Phase 6: HR --------------------------------------------------------
	mux.HandleFunc("GET /hr/shifts", requireStaffAuth(a.handleListShifts))
	mux.HandleFunc("POST /hr/shifts", requireStaffRole("owner", "admin")(a.handleCreateShift))
	mux.HandleFunc("DELETE /hr/shifts/{id}", requireStaffRole("owner", "admin")(a.handleDeleteShift))
	mux.HandleFunc("GET /hr/register-sessions", requireStaffAuth(a.handleListRegisterSessions))
	mux.HandleFunc("PUT /staff/{id}/active", requireStaffRole("owner", "admin")(a.handleSetStaffActive))
	mux.HandleFunc("PUT /staff/{id}/role", requireStaffRole("owner", "admin")(a.handleUpdateStaffRole))

	return withLogging(withCORS(allowedOrigins, a.withUser(a.withStaff(mux))))
}
