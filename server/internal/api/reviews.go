package api

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"

	"heyfreak-server/internal/store"
)

func (a *API) handleListReviews(w http.ResponseWriter, r *http.Request) {
	productID := r.PathValue("id")

	summary, err := a.store.ListReviews(productID)
	if err != nil {
		log.Printf("list reviews: %v", err)
		writeError(w, http.StatusInternalServerError, "gagal memuat ulasan")
		return
	}
	writeJSON(w, http.StatusOK, summary)
}

func (a *API) handleCreateReview(w http.ResponseWriter, r *http.Request) {
	user, _ := userFromContext(r)
	productID := r.PathValue("id")

	var input store.ReviewInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	review, err := a.store.CreateReview(user.ID, user.Name, productID, input)
	if errors.Is(err, store.ErrValidation) {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if err != nil {
		log.Printf("create review: %v", err)
		writeError(w, http.StatusInternalServerError, "gagal mengirim ulasan")
		return
	}
	writeJSON(w, http.StatusCreated, review)
}
