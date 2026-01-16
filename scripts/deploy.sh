#!/bin/bash

set -e

# Change to the project directory on the remote server
cd /var/www/jvfd-cc

echo "Starting deployment..."

echo "Pulling latest changes..."
git pull origin main

echo "Building Docker images..."
docker compose -f docker-compose/docker-compose.prod.yml down --remove-orphans
docker system prune --all -f
set -a
source .env
docker compose -f docker-compose/docker-compose.prod.yml build

echo "Restarting services..."
docker compose -f docker-compose/docker-compose.prod.yml up -d 2>&1 &

echo "Cleaning up unused images..."
docker image prune -f

echo "Deployment completed successfully!"
