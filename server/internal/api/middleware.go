package api

import (
	"context"
	"log"
	"net/http"

	"heyfreak-server/internal/store"
)

const sessionCookieName = "heyfreak_session"
const staffSessionCookieName = "heyfreak_staff_session"

type contextKey string

const userContextKey contextKey = "user"
const staffContextKey contextKey = "staff"

// withCORS allows a small set of known origins — the customer storefront
// and (a different origin) heyfreak-admin — rather than a single one.
// Credentialed requests (cookies) can't use a "*" wildcard origin, so the
// matching origin is echoed back instead.
func withCORS(allowedOrigins []string, next http.Handler) http.Handler {
	allowed := make(map[string]bool, len(allowedOrigins))
	for _, o := range allowedOrigins {
		allowed[o] = true
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if allowed[origin] {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Vary", "Origin")
		}
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

// withStaff mirrors withUser but for the separate heyfreak-admin staff
// session cookie — a request can carry both a customer session and a staff
// session at once (different cookies), though in practice only one client
// origin will ever send either.
func (a *API) withStaff(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		cookie, err := r.Cookie(staffSessionCookieName)
		if err != nil || cookie.Value == "" {
			next.ServeHTTP(w, r)
			return
		}

		staff, err := a.store.StaffFromSession(cookie.Value)
		if err != nil {
			next.ServeHTTP(w, r)
			return
		}

		ctx := context.WithValue(r.Context(), staffContextKey, staff)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func staffFromContext(r *http.Request) (store.Staff, bool) {
	staff, ok := r.Context().Value(staffContextKey).(store.Staff)
	return staff, ok
}

// requireStaffRole wraps a handler that must only run for a logged-in
// staff member, optionally restricted to a set of roles (no roles means
// "any authenticated staff").
func requireStaffRole(roles ...string) func(http.HandlerFunc) http.HandlerFunc {
	allowed := make(map[string]bool, len(roles))
	for _, r := range roles {
		allowed[r] = true
	}

	return func(next http.HandlerFunc) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			staff, ok := staffFromContext(r)
			if !ok {
				writeError(w, http.StatusUnauthorized, "login staff diperlukan")
				return
			}
			if len(allowed) > 0 && !allowed[staff.Role] {
				writeError(w, http.StatusForbidden, "role kamu tidak punya akses ini")
				return
			}
			next(w, r)
		}
	}
}

// requireStaffAuth wraps a handler that must only run for any logged-in
// staff member, regardless of role.
func requireStaffAuth(next http.HandlerFunc) http.HandlerFunc {
	return requireStaffRole()(next)
}
