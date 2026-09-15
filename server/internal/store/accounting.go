package store

import (
	"database/sql"
	"fmt"
	"strings"
)

type Account struct {
	Code string `json:"code"`
	Name string `json:"name"`
	Type string `json:"type"`
}

type JournalLine struct {
	AccountCode string `json:"accountCode"`
	AccountName string `json:"accountName,omitempty"`
	Debit       int    `json:"debit"`
	Credit      int    `json:"credit"`
}

type JournalEntry struct {
	ID            int64         `json:"id"`
	Memo          string        `json:"memo"`
	ReferenceType string        `json:"referenceType,omitempty"`
	ReferenceID   string        `json:"referenceId,omitempty"`
	CreatedAt     string        `json:"createdAt"`
	Lines         []JournalLine `json:"lines"`
}

type TrialBalanceRow struct {
	AccountCode string `json:"accountCode"`
	AccountName string `json:"accountName"`
	Type        string `json:"type"`
	Debit       int    `json:"debit"`
	Credit      int    `json:"credit"`
}

// postJournalEntryTx is the only way journal_entries get written — every
// entry must balance, and (reference_type, reference_id) is unique so a
// caller can safely post the same business event twice (e.g. a payment
// webhook firing again) without double-booking it.
func postJournalEntryTx(tx *sql.Tx, memo, referenceType, referenceID string, lines []JournalLine) error {
	if referenceType != "" && referenceID != "" {
		var exists int
		if err := tx.QueryRow(
			`SELECT COUNT(*) FROM journal_entries WHERE reference_type = ? AND reference_id = ?`,
			referenceType, referenceID,
		).Scan(&exists); err != nil {
			return fmt.Errorf("check existing journal entry: %w", err)
		}
		if exists > 0 {
			return nil
		}
	}

	debitSum, creditSum := 0, 0
	for _, l := range lines {
		debitSum += l.Debit
		creditSum += l.Credit
	}
	if debitSum != creditSum {
		return fmt.Errorf("unbalanced journal entry %q: debit %d != credit %d", memo, debitSum, creditSum)
	}

	var refTypeArg, refIDArg any
	if referenceType != "" {
		refTypeArg = referenceType
	}
	if referenceID != "" {
		refIDArg = referenceID
	}

	result, err := tx.Exec(
		`INSERT INTO journal_entries (memo, reference_type, reference_id) VALUES (?, ?, ?)`,
		memo, refTypeArg, refIDArg,
	)
	if err != nil {
		return fmt.Errorf("insert journal entry: %w", err)
	}
	entryID, err := result.LastInsertId()
	if err != nil {
		return fmt.Errorf("insert journal entry: %w", err)
	}

	for _, l := range lines {
		if _, err := tx.Exec(
			`INSERT INTO journal_lines (entry_id, account_code, debit, credit) VALUES (?, ?, ?, ?)`,
			entryID, l.AccountCode, l.Debit, l.Credit,
		); err != nil {
			return fmt.Errorf("insert journal line: %w", err)
		}
	}
	return nil
}

// postSaleRevenueJournal records simplified cash-basis revenue for a paid
// sale (online or POS): Dr Kas, Cr Pendapatan Penjualan. There's no COGS/
// inventory posting here — products don't carry a cost basis beyond what a
// purchase order records, so this stays "basic" cash-basis accounting
// rather than full accrual costing.
func postSaleRevenueJournal(tx *sql.Tx, orderID string, total int) error {
	if total <= 0 {
		return nil
	}
	return postJournalEntryTx(tx, "Penjualan "+orderID, "order", orderID, []JournalLine{
		{AccountCode: "1000", Debit: total},
		{AccountCode: "4000", Credit: total},
	})
}

// postInventoryReceiptJournal records Dr Persediaan, Cr Utang Usaha for one
// purchase-order receiving event. receiptRef must be unique per call (a PO
// can be received in several partial batches, each its own entry).
func postInventoryReceiptJournal(tx *sql.Tx, poID, receiptRef string, value int) error {
	if value <= 0 {
		return nil
	}
	return postJournalEntryTx(tx, "Penerimaan barang "+poID, "purchase_order_receipt", receiptRef, []JournalLine{
		{AccountCode: "1200", Debit: value},
		{AccountCode: "2000", Credit: value},
	})
}

func (s *Store) ListAccounts() ([]Account, error) {
	rows, err := s.db.Query(`SELECT code, name, type FROM accounts ORDER BY code`)
	if err != nil {
		return nil, fmt.Errorf("query accounts: %w", err)
	}
	defer rows.Close()

	accounts := []Account{}
	for rows.Next() {
		var a Account
		if err := rows.Scan(&a.Code, &a.Name, &a.Type); err != nil {
			return nil, fmt.Errorf("scan account: %w", err)
		}
		accounts = append(accounts, a)
	}
	return accounts, rows.Err()
}

// TrialBalance sums every posted debit/credit per account — asset/expense
// accounts read naturally as a debit balance, liability/equity/revenue as
// a credit balance, matching standard trial-balance presentation.
func (s *Store) TrialBalance() ([]TrialBalanceRow, error) {
	rows, err := s.db.Query(
		`SELECT a.code, a.name, a.type, COALESCE(SUM(jl.debit), 0), COALESCE(SUM(jl.credit), 0)
		 FROM accounts a
		 LEFT JOIN journal_lines jl ON jl.account_code = a.code
		 GROUP BY a.code, a.name, a.type
		 ORDER BY a.code`,
	)
	if err != nil {
		return nil, fmt.Errorf("query trial balance: %w", err)
	}
	defer rows.Close()

	result := []TrialBalanceRow{}
	for rows.Next() {
		var row TrialBalanceRow
		if err := rows.Scan(&row.AccountCode, &row.AccountName, &row.Type, &row.Debit, &row.Credit); err != nil {
			return nil, fmt.Errorf("scan trial balance row: %w", err)
		}
		result = append(result, row)
	}
	return result, rows.Err()
}

func (s *Store) ListJournalEntries(limit int) ([]JournalEntry, error) {
	if limit <= 0 || limit > 500 {
		limit = 100
	}

	rows, err := s.db.Query(
		`SELECT id, memo, COALESCE(reference_type,''), COALESCE(reference_id,''), created_at
		 FROM journal_entries ORDER BY id DESC LIMIT ?`,
		limit,
	)
	if err != nil {
		return nil, fmt.Errorf("query journal entries: %w", err)
	}
	defer rows.Close()

	entries := []JournalEntry{}
	ids := []int64{}
	for rows.Next() {
		var e JournalEntry
		if err := rows.Scan(&e.ID, &e.Memo, &e.ReferenceType, &e.ReferenceID, &e.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan journal entry: %w", err)
		}
		e.Lines = []JournalLine{}
		entries = append(entries, e)
		ids = append(ids, e.ID)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if len(ids) == 0 {
		return entries, nil
	}

	placeholders := strings.TrimSuffix(strings.Repeat("?,", len(ids)), ",")
	args := make([]any, len(ids))
	for i, id := range ids {
		args[i] = id
	}

	linesByEntry := make(map[int64][]JournalLine, len(ids))
	lineRows, err := s.db.Query(
		`SELECT jl.entry_id, jl.account_code, a.name, jl.debit, jl.credit
		 FROM journal_lines jl JOIN accounts a ON a.code = jl.account_code
		 WHERE jl.entry_id IN (`+placeholders+`)
		 ORDER BY jl.id`,
		args...,
	)
	if err != nil {
		return nil, fmt.Errorf("query journal lines: %w", err)
	}
	defer lineRows.Close()

	for lineRows.Next() {
		var entryID int64
		var l JournalLine
		if err := lineRows.Scan(&entryID, &l.AccountCode, &l.AccountName, &l.Debit, &l.Credit); err != nil {
			return nil, fmt.Errorf("scan journal line: %w", err)
		}
		linesByEntry[entryID] = append(linesByEntry[entryID], l)
	}
	if err := lineRows.Err(); err != nil {
		return nil, err
	}

	for i := range entries {
		if lines, ok := linesByEntry[entries[i].ID]; ok {
			entries[i].Lines = lines
		}
	}
	return entries, nil
}
