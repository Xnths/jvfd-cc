#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

if [ -f "$PROJECT_ROOT/.env" ]; then
    set -a
    source "$PROJECT_ROOT/.env"
    set +a
else
    echo "$(date '+%Y-%m-%d %H:%M:%S') - ERRO: Arquivo .env não encontrado em $PROJECT_ROOT" >> "/tmp/healing-fallback.log"
    exit 1
fi
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$HEALTH_CHECK_URL")

if [ "$HTTP_CODE" != "200" ] && [ "$HTTP_CODE" != "308" ] && [ "$HTTP_CODE" != "301" ]; then
    
    echo "========================================" >> "$HEALING_LOG_FILE"
    echo "$(date '+%Y-%m-%d %H:%M:%S') - FALHA DETECTADA: HTTP $HTTP_CODE" >> "$HEALING_LOG_FILE"
    
    ACTIVE_CONTAINER=$(docker ps -a --format '{{.Names}}' | grep "$FRONTEND_CONTAINER_PREFIX")
    
    if [ -n "$ACTIVE_CONTAINER" ]; then
        echo "Reiniciando container ativo: $ACTIVE_CONTAINER" >> "$HEALING_LOG_FILE"
        docker restart "$ACTIVE_CONTAINER"
        
        docker restart "$NGINX_CONTAINER_NAME"
        
        echo "Self-healing executado com sucesso." >> "$HEALING_LOG_FILE"
    else
        echo "ERRO CRÍTICO: Nenhum container ${FRONTEND_CONTAINER_PREFIX}* encontrado!" >> "$HEALING_LOG_FILE"
    fi
fi