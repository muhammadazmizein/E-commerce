package api

import (
	"context"
	"log"
	"net/http"

	"heyfreak-server/internal/store"
)

const sessionCookieName = "heyfreak_session"

type contextKey string

const userContextKey contextKey = "user"

func withCORS(allowedOrigin string, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", allowedOrigin)
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		w.Header().Set("Access-Control-Allow-Credentials", "true")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func withLogging(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Printf("%s %s", r.Method, r.URL.Path)
		next.ServeHTTP(w, r)
	})
}

// withUser attaches the logged-in user to the request context when a valid
// session cookie is present, but never blocks the request (guest requests
// are allowed to proceed with no user in context).
func (a *API) withUser(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		cookie, err := r.Cookie(sessionCookieName)
		if err != nil || cookie.Value == "" {
			next.ServeHTTP(w, r)
			return
		}

		user, err := a.store.UserFromSession(cookie.Value)
		if err != nil {
			next.ServeHTTP(w, r)
			return
		}

		ctx := context.WithValue(r.Context(), userContextKey, user)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func userFromContext(r *http.Request) (store.User, bool) {
	user, ok := r.Context().Value(userContextKey).(store.User)
	return user, ok
}

// requireAuth wraps a handler that must only run for a logged-in user.
func requireAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if _, ok := userFromContext(r); !ok {
			writeError(w, http.StatusUnauthorized, "login diperlukan")
			return
		}
		next(w, r)
	}
}
