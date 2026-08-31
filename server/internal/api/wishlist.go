package api

import (
	"encoding/json"
	"log"
	"net/http"
)

func (a *API) handleListWishlist(w http.ResponseWriter, r *http.Request) {
	user, _ := userFromContext(r)

	products, err := a.store.ListWishlist(user.ID)
	if err != nil {
		log.Printf("list wishlist: %v", err)
		writeError(w, http.StatusInternalServerError, "gagal memuat wishlist")
		return
	}
	writeJSON(w, http.StatusOK, products)
}

type addWishlistInput struct {
	ProductID string `json:"productId"`
}

func (a *API) handleAddWishlist(w http.ResponseWriter, r *http.Request) {
	user, _ := userFromContext(r)

	var input addWishlistInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil || input.ProductID == "" {
		writeError(w, http.StatusBadRequest, "productId wajib diisi")
		return
	}

	if err := a.store.AddToWishlist(user.ID, input.ProductID); err != nil {
		log.Printf("add wishlist: %v", err)
		writeError(w, http.StatusInternalServerError, "gagal menyimpan ke wishlist")
		return
	}
	writeJSON(w, http.StatusCreated, map[string]bool{"ok": true})
}

func (a *API) handleRemoveWishlist(w http.ResponseWriter, r *http.Request) {
	user, _ := userFromContext(r)
	productID := r.PathValue("productId")

	if err := a.store.RemoveFromWishlist(user.ID, productID); err != nil {
		log.Printf("remove wishlist: %v", err)
		writeError(w, http.StatusInternalServerError, "gagal menghapus dari wishlist")
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}
