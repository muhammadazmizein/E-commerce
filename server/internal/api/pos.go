package api

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strconv"

	"heyfreak-server/internal/store"
)

func (a *API) handleListRegisters(w http.ResponseWriter, r *http.Request) {
	registers, err := a.store.ListRegisters()
	if err != nil {
		log.Printf("list registers: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to load registers")
		return
	}
	writeJSON(w, http.StatusOK, registers)
}

func (a *API) handleGetActiveRegisterSession(w http.ResponseWriter, r *http.Request) {
	registerID := r.PathValue("id")

	session, err := a.store.GetOpenRegisterSession(registerID)
	if err != nil {
		log.Printf("get open register session: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to load register session")
		return
	}
	writeJSON(w, http.StatusOK, session)
}

type openRegisterInput struct {
	OpeningCash int `json:"openingCash"`
}

func (a *API) handleOpenRegisterSession(w http.ResponseWriter, r *http.Request) {
	registerID := r.PathValue("id")
	staff, _ := staffFromContext(r)

	var input openRegisterInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	session, err := a.store.OpenRegisterSession(registerID, staff.ID, input.OpeningCash)
	if errors.Is(err, store.ErrValidation) {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if errors.Is(err, store.ErrRegisterBusy) {
		writeError(w, http.StatusConflict, "register ini sedang dipakai sesi lain")
		return
	}
	if err != nil {
		log.Printf("open register session: %v", err)
		writeError(w, http.StatusInternalServerError, "gagal membuka kasir")
		return
	}

	writeJSON(w, http.StatusCreated, session)
}

type closeRegisterInput struct {
	ClosingCash int `json:"closingCash"`
}

func (a *API) handleCloseRegisterSession(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid session id")
		return
	}
	staff, _ := staffFromContext(r)

	var input closeRegisterInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	session, err := a.store.CloseRegisterSession(id, staff.ID, input.ClosingCash)
	if errors.Is(err, store.ErrNoOpenSession) {
		writeError(w, http.StatusNotFound, "sesi kasir tidak ditemukan atau sudah ditutup")
		return
	}
	if errors.Is(err, store.ErrSessionNotYours) {
		writeError(w, http.StatusForbidden, "sesi kasir ini bukan milik kamu")
		return
	}
	if err != nil {
		log.Printf("close register session: %v", err)
		writeError(w, http.StatusInternalServerError, "gagal menutup kasir")
		return
	}

	writeJSON(w, http.StatusOK, session)
}

func (a *API) handleCreatePOSSale(w http.ResponseWriter, r *http.Request) {
	var input store.POSSaleInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	staff, _ := staffFromContext(r)
	order, err := a.store.CreatePOSSale(input, staff.ID)
	if errors.Is(err, store.ErrValidation) {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if errors.Is(err, store.ErrNoOpenSession) {
		writeError(w, http.StatusBadRequest, "sesi kasir tidak ditemukan atau sudah ditutup")
		return
	}
	if errors.Is(err, store.ErrSessionNotYours) {
		writeError(w, http.StatusForbidden, "sesi kasir ini bukan milik kamu")
		return
	}
	if err != nil {
		log.Printf("create pos sale: %v", err)
		writeError(w, http.StatusInternalServerError, "gagal membuat transaksi")
		return
	}

	writeJSON(w, http.StatusCreated, order)
}
