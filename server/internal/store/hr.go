package store

import "fmt"

type Shift struct {
	ID         int64  `json:"id"`
	StaffID    string `json:"staffId"`
	StaffName  string `json:"staffName,omitempty"`
	LocationID string `json:"locationId"`
	StartsAt   string `json:"startsAt"`
	EndsAt     string `json:"endsAt"`
}

type ShiftInput struct {
	StaffID    string `json:"staffId"`
	LocationID string `json:"locationId"`
	StartsAt   string `json:"startsAt"`
	EndsAt     string `json:"endsAt"`
}

func (s *Store) CreateShift(input ShiftInput) (Shift, error) {
	if input.StaffID == "" || input.LocationID == "" || input.StartsAt == "" || input.EndsAt == "" {
		return Shift{}, validationError("staff, lokasi, dan waktu mulai/selesai wajib diisi")
	}

	result, err := s.db.Exec(
		`INSERT INTO shifts (staff_id, location_id, starts_at, ends_at) VALUES (?, ?, ?, ?)`,
		input.StaffID, input.LocationID, input.StartsAt, input.EndsAt,
	)
	if err != nil {
		return Shift{}, fmt.Errorf("insert shift: %w", err)
	}
	id, err := result.LastInsertId()
	if err != nil {
		return Shift{}, fmt.Errorf("insert shift: %w", err)
	}

	return Shift{ID: id, StaffID: input.StaffID, LocationID: input.LocationID, StartsAt: input.StartsAt, EndsAt: input.EndsAt}, nil
}

// ListShifts returns upcoming/recent shifts across all staff, most recent
// start time first — heyfreak-admin shows this as a simple schedule table
// rather than a calendar view.
func (s *Store) ListShifts(limit int) ([]Shift, error) {
	if limit <= 0 || limit > 500 {
		limit = 100
	}
	rows, err := s.db.Query(
		`SELECT sh.id, sh.staff_id, st.name, sh.location_id, sh.starts_at, sh.ends_at
		 FROM shifts sh JOIN staff st ON st.id = sh.staff_id
		 ORDER BY sh.starts_at DESC LIMIT ?`,
		limit,
	)
	if err != nil {
		return nil, fmt.Errorf("query shifts: %w", err)
	}
	defer rows.Close()

	shifts := []Shift{}
	for rows.Next() {
		var sh Shift
		if err := rows.Scan(&sh.ID, &sh.StaffID, &sh.StaffName, &sh.LocationID, &sh.StartsAt, &sh.EndsAt); err != nil {
			return nil, fmt.Errorf("scan shift: %w", err)
		}
		shifts = append(shifts, sh)
	}
	return shifts, rows.Err()
}

func (s *Store) DeleteShift(id int64) error {
	_, err := s.db.Exec(`DELETE FROM shifts WHERE id = ?`, id)
	return err
}

// ListRegisterSessions is the cash-drawer audit trail heyfreak-admin's
// staff page shows — every open/close, who ran it, and how it reconciled.
func (s *Store) ListRegisterSessions(limit int) ([]RegisterSession, error) {
	if limit <= 0 || limit > 500 {
		limit = 50
	}
	rows, err := s.db.Query(
		`SELECT `+registerSessionColumns+` FROM register_sessions ORDER BY id DESC LIMIT ?`,
		limit,
	)
	if err != nil {
		return nil, fmt.Errorf("query register sessions: %w", err)
	}
	defer rows.Close()

	sessions := []RegisterSession{}
	for rows.Next() {
		rs, err := scanRegisterSession(rows)
		if err != nil {
			return nil, fmt.Errorf("scan register session: %w", err)
		}
		sessions = append(sessions, rs)
	}
	return sessions, rows.Err()
}
