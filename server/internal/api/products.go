package api

import (
	"database/sql"
	"errors"
	"log"
	"net/http"
)

func (a *API) handleListProducts(w http.ResponseWriter, r *http.Request) {
	category := r.URL.Query().Get("category")

	products, err := a.store.ListProducts(category)
	if err != nil {
		log.Printf("list products: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to load products")
		return
	}

	writeJSON(w, http.StatusOK, products)
}

func (a *API) handleGetProduct(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")

	product, err := a.store.GetProduct(id)
	if errors.Is(err, sql.ErrNoRows) {
		writeError(w, http.StatusNotFound, "product not found")
		return
	}
	if err != nil {
		log.Printf("get product: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to load product")
		return
	}

	writeJSON(w, http.StatusOK, product)
}
