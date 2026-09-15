package api

import (
	"log"
	"net/http"
)

func (a *API) handleListAccounts(w http.ResponseWriter, r *http.Request) {
	accounts, err := a.store.ListAccounts()
	if err != nil {
		log.Printf("list accounts: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to load accounts")
		return
	}
	writeJSON(w, http.StatusOK, accounts)
}

func (a *API) handleTrialBalance(w http.ResponseWriter, r *http.Request) {
	rows, err := a.store.TrialBalance()
	if err != nil {
		log.Printf("trial balance: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to load trial balance")
		return
	}
	writeJSON(w, http.StatusOK, rows)
}

func (a *API) handleListJournalEntries(w http.ResponseWriter, r *http.Request) {
	entries, err := a.store.ListJournalEntries(100)
	if err != nil {
		log.Printf("list journal entries: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to load journal entries")
		return
	}
	writeJSON(w, http.StatusOK, entries)
}
