// Command api serves the public, admin and internal HTTP API and runs the newsletter outbox.
package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/Xnths/jvfd-cc/backend/internal/api"
	"github.com/Xnths/jvfd-cc/backend/internal/authn"
	"github.com/Xnths/jvfd-cc/backend/internal/config"
	"github.com/Xnths/jvfd-cc/backend/internal/newsletter"
	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	log := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	if err := run(log); err != nil {
		log.Error("api stopped", "err", err)
		os.Exit(1)
	}
}

func run(log *slog.Logger) error {
	cfg, err := config.LoadAPI()
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

	srv := &api.Server{
		Cfg: cfg, Pool: pool, Log: log, Now: time.Now,
		Verifier:  authn.NewRemoteVerifier(cfg.JWKSURL, cfg.Issuer, cfg.Audience),
		Turnstile: api.CFTurnstile{Secret: cfg.TurnstileSecret},
		Notify: &api.HTTPNotifier{RevalidateURL: cfg.RevalidateURL, Secret: cfg.RevalidateSecret,
			IndexNowKey: cfg.IndexNowKey, SiteURL: cfg.PublicBaseURL, Log: log},
	}

	if cfg.ResendAPIKey != "" {
		w := newsletter.NewWorker(pool, newsletter.Resend{APIKey: cfg.ResendAPIKey}, log, cfg.PublicBaseURL, srv.UnsubscribeToken)
		go w.Run(ctx, 30*time.Second)
	} else {
		log.Warn("RESEND_API_KEY not set: newsletter worker disabled (campaigns stay queued)")
	}

	httpSrv := &http.Server{
		Addr: cfg.Addr, Handler: srv.Routes(),
		ReadHeaderTimeout: 5 * time.Second, ReadTimeout: 30 * time.Second, WriteTimeout: 11 * time.Minute, IdleTimeout: 60 * time.Second,
	}
	go func() {
		<-ctx.Done()
		sctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()
		_ = httpSrv.Shutdown(sctx)
	}()
	log.Info("api listening", "addr", cfg.Addr)
	if err := httpSrv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		return err
	}
	return nil
}
