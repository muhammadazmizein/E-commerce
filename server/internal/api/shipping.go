package api

import (
	"encoding/json"
	"log"
	"net/http"

	"heyfreak-server/internal/rajaongkir"
)

func (a *API) handleSearchCities(w http.ResponseWriter, r *http.Request) {
	if !a.rajaongkir.Configured() {
		writeJSON(w, http.StatusOK, map[string]any{"configured": false, "cities": []rajaongkir.City{}})
		return
	}

	query := r.URL.Query().Get("search")
	cities, err := a.rajaongkir.SearchCities(query)
	if err != nil {
		log.Printf("search cities: %v", err)
		writeError(w, http.StatusBadGateway, "gagal mencari kota")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"configured": true, "cities": cities})
}

type shippingCostInput struct {
	DestinationCityID string `json:"destinationCityId"`
	WeightGrams       int    `json:"weightGrams"`
}

var defaultCouriers = []string{"jne", "pos", "tiki"}

func (a *API) handleShippingCost(w http.ResponseWriter, r *http.Request) {
	if !a.rajaongkir.Configured() {
		writeJSON(w, http.StatusOK, map[string]any{"configured": false, "services": []rajaongkir.Service{}})
		return
	}

	var input shippingCostInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if input.WeightGrams <= 0 {
		input.WeightGrams = 1000
	}
	if input.DestinationCityID == "" {
		writeError(w, http.StatusBadRequest, "destinationCityId wajib diisi")
		return
	}

	services, err := a.rajaongkir.GetCost(input.DestinationCityID, input.WeightGrams, defaultCouriers)
	if err != nil {
		log.Printf("get shipping cost: %v", err)
		writeError(w, http.StatusBadGateway, "gagal menghitung ongkir")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"configured": true, "services": services})
}
