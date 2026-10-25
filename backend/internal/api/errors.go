package api

import (
	"errors"

	"github.com/jackc/pgx/v5/pgconn"
)

// isUnique reports a unique-constraint violation.
func isUnique(err error) bool {
	var pg *pgconn.PgError
	return errors.As(err, &pg) && pg.Code == "23505"
}

// isFKViolation reports a foreign-key violation.
func isFKViolation(err error) bool {
	var pg *pgconn.PgError
	return errors.As(err, &pg) && pg.Code == "23503"
}
