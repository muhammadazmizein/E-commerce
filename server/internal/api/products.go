package api

import (
	"database/sql"
	"encoding/json"
	"errors"
	"log"
	"net/http"

	"heyfreak-server/internal/store"
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

func (a *API) handleListProductsAdmin(w http.ResponseWriter, r *http.Request) {
	products, err := a.store.ListProductsAdmin()
	if err != nil {
		log.Printf("list products admin: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to load products")
		return
	}
	writeJSON(w, http.StatusOK, products)
}

func (a *API) handleCreateProduct(w http.ResponseWriter, r *http.Request) {
	var input store.ProductInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	product, err := a.store.CreateProduct(input)
	if errors.Is(err, store.ErrValidation) {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if err != nil {
		log.Printf("create product: %v", err)
		writeError(w, http.StatusInternalServerError, "gagal membuat produk")
		return
	}

	writeJSON(w, http.StatusCreated, product)
}

func (a *API) handleUpdateProduct(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")

	var input store.ProductInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	product, err := a.store.UpdateProduct(id, input)
	if errors.Is(err, store.ErrValidation) {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if errors.Is(err, sql.ErrNoRows) {
		writeError(w, http.StatusNotFound, "product not found")
		return
	}
	if err != nil {
		log.Printf("update product: %v", err)
		writeError(w, http.StatusInternalServerError, "gagal memperbarui produk")
		return
	}

	writeJSON(w, http.StatusOK, product)
}

type setProductActiveInput struct {
	IsActive bool `json:"isActive"`
}

func (a *API) handleSetProductActive(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")

	var input setProductActiveInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if err := a.store.SetProductActive(id, input.IsActive); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			writeError(w, http.StatusNotFound, "product not found")
			return
		}
		log.Printf("set product active: %v", err)
		writeError(w, http.StatusInternalServerError, "gagal memperbarui status produk")
		return
	}

	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}
