#!/usr/bin/env bash
# ============================================================
# MedAssist AI — production deploy script.
#
# Run on the target server (or from CI over SSH — see
# .github/workflows/deploy.yml). Pulls the latest release branch,
# builds fresh images, and rolls the stack over with a health check
# before declaring success.
#
# Usage: ./scripts/deploy.sh [git-ref]   (defaults to origin/main)
# ============================================================
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

COMPOSE_FILE="docker-compose.prod.yml"
GIT_REF="${1:-origin/main}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1/api/health}"
HEALTH_RETRIES=15
HEALTH_INTERVAL=5

log() { printf '\n\033[1;34m==>\033[0m %s\n' "$1"; }
die() { printf '\033[1;31mERROR:\033[0m %s\n' "$1" >&2; exit 1; }

command -v docker >/dev/null 2>&1 || die "docker is not installed"
docker compose version >/dev/null 2>&1 || die "docker compose (v2 plugin) is required"

[ -f .env ] || die ".env not found — copy .env.example to .env and fill in real secrets first"

# ---------- 1. Pull latest code ----------
# This resets the working tree to exactly match $GIT_REF, discarding any
# local changes/commits. The deploy checkout must never carry ad-hoc edits —
# if you need a hotfix here, commit and push it, then redeploy.
log "Fetching and checking out ${GIT_REF}"
git fetch --all --prune
git checkout "${GIT_REF#origin/}" 2>/dev/null || git checkout -B "${GIT_REF#origin/}" "$GIT_REF"
git reset --hard "$GIT_REF"

# ---------- 2. Generate the MongoDB replica-set keyfile if missing ----------
# Never committed (see .gitignore) — internal cluster-auth secret, one per
# deployment. Must be exactly 400 (owner read-only) or mongod refuses it.
if [ ! -f mongo/mongo-keyfile ]; then
  log "Generating mongo/mongo-keyfile"
  mkdir -p mongo
  openssl rand -base64 756 > mongo/mongo-keyfile
  chmod 400 mongo/mongo-keyfile
fi

# ---------- 3. Build images ----------
log "Building Docker images"
docker compose -f "$COMPOSE_FILE" --env-file .env build --pull

# ---------- 4. Roll the stack over ----------
log "Starting the updated stack"
docker compose -f "$COMPOSE_FILE" --env-file .env up -d --remove-orphans

# ---------- 5. Wait for the backend to report healthy ----------
log "Waiting for ${HEALTH_URL} to respond"
attempt=0
until curl -fsS "$HEALTH_URL" >/dev/null 2>&1; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge "$HEALTH_RETRIES" ]; then
    log "Health check failed after ${HEALTH_RETRIES} attempts — showing recent backend logs"
    docker compose -f "$COMPOSE_FILE" logs --tail=100 backend
    die "Deployment failed health check; the previous containers are still running under their old image tags until you redeploy a known-good ref"
  fi
  sleep "$HEALTH_INTERVAL"
done

# ---------- 6. Clean up dangling images from previous builds ----------
log "Pruning dangling images"
docker image prune -f >/dev/null

log "Deployed $(git rev-parse --short HEAD) successfully"
