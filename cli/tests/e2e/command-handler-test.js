/**
 * 测试：CLI 命令处理器的静态验证
 * 不依赖 Electron 运行时
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('[TEST] Command Handler Static Validation');

// 1. 验证 electron.main.cjs 语法
console.log('\n[TEST] Checking electron.main.cjs syntax...');
const mainPath = path.resolve(__dirname, '../../../ui-desktop/electron.main.cjs');
const mainCode = fs.readFileSync(mainPath, 'utf8');

// 检查是否包含 command handler
assert(mainCode.includes("stateHost.registerHandler('command'"), 'Missing command handler registration');
assert(mainCode.includes('ui.window.shrinkToBall'), 'Missing shrinkToBall command');
assert(mainCode.includes('ui.window.restoreFromBall'), 'Missing restoreFromBall command');
console.log('  ✓ Command handler code present');

// 2. 验证 CLI 模块
console.log('\n[TEST] Checking CLI ui-control.js...');
const cliPath = path.resolve(__dirname, '../../src/modules/ui-control.js');
const cliCode = fs.readFileSync(cliPath, 'utf8');

assert(cliCode.includes('sendCommand'), 'Missing sendCommand function');
assert(cliCode.includes('ui.window.shrinkToBall'), 'Missing shrinkToBall in CLI');
assert(cliCode.includes('ui.window.restoreFromBall'), 'Missing restoreFromBall in CLI');
console.log('  ✓ CLI control module has required functions');

// 3. 验证语法
console.log('\n[TEST] Validating JavaScript syntax...');
try {
  new Function(cliCode);
  console.log('  ✓ ui-control.js syntax valid');
} catch (e) {
  console.error('  ✗ Syntax error:', e.message);
  process.exit(1);
}

console.log('\n[TEST] All static validations passed');
console.log('\n[TEST] Note: End-to-end test requires running Electron');
console.log('       Run manually: node cli/tests/e2e/ui-command-test.js');
console.log('\n========================================');
console.log('PASS: Command Handler Static Tests');
console.log('========================================');
