// Package rajaongkir is a client for RajaOngkir's shipping-cost API on the
// Komerce platform (https://collaborator.komerce.id), used to look up
// destination subdistricts and calculate real courier shipping costs.
//
// RajaOngkir migrated off its old api.rajaongkir.com "Starter" API in 2025 —
// that domain is now fully shut down. This client targets the replacement
// "V2" API at rajaongkir.komerce.id, which identifies locations by
// subdistrict id (not the old city id) and returns a flatter JSON shape.
package rajaongkir

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"sort"
	"strconv"
	"strings"
	"time"
)

var ErrNotConfigured = errors.New("rajaongkir is not configured")

const baseURL = "https://rajaongkir.komerce.id/api/v1"

type Client struct {
	APIKey     string
	OriginID   string
	httpClient *http.Client
}

func New(apiKey, originID string) *Client {
	return &Client{
		APIKey:     apiKey,
		OriginID:   originID,
		httpClient: &http.Client{Timeout: 15 * time.Second},
	}
}

func (c *Client) Configured() bool {
	return c.APIKey != "" && c.OriginID != ""
}

type apiMeta struct {
	Message string `json:"message"`
	Code    int    `json:"code"`
	Status  string `json:"status"`
}

// City is a destination search result — despite the name it's actually a
// subdistrict (the finest granularity the API resolves), since that's the id
// the cost endpoint requires.
type City struct {
	ID              int    `json:"id"`
	Label           string `json:"label"`
	SubdistrictName string `json:"subdistrict_name"`
	DistrictName    string `json:"district_name"`
	CityName        string `json:"city_name"`
	ProvinceName    string `json:"province_name"`
	ZipCode         string `json:"zip_code"`
}

type destinationSearchResponse struct {
	Meta apiMeta `json:"meta"`
	Data []City  `json:"data"`
}

// SearchCities looks up destination subdistricts whose name/label matches
// the query, via the API's own search (no more local city-list caching).
// limit caps how many rows come back — pass a small number (e.g. 10) for a
// simple typeahead, or a large one (e.g. 1000) to pull every kecamatan/
// kelurahan under a kabupaten/kota in one call for a cascading picker.
func (c *Client) SearchCities(query string, limit int) ([]City, error) {
	if !c.Configured() {
		return nil, ErrNotConfigured
	}
	query = strings.TrimSpace(query)
	if query == "" {
		return nil, nil
	}
	if limit <= 0 {
		limit = 10
	}

	reqURL := baseURL + "/destination/domestic-destination?" + url.Values{
		"search": {query},
		"limit":  {strconv.Itoa(limit)},
	}.Encode()

	req, err := http.NewRequest(http.MethodGet, reqURL, nil)
	if err != nil {
		return nil, fmt.Errorf("build request: %w", err)
	}
	req.Header.Set("key", c.APIKey)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("call rajaongkir: %w", err)
	}
	defer resp.Body.Close()

	var parsed destinationSearchResponse
	if err := json.NewDecoder(resp.Body).Decode(&parsed); err != nil {
		return nil, fmt.Errorf("decode response: %w", err)
	}
	if resp.StatusCode != http.StatusOK || parsed.Meta.Status == "error" {
		return nil, fmt.Errorf("rajaongkir: %s", parsed.Meta.Message)
	}

	return parsed.Data, nil
}

type Service struct {
	Courier     string `json:"courier"`
	Service     string `json:"service"`
	Description string `json:"description"`
	Cost        int    `json:"cost"`
	ETD         string `json:"etd"`
}

type costResponse struct {
	Meta apiMeta `json:"meta"`
	Data []struct {
		Name        string `json:"name"`
		Code        string `json:"code"`
		Service     string `json:"service"`
		Description string `json:"description"`
		Cost        int    `json:"cost"`
		ETD         string `json:"etd"`
	} `json:"data"`
}

// GetCost fetches shipping costs to destinationID (a subdistrict id from
// SearchCities) for the given couriers (e.g. []string{"jne", "pos", "tiki"})
// and parcel weight in grams.
func (c *Client) GetCost(destinationID string, weightGrams int, couriers []string) ([]Service, error) {
	if !c.Configured() {
		return nil, ErrNotConfigured
	}

	// The Komerce V2 endpoint reads its params as a form body, not JSON — a
	// JSON body decodes to empty fields on their end and fails their
	// "required" validation.
	form := url.Values{
		"origin":      {c.OriginID},
		"destination": {destinationID},
		"weight":      {strconv.Itoa(weightGrams)},
		"courier":     {strings.Join(couriers, ":")},
		"price":       {"lowest"},
	}

	req, err := http.NewRequest(http.MethodPost, baseURL+"/calculate/domestic-cost", strings.NewReader(form.Encode()))
	if err != nil {
		return nil, fmt.Errorf("build request: %w", err)
	}
	req.Header.Set("key", c.APIKey)
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("call rajaongkir: %w", err)
	}
	defer resp.Body.Close()

	var parsed costResponse
	if err := json.NewDecoder(resp.Body).Decode(&parsed); err != nil {
		return nil, fmt.Errorf("decode response: %w", err)
	}
	if resp.StatusCode != http.StatusOK || parsed.Meta.Status == "error" {
		return nil, fmt.Errorf("rajaongkir: %s", parsed.Meta.Message)
	}

	services := make([]Service, 0, len(parsed.Data))
	seen := make(map[string]bool)
	for _, d := range parsed.Data {
		if !isRelevantParcelService(d.Service, d.Description) {
			continue
		}
		// Some couriers (TIKI in particular) return several product codes
		// that are identically priced/timed for a given route — collapse
		// those down to one entry instead of showing near-duplicates.
		dedupeKey := fmt.Sprintf("%s|%d|%s", d.Code, d.Cost, d.ETD)
		if seen[dedupeKey] {
			continue
		}
		seen[dedupeKey] = true
		services = append(services, Service{
			Courier:     d.Code,
			Service:     d.Service,
			Description: d.Description,
			Cost:        d.Cost,
			ETD:         d.ETD,
		})
	}

	sort.Slice(services, func(i, j int) bool { return services[i].Cost < services[j].Cost })
	const maxServices = 6
	if len(services) > maxServices {
		services = services[:maxServices]
	}
	return services, nil
}

// isRelevantParcelService drops RajaOngkir results that aren't a normal
// small-parcel delivery: bulk/cargo freight, declared-value/dangerous-goods
// surcharge services, and courier-specific motorcycle-shipping tariffs
// (TIKI, for one, returns "Motor Di Bawah 150cc/1500watt" style entries
// costing hundreds of thousands — irrelevant, and confusing, for a t-shirt).
func isRelevantParcelService(service, description string) bool {
	text := strings.ToLower(service + " " + description)
	irrelevant := []string{
		"kargo", "cargo", "trucking", "dangerous goods", "valuable goods",
		"cc/", "watt", "motor",
	}
	for _, kw := range irrelevant {
		if strings.Contains(text, kw) {
			return false
		}
	}
	return true
}
