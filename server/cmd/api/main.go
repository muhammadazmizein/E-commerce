package main

import (
	"log"
	"net/http"

	"heyfreak-server/internal/api"
	"heyfreak-server/internal/config"
	"heyfreak-server/internal/midtrans"
	"heyfreak-server/internal/rajaongkir"
	"heyfreak-server/internal/store"
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

	mt := midtrans.New(cfg.MidtransServerKey, cfg.MidtransClientKey, cfg.MidtransIsProduction)
	if !mt.Configured() {
		log.Println("warning: Midtrans is not configured (MIDTRANS_SERVER_KEY missing) — online payment is disabled, COD still works")
	} else if mt.IsProduction {
		log.Println("Midtrans running in PRODUCTION mode — real payments will be processed")
	} else {
		log.Println("Midtrans running in sandbox mode")
	}

	ro := rajaongkir.New(cfg.RajaOngkirAPIKey, cfg.RajaOngkirOriginID)
	if !ro.Configured() {
		log.Println("warning: RajaOngkir is not configured (RAJAONGKIR_API_KEY/RAJAONGKIR_ORIGIN_CITY_ID missing) — falling back to flat-rate shipping")
	}

	router := api.New(db, mt, ro, cfg.AllowedOrigin).Router(cfg.AllowedOrigin)

	log.Printf("heyfreak-server listening on :%s", cfg.Port)
	if err := http.ListenAndServe(":"+cfg.Port, router); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
