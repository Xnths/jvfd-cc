#!/bin/sh

echo "Installing dependencies..."
pnpm install

echo "Iniciando aplicação..."
pnpm run dev
