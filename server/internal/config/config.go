package config

import (
	"bufio"
	"fmt"
	"os"
	"strings"
)

type Config struct {
	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string
	Port       string
	// AllowedOrigins lists every frontend origin allowed to call this API
	// with credentials — the customer storefront and (a separate origin)
	// heyfreak-admin.
	AllowedOrigins []string

	MidtransServerKey    string
	MidtransClientKey    string
	MidtransIsProduction bool

	RajaOngkirAPIKey   string
	RajaOngkirOriginID string
}

// LoadDotEnv reads KEY=VALUE pairs from a .env file into the process
// environment, without overriding variables already set.
func LoadDotEnv(path string) {
	f, err := os.Open(path)
	if err != nil {
		return
	}
	defer f.Close()

	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		key, value, ok := strings.Cut(line, "=")
		if !ok {
			continue
		}
		key = strings.TrimSpace(key)
		value = strings.Trim(strings.TrimSpace(value), `"'`)
		if _, exists := os.LookupEnv(key); !exists {
			os.Setenv(key, value)
		}
	}
}

func Load() Config {
	port := getEnv("PORT", "8080")

	// ALLOWED_ORIGINS is the new, comma-separated form (customer storefront
	// + heyfreak-admin); ALLOWED_ORIGIN (singular) is kept as a fallback so
	// existing deployments that only set the old var keep working.
	origins := getEnv("ALLOWED_ORIGINS", "")
	if origins == "" {
		origins = getEnv("ALLOWED_ORIGIN", "http://localhost:3000")
	}

	return Config{
		DBHost:         getEnv("DB_HOST", "127.0.0.1"),
		DBPort:         getEnv("DB_PORT", "3306"),
		DBUser:         getEnv("DB_USER", "heyfreak_app"),
		DBPassword:     getEnv("DB_PASSWORD", ""),
		DBName:         getEnv("DB_NAME", "heyfreak"),
		Port:           port,
		AllowedOrigins: splitAndTrim(origins, ","),

		MidtransServerKey:    getEnv("MIDTRANS_SERVER_KEY", ""),
		MidtransClientKey:    getEnv("MIDTRANS_CLIENT_KEY", ""),
		MidtransIsProduction: getEnv("MIDTRANS_IS_PRODUCTION", "false") == "true",

		RajaOngkirAPIKey:   getEnv("RAJAONGKIR_API_KEY", ""),
		RajaOngkirOriginID: getEnv("RAJAONGKIR_ORIGIN_CITY_ID", ""),
	}
}

func (c Config) MySQLDSN() string {
	// loc=Local matters as much as parseTime=true here: MySQL's
	// time_zone is SYSTEM (naive wall-clock, whatever the DB host's OS
	// zone is) and every created_at column is DEFAULT CURRENT_TIMESTAMP
	// in that same wall-clock — so both directions need to agree on
	// "Local" too. Without it the driver defaults to UTC, which silently
	// mis-scans stored timestamps back into Go AND mis-converts time.Time
	// query args (e.g. a report's "now" bound) by the host's UTC offset —
	// wrong on read and wrong on write, not just a display quirk.
	return fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?parseTime=true&charset=utf8mb4&loc=Local",
		c.DBUser, c.DBPassword, c.DBHost, c.DBPort, c.DBName)
}

func getEnv(key, fallback string) string {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		return v
	}
	return fallback
}

func splitAndTrim(s, sep string) []string {
	parts := strings.Split(s, sep)
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			out = append(out, p)
		}
	}
	return out
}
