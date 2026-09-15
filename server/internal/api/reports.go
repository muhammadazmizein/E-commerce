package api

import (
	"log"
	"net/http"
	"time"
)

// parseReportRange reads ?from=YYYY-MM-DD&to=YYYY-MM-DD, defaulting to the
// last 30 days when absent/invalid.
func parseReportRange(r *http.Request) (time.Time, time.Time) {
	to := time.Now()
	from := to.AddDate(0, 0, -30)

	if v := r.URL.Query().Get("from"); v != "" {
		if t, err := time.Parse("2006-01-02", v); err == nil {
			from = t
		}
	}
	if v := r.URL.Query().Get("to"); v != "" {
		if t, err := time.Parse("2006-01-02", v); err == nil {
			to = t.Add(24*time.Hour - time.Second)
		}
	}
	return from, to
}

func (a *API) handleSalesReport(w http.ResponseWriter, r *http.Request) {
	from, to := parseReportRange(r)

	byChannel, err := a.store.SalesByChannel(from, to)
	if err != nil {
		log.Printf("sales by channel: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to load report")
		return
	}
	byDay, err := a.store.SalesByDay(from, to)
	if err != nil {
		log.Printf("sales by day: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to load report")
		return
	}
	topProducts, err := a.store.TopProducts(from, to, 10)
	if err != nil {
		log.Printf("top products: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to load report")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"byChannel":   byChannel,
		"byDay":       byDay,
		"topProducts": topProducts,
	})
}
