package auth

import (
	"github.com/Xnths/jvfd-cc/backend/internal/httpx"
	"github.com/golang-jwt/jwt/v5"
)

func registered(sub string) jwt.RegisteredClaims { return jwt.RegisteredClaims{Subject: sub} }

func ipHashOf(secret, v string) string { return httpx.HashIP(secret, v) }
