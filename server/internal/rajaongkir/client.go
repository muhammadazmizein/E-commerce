// Package rajaongkir is a minimal client for the RajaOngkir Starter API
// (https://rajaongkir.com/dokumentasi), used to look up destination cities
// and calculate real courier shipping costs.
package rajaongkir

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"
)

var ErrNotConfigured = errors.New("rajaongkir is not configured")

const baseURL = "https://api.rajaongkir.com/starter"

type Client struct {
	APIKey     string
	OriginID   string
	httpClient *http.Client

	citiesOnce sync.Once
	cities     []City
	citiesErr  error
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

type City struct {
	ID       string `json:"city_id"`
	Name     string `json:"city_name"`
	Province string `json:"province"`
}

type cityListResponse struct {
	RajaOngkir struct {
		Results []City `json:"results"`
	} `json:"rajaongkir"`
}

func (c *Client) loadCities() ([]City, error) {
	c.citiesOnce.Do(func() {
		req, err := http.NewRequest(http.MethodGet, baseURL+"/city", nil)
		if err != nil {
			c.citiesErr = fmt.Errorf("build request: %w", err)
			return
		}
		req.Header.Set("key", c.APIKey)

		resp, err := c.httpClient.Do(req)
		if err != nil {
			c.citiesErr = fmt.Errorf("call rajaongkir: %w", err)
			return
		}
		defer resp.Body.Close()

		var parsed cityListResponse
		if err := json.NewDecoder(resp.Body).Decode(&parsed); err != nil {
			c.citiesErr = fmt.Errorf("decode response: %w", err)
			return
		}
		c.cities = parsed.RajaOngkir.Results
	})
	return c.cities, c.citiesErr
}

// SearchCities returns cities whose name contains the query (case-insensitive).
func (c *Client) SearchCities(query string) ([]City, error) {
	if !c.Configured() {
		return nil, ErrNotConfigured
	}

	cities, err := c.loadCities()
	if err != nil {
		return nil, err
	}

	query = strings.ToLower(strings.TrimSpace(query))
	if query == "" {
		return nil, nil
	}

	matches := make([]City, 0, 10)
	for _, city := range cities {
		if strings.Contains(strings.ToLower(city.Name), query) {
			matches = append(matches, city)
			if len(matches) >= 10 {
				break
			}
		}
	}
	return matches, nil
}

type Service struct {
	Courier     string `json:"courier"`
	Service     string `json:"service"`
	Description string `json:"description"`
	Cost        int    `json:"cost"`
	ETD         string `json:"etd"`
}

type costResponse struct {
	RajaOngkir struct {
		Results []struct {
			Code  string `json:"code"`
			Name  string `json:"name"`
			Costs []struct {
				Service     string `json:"service"`
				Description string `json:"description"`
				Cost        []struct {
					Value int    `json:"value"`
					ETD   string `json:"etd"`
				} `json:"cost"`
			} `json:"costs"`
		} `json:"results"`
	} `json:"rajaongkir"`
}

// GetCost fetches shipping costs to destinationCityID for the given couriers
// (e.g. []string{"jne", "pos", "tiki"}) and parcel weight in grams.
func (c *Client) GetCost(destinationCityID string, weightGrams int, couriers []string) ([]Service, error) {
	if !c.Configured() {
		return nil, ErrNotConfigured
	}

	var services []Service
	for _, courier := range couriers {
		form := url.Values{
			"origin":      {c.OriginID},
			"destination": {destinationCityID},
			"weight":      {strconv.Itoa(weightGrams)},
			"courier":     {courier},
		}

		req, err := http.NewRequest(http.MethodPost, baseURL+"/cost", strings.NewReader(form.Encode()))
		if err != nil {
			return nil, fmt.Errorf("build request: %w", err)
		}
		req.Header.Set("key", c.APIKey)
		req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

		resp, err := c.httpClient.Do(req)
		if err != nil {
			return nil, fmt.Errorf("call rajaongkir: %w", err)
		}

		var parsed costResponse
		err = json.NewDecoder(resp.Body).Decode(&parsed)
		resp.Body.Close()
		if err != nil {
			return nil, fmt.Errorf("decode response: %w", err)
		}

		for _, result := range parsed.RajaOngkir.Results {
			for _, cost := range result.Costs {
				if len(cost.Cost) == 0 {
					continue
				}
				services = append(services, Service{
					Courier:     result.Code,
					Service:     cost.Service,
					Description: cost.Description,
					Cost:        cost.Cost[0].Value,
					ETD:         cost.Cost[0].ETD,
				})
			}
		}
	}

	return services, nil
}
