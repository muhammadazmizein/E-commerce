package api

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"time"

	"heyfreak-server/internal/store"
)

const sessionCookieMaxAge = 30 * 24 * 60 * 60 // 30 days, seconds

func (a *API) setSessionCookie(w http.ResponseWriter, token string) {
	http.SetCookie(w, &http.Cookie{
		Name:     sessionCookieName,
		Value:    token,
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   sessionCookieMaxAge,
		Expires:  time.Now().Add(sessionCookieMaxAge * time.Second),
	})
}

func (a *API) clearSessionCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     sessionCookieName,
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   -1,
	})
}

func (a *API) handleRegister(w http.ResponseWriter, r *http.Request) {
	var input store.RegisterInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	user, token, err := a.store.RegisterUser(input)
	if errors.Is(err, store.ErrValidation) {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if errors.Is(err, store.ErrEmailTaken) {
		writeError(w, http.StatusConflict, "Email sudah terdaftar")
		return
	}
	if err != nil {
		log.Printf("register user: %v", err)
		writeError(w, http.StatusInternalServerError, "gagal mendaftar")
		return
	}

	a.setSessionCookie(w, token)
	writeJSON(w, http.StatusCreated, user)
}

func (a *API) handleLogin(w http.ResponseWriter, r *http.Request) {
	var input store.LoginInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	user, token, err := a.store.LoginUser(input)
	if errors.Is(err, store.ErrInvalidCredential) {
		writeError(w, http.StatusUnauthorized, "Email atau password salah")
		return
	}
	if err != nil {
		log.Printf("login user: %v", err)
		writeError(w, http.StatusInternalServerError, "gagal login")
		return
	}

	a.setSessionCookie(w, token)
	writeJSON(w, http.StatusOK, user)
}

func (a *API) handleLogout(w http.ResponseWriter, r *http.Request) {
	if cookie, err := r.Cookie(sessionCookieName); err == nil && cookie.Value != "" {
		if err := a.store.DeleteSession(cookie.Value); err != nil {
			log.Printf("delete session: %v", err)
		}
	}
	a.clearSessionCookie(w)
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (a *API) handleMe(w http.ResponseWriter, r *http.Request) {
	user, ok := userFromContext(r)
	if !ok {
		writeJSON(w, http.StatusOK, nil)
		return
	}
	writeJSON(w, http.StatusOK, user)
}
