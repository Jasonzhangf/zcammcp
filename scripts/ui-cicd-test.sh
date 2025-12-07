#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
UI_DESKTOP="$REPO_ROOT/ui-desktop"
CLI_DIR="$REPO_ROOT/cli"
PORT=${ZCAM_UI_DEV_PORT:-6223}
TIMEOUT=${UI_TEST_TIMEOUT:-5000}

start_ui() {
  echo "[ui-test] Building UI Desktop..."
  (cd "$UI_DESKTOP" && npm run build >/dev/null)
  (cd "$UI_DESKTOP" && npm run build:electron >/dev/null)

  echo "[ui-test] Starting Vite + Electron (Dev Socket)"
  (cd "$UI_DESKTOP" && NODE_ENV=development ./scripts/start-ui-with-dev.sh) >/tmp/ui-test-start.log 2>&1 &
  START_PID=$!
  echo "$START_PID" > "$UI_DESKTOP/.ui-test-starter.pid"

  echo "[ui-test] Waiting for socket port $PORT..."
  for i in {1..60}; do
    if nc -z localhost "$PORT" >/dev/null 2>&1; then
      echo "[ui-test] Dev socket ready"
      return 0
    fi
    sleep 1
  done
  echo "[ui-test] Dev socket not ready (timeout)" >&2
  return 1
}

run_cycle() {
  echo "[ui-test] Running cycle test (timeout=$TIMEOUT ms)"
  (cd "$CLI_DIR" && npm start -- ui dev cycle --timeout "$TIMEOUT")
}

stop_ui() {
  echo "[ui-test] Stopping UI"
  (cd "$UI_DESKTOP" && ./scripts/stop-ui-with-dev.sh) || true
  if [[ -f "$UI_DESKTOP/.ui-test-starter.pid" ]]; then
    kill "$(cat "$UI_DESKTOP/.ui-test-starter.pid")" >/dev/null 2>&1 || true
    rm -f "$UI_DESKTOP/.ui-test-starter.pid"
  fi
}

trap stop_ui EXIT

start_ui
run_cycle
