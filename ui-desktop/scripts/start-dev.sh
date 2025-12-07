#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/.."

export NODE_ENV=development

echo "[开发模式] 启动 Vite 开发服务器"
npm run dev &
VITE_PID=$!

echo "[开发模式] 等待服务器启动..."
sleep 3

echo "[开发模式] 启动 Electron"
NODE_ENV=development npm run electron

# 清理
trap "kill $VITE_PID 2>/dev/null || true" EXIT
