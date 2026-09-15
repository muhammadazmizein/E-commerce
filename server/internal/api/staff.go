package api

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"time"

	"heyfreak-server/internal/store"
)

const staffSessionCookieMaxAge = 12 * 60 * 60 // 12 hours, seconds — a POS shift, not a remembered login

func (a *API) setStaffSessionCookie(w http.ResponseWriter, token string) {
	http.SetCookie(w, &http.Cookie{
		Name:     staffSessionCookieName,
		Value:    token,
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   staffSessionCookieMaxAge,
		Expires:  time.Now().Add(staffSessionCookieMaxAge * time.Second),
	})
}

func (a *API) clearStaffSessionCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     staffSessionCookieName,
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   -1,
	})
}

// handleStaffBootstrap creates the very first staff account (role
// "owner") so heyfreak-admin has somewhere to log in on a fresh install —
// it refuses once any staff account exists.
func (a *API) handleStaffBootstrap(w http.ResponseWriter, r *http.Request) {
	var input store.RegisterStaffInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	staff, token, err := a.store.BootstrapOwner(input)
	if errors.Is(err, store.ErrValidation) {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if errors.Is(err, store.ErrStaffEmailTaken) {
		writeError(w, http.StatusConflict, "Email sudah terdaftar")
		return
	}
	if errors.Is(err, store.ErrStaffExists) {
		writeError(w, http.StatusConflict, "Sudah ada akun staff, minta admin buatkan akun baru")
		return
	}
	if err != nil {
		log.Printf("bootstrap owner: %v", err)
		writeError(w, http.StatusInternalServerError, "gagal membuat akun")
		return
	}

	a.setStaffSessionCookie(w, token)
	writeJSON(w, http.StatusCreated, staff)
}

func (a *API) handleCreateStaff(w http.ResponseWriter, r *http.Request) {
	var input store.RegisterStaffInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	staff, err := a.store.CreateStaff(input)
	if errors.Is(err, store.ErrValidation) {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if errors.Is(err, store.ErrStaffEmailTaken) {
		writeError(w, http.StatusConflict, "Email sudah terdaftar")
		return
	}
	if err != nil {
		log.Printf("create staff: %v", err)
		writeError(w, http.StatusInternalServerError, "gagal membuat akun staff")
		return
	}

	writeJSON(w, http.StatusCreated, staff)
}

func (a *API) handleListStaff(w http.ResponseWriter, r *http.Request) {
	staffList, err := a.store.ListStaff()
	if err != nil {
		log.Printf("list staff: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to load staff")
		return
	}
	writeJSON(w, http.StatusOK, staffList)
}

func (a *API) handleStaffLogin(w http.ResponseWriter, r *http.Request) {
	var input store.StaffLoginInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	staff, token, err := a.store.StaffLogin(input)
	if errors.Is(err, store.ErrInvalidStaffCredential) {
		writeError(w, http.StatusUnauthorized, "Email atau password salah")
		return
	}
	if err != nil {
		log.Printf("staff login: %v", err)
		writeError(w, http.StatusInternalServerError, "gagal login")
		return
	}

	a.setStaffSessionCookie(w, token)
	writeJSON(w, http.StatusOK, staff)
}

func (a *API) handleStaffLogout(w http.ResponseWriter, r *http.Request) {
	if cookie, err := r.Cookie(staffSessionCookieName); err == nil && cookie.Value != "" {
		if err := a.store.DeleteStaffSession(cookie.Value); err != nil {
			log.Printf("delete staff session: %v", err)
		}
	}
	a.clearStaffSessionCookie(w)
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (a *API) handleStaffMe(w http.ResponseWriter, r *http.Request) {
	staff, ok := staffFromContext(r)
	if !ok {
		writeJSON(w, http.StatusOK, nil)
		return
	}
	writeJSON(w, http.StatusOK, staff)
}
