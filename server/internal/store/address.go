package store

import "fmt"

func (s *Store) ListAddresses(userID string) ([]Address, error) {
	rows, err := s.db.Query(
		`SELECT id, label, recipient_name, phone, address, city, postal_code, is_default
		 FROM addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC`,
		userID,
	)
	if err != nil {
		return nil, fmt.Errorf("query addresses: %w", err)
	}
	defer rows.Close()

	addresses := []Address{}
	for rows.Next() {
		var a Address
		if err := rows.Scan(&a.ID, &a.Label, &a.RecipientName, &a.Phone, &a.Address, &a.City, &a.PostalCode, &a.IsDefault); err != nil {
			return nil, fmt.Errorf("scan address: %w", err)
		}
		addresses = append(addresses, a)
	}
	return addresses, rows.Err()
}

func (s *Store) CreateAddress(userID string, input AddressInput) (Address, error) {
	if input.Label == "" || input.RecipientName == "" || input.Phone == "" ||
		input.Address == "" || input.City == "" || input.PostalCode == "" {
		return Address{}, validationError("semua field alamat wajib diisi")
	}

	id, err := newID()
	if err != nil {
		return Address{}, fmt.Errorf("generate address id: %w", err)
	}

	tx, err := s.db.Begin()
	if err != nil {
		return Address{}, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback()

	if input.IsDefault {
		if _, err := tx.Exec(`UPDATE addresses SET is_default = 0 WHERE user_id = ?`, userID); err != nil {
			return Address{}, fmt.Errorf("clear default addresses: %w", err)
		}
	}

	if _, err := tx.Exec(
		`INSERT INTO addresses (id, user_id, label, recipient_name, phone, address, city, postal_code, is_default)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		id, userID, input.Label, input.RecipientName, input.Phone, input.Address, input.City, input.PostalCode, input.IsDefault,
	); err != nil {
		return Address{}, fmt.Errorf("insert address: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return Address{}, fmt.Errorf("commit tx: %w", err)
	}

	return Address{
		ID: id, Label: input.Label, RecipientName: input.RecipientName, Phone: input.Phone,
		Address: input.Address, City: input.City, PostalCode: input.PostalCode, IsDefault: input.IsDefault,
	}, nil
}

func (s *Store) UpdateAddress(userID, addressID string, input AddressInput) error {
	if input.Label == "" || input.RecipientName == "" || input.Phone == "" ||
		input.Address == "" || input.City == "" || input.PostalCode == "" {
		return validationError("semua field alamat wajib diisi")
	}

	tx, err := s.db.Begin()
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback()

	if input.IsDefault {
		if _, err := tx.Exec(`UPDATE addresses SET is_default = 0 WHERE user_id = ?`, userID); err != nil {
			return fmt.Errorf("clear default addresses: %w", err)
		}
	}

	res, err := tx.Exec(
		`UPDATE addresses SET label = ?, recipient_name = ?, phone = ?, address = ?, city = ?, postal_code = ?, is_default = ?
		 WHERE id = ? AND user_id = ?`,
		input.Label, input.RecipientName, input.Phone, input.Address, input.City, input.PostalCode, input.IsDefault,
		addressID, userID,
	)
	if err != nil {
		return fmt.Errorf("update address: %w", err)
	}
	affected, err := res.RowsAffected()
	if err != nil {
		return fmt.Errorf("rows affected: %w", err)
	}
	if affected == 0 {
		return validationError("alamat tidak ditemukan")
	}

	return tx.Commit()
}

func (s *Store) DeleteAddress(userID, addressID string) error {
	_, err := s.db.Exec(`DELETE FROM addresses WHERE id = ? AND user_id = ?`, addressID, userID)
	return err
}
