/**
 * 端到端测试：UI 命令执行
 * 测试 CLI → Electron 主进程 → 窗口状态变化 的完整链路
 */

const http = require('http');

const STATE_HOST_PORT = parseInt(process.env.ZCAM_STATE_PORT || '6224', 10);
const STATE_HOST_HOST = process.env.ZCAM_STATE_HOST || '127.0.0.1';

function requestJson(path, method = 'GET', payload) {
  return new Promise((resolve, reject) => {
    const body = payload ? JSON.stringify(payload) : null;
    const options = {
      hostname: STATE_HOST_HOST,
      port: STATE_HOST_PORT,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': body ? Buffer.byteLength(body) : 0,
      },
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data || '{}'));
        } catch (err) {
          reject(new Error(`invalid JSON: ${err.message}`));
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function sendCommand(command, params = {}) {
  const res = await requestJson('/command', 'POST', {
    channel: 'command',
    action: 'execute',
    payload: { command, params }
  });
  if (!res.ok) throw new Error(res.error);
  return res.result || res;
}

async function getWindowState() {
  const res = await requestJson('/state?channel=window', 'GET');
  return res.state || null;
}

async function testCommandList() {
  console.log('[TEST] command list...');
  
  const result = await requestJson('/command', 'POST', {
    channel: 'command',
    action: 'list',
    payload: {}
  });
  
  if (!result.ok) {
    throw new Error('List commands failed');
  }
  
  // 从 result.result.commands 获取列表
  const commands = result.result?.commands || [];
  const hasShrink = commands.some(c => c.id === 'ui.window.shrinkToBall');
  const hasRestore = commands.some(c => c.id === 'ui.window.restoreFromBall');
  
  if (!hasShrink || !hasRestore) {
    throw new Error('Missing expected commands in list');
  }
  
  console.log(`  ✓ Found ${commands.length} commands including shrink/restore`);
  return true;
}

async function testShrinkToBall() {
  console.log('[TEST] ui.window.shrinkToBall...');
  
  const result = await sendCommand('ui.window.shrinkToBall');
  if (!result.ok) {
    throw new Error(`shrinkToBall command failed: ${result.error}`);
  }
  console.log('  ✓ Command returned ok');
  
  await new Promise(r => setTimeout(r, 500));
  
  const state = await getWindowState();
  if (!state) throw new Error('Failed to get window state');
  if (state.mode !== 'ball') throw new Error(`Expected mode=ball, got mode=${state.mode}`);
  if (!state.ballVisible) throw new Error('Expected ballVisible=true');
  console.log('  ✓ Window state changed to ball mode');
  
  return true;
}

async function testRestoreFromBall() {
  console.log('[TEST] ui.window.restoreFromBall...');
  
  const result = await sendCommand('ui.window.restoreFromBall');
  if (!result.ok) {
    throw new Error(`restoreFromBall command failed: ${result.error}`);
  }
  console.log('  ✓ Command returned ok');
  
  await new Promise(r => setTimeout(r, 500));
  
  const state = await getWindowState();
  if (!state) throw new Error('Failed to get window state');
  if (state.mode !== 'main') throw new Error(`Expected mode=main, got mode=${state.mode}`);
  if (state.ballVisible) throw new Error('Expected ballVisible=false');
  console.log('  ✓ Window state changed to main mode');
  
  return true;
}

async function runTests() {
  console.log('=====================================');
  console.log('UI Command E2E Tests');
  console.log('=====================================\n');
  
  const tests = [
    { name: 'command list', fn: testCommandList },
    { name: 'shrink to ball', fn: testShrinkToBall },
    { name: 'restore from ball', fn: testRestoreFromBall },
  ];
  
  const results = [];
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      await test.fn();
      results.push({ name: test.name, status: 'PASS' });
      passed++;
    } catch (err) {
      console.error(`  ✗ ${err.message}`);
      results.push({ name: test.name, status: 'FAIL', error: err.message });
      failed++;
    }
    console.log('');
  }
  
  console.log('=====================================');
  console.log('Results:');
  results.forEach(r => {
    const icon = r.status === 'PASS' ? '✓' : '✗';
    const color = r.status === 'PASS' ? '\x1b[32m' : '\x1b[31m';
    console.log(`  ${color}${icon}\x1b[0m ${r.name}${r.error ? `: ${r.error}` : ''}`);
  });
  console.log('=====================================');
  console.log(`Total: ${passed} passed, ${failed} failed`);
  
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
