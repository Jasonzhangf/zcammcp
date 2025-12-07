#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/.."

stop_pid() {
  local file="$1"
  if [[ -f "$file" ]]; then
    local pid
    pid=$(cat "$file")
    if kill -0 "$pid" >/dev/null 2>&1; then
      echo "[stop] killing $pid"
      kill "$pid" || true
    fi
    rm -f "$file"
  fi
}

stop_pid ".vite.pid"
stop_pid ".electron.pid"

# 兜底：杀掉 Electron / vite 进程
pkill -f "npm run electron" || true
pkill -f "npm run dev" || true

# 一点 grace period
sleep 1

# 枚举 electron/vite 余留进程
ps -ef | grep -E "(electron|vite|npm run dev)" | grep -v grep || true

echo "[stop] done"
