#!/bin/bash
# ZCAM UI Desktop - Push Gate Test Matrix Runner
# 运行完整测试矩阵并生成报告

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
REPORT_DIR="$PROJECT_ROOT/.test-reports"
COMMIT_SHA=$(git rev-parse --short HEAD)
REPORT_FILE="$REPORT_DIR/push-gate-$COMMIT_SHA.json"

mkdir -p "$REPORT_DIR"

echo "=========================================="
echo "ZCAM Push Gate Test Matrix"
echo "Commit: $COMMIT_SHA"
echo "Time: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "=========================================="
echo ""

PASSED=true
FAILURES=()

# Test 1: CLI Unit Tests
echo "[1/3] CLI Unit Tests..."
cd "$PROJECT_ROOT/cli"
if npm test 2>&1 | tee "$REPORT_DIR/cli-test.log"; then
    echo "  ✓ CLI tests passed"
else
    echo "  ✗ CLI tests failed"
    PASSED=false
    FAILURES+=("CLI unit tests failed")
fi
echo ""

# Test 2: UI Desktop Unit Tests
echo "[2/3] UI Desktop Unit Tests..."
cd "$PROJECT_ROOT/ui-desktop"
if npm test 2>&1 | tee "$REPORT_DIR/ui-test.log"; then
    echo "  ✓ UI tests passed"
else
    echo "  ✗ UI tests failed"
    PASSED=false
    FAILURES+=("UI Desktop unit tests failed")
fi
echo ""

# Test 3: UI Cycle E2E Tests
echo "[3/3] UI Cycle E2E Tests..."
cd "$PROJECT_ROOT/cli"
# 需要先启动 Electron 应用
# 检查是否已经运行
if ! pgrep -f "Electron" > /dev/null 2>&1; then
    echo "  启动 Electron 应用..."
    NODE_ENV=development npm run electron &
    ELECTRON_PID=$!
    sleep 10
fi

if npm start -- ui dev cycle --loop 10 --timeout 5000 2>&1 | tee "$REPORT_DIR/e2e-test.log"; then
    echo "  ✓ E2E tests passed"
else
    echo "  ✗ E2E tests failed"
    PASSED=false
    FAILURES+=("UI Cycle E2E tests failed")
fi
echo ""

# 生成报告
echo "=========================================="
echo "Test Matrix Summary"
echo "=========================================="

if [ "$PASSED" = true ]; then
    SUMMARY="All tests passed"
    echo "✓ $SUMMARY"
else
    SUMMARY="Tests failed: ${#FAILURES[@]}"
    echo "✗ $SUMMARY"
    for failure in "${FAILURES[@]}"; do
        echo "  - $failure"
    done
fi

# 写入 JSON 报告
cat > "$REPORT_FILE" << JSONEOF
{
  "commit": "$COMMIT_SHA",
  "timestamp": $(date +%s),
  "datetime": "$(date -u '+%Y-%m-%d %H:%M:%S UTC')",
  "passed": $PASSED,
  "summary": "$SUMMARY",
  "failures": [
$(for f in "${FAILURES[@]}"; do echo "    \"$f\","; done | sed '$ s/,$//')
  ],
  "reports": {
    "cli": "$REPORT_DIR/cli-test.log",
    "ui": "$REPORT_DIR/ui-test.log",
    "e2e": "$REPORT_DIR/e2e-test.log"
  }
}
JSONEOF

echo ""
echo "Report saved to: $REPORT_FILE"

if [ "$PASSED" = true ]; then
    echo ""
    echo "✓ Push gate passed. You may now push to remote."
    exit 0
else
    echo ""
    echo "✗ Push gate failed. Fix issues before pushing."
    exit 1
fi
