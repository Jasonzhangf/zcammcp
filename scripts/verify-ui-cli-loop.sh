#!/bin/bash
# 验证 UI-CLI 命令闭环
set -e

echo "========================================"
echo "UI-CLI Loop Verification"
echo "========================================"
echo ""

# 1. TypeScript 编译
echo "[1/4] TypeScript Build..."
cd ui-desktop
npm run build
echo "  ✓ TypeScript build passed"

# 2. CLI 单元测试
echo ""
echo "[2/4] CLI Unit Tests..."
cd ../cli
npm test -- --testPathPatterns=uvc-service --passWithNoTests
echo "  ✓ CLI tests passed"

# 3. 静态验证
echo ""
echo "[3/4] Command Handler Static Validation..."
node tests/e2e/command-handler-test.js
echo "  ✓ Static validation passed"

# 4. 语法检查
echo ""
echo "[4/4] JavaScript Syntax Check..."
node -c src/modules/ui-control.js
node -c src/modules/ui.js
echo "  ✓ Syntax check passed"

echo ""
echo "========================================"
echo "PASS: All verification steps completed"
echo "========================================"
echo ""
echo "Note: E2E test requires running Electron"
echo "Manual E2E test:"
echo "  1. cd ui-desktop && npm run electron"
echo "  2. In another terminal:"
echo "     cd cli && node tests/e2e/ui-command-test.js"
