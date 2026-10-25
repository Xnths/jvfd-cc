package auth

import (
	"context"
	"errors"
	"sync"

	"github.com/coreos/go-oidc/v3/oidc"
	"golang.org/x/oauth2"
)

// Identity is the verified Google identity of the person logging in.
type Identity struct {
	Sub           string
	Email         string
	EmailVerified bool
	Name          string
	Picture       string
}

// Provider abstracts Google so the flow can be tested without the network.
type Provider interface {
	AuthURL(state, nonce, challenge string) string
	Exchange(ctx context.Context, code, verifier, nonce string) (Identity, error)
}

// Google implements Provider with OpenID Connect against accounts.google.com.
type Google struct {
	clientID string
	cfg      oauth2.Config
	once     sync.Once
	oidc     *oidc.Provider
	initErr  error
}

// NewGoogle builds the provider. Discovery happens lazily on first use.
func NewGoogle(clientID, clientSecret, redirectURL string) *Google {
	return &Google{
		clientID: clientID,
		cfg: oauth2.Config{
			ClientID: clientID, ClientSecret: clientSecret, RedirectURL: redirectURL,
			Endpoint: oauth2.Endpoint{
				AuthURL:  "https://accounts.google.com/o/oauth2/v2/auth",
				TokenURL: "https://oauth2.googleapis.com/token",
			},
			Scopes: []string{oidc.ScopeOpenID, "email", "profile"},
		},
	}
}

func (g *Google) AuthURL(state, nonce, challenge string) string {
	return g.cfg.AuthCodeURL(state,
		oauth2.SetAuthURLParam("nonce", nonce),
		oauth2.SetAuthURLParam("code_challenge", challenge),
		oauth2.SetAuthURLParam("code_challenge_method", "S256"),
		oauth2.SetAuthURLParam("prompt", "select_account"),
	)
}

func (g *Google) Exchange(ctx context.Context, code, verifier, nonce string) (Identity, error) {
	g.once.Do(func() { g.oidc, g.initErr = oidc.NewProvider(ctx, "https://accounts.google.com") })
	if g.initErr != nil {
		return Identity{}, g.initErr
	}
	tok, err := g.cfg.Exchange(ctx, code, oauth2.SetAuthURLParam("code_verifier", verifier))
	if err != nil {
		return Identity{}, err
	}
	raw, _ := tok.Extra("id_token").(string)
	if raw == "" {
		return Identity{}, errors.New("no id_token in response")
	}
	idt, err := g.oidc.Verifier(&oidc.Config{ClientID: g.clientID}).Verify(ctx, raw)
	if err != nil {
		return Identity{}, err
	}
	if idt.Nonce != nonce {
		return Identity{}, errors.New("nonce mismatch")
	}
	var claims struct {
		Email         string `json:"email"`
		EmailVerified bool   `json:"email_verified"`
		Name          string `json:"name"`
		Picture       string `json:"picture"`
	}
	if err := idt.Claims(&claims); err != nil {
		return Identity{}, err
	}
	return Identity{Sub: idt.Subject, Email: claims.Email, EmailVerified: claims.EmailVerified, Name: claims.Name, Picture: claims.Picture}, nil
}
