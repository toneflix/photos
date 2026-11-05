#!/usr/bin/env bash
# Runs on the API server. Installs, builds and migrates a release, points
# `current` at it, restarts the API and rolls back if the health check fails.
#
# Usage: deploy-api.sh deploy <release> | deploy-api.sh rollback
# Environment: DEPLOY_PATH, SKIP_MIGRATIONS, KEEP_RELEASES, PM2_NAME, RESTART_COMMAND

set -euo pipefail

ACTION="${1:-deploy}"
RELEASE="${2:-}"
DEPLOY_PATH="${DEPLOY_PATH:-/var/www/api.music.toneflix.net}"
SKIP_MIGRATIONS="${SKIP_MIGRATIONS:-false}"
KEEP_RELEASES="${KEEP_RELEASES:-5}"
PM2_NAME="${PM2_NAME:-toneflix-photos-api}"
RELEASES="$DEPLOY_PATH/releases"
SHARED="$DEPLOY_PATH/shared"
CURRENT="$DEPLOY_PATH/current"
API_DIR="$CURRENT/apps/api"

export NODE_ENV=production
export CI=true

log() { printf '\n==> %s\n' "$*"; }

pnpm_cmd() {
  if command -v pnpm >/dev/null 2>&1; then pnpm "$@"; else corepack pnpm "$@"; fi
}

switch_to() {
  ln -sfn "$RELEASES/$1" "$DEPLOY_PATH/current.next"
  mv -Tf "$DEPLOY_PATH/current.next" "$CURRENT"
}

restart_api() {
  log "Restarting the API"

  if [ -n "${RESTART_COMMAND:-}" ]; then
    (cd "$API_DIR" && bash -c "$RESTART_COMMAND")
    return
  fi

  if pm2 describe "$PM2_NAME" >/dev/null 2>&1; then
    pm2 reload "$PM2_NAME" --update-env
  else
    pm2 start "$API_DIR/dist/server.js" --name "$PM2_NAME" --cwd "$API_DIR" --time
  fi

  pm2 save >/dev/null
}

healthy() {
  local port
  port="$(grep -E '^APP_PORT=' "$SHARED/.env" | tail -n1 | cut -d= -f2 | tr -d '"'"'"' ')"
  port="${port:-3000}"

  for _ in $(seq 1 15); do
    if curl -fsS "http://127.0.0.1:$port/api" >/dev/null 2>&1; then return 0; fi
    sleep 2
  done

  return 1
}

previous_release() {
  local active
  active="$(basename "$(readlink -f "$CURRENT")")"
  find "$RELEASES" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | sort | awk -v a="$active" '$0 < a' | tail -n1
}

prune_releases() {
  local active
  active="$(basename "$(readlink -f "$CURRENT")")"
  find "$RELEASES" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | sort | head -n "-$KEEP_RELEASES" | awk -v a="$active" '$0 != a' | while read -r old; do
    rm -rf "${RELEASES:?}/$old"
  done
}

link_shared() {
  local dir="$RELEASES/$1/apps/api"

  if [ ! -f "$SHARED/.env" ]; then
    echo "Missing $SHARED/.env. Create it from apps/api/.env.example before deploying." >&2
    exit 1
  fi

  if [ ! -d "$SHARED/storage" ]; then
    cp -a "$dir/storage" "$SHARED/storage"
  fi

  rm -rf "$dir/storage"
  ln -s "$SHARED/storage" "$dir/storage"
  ln -sfn "$SHARED/.env" "$dir/.env"
}

deploy() {
  local dir="$RELEASES/$RELEASE"
  local previous=""

  [ -n "$RELEASE" ] || { echo "No release name given." >&2; exit 1; }
  [ -L "$CURRENT" ] && previous="$(basename "$(readlink -f "$CURRENT")")"

  log "Unpacking $RELEASE"
  mkdir -p "$dir" "$SHARED"
  tar -xzf "$RELEASES/$RELEASE.tar.gz" -C "$dir"
  rm -f "$RELEASES/$RELEASE.tar.gz"
  link_shared "$RELEASE"

  log "Installing dependencies"
  (cd "$dir" && pnpm_cmd install --frozen-lockfile --filter '@photos/api...')

  log "Building"
  (cd "$dir/apps/api" && pnpm_cmd exec ark build)

  if [ "$SKIP_MIGRATIONS" = "true" ]; then
    log "Skipping migrations"
  else
    log "Running migrations"
    (cd "$dir/apps/api" && pnpm_cmd exec ark migrate --no-interaction)
  fi

  log "Switching current to $RELEASE"
  switch_to "$RELEASE"
  restart_api

  if ! healthy; then
    echo "Health check failed for $RELEASE." >&2

    if [ -n "$previous" ]; then
      log "Rolling back to $previous"
      switch_to "$previous"
      restart_api
    fi

    exit 1
  fi

  prune_releases
  log "Deployed $RELEASE"
}

rollback() {
  local target
  target="$(previous_release)"

  [ -n "$target" ] || { echo "There is no earlier release to roll back to." >&2; exit 1; }

  log "Rolling back to $target"
  switch_to "$target"
  restart_api
  healthy || { echo "Health check failed after rollback." >&2; exit 1; }
  log "Rolled back to $target"
}

case "$ACTION" in
  deploy) deploy ;;
  rollback) rollback ;;
  *) echo "Unknown action: $ACTION" >&2; exit 1 ;;
esac
