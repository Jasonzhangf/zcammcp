#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "$PROJECT_ROOT"

echo "\n[1键打包] 清理旧产物"
rm -rf dist dist-web release

if command -v npm >/dev/null 2>&1; then
  NPM_CMD="npm"
else
  echo "npm 不可用，请先安装 Node.js"
  exit 1
fi

if ! test -d node_modules; then
  echo "安装依赖"
  $NPM_CMD install
fi

echo "[1键打包] 构建 Web"
$NPM_CMD run build:web

if ! test -d dist-web; then
  echo "未找到 dist-web 目录，请确认 Vite 输出路径"
  exit 1
fi

echo "[1键打包] 编译 TypeScript"
$NPM_CMD run build

echo "[1键打包] 构建 Electron"
$NPM_CMD run build:electron

if ! test -f dist/electron.main.cjs; then
  echo "Electron 主进程构建失败: 未找到 dist/electron.main.cjs"
  exit 1
fi

echo "[1键打包] 打包 DMG"
$NPM_CMD run package

DMG_FILE=$(find release -name '*.dmg' -maxdepth 1 2>/dev/null | head -n 1)
if [ -n "$DMG_FILE" ]; then
  echo "\n✅ 打包完成: $DMG_FILE"
else
  echo "❌ 未找到 DMG 文件，请检查日志"
  exit 1
fi
