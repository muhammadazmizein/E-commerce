package api

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"

	"heyfreak-server/internal/store"
)

func (a *API) handleListLocations(w http.ResponseWriter, r *http.Request) {
	locations, err := a.store.ListLocations()
	if err != nil {
		log.Printf("list locations: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to load locations")
		return
	}
	writeJSON(w, http.StatusOK, locations)
}

func (a *API) handleListInventory(w http.ResponseWriter, r *http.Request) {
	locationID := r.URL.Query().Get("locationId")
	if locationID == "" {
		writeError(w, http.StatusBadRequest, "locationId wajib diisi")
		return
	}

	levels, err := a.store.ListInventoryByLocation(locationID)
	if err != nil {
		log.Printf("list inventory: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to load inventory")
		return
	}
	writeJSON(w, http.StatusOK, levels)
}

func (a *API) handleListStockMovements(w http.ResponseWriter, r *http.Request) {
	productID := r.PathValue("productId")

	movements, err := a.store.ListStockMovements(productID, 100)
	if err != nil {
		log.Printf("list stock movements: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to load stock movements")
		return
	}
	writeJSON(w, http.StatusOK, movements)
}

type adjustStockInput struct {
	LocationID string `json:"locationId"`
	ProductID  string `json:"productId"`
	Size       string `json:"size"`
	Delta      int    `json:"delta"`
}

func (a *API) handleAdjustStock(w http.ResponseWriter, r *http.Request) {
	var input adjustStockInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	staff, _ := staffFromContext(r)
	if err := a.store.AdjustStock(input.LocationID, input.ProductID, input.Size, input.Delta, staff.ID); err != nil {
		if errors.Is(err, store.ErrValidation) {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		log.Printf("adjust stock: %v", err)
		writeError(w, http.StatusInternalServerError, "gagal menyesuaikan stok")
		return
	}

	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

type transferStockInput struct {
	FromLocationID string `json:"fromLocationId"`
	ToLocationID   string `json:"toLocationId"`
	ProductID      string `json:"productId"`
	Size           string `json:"size"`
	Qty            int    `json:"qty"`
}

func (a *API) handleTransferStock(w http.ResponseWriter, r *http.Request) {
	var input transferStockInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	staff, _ := staffFromContext(r)
	if err := a.store.TransferStock(input.FromLocationID, input.ToLocationID, input.ProductID, input.Size, input.Qty, staff.ID); err != nil {
		if errors.Is(err, store.ErrValidation) {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		log.Printf("transfer stock: %v", err)
		writeError(w, http.StatusInternalServerError, "gagal transfer stok")
		return
	}

	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}
