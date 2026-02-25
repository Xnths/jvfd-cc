#!/bin/bash

set -e

PROJECT_DIR="/var/www/jvfd-cc"
COMPOSE_FILE="docker-compose/docker-compose.prod.yml"
NGINX_CONF_DIR="nginx/conf.d"

cd "$PROJECT_DIR"

git config --global --add safe.directory "$PROJECT_DIR"

echo "Starting zero-downtime deployment..."

echo "Pulling latest changes..."
git pull origin main

if [ -f ".env" ]; then
    set -a
    source .env
    set +a
else
    echo "Erro: Arquivo .env não encontrado!"
    exit 1
fi

echo "Ensuring supporting services (nginx, mongo) are up..."
docker compose -f "$COMPOSE_FILE" up -d mongo clinic-nginx

NETWORK_NAME=$(docker network ls --format '{{.Name}}' | grep 'cloudflare-net' | head -n1)
if [ -z "$NETWORK_NAME" ]; then
    echo "Erro: Rede cloudflare-net não encontrada!"
    exit 1
fi
echo "Using network: $NETWORK_NAME"

if docker ps --format '{{.Names}}' | grep -q "clinic-frontend-blue"; then
    ACTIVE_COLOR="blue"
    NEW_COLOR="green"
else
    ACTIVE_COLOR="green"
    NEW_COLOR="blue"
fi

echo "Active environment: $ACTIVE_COLOR. Deploying to: $NEW_COLOR."

echo "Building $NEW_COLOR image..."
docker build \
    --build-arg NEXT_PUBLIC_GA_ID="$NEXT_PUBLIC_GA_ID" \
    --build-arg DATABASE_URI="$DATABASE_URI" \
    --build-arg PAYLOAD_SECRET="$PAYLOAD_SECRET" \
    -t "clinic-frontend:$NEW_COLOR" \
    -f Dockerfile .

echo "Starting $NEW_COLOR container..."
docker rm -f "clinic-frontend-$NEW_COLOR" 2>/dev/null || true

docker run -d \
    --name "clinic-frontend-$NEW_COLOR" \
    --network "$NETWORK_NAME" \
    --restart always \
    -e NODE_ENV=production \
    -e NEXT_TELEMETRY_DISABLED=1 \
    -e DATABASE_URI="$DATABASE_URI" \
    -e PAYLOAD_SECRET="$PAYLOAD_SECRET" \
    -e NEXT_PUBLIC_GA_ID="$NEXT_PUBLIC_GA_ID" \
    -v jvfd-cc_media-data:/app/media \
    "clinic-frontend:$NEW_COLOR"

echo "Performing health check on $NEW_COLOR container..."
MAX_RETRIES=10
COUNT=0
HEALTHY=false

while [ $COUNT -lt $MAX_RETRIES ]; do
    if docker run --rm --network "$NETWORK_NAME" curlimages/curl -s -f "http://clinic-frontend-$NEW_COLOR:3000" > /dev/null; then
        HEALTHY=true
        break
    fi
    echo "Waiting for container to be ready... ($((COUNT+1))/$MAX_RETRIES)"
    sleep 3
    COUNT=$((COUNT+1))
done

if [ "$HEALTHY" = false ]; then
    echo "ERRO: Health check falhou para o container $NEW_COLOR!"
    echo "Logs do container falho:"
    docker logs "clinic-frontend-$NEW_COLOR" | tail -n 20
    echo "Limpando container falho..."
    docker rm -f "clinic-frontend-$NEW_COLOR"
    exit 1
fi

echo "Health check passed!"

echo "Switching Nginx to $NEW_COLOR..."
cp "$NGINX_CONF_DIR/$NEW_COLOR.conf" "$NGINX_CONF_DIR/default.conf"
docker exec clinic-nginx nginx -s reload

echo "Traffic switched to $NEW_COLOR."

echo "Stopping $ACTIVE_COLOR container..."
docker stop "clinic-frontend-$ACTIVE_COLOR" 2>/dev/null || true
docker rm "clinic-frontend-$ACTIVE_COLOR" 2>/dev/null || true
docker system prune -f

echo "Deployment completed successfully! Zero downtime achieved."
