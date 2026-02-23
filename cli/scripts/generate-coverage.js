#!/usr/bin/env node
/**
 * CLI 测试覆盖率报告生成器
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const COVERAGE_DIR = path.join(PROJECT_ROOT, 'coverage');

console.log('========================================');
console.log('CLI Test Coverage Report');
console.log('========================================\n');

if (!fs.existsSync(COVERAGE_DIR)) {
  fs.mkdirSync(COVERAGE_DIR, { recursive: true });
}

console.log('[1/2] Running tests with coverage...\n');
try {
  execSync('npm test -- --coverage --coverageDirectory=coverage', {
    cwd: PROJECT_ROOT,
    stdio: 'inherit'
  });
} catch (err) {
  console.error('\n✗ Test execution failed');
  process.exit(1);
}

console.log('\n========================================');
console.log('Coverage report generated:');
console.log('  - ' + path.join(COVERAGE_DIR, 'coverage-summary.json'));
console.log('  - ' + path.join(COVERAGE_DIR, 'lcov-report/index.html'));
console.log('========================================');
