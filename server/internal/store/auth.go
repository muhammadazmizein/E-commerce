package store

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
)

var (
	ErrEmailTaken        = errors.New("email already registered")
	ErrInvalidCredential = errors.New("invalid email or password")
)

const sessionTTL = 30 * 24 * time.Hour

func newID() (string, error) {
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return hex.EncodeToString(buf), nil
}

func newSessionToken() (string, error) {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return hex.EncodeToString(buf), nil
}

func (s *Store) RegisterUser(input RegisterInput) (User, string, error) {
	name := strings.TrimSpace(input.Name)
	email := strings.ToLower(strings.TrimSpace(input.Email))
	if name == "" || email == "" || len(input.Password) < 8 {
		return User{}, "", validationError("nama, email wajib diisi dan password minimal 8 karakter")
	}

	var exists int
	if err := s.db.QueryRow(`SELECT COUNT(*) FROM users WHERE email = ?`, email).Scan(&exists); err != nil {
		return User{}, "", fmt.Errorf("check existing email: %w", err)
	}
	if exists > 0 {
		return User{}, "", ErrEmailTaken
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		return User{}, "", fmt.Errorf("hash password: %w", err)
	}

	id, err := newID()
	if err != nil {
		return User{}, "", fmt.Errorf("generate user id: %w", err)
	}

	if _, err := s.db.Exec(
		`INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)`,
		id, name, email, string(hash),
	); err != nil {
		return User{}, "", fmt.Errorf("insert user: %w", err)
	}

	token, err := s.createSession(id)
	if err != nil {
		return User{}, "", err
	}

	return User{ID: id, Name: name, Email: email}, token, nil
}

func (s *Store) LoginUser(input LoginInput) (User, string, error) {
	email := strings.ToLower(strings.TrimSpace(input.Email))

	var user User
	var hash string
	row := s.db.QueryRow(`SELECT id, name, email, password_hash FROM users WHERE email = ?`, email)
	if err := row.Scan(&user.ID, &user.Name, &user.Email, &hash); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return User{}, "", ErrInvalidCredential
		}
		return User{}, "", fmt.Errorf("lookup user: %w", err)
	}

	if err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(input.Password)); err != nil {
		return User{}, "", ErrInvalidCredential
	}

	token, err := s.createSession(user.ID)
	if err != nil {
		return User{}, "", err
	}

	return user, token, nil
}

func (s *Store) createSession(userID string) (string, error) {
	token, err := newSessionToken()
	if err != nil {
		return "", fmt.Errorf("generate session token: %w", err)
	}

	if _, err := s.db.Exec(
		`INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)`,
		token, userID, time.Now().Add(sessionTTL),
	); err != nil {
		return "", fmt.Errorf("insert session: %w", err)
	}

	return token, nil
}

func (s *Store) DeleteSession(token string) error {
	_, err := s.db.Exec(`DELETE FROM sessions WHERE token = ?`, token)
	return err
}

func (s *Store) UserFromSession(token string) (User, error) {
	var user User
	row := s.db.QueryRow(
		`SELECT u.id, u.name, u.email FROM sessions s
		 JOIN users u ON u.id = s.user_id
		 WHERE s.token = ? AND s.expires_at > NOW()`,
		token,
	)
	err := row.Scan(&user.ID, &user.Name, &user.Email)
	return user, err
}
