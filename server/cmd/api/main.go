package main

import (
	"log"
	"net/http"

	"heyfreak-server/internal/api"
	"heyfreak-server/internal/config"
	"heyfreak-server/internal/rajaongkir"
	"heyfreak-server/internal/store"
	"heyfreak-server/internal/xendit"
)

func main() {
	config.LoadDotEnv(".env")
	cfg := config.Load()

	db, err := store.Open(cfg.MySQLDSN())
	if err != nil {
		log.Fatalf("connect to database: %v", err)
	}
	defer db.Close()

	if err := db.Migrate(); err != nil {
		log.Fatalf("run migrations: %v", err)
	}
	log.Println("database ready")

	xd := xendit.New(cfg.XenditSecretKey, cfg.XenditWebhookToken)
	if !xd.Configured() {
		log.Println("warning: Xendit is not configured (XENDIT_SECRET_KEY missing) — online payment is disabled, COD still works")
	}

	ro := rajaongkir.New(cfg.RajaOngkirAPIKey, cfg.RajaOngkirOriginID)
	if !ro.Configured() {
		log.Println("warning: RajaOngkir is not configured (RAJAONGKIR_API_KEY/RAJAONGKIR_ORIGIN_CITY_ID missing) — falling back to flat-rate shipping")
	}

	router := api.New(db, xd, ro, cfg.AllowedOrigin, cfg.PublicAPIURL).Router(cfg.AllowedOrigin)

	log.Printf("heyfreak-server listening on :%s", cfg.Port)
	if err := http.ListenAndServe(":"+cfg.Port, router); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
