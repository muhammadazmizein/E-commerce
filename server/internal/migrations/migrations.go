// Package migrations embeds the SQL schema and seed data applied on startup.
package migrations

import "embed"

//go:embed schema.sql seed.sql
var FS embed.FS
