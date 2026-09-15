package store

import (
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
)

var (
	ErrStaffEmailTaken        = errors.New("staff email already registered")
	ErrInvalidStaffCredential = errors.New("invalid staff email or password")
	// ErrStaffExists guards the public bootstrap endpoint: it only ever
	// creates the very first ("owner") staff account, so there's no
	// chicken-and-egg problem getting heyfreak-admin its first login.
	ErrStaffExists = errors.New("staff already bootstrapped")
)

var staffRoles = map[string]bool{"owner": true, "admin": true, "cashier": true, "warehouse": true}

const staffSessionTTL = 12 * time.Hour

func validStaffRole(role string) bool {
	return staffRoles[role]
}

func (s *Store) staffCount() (int, error) {
	var count int
	if err := s.db.QueryRow(`SELECT COUNT(*) FROM staff`).Scan(&count); err != nil {
		return 0, fmt.Errorf("count staff: %w", err)
	}
	return count, nil
}

func (s *Store) insertStaff(name, email, password, role string) (Staff, error) {
	name = strings.TrimSpace(name)
	email = strings.ToLower(strings.TrimSpace(email))
	if name == "" || email == "" || len(password) < 8 {
		return Staff{}, validationError("nama, email wajib diisi dan password minimal 8 karakter")
	}
	if !validStaffRole(role) {
		return Staff{}, validationError("role tidak dikenali")
	}

	var exists int
	if err := s.db.QueryRow(`SELECT COUNT(*) FROM staff WHERE email = ?`, email).Scan(&exists); err != nil {
		return Staff{}, fmt.Errorf("check existing staff email: %w", err)
	}
	if exists > 0 {
		return Staff{}, ErrStaffEmailTaken
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return Staff{}, fmt.Errorf("hash password: %w", err)
	}

	id, err := newID()
	if err != nil {
		return Staff{}, fmt.Errorf("generate staff id: %w", err)
	}

	if _, err := s.db.Exec(
		`INSERT INTO staff (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)`,
		id, name, email, string(hash), role,
	); err != nil {
		return Staff{}, fmt.Errorf("insert staff: %w", err)
	}

	return Staff{ID: id, Name: name, Email: email, Role: role, IsActive: true}, nil
}

// BootstrapOwner creates the very first staff account (role "owner"). Only
// succeeds while the staff table is empty — after that, new staff must be
// created by an already-authenticated owner/admin via CreateStaff.
func (s *Store) BootstrapOwner(input RegisterStaffInput) (Staff, string, error) {
	count, err := s.staffCount()
	if err != nil {
		return Staff{}, "", err
	}
	if count > 0 {
		return Staff{}, "", ErrStaffExists
	}

	staff, err := s.insertStaff(input.Name, input.Email, input.Password, "owner")
	if err != nil {
		return Staff{}, "", err
	}

	token, err := s.createStaffSession(staff.ID)
	if err != nil {
		return Staff{}, "", err
	}
	return staff, token, nil
}

// CreateStaff adds a new staff account. Callers must already have verified
// the requester is an owner/admin (see requireStaffRole in api/middleware.go).
func (s *Store) CreateStaff(input RegisterStaffInput) (Staff, error) {
	role := input.Role
	if role == "" {
		role = "cashier"
	}
	return s.insertStaff(input.Name, input.Email, input.Password, role)
}

func (s *Store) ListStaff() ([]Staff, error) {
	rows, err := s.db.Query(`SELECT id, name, email, role, is_active FROM staff ORDER BY name`)
	if err != nil {
		return nil, fmt.Errorf("query staff: %w", err)
	}
	defer rows.Close()

	staffList := []Staff{}
	for rows.Next() {
		var st Staff
		if err := rows.Scan(&st.ID, &st.Name, &st.Email, &st.Role, &st.IsActive); err != nil {
			return nil, fmt.Errorf("scan staff: %w", err)
		}
		staffList = append(staffList, st)
	}
	return staffList, rows.Err()
}

func (s *Store) SetStaffActive(id string, active bool) error {
	result, err := s.db.Exec(`UPDATE staff SET is_active = ? WHERE id = ?`, active, id)
	if err != nil {
		return fmt.Errorf("set staff active: %w", err)
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("set staff active: %w", err)
	}
	if affected == 0 {
		return sql.ErrNoRows
	}
	return nil
}

func (s *Store) UpdateStaffRole(id, role string) error {
	if !validStaffRole(role) {
		return validationError("role tidak dikenali")
	}
	result, err := s.db.Exec(`UPDATE staff SET role = ? WHERE id = ?`, role, id)
	if err != nil {
		return fmt.Errorf("update staff role: %w", err)
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("update staff role: %w", err)
	}
	if affected == 0 {
		return sql.ErrNoRows
	}
	return nil
}

func (s *Store) StaffLogin(input StaffLoginInput) (Staff, string, error) {
	email := strings.ToLower(strings.TrimSpace(input.Email))

	var st Staff
	var hash string
	row := s.db.QueryRow(`SELECT id, name, email, password_hash, role, is_active FROM staff WHERE email = ?`, email)
	if err := row.Scan(&st.ID, &st.Name, &st.Email, &hash, &st.Role, &st.IsActive); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Staff{}, "", ErrInvalidStaffCredential
		}
		return Staff{}, "", fmt.Errorf("lookup staff: %w", err)
	}
	if !st.IsActive {
		return Staff{}, "", ErrInvalidStaffCredential
	}

	if err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(input.Password)); err != nil {
		return Staff{}, "", ErrInvalidStaffCredential
	}

	token, err := s.createStaffSession(st.ID)
	if err != nil {
		return Staff{}, "", err
	}
	return st, token, nil
}

func (s *Store) createStaffSession(staffID string) (string, error) {
	token, err := newSessionToken()
	if err != nil {
		return "", fmt.Errorf("generate staff session token: %w", err)
	}
	if _, err := s.db.Exec(
		`INSERT INTO staff_sessions (token, staff_id, expires_at) VALUES (?, ?, ?)`,
		token, staffID, time.Now().Add(staffSessionTTL),
	); err != nil {
		return "", fmt.Errorf("insert staff session: %w", err)
	}
	return token, nil
}

func (s *Store) DeleteStaffSession(token string) error {
	_, err := s.db.Exec(`DELETE FROM staff_sessions WHERE token = ?`, token)
	return err
}

func (s *Store) StaffFromSession(token string) (Staff, error) {
	var st Staff
	row := s.db.QueryRow(
		`SELECT s.id, s.name, s.email, s.role, s.is_active FROM staff_sessions ss
		 JOIN staff s ON s.id = ss.staff_id
		 WHERE ss.token = ? AND ss.expires_at > NOW() AND s.is_active = 1`,
		token,
	)
	err := row.Scan(&st.ID, &st.Name, &st.Email, &st.Role, &st.IsActive)
	return st, err
}
