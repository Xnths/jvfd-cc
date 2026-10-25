// Command migrate manages the database schema and one-off admin tasks.
//
//	migrate up|down|status        goose migrations (DATABASE_URL)
//	migrate keys generate <file>  create an Ed25519 signing key (PKCS#8 PEM, mode 0600)
//	migrate keys public <file>    print the PKIX public key of a private key file
//	migrate client create <id>    create a machine client; prints the secret once
//	migrate payload-import <dir> [--apply] [--refresh-content]   import a mongoexport directory (dry run unless --apply)
//	migrate verify-import <dir>              check every exported row exists in Postgres
package main

import (
	"context"
	"crypto/x509"
	"database/sql"
	"encoding/pem"
	"fmt"
	"os"

	"github.com/Xnths/jvfd-cc/backend/internal/auth"
	"github.com/Xnths/jvfd-cc/backend/internal/authn"
	"github.com/Xnths/jvfd-cc/backend/internal/importer"
	"github.com/Xnths/jvfd-cc/backend/migrations"
	"github.com/jackc/pgx/v5/pgxpool"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"
)

func main() {
	if err := run(os.Args[1:]); err != nil {
		fmt.Fprintln(os.Stderr, "error:", err)
		os.Exit(1)
	}
}

func run(args []string) error {
	if len(args) == 0 {
		return fmt.Errorf("usage: migrate up|down|status | keys generate|public <file> | client create <id>")
	}
	switch args[0] {
	case "up", "down", "status":
		return gooseCmd(args[0])
	case "keys":
		return keysCmd(args[1:])
	case "client":
		return clientCmd(args[1:])
	case "payload-import", "verify-import":
		return importCmd(args)
	}
	return fmt.Errorf("unknown command %q", args[0])
}

func gooseCmd(cmd string) error {
	url := os.Getenv("DATABASE_URL")
	if url == "" {
		return fmt.Errorf("DATABASE_URL is required")
	}
	db, err := sql.Open("pgx", url)
	if err != nil {
		return err
	}
	defer db.Close()
	goose.SetBaseFS(migrations.FS)
	if err := goose.SetDialect("postgres"); err != nil {
		return err
	}
	switch cmd {
	case "up":
		return goose.Up(db, ".")
	case "down":
		return goose.Down(db, ".")
	default:
		return goose.Status(db, ".")
	}
}

func keysCmd(args []string) error {
	if len(args) != 2 {
		return fmt.Errorf("usage: migrate keys generate|public <file>")
	}
	switch args[0] {
	case "generate":
		if _, err := os.Stat(args[1]); err == nil {
			return fmt.Errorf("%s already exists; refusing to overwrite a signing key", args[1])
		}
		_, pemBytes, err := authn.GenerateKey()
		if err != nil {
			return err
		}
		if err := os.WriteFile(args[1], pemBytes, 0o600); err != nil {
			return err
		}
		fmt.Println("wrote", args[1])
		return nil
	case "public":
		priv, err := authn.LoadPrivateKey(args[1])
		if err != nil {
			return err
		}
		der, err := x509.MarshalPKIXPublicKey(priv.Public())
		if err != nil {
			return err
		}
		return pem.Encode(os.Stdout, &pem.Block{Type: "PUBLIC KEY", Bytes: der})
	}
	return fmt.Errorf("unknown keys command %q", args[0])
}

func clientCmd(args []string) error {
	if len(args) != 2 || args[0] != "create" {
		return fmt.Errorf("usage: migrate client create <id>")
	}
	url := os.Getenv("DATABASE_URL")
	if url == "" {
		return fmt.Errorf("DATABASE_URL is required")
	}
	ctx := context.Background()
	pool, err := pgxpool.New(ctx, url)
	if err != nil {
		return err
	}
	defer pool.Close()
	secret := auth.RandomToken(32)
	_, err = pool.Exec(ctx,
		`INSERT INTO service_clients (client_id, secret_hash, scopes) VALUES ($1, $2, $3)
		 ON CONFLICT (client_id) DO UPDATE SET secret_hash = EXCLUDED.secret_hash, disabled = false`,
		args[1], auth.HashSecret(secret), []string{authn.ScopeJobs})
	if err != nil {
		return err
	}
	fmt.Printf("client_id=%s\nclient_secret=%s\n(store the secret now; it cannot be shown again)\n", args[1], secret)
	return nil
}

func importCmd(args []string) error {
	if len(args) < 2 {
		return fmt.Errorf("usage: migrate %s <export-dir> [--apply]", args[0])
	}
	url := os.Getenv("DATABASE_URL")
	if url == "" {
		return fmt.Errorf("DATABASE_URL is required")
	}
	ctx := context.Background()
	pool, err := pgxpool.New(ctx, url)
	if err != nil {
		return err
	}
	defer pool.Close()
	if args[0] == "verify-import" {
		problems, err := importer.Verify(ctx, pool, args[1])
		if err != nil {
			return err
		}
		for _, p := range problems {
			fmt.Println("PROBLEM:", p)
		}
		if len(problems) > 0 {
			return fmt.Errorf("%d problem(s)", len(problems))
		}
		fmt.Println("verify-import: OK")
		return nil
	}
	var opts importer.Options
	for _, a := range args[2:] {
		switch a {
		case "--apply":
			opts.Apply = true
		case "--refresh-content":
			opts.RefreshContent = true
		default:
			return fmt.Errorf("unknown flag %q", a)
		}
	}
	rep, err := importer.Run(ctx, pool, args[1], opts)
	if rep != nil {
		fmt.Print(rep)
	}
	return err
}
