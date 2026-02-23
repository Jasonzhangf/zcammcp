/**
 * E2E Integration Tests: ui dev cycle --json
 * 真实执行 cycle 命令，通过 fake StateHost 覆盖成功/失败场景
 * 所有测试必须从 stdout 提取并成功 JSON.parse，否则测试失败
 */

const { spawn } = require('child_process');
const http = require('http');
const assert = require('assert');
const path = require('path');

describe('ui dev cycle --json E2E Integration', () => {
  const CLI_INDEX = path.resolve(__dirname, '../../src/index.js');
  const TEST_PORT = 16224;

  let fakeServer = null;
  let requestCount = 0;

  function startFakeServer(responses) {
    return new Promise((resolve, reject) => {
      requestCount = 0;
      const server = http.createServer((req, res) => {
        requestCount++;
        const response = responses.shift();
        if (response === undefined) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'No more mock responses' }));
        } else if (typeof response === 'string') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: response }));
        } else {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(response));
        }
      });

      server.listen(TEST_PORT, '127.0.0.1', () => {
        resolve(server);
      });
      
      server.on('error', reject);
    });
  }

  function stopFakeServer() {
    return new Promise((resolve) => {
      if (fakeServer) {
        fakeServer.close(() => resolve());
        fakeServer = null;
      } else {
        resolve();
      }
    });
  }

  function runCycle(args) {
    return new Promise((resolve, reject) => {
      const env = { 
        ...process.env, 
        ZCAM_STATE_PORT: String(TEST_PORT), 
        ZCAM_STATE_HOST: '127.0.0.1',
        NODE_ENV: 'test'
      };
      
      // Build args array: ui window cycle [options] --json
      // --json MUST be placed AFTER cycle subcommand and its options
      const allArgs = ['ui', 'window', 'cycle'];
      
      // Parse args and add them in correct order
      const argParts = args.split(' ').filter(a => a.trim());
      argParts.forEach(arg => allArgs.push(arg.trim()));
      
      // Add --json flag at the end (after loop/timeout options)
      allArgs.push('--json');
      
      const proc = spawn('node', [CLI_INDEX, ...allArgs], {
        env,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => { stdout += data.toString(); });
      proc.stderr.on('data', (data) => { stderr += data.toString(); });

      proc.on('close', (code) => {
        resolve({ stdout, stderr, exitCode: code });
      });

      proc.on('error', (err) => {
        reject(err);
      });
    });
  }

  function parseJsonOutput(stdout) {
    // Extract JSON from stdout (skip timer logs and other text)
    // Look for the JSON block that starts with { and contains "ok": true/false
    const jsonMatch = stdout.match(/\{[\s\S]*"ok"\s*:\s*(?:true|false)[\s\S]*\}/m);
    assert(jsonMatch, `Expected JSON output in stdout. Got:\n${stdout}`);
    
    let jsonOutput;
    assert.doesNotThrow(() => {
      jsonOutput = JSON.parse(jsonMatch[0]);
    }, `stdout should contain valid JSON. Got: ${jsonMatch[0]}`);
    
    return jsonOutput;
  }

  beforeEach(async () => {
    await stopFakeServer();
  });

  afterEach(async () => {
    await stopFakeServer();
  });

  describe('Full success scenario - one complete loop', () => {
    it('MUST output valid JSON with ok:true and exit(0)', async () => {
      fakeServer = await startFakeServer([
        // Request 1: shrinkToBall
        { ok: true, state: { mode: 'ball', ballVisible: true, lastBounds: { x: 100, y: 100, width: 100, height: 100 } } },
        // Request 2: state POST (after shrinkToBall)
        { ok: true },
        // Request 3: restoreFromBall - MUST include mode
        { ok: true, state: { mode: 'main', ballVisible: false } },
        // Request 4: state POST (after restoreFromBall)
        { ok: true },
        // Request 5: heartbeat check
        { ok: true, state: { heartbeats: { statusCard: { updated: true, ts: Date.now() } } } },
      ]);

      const result = await runCycle('--loop 1 --timeout 2000');

      // CRITICAL: Exit code MUST be 0
      assert.strictEqual(result.exitCode, 0, `Expected exit code 0, got ${result.exitCode}. stdout: ${result.stdout}`);

      // CRITICAL: MUST parse JSON from stdout
      const jsonOutput = parseJsonOutput(result.stdout);

      // CRITICAL: ok MUST be true
      assert.strictEqual(jsonOutput.ok, true, 'ok MUST be true for success');
      assert.strictEqual(jsonOutput.loop, 1, 'loop MUST be 1');
      assert.strictEqual(typeof jsonOutput.timeoutMs, 'number', 'timeoutMs MUST be number');
      assert.strictEqual(typeof jsonOutput.totalMs, 'number', 'totalMs MUST be number');
      assert(Array.isArray(jsonOutput.results), 'results MUST be array');
      assert.strictEqual(jsonOutput.results.length, 1, 'MUST have 1 result');

      // CRITICAL: Result structure
      const result1 = jsonOutput.results[0];
      assert.strictEqual(result1.status, 'pass', 'status MUST be pass');
      assert.strictEqual(typeof result1.durationMs, 'number', 'durationMs MUST be number');
      assert(result1.durationMs >= 0, 'durationMs MUST be >= 0');
    });
  });

  describe('Restore failure scenario', () => {
    it('MUST output valid JSON with ok:false, exit(1), and error field', async () => {
      fakeServer = await startFakeServer([
        // shrinkToBall success
        { ok: true, state: { mode: 'ball', ballVisible: true, lastBounds: { x: 100, y: 100, width: 100, height: 100 } } },
        // state POST
        { ok: true },
        // restoreFromBall failure
        'restore failed: window not found',
      ]);

      const result = await runCycle('--loop 1 --timeout 2000');

      // CRITICAL: Exit code MUST be 1
      assert.strictEqual(result.exitCode, 1, `Expected exit code 1, got ${result.exitCode}`);

      // CRITICAL: MUST parse JSON from stdout
      const jsonOutput = parseJsonOutput(result.stdout);

      // CRITICAL: ok MUST be false
      assert.strictEqual(jsonOutput.ok, false, 'ok MUST be false for failure');
      assert.strictEqual(jsonOutput.results.length, 1, 'MUST have 1 result');
      
      const result1 = jsonOutput.results[0];
      assert.strictEqual(result1.status, 'fail', 'status MUST be fail');
      assert.strictEqual(typeof result1.error, 'string', 'error MUST be string');
      assert(result1.error.length > 0, 'error MUST NOT be empty');
      assert.strictEqual(typeof result1.durationMs, 'number', 'durationMs MUST be number');
    });
  });

  describe('Heartbeat timeout scenario', () => {
    it('MUST output valid JSON with ok:false and exit(1) on timeout', async () => {
      fakeServer = await startFakeServer([
        // shrinkToBall success
        { ok: true, state: { mode: 'ball', ballVisible: true, lastBounds: { x: 100, y: 100, width: 100, height: 100 } } },
        // state POST
        { ok: true },
        // restoreFromBall success but no heartbeat
        { ok: true, state: { mode: 'main', ballVisible: false, heartbeats: {} } },
        // state POST
        { ok: true },
        // Multiple heartbeat checks that never return updated
        { ok: true, state: { heartbeats: {} } },
        { ok: true, state: { heartbeats: {} } },
        { ok: true, state: { heartbeats: {} } },
        { ok: true, state: { heartbeats: {} } },
        { ok: true, state: { heartbeats: {} } },
        { ok: true, state: { heartbeats: {} } },
        { ok: true, state: { heartbeats: {} } },
      ]);

      const result = await runCycle('--loop 1 --timeout 200');

      // CRITICAL: Exit code MUST be 1
      assert.strictEqual(result.exitCode, 1, `Expected exit code 1, got ${result.exitCode}`);

      // CRITICAL: MUST parse JSON from stdout
      const jsonOutput = parseJsonOutput(result.stdout);

      // CRITICAL: ok MUST be false
      assert.strictEqual(jsonOutput.ok, false, 'ok MUST be false for timeout');
      assert.strictEqual(jsonOutput.results[0].status, 'fail', 'status MUST be fail');
      assert(
        jsonOutput.results[0].error.includes('heartbeat') || jsonOutput.results[0].error.includes('timeout'),
        `error MUST mention heartbeat or timeout, got: ${jsonOutput.results[0].error}`
      );
      assert.strictEqual(typeof jsonOutput.results[0].durationMs, 'number', 'durationMs MUST be number');
    });
  });

  describe('Multi-loop success scenario', () => {
    it('MUST output valid JSON with 2 successful loop results', async () => {
      const responses = [
        // Loop 1: shrink
        { ok: true, state: { mode: 'ball', ballVisible: true, lastBounds: { x: 100, y: 100, width: 100, height: 100 } } },
        { ok: true },
        // Loop 1: restore
        { ok: true, state: { mode: 'main', ballVisible: false } },
        { ok: true },
        // Loop 1: heartbeat
        { ok: true, state: { heartbeats: { statusCard: { updated: true, ts: Date.now() } } } },
        // Loop 2: shrink
        { ok: true, state: { mode: 'ball', ballVisible: true, lastBounds: { x: 100, y: 100, width: 100, height: 100 } } },
        { ok: true },
        // Loop 2: restore
        { ok: true, state: { mode: 'main', ballVisible: false } },
        { ok: true },
        // Loop 2: heartbeat
        { ok: true, state: { heartbeats: { statusCard: { updated: true, ts: Date.now() } } } },
      ];
      
      fakeServer = await startFakeServer(responses);

      const result = await runCycle('--loop 2 --timeout 2000');

      // CRITICAL: Exit code MUST be 0
      assert.strictEqual(result.exitCode, 0, `Expected exit code 0, got ${result.exitCode}. stdout: ${result.stdout}`);

      // CRITICAL: MUST parse JSON from stdout
      const jsonOutput = parseJsonOutput(result.stdout);

      // CRITICAL: Validate structure
      assert.strictEqual(jsonOutput.ok, true, 'ok MUST be true');
      assert.strictEqual(jsonOutput.loop, 2, 'loop MUST be 2');
      assert.strictEqual(jsonOutput.results.length, 2, 'MUST have 2 results');

      // CRITICAL: Each result MUST have correct structure
      jsonOutput.results.forEach((r, i) => {
        assert.strictEqual(r.status, 'pass', `result ${i} status MUST be pass`);
        assert.strictEqual(typeof r.durationMs, 'number', `result ${i} durationMs MUST be number`);
        assert(r.durationMs >= 0, `result ${i} durationMs MUST be >= 0`);
      });

      // CRITICAL: totalMs MUST be >= sum of durations
      const sumDurations = jsonOutput.results.reduce((sum, r) => sum + r.durationMs, 0);
      assert(
        jsonOutput.totalMs >= sumDurations - 50,
        `totalMs (${jsonOutput.totalMs}) MUST be >= sum of durations (${sumDurations})`
      );
    });
  });

  describe('Partial failure in multi-loop', () => {
    it('MUST output valid JSON with ok:false when 2nd loop fails', async () => {
      fakeServer = await startFakeServer([
        // Loop 1: shrink
        { ok: true, state: { mode: 'ball', ballVisible: true, lastBounds: { x: 100, y: 100, width: 100, height: 100 } } },
        { ok: true },
        // Loop 1: restore
        { ok: true, state: { mode: 'main', ballVisible: false } },
        { ok: true },
        // Loop 1: heartbeat
        { ok: true, state: { heartbeats: { statusCard: { updated: true, ts: Date.now() } } } },
        // Loop 2: shrink fails
        'shrink failed: window busy',
      ]);

      const result = await runCycle('--loop 2 --timeout 2000');

      // CRITICAL: Exit code MUST be 1
      assert.strictEqual(result.exitCode, 1, `Expected exit code 1, got ${result.exitCode}`);

      // CRITICAL: MUST parse JSON from stdout
      const jsonOutput = parseJsonOutput(result.stdout);

      // CRITICAL: ok MUST be false
      assert.strictEqual(jsonOutput.ok, false, 'ok MUST be false');
      assert.strictEqual(jsonOutput.results.length, 2, 'MUST have 2 results');
      
      // CRITICAL: First loop passes, second fails
      assert.strictEqual(jsonOutput.results[0].status, 'pass', 'first loop MUST pass');
      assert.strictEqual(jsonOutput.results[1].status, 'fail', 'second loop MUST fail');
      assert(
        jsonOutput.results[1].error.length > 0,
        'second loop MUST have non-empty error'
      );
      assert.strictEqual(typeof jsonOutput.results[1].durationMs, 'number', 'durationMs MUST be number');
    });
  });
});
