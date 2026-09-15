package api

import (
	"database/sql"
	"encoding/json"
	"errors"
	"log"
	"net/http"

	"heyfreak-server/internal/store"
)

func (a *API) handleListSuppliers(w http.ResponseWriter, r *http.Request) {
	suppliers, err := a.store.ListSuppliers()
	if err != nil {
		log.Printf("list suppliers: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to load suppliers")
		return
	}
	writeJSON(w, http.StatusOK, suppliers)
}

func (a *API) handleCreateSupplier(w http.ResponseWriter, r *http.Request) {
	var input store.SupplierInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	supplier, err := a.store.CreateSupplier(input)
	if errors.Is(err, store.ErrValidation) {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if err != nil {
		log.Printf("create supplier: %v", err)
		writeError(w, http.StatusInternalServerError, "gagal membuat supplier")
		return
	}

	writeJSON(w, http.StatusCreated, supplier)
}

func (a *API) handleListPurchaseOrders(w http.ResponseWriter, r *http.Request) {
	orders, err := a.store.ListPurchaseOrders()
	if err != nil {
		log.Printf("list purchase orders: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to load purchase orders")
		return
	}
	writeJSON(w, http.StatusOK, orders)
}

func (a *API) handleGetPurchaseOrder(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")

	order, err := a.store.GetPurchaseOrder(id)
	if errors.Is(err, sql.ErrNoRows) {
		writeError(w, http.StatusNotFound, "purchase order not found")
		return
	}
	if err != nil {
		log.Printf("get purchase order: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to load purchase order")
		return
	}
	writeJSON(w, http.StatusOK, order)
}

func (a *API) handleCreatePurchaseOrder(w http.ResponseWriter, r *http.Request) {
	var input store.CreatePurchaseOrderInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	staff, _ := staffFromContext(r)
	order, err := a.store.CreatePurchaseOrder(input, staff.ID)
	if errors.Is(err, store.ErrValidation) {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if err != nil {
		log.Printf("create purchase order: %v", err)
		writeError(w, http.StatusInternalServerError, "gagal membuat purchase order")
		return
	}

	writeJSON(w, http.StatusCreated, order)
}

type receivePurchaseOrderInput struct {
	Items []store.ReceiveItemInput `json:"items"`
}

func (a *API) handleReceivePurchaseOrder(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")

	var input receivePurchaseOrderInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	staff, _ := staffFromContext(r)
	order, err := a.store.ReceivePurchaseOrder(id, input.Items, staff.ID)
	if errors.Is(err, store.ErrValidation) {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if err != nil {
		log.Printf("receive purchase order: %v", err)
		writeError(w, http.StatusInternalServerError, "gagal menerima barang")
		return
	}

	writeJSON(w, http.StatusOK, order)
}
