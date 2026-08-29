package api

import (
	"log"
	"net/http"
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
