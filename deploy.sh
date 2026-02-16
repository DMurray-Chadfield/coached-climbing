#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
IMAGE_REPO="${IMAGE_REPO:-tomtee/climbing-app}"
IMAGE_TAG="${IMAGE_TAG:-lastest}"
WEB_IMAGE="${WEB_IMAGE:-${IMAGE_REPO}:${IMAGE_TAG}}"

echo "Deploying image: ${WEB_IMAGE}"
export WEB_IMAGE

docker compose -f "${COMPOSE_FILE}" pull
docker compose -f "${COMPOSE_FILE}" up -d db web

docker compose -f "${COMPOSE_FILE}" exec -T web sh -lc 'prisma migrate deploy --schema=./prisma/schema.prisma'

docker compose -f "${COMPOSE_FILE}" up -d --remove-orphans
docker compose -f "${COMPOSE_FILE}" ps

echo "Deploy complete."
