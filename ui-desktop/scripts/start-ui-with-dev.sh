#!/usr/bin/env bash
set -euo pipefail

# UI Desktop - 开发模式，包含 Dev Socket，供 CLI 观测和消息驱动测试

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/.."

echo "[UI Desktop] 开发模式：启动 Vite + Electron 并开启 Dev Socket"

# 启动 Vite 开发服务器
export NODE_ENV=development
npm run dev &
VITE_PID=$!

echo "[UI Desktop] 等待服务器启动..."
sleep 3

echo "[UI Desktop] 启动 Electron（包含 Dev Socket）..."
NODE_ENV=development npm run electron &
ELECTRON_PID=$!

# 保存进程 PID，方便后续调试或统一关掉
echo "$VITE_PID" > .vite.pid
echo "$ELECTRON_PID" > .electron.pid

echo "[UI Desktop] ✅ 已启动 (Dev Socket 开启在端口 ${ZCAM_UI_DEV_PORT:-})"
echo "──────────────"
echo "现在可用的 CLI 命令："
echo "  cd cli && npm start -- ui dev watch"
echo "  cd cli && npm start -- ui dev cycle --timeout 5000 --loop 10"
echo "  cd cli && npm start -- ui dev ping"
echo "──────────────"

# 可选：直接启动消息驱动回环测试"
echo "  cd cli && npm start -- ui dev cycle"
echo "──────────────"

# 方便统一关闭所有
echo "# 按 Ctrl+C 退出，或者跑 ./scripts/stop-ui-with-dev.sh"
echo "# 或手动: kill $VITE_PID && kill $ELECTRON_PID"
