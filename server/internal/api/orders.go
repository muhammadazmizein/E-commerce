package api

import (
	"database/sql"
	"encoding/json"
	"errors"
	"log"
	"net/http"

	"heyfreak-server/internal/store"
)

func (a *API) handleCreateOrder(w http.ResponseWriter, r *http.Request) {
	var input store.CreateOrderInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	user, _ := userFromContext(r)
	order, err := a.store.CreateOrder(input, user.ID)
	if errors.Is(err, store.ErrValidation) {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if err != nil {
		log.Printf("create order: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to create order")
		return
	}

	writeJSON(w, http.StatusCreated, order)
}

func (a *API) handleListMyOrders(w http.ResponseWriter, r *http.Request) {
	user, _ := userFromContext(r)

	orders, err := a.store.ListOrdersByUser(user.ID)
	if err != nil {
		log.Printf("list orders by user: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to load orders")
		return
	}

	writeJSON(w, http.StatusOK, orders)
}

func (a *API) handleGetOrder(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")

	order, err := a.store.GetOrder(id)
	if errors.Is(err, sql.ErrNoRows) {
		writeError(w, http.StatusNotFound, "order not found")
		return
	}
	if err != nil {
		log.Printf("get order: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to load order")
		return
	}

	writeJSON(w, http.StatusOK, order)
}
