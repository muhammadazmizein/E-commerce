package api

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"

	"heyfreak-server/internal/store"
)

func (a *API) handleListAddresses(w http.ResponseWriter, r *http.Request) {
	user, _ := userFromContext(r)

	addresses, err := a.store.ListAddresses(user.ID)
	if err != nil {
		log.Printf("list addresses: %v", err)
		writeError(w, http.StatusInternalServerError, "gagal memuat alamat")
		return
	}
	writeJSON(w, http.StatusOK, addresses)
}

func (a *API) handleCreateAddress(w http.ResponseWriter, r *http.Request) {
	user, _ := userFromContext(r)

	var input store.AddressInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	address, err := a.store.CreateAddress(user.ID, input)
	if errors.Is(err, store.ErrValidation) {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if err != nil {
		log.Printf("create address: %v", err)
		writeError(w, http.StatusInternalServerError, "gagal menyimpan alamat")
		return
	}
	writeJSON(w, http.StatusCreated, address)
}

func (a *API) handleUpdateAddress(w http.ResponseWriter, r *http.Request) {
	user, _ := userFromContext(r)
	id := r.PathValue("id")

	var input store.AddressInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	err := a.store.UpdateAddress(user.ID, id, input)
	if errors.Is(err, store.ErrValidation) {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if err != nil {
		log.Printf("update address: %v", err)
		writeError(w, http.StatusInternalServerError, "gagal memperbarui alamat")
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (a *API) handleDeleteAddress(w http.ResponseWriter, r *http.Request) {
	user, _ := userFromContext(r)
	id := r.PathValue("id")

	if err := a.store.DeleteAddress(user.ID, id); err != nil {
		log.Printf("delete address: %v", err)
		writeError(w, http.StatusInternalServerError, "gagal menghapus alamat")
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}
