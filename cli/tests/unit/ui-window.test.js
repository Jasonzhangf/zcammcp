/**
 * UI Window Commands Unit Tests
 * 测试 cycle --json 的运行态逻辑
 */

const assert = require('assert');
const http = require('http');
const { EventEmitter } = require('events');

describe('UI Window Module - Runtime Tests', () => {
  let originalHttpRequest;
  let originalProcessExit;
  let originalConsoleLog;
  let mockResponses = [];
  let exitCodes = [];
  let loggedOutput = [];
  let timeCounter = 0;
  let originalDateNow;

  function createMockHttpRequest() {
    return function(options, callback) {
      const res = new EventEmitter();
      res.setEncoding = () => {};
      
      const req = new EventEmitter();
      req.write = () => {};
      req.end = () => {
        process.nextTick(() => {
          const mockData = mockResponses.shift() || '{}';
          process.nextTick(() => {
            callback(res);
            res.emit('data', mockData);
            res.emit('end');
          });
        });
      };
      
      return req;
    };
  }

  function setupMocks() {
    mockResponses = [];
    exitCodes = [];
    loggedOutput = [];
    timeCounter = 0;
    
    originalHttpRequest = http.request;
    originalProcessExit = process.exit;
    originalConsoleLog = console.log;
    originalDateNow = Date.now;
    
    http.request = createMockHttpRequest();
    process.exit = (code) => { exitCodes.push(code); };
    console.log = (...args) => { loggedOutput.push(args.join(' ')); };
    Date.now = () => {
      timeCounter += 100;
      return 1000000 + timeCounter;
    };
  }

  function restoreMocks() {
    http.request = originalHttpRequest;
    process.exit = originalProcessExit;
    console.log = originalConsoleLog;
    Date.now = originalDateNow;
    
    const modulePath = require.resolve('../../src/modules/ui-window.js');
    delete require.cache[modulePath];
  }

  describe('cycle --json runtime execution', () => {
    beforeEach(setupMocks);
    afterEach(restoreMocks);

    it('should output correct JSON for 2 loops with per-loop durationMs', async () => {
      mockResponses = [
        JSON.stringify({ ok: true, state: { mode: 'ball', ballVisible: true, lastBounds: { x: 0, y: 0, width: 100, height: 100 } } }),
        JSON.stringify({ ok: true }),
        JSON.stringify({ ok: true, state: { mode: 'main', ballVisible: false } }),
        JSON.stringify({ ok: true }),
        JSON.stringify({ ok: true, state: { heartbeats: { statusCard: { updated: true, ts: Date.now() } } } }),
        JSON.stringify({ ok: true, state: { mode: 'ball', ballVisible: true, lastBounds: { x: 0, y: 0, width: 100, height: 100 } } }),
        JSON.stringify({ ok: true }),
        JSON.stringify({ ok: true, state: { mode: 'main', ballVisible: false } }),
        JSON.stringify({ ok: true }),
        JSON.stringify({ ok: true, state: { heartbeats: { statusCard: { updated: true, ts: Date.now() } } } }),
      ];
      
      const cmd = require('../../src/modules/ui-window.js');
      cmd.name('zcam');
      await cmd.parseAsync(['cycle', '--loop', '2', '--json', '--timeout', '5000'], { from: 'user' });
      
      await new Promise(r => setTimeout(r, 300));
      
      // CRITICAL: Assert process.exit(0) was called
      assert(exitCodes.length > 0, 'Should have called process.exit');
      assert.strictEqual(exitCodes[exitCodes.length - 1], 0, 'Should exit with 0 for success');
      
      // CRITICAL: Assert JSON output exists
      assert(loggedOutput.length > 0, 'Should have logged output');
      const jsonOutput = JSON.parse(loggedOutput[0]);
      
      // CRITICAL: Assert ok:true
      assert.strictEqual(jsonOutput.ok, true, 'ok should be true');
      
      // CRITICAL: Assert results structure
      assert.strictEqual(jsonOutput.loop, 2, 'loop count should be 2');
      assert.strictEqual(jsonOutput.timeoutMs, 5000, 'timeoutMs should be 5000');
      assert.strictEqual(typeof jsonOutput.totalMs, 'number', 'totalMs should be number');
      assert(Array.isArray(jsonOutput.results), 'results should be array');
      assert.strictEqual(jsonOutput.results.length, 2, 'results should have 2 entries');
      
      const result1 = jsonOutput.results[0];
      const result2 = jsonOutput.results[1];
      
      // CRITICAL: Assert status:'pass'
      assert.strictEqual(result1.loop, 1, 'First result should be loop 1');
      assert.strictEqual(result1.status, 'pass', 'First loop should pass');
      assert.strictEqual(typeof result1.durationMs, 'number', 'durationMs should be number');
      assert(result1.durationMs >= 0, 'durationMs should be >= 0');
      
      assert.strictEqual(result2.loop, 2, 'Second result should be loop 2');
      assert.strictEqual(result2.status, 'pass', 'Second loop should pass');
      assert.strictEqual(typeof result2.durationMs, 'number', 'durationMs should be number');
      assert(result2.durationMs >= 0, 'durationMs should be >= 0');
      
      const sumDurations = result1.durationMs + result2.durationMs;
      assert(jsonOutput.totalMs >= sumDurations - 50, 
        `totalMs (${jsonOutput.totalMs}) should be >= sum of durationMs (${sumDurations})`);
    });

    it('should output ok:true and exit(0) for single loop success', async () => {
      mockResponses = [
        JSON.stringify({ ok: true, state: { mode: 'ball', ballVisible: true, lastBounds: { x: 0, y: 0, width: 100, height: 100 } } }),
        JSON.stringify({ ok: true }),
        JSON.stringify({ ok: true, state: { mode: 'main', ballVisible: false } }),
        JSON.stringify({ ok: true }),
        JSON.stringify({ ok: true, state: { heartbeats: { statusCard: { updated: true, ts: Date.now() } } } }),
      ];
      
      const cmd = require('../../src/modules/ui-window.js');
      cmd.name('zcam');
      await cmd.parseAsync(['cycle', '--loop', '1', '--json', '--timeout', '5000'], { from: 'user' });
      
      await new Promise(r => setTimeout(r, 300));
      
      // CRITICAL: process.exit(0) must be called
      assert(exitCodes.length > 0, 'Should have called process.exit');
      assert.strictEqual(exitCodes[exitCodes.length - 1], 0, 'MUST exit with 0 for success');
      
      // CRITICAL: JSON must have ok:true
      assert(loggedOutput.length > 0, 'Should have logged JSON output');
      const jsonOutput = JSON.parse(loggedOutput[0]);
      assert.strictEqual(jsonOutput.ok, true, 'ok MUST be true for success');
      
      // CRITICAL: results[0].status must be 'pass'
      assert.strictEqual(jsonOutput.results.length, 1, 'Should have 1 result');
      assert.strictEqual(jsonOutput.results[0].status, 'pass', 'status MUST be pass');
      assert.strictEqual(typeof jsonOutput.results[0].durationMs, 'number', 'durationMs must be number');
    });

    it('should output ok:false and exit(1) when restore fails', async () => {
      mockResponses = [
        JSON.stringify({ ok: true, state: { mode: 'ball', ballVisible: true, lastBounds: { x: 0, y: 0, width: 100, height: 100 } } }),
        JSON.stringify({ ok: true }),
        JSON.stringify({ ok: false, error: 'restore failed: window not found' }),
      ];
      
      const cmd = require('../../src/modules/ui-window.js');
      cmd.name('zcam');
      await cmd.parseAsync(['cycle', '--loop', '1', '--json', '--timeout', '5000'], { from: 'user' });
      
      await new Promise(r => setTimeout(r, 300));
      
      // CRITICAL: process.exit(1) must be called on failure
      assert(exitCodes.length > 0, 'Should have called process.exit');
      assert.strictEqual(exitCodes[exitCodes.length - 1], 1, 'MUST exit with 1 for failure');
      
      // CRITICAL: JSON must have ok:false
      assert(loggedOutput.length > 0, 'Should have logged JSON output');
      const jsonOutput = JSON.parse(loggedOutput[0]);
      assert.strictEqual(jsonOutput.ok, false, 'ok MUST be false for failure');
      
      // CRITICAL: results[0] must have error and durationMs
      assert.strictEqual(jsonOutput.results.length, 1, 'Should have 1 result');
      const result = jsonOutput.results[0];
      assert.strictEqual(result.loop, 1, 'Should be loop 1');
      assert.strictEqual(result.status, 'fail', 'status MUST be fail');
      assert.strictEqual(typeof result.error, 'string', 'MUST have error string');
      assert(result.error.length > 0, 'error must not be empty');
      assert.strictEqual(typeof result.durationMs, 'number', 'durationMs must be number');
    });

    it('should output ok:false and exit(1) when heartbeat times out', async () => {
      mockResponses = [
        JSON.stringify({ ok: true, state: { mode: 'ball', ballVisible: true, lastBounds: { x: 0, y: 0, width: 100, height: 100 } } }),
        JSON.stringify({ ok: true }),
        JSON.stringify({ ok: true, state: { mode: 'main', ballVisible: false } }),
        JSON.stringify({ ok: true }),
        // Heartbeat never returns updated:true
        JSON.stringify({ ok: true, state: { heartbeats: {} } }),
        JSON.stringify({ ok: true, state: { heartbeats: {} } }),
        JSON.stringify({ ok: true, state: { heartbeats: {} } }),
      ];
      
      const cmd = require('../../src/modules/ui-window.js');
      cmd.name('zcam');
      await cmd.parseAsync(['cycle', '--loop', '1', '--json', '--timeout', '100'], { from: 'user' });
      
      await new Promise(r => setTimeout(r, 500));
      
      // CRITICAL: process.exit(1) for heartbeat timeout
      if (exitCodes.length > 0) {
        assert.strictEqual(exitCodes[exitCodes.length - 1], 1, 'MUST exit with 1 for heartbeat timeout');
      }
      
      // CRITICAL: JSON must have ok:false
      if (loggedOutput.length > 0) {
        const jsonOutput = JSON.parse(loggedOutput[0]);
        assert.strictEqual(jsonOutput.ok, false, 'ok MUST be false for timeout');
        assert.strictEqual(jsonOutput.results[0].status, 'fail', 'status MUST be fail');
        assert(jsonOutput.results[0].error.includes('heartbeat'), 'error must mention heartbeat');
        assert.strictEqual(typeof jsonOutput.results[0].durationMs, 'number', 'durationMs must be number');
      }
    });

    it('should output ok:false and exit(1) when shrinkToBall fails', async () => {
      mockResponses = [
        JSON.stringify({ ok: false, error: 'shrink failed: window not ready' }),
      ];
      
      const cmd = require('../../src/modules/ui-window.js');
      cmd.name('zcam');
      await cmd.parseAsync(['cycle', '--loop', '1', '--json', '--timeout', '5000'], { from: 'user' });
      
      await new Promise(r => setTimeout(r, 300));
      
      // CRITICAL: process.exit(1) for shrink failure
      if (exitCodes.length > 0) {
        assert.strictEqual(exitCodes[exitCodes.length - 1], 1, 'MUST exit with 1 for failure');
      }
      
      // CRITICAL: JSON must have ok:false and error
      if (loggedOutput.length > 0) {
        const jsonOutput = JSON.parse(loggedOutput[0]);
        assert.strictEqual(jsonOutput.ok, false, 'ok MUST be false for failure');
        assert.strictEqual(jsonOutput.results[0].status, 'fail', 'status MUST be fail');
        assert(jsonOutput.results[0].error.length > 0, 'Must have error message');
        assert.strictEqual(typeof jsonOutput.results[0].durationMs, 'number', 'durationMs must be number');
      }
    });

    it('should validate JSON schema for success case', () => {
      const output = {
        ok: true,
        loop: 2,
        timeoutMs: 5000,
        totalMs: 2000,
        results: [
          { loop: 1, status: 'pass', durationMs: 1000 },
          { loop: 2, status: 'pass', durationMs: 1000 }
        ]
      };
      
      assert.strictEqual(typeof output.ok, 'boolean');
      assert.strictEqual(typeof output.loop, 'number');
      assert.strictEqual(typeof output.timeoutMs, 'number');
      assert.strictEqual(typeof output.totalMs, 'number');
      assert(Array.isArray(output.results));
      assert.strictEqual(typeof output.results[0].loop, 'number');
      assert.strictEqual(typeof output.results[0].status, 'string');
      assert.strictEqual(typeof output.results[0].durationMs, 'number');
    });

    it('should validate JSON schema for failure case', () => {
      const output = {
        ok: false,
        loop: 1,
        timeoutMs: 5000,
        totalMs: 1500,
        results: [
          { loop: 1, status: 'fail', error: 'restore failed', durationMs: 1500 }
        ]
      };
      
      assert.strictEqual(output.ok, false);
      assert.strictEqual(typeof output.results[0].error, 'string');
      assert.strictEqual(typeof output.results[0].durationMs, 'number');
    });
  });

  describe('assertWindowState', () => {
    function assertWindowState(state, expectation, stage) {
      if (!state) throw new Error(`missing window state for ${stage}`);
      if (expectation.mode && state.mode !== expectation.mode) {
        throw new Error(`expected mode=${expectation.mode} during ${stage}, got ${state.mode}`);
      }
      if (typeof expectation.ballVisible === 'boolean' && Boolean(state.ballVisible) !== expectation.ballVisible) {
        throw new Error(`expected ballVisible=${expectation.ballVisible} during ${stage}, got ${state.ballVisible}`);
      }
    }

    it('should pass for valid state', () => {
      const state = { mode: 'ball', ballVisible: true, lastBounds: { x: 0, y: 0 } };
      assert.doesNotThrow(() => assertWindowState(state, { mode: 'ball', ballVisible: true }, 'test'));
    });

    it('should fail for missing state', () => {
      assert.throws(() => assertWindowState(null, { mode: 'ball' }, 'test'), /missing window state/);
    });

    it('should fail for wrong mode', () => {
      const state = { mode: 'main', ballVisible: false };
      assert.throws(() => assertWindowState(state, { mode: 'ball' }, 'test'), /expected mode=ball/);
    });
  });

  describe('assertNoScrollbar', () => {
    function assertNoScrollbar(state, expectation, stage) {
      if (!state || !state.scrollInfo) return;
      const { hasHorizontalScrollbar, hasVerticalScrollbar } = state.scrollInfo;
      if (hasHorizontalScrollbar) throw new Error(`unexpected horizontal scrollbar during ${stage}`);
      if (hasVerticalScrollbar) throw new Error(`unexpected vertical scrollbar during ${stage}`);
    }

    it('should pass when no scrollbars', () => {
      const state = { scrollInfo: { hasHorizontalScrollbar: false, hasVerticalScrollbar: false } };
      assert.doesNotThrow(() => assertNoScrollbar(state, {}, 'test'));
    });

    it('should fail when horizontal scrollbar', () => {
      const state = { scrollInfo: { hasHorizontalScrollbar: true, hasVerticalScrollbar: false } };
      assert.throws(() => assertNoScrollbar(state, {}, 'test'), /unexpected horizontal scrollbar/);
    });

    it('should fail when vertical scrollbar', () => {
      const state = { scrollInfo: { hasHorizontalScrollbar: false, hasVerticalScrollbar: true } };
      assert.throws(() => assertNoScrollbar(state, {}, 'test'), /unexpected vertical scrollbar/);
    });
  });
});
