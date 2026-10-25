// Command auth runs the Google-only authentication server.
package main

import (
	"context"
	"crypto/ed25519"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/Xnths/jvfd-cc/backend/internal/auth"
	"github.com/Xnths/jvfd-cc/backend/internal/authn"
	"github.com/Xnths/jvfd-cc/backend/internal/config"
	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	log := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	if err := run(log); err != nil {
		log.Error("auth server stopped", "err", err)
		os.Exit(1)
	}
}

func run(log *slog.Logger) error {
	cfg, err := config.LoadAuth()
	if err != nil {
		return err
	}
	priv, err := authn.LoadPrivateKey(cfg.JWTPrivateKeyFile)
	if err != nil {
		return err
	}
	var previous []ed25519.PublicKey
	if cfg.JWTPreviousPubFile != "" {
		p, err := authn.LoadPublicKey(cfg.JWTPreviousPubFile)
		if err != nil {
			return err
		}
		previous = append(previous, p)
	}
	sealer, err := auth.NewSealer(cfg.CookieSecret)
	if err != nil {
		return err
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	pool, err := pgxpool.New(ctx, cfg.DatabaseURL)
	if err != nil {
		return err
	}
	defer pool.Close()

	svc := &auth.Service{
		Cfg: cfg, Store: auth.NewPGStore(pool),
		Provider: auth.NewGoogle(cfg.GoogleClientID, cfg.GoogleClientSecret, cfg.RedirectURL),
		Signer:   authn.NewSigner(priv, cfg.Issuer, cfg.Audience, previous...),
		Sealer:   sealer, Now: time.Now,
	}
	srv := &http.Server{
		Addr: cfg.Addr, Handler: auth.NewHandler(svc, log).Routes(),
		ReadHeaderTimeout: 5 * time.Second, ReadTimeout: 15 * time.Second, WriteTimeout: 30 * time.Second, IdleTimeout: 60 * time.Second,
	}
	go func() {
		<-ctx.Done()
		sctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		_ = srv.Shutdown(sctx)
	}()
	log.Info("auth server listening", "addr", cfg.Addr, "admins", len(cfg.AdminEmails))
	if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		return err
	}
	return nil
}
