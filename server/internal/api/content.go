package api

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"

	"heyfreak-server/internal/store"
)

func (a *API) handleListCategories(w http.ResponseWriter, r *http.Request) {
	categories, err := a.store.ListCategories()
	if err != nil {
		log.Printf("list categories: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to load categories")
		return
	}
	writeJSON(w, http.StatusOK, categories)
}

type createCategoryInput struct {
	Name string `json:"name"`
}

func (a *API) handleCreateCategory(w http.ResponseWriter, r *http.Request) {
	var input createCategoryInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	category, err := a.store.CreateCategory(input.Name)
	if errors.Is(err, store.ErrValidation) {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if errors.Is(err, store.ErrCategoryTaken) {
		writeError(w, http.StatusConflict, "Kategori sudah ada")
		return
	}
	if err != nil {
		log.Printf("create category: %v", err)
		writeError(w, http.StatusInternalServerError, "gagal membuat kategori")
		return
	}

	writeJSON(w, http.StatusCreated, category)
}

func (a *API) handleListBanners(w http.ResponseWriter, r *http.Request) {
	banners, err := a.store.ListBanners()
	if err != nil {
		log.Printf("list banners: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to load banners")
		return
	}
	writeJSON(w, http.StatusOK, banners)
}

func (a *API) handleListSiteImages(w http.ResponseWriter, r *http.Request) {
	images, err := a.store.ListSiteImages()
	if err != nil {
		log.Printf("list site images: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to load site images")
		return
	}
	writeJSON(w, http.StatusOK, images)
}
