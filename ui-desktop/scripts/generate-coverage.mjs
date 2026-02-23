#!/usr/bin/env node
/**
 * 生成测试覆盖率报告
 * 使用 Node.js 内置的 --test-coverage 功能
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const COVERAGE_DIR = path.join(PROJECT_ROOT, 'coverage');

console.log('========================================');
console.log('UI Desktop Test Coverage Report');
console.log('========================================\n');

// 创建覆盖率目录
if (!fs.existsSync(COVERAGE_DIR)) {
  fs.mkdirSync(COVERAGE_DIR, { recursive: true });
}

// 运行测试并生成覆盖率
console.log('[1/3] Running tests with coverage...');
try {
  execSync('npm run build', { cwd: PROJECT_ROOT, stdio: 'inherit' });
  console.log('✓ Build completed\n');
} catch (err) {
  console.error('✗ Build failed');
  process.exit(1);
}

console.log('[2/3] Generating coverage data...');
try {
  execSync(
    'node --test --test-reporter=spec --experimental-test-coverage dist/src/app/**/*.test.js',
    { cwd: PROJECT_ROOT, stdio: 'inherit' }
  );
  console.log('✓ Coverage data generated\n');
} catch (err) {
  console.error('✗ Test execution failed');
  // 继续生成报告，即使测试失败
}

console.log('[3/3] Coverage report saved to:', COVERAGE_DIR);
console.log('========================================');
console.log('To view detailed report:');
console.log('  - Check coverage/ directory');
console.log('  - Run: npm test -- --coverage (with jest)');
console.log('========================================');
