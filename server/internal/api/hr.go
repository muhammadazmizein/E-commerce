package api

import (
	"database/sql"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strconv"

	"heyfreak-server/internal/store"
)

func (a *API) handleListShifts(w http.ResponseWriter, r *http.Request) {
	shifts, err := a.store.ListShifts(200)
	if err != nil {
		log.Printf("list shifts: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to load shifts")
		return
	}
	writeJSON(w, http.StatusOK, shifts)
}

func (a *API) handleCreateShift(w http.ResponseWriter, r *http.Request) {
	var input store.ShiftInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	shift, err := a.store.CreateShift(input)
	if errors.Is(err, store.ErrValidation) {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if err != nil {
		log.Printf("create shift: %v", err)
		writeError(w, http.StatusInternalServerError, "gagal membuat shift")
		return
	}

	writeJSON(w, http.StatusCreated, shift)
}

func (a *API) handleDeleteShift(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid shift id")
		return
	}

	if err := a.store.DeleteShift(id); err != nil {
		log.Printf("delete shift: %v", err)
		writeError(w, http.StatusInternalServerError, "gagal menghapus shift")
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (a *API) handleListRegisterSessions(w http.ResponseWriter, r *http.Request) {
	sessions, err := a.store.ListRegisterSessions(100)
	if err != nil {
		log.Printf("list register sessions: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to load register sessions")
		return
	}
	writeJSON(w, http.StatusOK, sessions)
}

type setStaffActiveInput struct {
	IsActive bool `json:"isActive"`
}

func (a *API) handleSetStaffActive(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")

	var input setStaffActiveInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if err := a.store.SetStaffActive(id, input.IsActive); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			writeError(w, http.StatusNotFound, "staff not found")
			return
		}
		log.Printf("set staff active: %v", err)
		writeError(w, http.StatusInternalServerError, "gagal memperbarui status staff")
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

type updateStaffRoleInput struct {
	Role string `json:"role"`
}

func (a *API) handleUpdateStaffRole(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")

	var input updateStaffRoleInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if err := a.store.UpdateStaffRole(id, input.Role); err != nil {
		if errors.Is(err, store.ErrValidation) {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		if errors.Is(err, sql.ErrNoRows) {
			writeError(w, http.StatusNotFound, "staff not found")
			return
		}
		log.Printf("update staff role: %v", err)
		writeError(w, http.StatusInternalServerError, "gagal memperbarui role staff")
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}
