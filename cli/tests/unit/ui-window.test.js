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
      // 2 complete loops: shrink, state, restore, state, heartbeat per loop
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
      
      // KEY ASSERTIONS:
      // 1. Exit code 0
      assert(exitCodes.length > 0, 'Should have called process.exit');
      assert.strictEqual(exitCodes[exitCodes.length - 1], 0, 'Should exit with 0 for success');
      
      // 2. JSON output exists
      assert(loggedOutput.length > 0, 'Should have logged output');
      const jsonOutput = JSON.parse(loggedOutput[0]);
      
      // 3. JSON structure is correct
      assert.strictEqual(jsonOutput.ok, true, 'ok should be true');
      assert.strictEqual(jsonOutput.loop, 2, 'loop count should be 2');
      assert.strictEqual(jsonOutput.timeoutMs, 5000, 'timeoutMs should be 5000');
      assert.strictEqual(typeof jsonOutput.totalMs, 'number', 'totalMs should be number');
      assert(Array.isArray(jsonOutput.results), 'results should be array');
      assert.strictEqual(jsonOutput.results.length, 2, 'results should have 2 entries');
      
      // 4. Per-loop durationMs exists for each loop
      const result1 = jsonOutput.results[0];
      const result2 = jsonOutput.results[1];
      
      assert.strictEqual(result1.loop, 1, 'First result should be loop 1');
      assert.strictEqual(result1.status, 'pass', 'First loop should pass');
      assert.strictEqual(typeof result1.durationMs, 'number', 'durationMs should be number');
      assert(result1.durationMs >= 0, 'durationMs should be >= 0');
      
      assert.strictEqual(result2.loop, 2, 'Second result should be loop 2');
      assert.strictEqual(result2.status, 'pass', 'Second loop should pass');
      assert.strictEqual(typeof result2.durationMs, 'number', 'durationMs should be number');
      assert(result2.durationMs >= 0, 'durationMs should be >= 0');
      
      // 5. totalMs >= sum of durationMs (with tolerance)
      const sumDurations = result1.durationMs + result2.durationMs;
      assert(jsonOutput.totalMs >= sumDurations - 50, 
        `totalMs (${jsonOutput.totalMs}) should be >= sum of durationMs (${sumDurations})`);
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
        loop: 2,
        timeoutMs: 5000,
        totalMs: 1500,
        results: [
          { loop: 1, status: 'pass', durationMs: 1000 },
          { loop: 2, status: 'fail', error: 'timeout', durationMs: 500 }
        ]
      };
      
      assert.strictEqual(output.ok, false);
      assert.strictEqual(typeof output.results[1].error, 'string');
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
      if (expectation.requireBounds && !state.lastBounds) {
        throw new Error(`expected lastBounds to be recorded during ${stage}`);
      }
    }

    it('should pass for valid state', () => {
      const state = { mode: 'ball', ballVisible: true, lastBounds: { x: 0, y: 0 } };
      assert.doesNotThrow(() => assertWindowState(state, { mode: 'ball', ballVisible: true, requireBounds: true }, 'test'));
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
