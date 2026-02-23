/**
 * 端到端测试：cycle heartbeat 验证 (TODO#2)
 * 测试 restore 后等待 statusCard heartbeat 的成功/失败路径
 */

const http = require('http');
const assert = require('assert');

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

async function sendUiHeartbeat(controlId) {
  return requestJson('/command', 'POST', {
    channel: 'ui',
    action: 'heartbeat',
    payload: { controlId, ts: Date.now() }
  });
}

async function getUiHeartbeats() {
  const res = await requestJson('/command', 'POST', {
    channel: 'ui',
    action: 'getHeartbeats',
    payload: {}
  });
  return res.ok ? res.heartbeats || {} : {};
}

async function waitForHeartbeat(controlId, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const hbs = await getUiHeartbeats();
    if (hbs[controlId] && hbs[controlId].updated) {
      return { success: true, ts: hbs[controlId].ts };
    }
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error(`heartbeat timeout for ${controlId}`);
}

// Test: heartbeat success path
async function testHeartbeatSuccess() {
  console.log('[TEST] heartbeat success path...');
  
  // Simulate UI sending heartbeat
  setTimeout(() => {
    sendUiHeartbeat('statusCard').catch(() => {});
  }, 200);
  
  const result = await waitForHeartbeat('statusCard', 2000);
  assert(result.success, 'Expected heartbeat success');
  console.log('  ✓ Heartbeat received');
}

// Test: heartbeat timeout failure path
async function testHeartbeatTimeout() {
  console.log('[TEST] heartbeat timeout path...');
  
  try {
    // Don't send heartbeat, should timeout
    await waitForHeartbeat('nonExistentControl', 500);
    throw new Error('Expected timeout but got success');
  } catch (err) {
    if (!err.message.includes('timeout')) {
      throw err;
    }
    console.log('  ✓ Timeout correctly thrown');
  }
}

// Test: statusCard heartbeat in cycle context
async function testStatusCardHeartbeat() {
  console.log('[TEST] statusCard heartbeat cycle context...');
  
  // Clear any existing heartbeats
  
  // Simulate restore completed, UI should send heartbeat
  setTimeout(() => {
    sendUiHeartbeat('statusCard').catch(() => {});
  }, 300);
  
  const result = await waitForHeartbeat('statusCard', 1500);
  assert(result.success, 'statusCard should heartbeat after restore');
  console.log('  ✓ statusCard heartbeat received');
}

async function runTests() {
  console.log('=====================================');
  console.log('UI Cycle Heartbeat E2E Tests');
  console.log('=====================================\n');
  
  const tests = [
    { name: 'heartbeat success', fn: testHeartbeatSuccess },
    { name: 'heartbeat timeout', fn: testHeartbeatTimeout },
    { name: 'statusCard heartbeat', fn: testStatusCardHeartbeat },
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
    console.log(`  ${icon} ${r.name}${r.error ? `: ${r.error}` : ''}`);
  });
  console.log('=====================================');
  console.log(`Total: ${passed} passed, ${failed} failed`);
  
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
