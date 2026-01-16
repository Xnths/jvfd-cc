#!/bin/bash

timestamp=$(date +"%Y-%m-%d_%H-%M-%S")
logfile="logs_$timestamp.txt"

if [ "$1" = "dev" ]; then
    compose_file="docker-compose.test.yml"
    env_file=".env.local"
else
    compose_file="docker-compose.prod.yml"
    env_file=".env.prod"
fi

docker compose -f "$compose_file" down -v
docker system prune --all -f

docker compose -f "$compose_file" up --build >> "$logfile" 2>&1 &
compose_pid=$!

while kill -0 "$compose_pid" 2>/dev/null; do
    printf "\rExecutando deploy..."
    sleep 0.2
done

printf "\nDeploy finalizado.\n"
