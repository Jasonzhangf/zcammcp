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
echo "[1/4] CLI Unit Tests..."
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
echo "[2/4] UI Desktop Unit Tests..."
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
echo "[3/4] UI Cycle E2E Tests..."
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

# Test 4: Coverage Gate (>= 95% line and branch)
echo "[4/4] Coverage Gate..."

COVERAGE_PASSED=true

# CLI Coverage
echo "  Checking CLI coverage..."
cd "$PROJECT_ROOT/cli"
if [ ! -f "scripts/generate-coverage.js" ]; then
    echo "  ✗ CLI coverage script not found"
    COVERAGE_PASSED=false
    PASSED=false
    FAILURES+=("CLI coverage script missing")
elif ! node scripts/generate-coverage.js 2>&1 | tee "$REPORT_DIR/cli-coverage.log"; then
    echo "  ✗ CLI coverage generation failed"
    COVERAGE_PASSED=false
    PASSED=false
    FAILURES+=("CLI coverage generation failed")
elif [ ! -f "coverage/coverage-summary.json" ]; then
    echo "  ✗ CLI coverage summary not found"
    COVERAGE_PASSED=false
    PASSED=false
    FAILURES+=("CLI coverage summary missing")
else
    # Parse coverage using node
    COVERAGE_RESULT=$(node -e "
        try {
            const data = require('./coverage/coverage-summary.json');
            const lines = data.total?.lines?.pct ?? 0;
            const branches = data.total?.branches?.pct ?? 0;
            console.log(JSON.stringify({ lines, branches, passed: lines >= 95 && branches >= 95 }));
        } catch (e) {
            console.log(JSON.stringify({ error: e.message, passed: false }));
        }
    ")
    
    if echo "$COVERAGE_RESULT" | grep -q '"passed":false'; then
        if echo "$COVERAGE_RESULT" | grep -q '"error"'; then
            echo "  ✗ CLI coverage JSON parse error"
            COVERAGE_PASSED=false
            PASSED=false
            FAILURES+=("CLI coverage JSON parse error")
        else
            CLI_LINE=$(echo "$COVERAGE_RESULT" | node -e "console.log(JSON.parse(require('fs').readFileSync(0, 'utf-8')).lines)")
            CLI_BRANCH=$(echo "$COVERAGE_RESULT" | node -e "console.log(JSON.parse(require('fs').readFileSync(0, 'utf-8')).branches)")
            echo "    Line coverage: ${CLI_LINE}%"
            echo "    Branch coverage: ${CLI_BRANCH}%"
            echo "  ✗ CLI coverage below 95% threshold"
            COVERAGE_PASSED=false
            PASSED=false
            FAILURES+=("CLI coverage below 95%: lines=${CLI_LINE}%, branches=${CLI_BRANCH}%")
        fi
    else
        CLI_LINE=$(echo "$COVERAGE_RESULT" | node -e "console.log(JSON.parse(require('fs').readFileSync(0, 'utf-8')).lines)")
        CLI_BRANCH=$(echo "$COVERAGE_RESULT" | node -e "console.log(JSON.parse(require('fs').readFileSync(0, 'utf-8')).branches)")
        echo "    Line coverage: ${CLI_LINE}%"
        echo "    Branch coverage: ${CLI_BRANCH}%"
        echo "    ✓ CLI coverage passed"
    fi
fi

# UI Coverage
echo "  Checking UI Desktop coverage..."
cd "$PROJECT_ROOT/ui-desktop"
if [ ! -f "scripts/generate-coverage.mjs" ]; then
    echo "  ✗ UI coverage script not found"
    COVERAGE_PASSED=false
    PASSED=false
    FAILURES+=("UI coverage script missing")
elif ! node scripts/generate-coverage.mjs 2>&1 | tee "$REPORT_DIR/ui-coverage.log"; then
    echo "  ✗ UI coverage generation failed"
    COVERAGE_PASSED=false
    PASSED=false
    FAILURES+=("UI coverage generation failed")
elif [ ! -f "coverage/coverage-summary.json" ]; then
    echo "  ✗ UI coverage summary not found"
    COVERAGE_PASSED=false
    PASSED=false
    FAILURES+=("UI coverage summary missing")
else
    # Parse coverage using node
    COVERAGE_RESULT=$(node -e "
        try {
            const data = require('./coverage/coverage-summary.json');
            const lines = data.total?.lines?.pct ?? 0;
            const branches = data.total?.branches?.pct ?? 0;
            console.log(JSON.stringify({ lines, branches, passed: lines >= 95 && branches >= 95 }));
        } catch (e) {
            console.log(JSON.stringify({ error: e.message, passed: false }));
        }
    ")
    
    if echo "$COVERAGE_RESULT" | grep -q '"passed":false'; then
        if echo "$COVERAGE_RESULT" | grep -q '"error"'; then
            echo "  ✗ UI coverage JSON parse error"
            COVERAGE_PASSED=false
            PASSED=false
            FAILURES+=("UI coverage JSON parse error")
        else
            UI_LINE=$(echo "$COVERAGE_RESULT" | node -e "console.log(JSON.parse(require('fs').readFileSync(0, 'utf-8')).lines)")
            UI_BRANCH=$(echo "$COVERAGE_RESULT" | node -e "console.log(JSON.parse(require('fs').readFileSync(0, 'utf-8')).branches)")
            echo "    Line coverage: ${UI_LINE}%"
            echo "    Branch coverage: ${UI_BRANCH}%"
            echo "  ✗ UI coverage below 95% threshold"
            COVERAGE_PASSED=false
            PASSED=false
            FAILURES+=("UI coverage below 95%: lines=${UI_LINE}%, branches=${UI_BRANCH}%")
        fi
    else
        UI_LINE=$(echo "$COVERAGE_RESULT" | node -e "console.log(JSON.parse(require('fs').readFileSync(0, 'utf-8')).lines)")
        UI_BRANCH=$(echo "$COVERAGE_RESULT" | node -e "console.log(JSON.parse(require('fs').readFileSync(0, 'utf-8')).branches)")
        echo "    Line coverage: ${UI_LINE}%"
        echo "    Branch coverage: ${UI_BRANCH}%"
        echo "    ✓ UI coverage passed"
    fi
fi

if [ "$COVERAGE_PASSED" = false ]; then
    echo ""
    echo "  ✗ Coverage gate failed"
else
    echo ""
    echo "  ✓ Coverage gate passed"
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
    "e2e": "$REPORT_DIR/e2e-test.log",
    "cli-coverage": "$REPORT_DIR/cli-coverage.log",
    "ui-coverage": "$REPORT_DIR/ui-coverage.log"
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
