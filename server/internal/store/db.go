package store

import (
	"database/sql"
	"fmt"
	"strings"
	"time"

	_ "github.com/go-sql-driver/mysql"

	"heyfreak-server/internal/migrations"
)

type Store struct {
	db *sql.DB
}

func Open(dsn string) (*Store, error) {
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		return nil, fmt.Errorf("open db: %w", err)
	}
	db.SetMaxOpenConns(10)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("ping db: %w", err)
	}

	return &Store{db: db}, nil
}

func (s *Store) Close() error {
	return s.db.Close()
}

// Migrate applies the schema and (idempotently) the product seed data.
func (s *Store) Migrate() error {
	schema, err := migrations.FS.ReadFile("schema.sql")
	if err != nil {
		return fmt.Errorf("read schema.sql: %w", err)
	}
	if err := s.execScript(string(schema)); err != nil {
		return fmt.Errorf("apply schema: %w", err)
	}

	seed, err := migrations.FS.ReadFile("seed.sql")
	if err != nil {
		return fmt.Errorf("read seed.sql: %w", err)
	}
	if err := s.execScript(string(seed)); err != nil {
		return fmt.Errorf("apply seed: %w", err)
	}

	return nil
}

// execScript runs a semicolon-separated series of statements. Good enough
// for our own trusted migration files (no user input reaches this).
func (s *Store) execScript(script string) error {
	for _, stmt := range splitStatements(script) {
		stmt = strings.TrimSpace(stmt)
		if stmt == "" {
			continue
		}
		if _, err := s.db.Exec(stmt); err != nil {
			return fmt.Errorf("exec statement: %w\n%s", err, stmt)
		}
	}
	return nil
}

func splitStatements(script string) []string {
	var stmts []string
	var current []byte
	for i := 0; i < len(script); i++ {
		c := script[i]
		current = append(current, c)
		if c == ';' {
			stmts = append(stmts, string(current))
			current = nil
		}
	}
	if len(current) > 0 {
		stmts = append(stmts, string(current))
	}
	return stmts
}
