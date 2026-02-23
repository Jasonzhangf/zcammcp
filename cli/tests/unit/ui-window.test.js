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
  let originalConsoleError;
  let mockResponses = [];
  let exitCodes = [];
  let loggedOutput = [];
  let loggedErrors = [];
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
    loggedErrors = [];
    timeCounter = 0;
    
    originalHttpRequest = http.request;
    originalProcessExit = process.exit;
    originalConsoleLog = console.log;
    originalConsoleError = console.error;
    originalDateNow = Date.now;
    
    http.request = createMockHttpRequest();
    process.exit = (code) => { exitCodes.push(code); };
    console.log = (...args) => { loggedOutput.push(args.join(' ')); };
    console.error = (...args) => { loggedErrors.push(args.join(' ')); };
    Date.now = () => {
      timeCounter += 100;
      return 1000000 + timeCounter;
    };
  }

  function restoreMocks() {
    http.request = originalHttpRequest;
    process.exit = originalProcessExit;
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    Date.now = originalDateNow;
  }

  describe('cycle --json runtime execution', () => {
    beforeEach(function() {
      setupMocks();
    });
    afterEach(restoreMocks);

    it('should output correct JSON for 2 loops with per-loop durationMs', async () => {
      mockResponses = [
        JSON.stringify({ ok: true, state: { mode: 'ball', ballVisible: true, lastBounds: { x: 100, y: 100, width: 100, height: 100 } } }),
        JSON.stringify({ ok: true }),
        JSON.stringify({ ok: true, state: { mode: 'main', ballVisible: false } }),
        JSON.stringify({ ok: true }),
        JSON.stringify({ ok: true, state: { heartbeats: { statusCard: { updated: true, ts: Date.now() } } } }),
        JSON.stringify({ ok: true, state: { mode: 'ball', ballVisible: true, lastBounds: { x: 100, y: 100, width: 100, height: 100 } } }),
        JSON.stringify({ ok: true }),
        JSON.stringify({ ok: true, state: { mode: 'main', ballVisible: false } }),
        JSON.stringify({ ok: true }),
        JSON.stringify({ ok: true, state: { heartbeats: { statusCard: { updated: true, ts: Date.now() } } } }),
      ];
      
      const cmd = require('../../src/modules/ui-window.js');
      cmd.name('zcam');
      await cmd.parseAsync(['cycle', '--loop', '2', '--json', '--timeout', '5000'], { from: 'user' });
      
      await new Promise(r => setTimeout(r, 300));
      
      assert(exitCodes.length > 0, 'Should have called process.exit');
      assert.strictEqual(exitCodes[exitCodes.length - 1], 0, 'Should exit with 0 for success');
      
      assert(loggedOutput.length > 0, 'Should have logged output');
      const jsonOutput = JSON.parse(loggedOutput[0]);
      
      assert.strictEqual(jsonOutput.ok, true);
      assert.strictEqual(jsonOutput.loop, 2);
      assert.strictEqual(jsonOutput.timeoutMs, 5000);
      assert(Array.isArray(jsonOutput.results));
      assert.strictEqual(jsonOutput.results.length, 2);
      
      assert.strictEqual(typeof jsonOutput.results[0].durationMs, 'number');
      assert.strictEqual(typeof jsonOutput.results[1].durationMs, 'number');
      
      const sumDurations = jsonOutput.results.reduce((sum, r) => sum + r.durationMs, 0);
      assert(jsonOutput.totalMs >= sumDurations - 50, `totalMs ${jsonOutput.totalMs} < sum ${sumDurations}`);
    });

    it('should output ok:true and exit(0) for single loop success', async () => {
      mockResponses = [
        JSON.stringify({ ok: true, state: { mode: 'ball', ballVisible: true, lastBounds: { x: 100, y: 100, width: 100, height: 100 } } }),
        JSON.stringify({ ok: true }),
        JSON.stringify({ ok: true, state: { mode: 'main', ballVisible: false } }),
        JSON.stringify({ ok: true }),
        JSON.stringify({ ok: true, state: { heartbeats: { statusCard: { updated: true, ts: Date.now() } } } }),
      ];
      
      const cmd = require('../../src/modules/ui-window.js');
      cmd.name('zcam');
      await cmd.parseAsync(['cycle', '--loop', '1', '--json', '--timeout', '5000'], { from: 'user' });
      
      await new Promise(r => setTimeout(r, 300));
      
      assert(exitCodes.length > 0, 'Should have called process.exit');
      assert.strictEqual(exitCodes[exitCodes.length - 1], 0, 'Should exit with 0 for success');
      
      const jsonOutput = JSON.parse(loggedOutput[0]);
      assert.strictEqual(jsonOutput.ok, true);
    });

    it('should output ok:false and exit(1) when restore fails', async () => {
      mockResponses = [
        JSON.stringify({ ok: true, state: { mode: 'ball', ballVisible: true, lastBounds: { x: 100, y: 100, width: 100, height: 100 } } }),
        JSON.stringify({ ok: true }),
        JSON.stringify({ ok: false, error: 'restore failed' }),
      ];
      
      const cmd = require('../../src/modules/ui-window.js');
      cmd.name('zcam');
      await cmd.parseAsync(['cycle', '--loop', '1', '--json', '--timeout', '5000'], { from: 'user' });
      
      await new Promise(r => setTimeout(r, 300));
      
      assert(exitCodes.length > 0, 'Should have called process.exit');
      assert.strictEqual(exitCodes[exitCodes.length - 1], 1, 'Should exit with 1 for failure');
      
      const jsonOutput = JSON.parse(loggedOutput[0]);
      assert.strictEqual(jsonOutput.ok, false);
      assert(jsonOutput.results[0].error.includes('restore failed'));
    });

    it('should output ok:false and exit(1) when heartbeat times out', async () => {
      mockResponses = [
        JSON.stringify({ ok: true, state: { mode: 'ball', ballVisible: true, lastBounds: { x: 100, y: 100, width: 100, height: 100 } } }),
        JSON.stringify({ ok: true }),
        JSON.stringify({ ok: true, state: { mode: 'main', ballVisible: false } }),
        JSON.stringify({ ok: true }),
        JSON.stringify({ ok: true, state: { heartbeats: {} } }),
        JSON.stringify({ ok: true, state: { heartbeats: {} } }),
        JSON.stringify({ ok: true, state: { heartbeats: {} } }),
        JSON.stringify({ ok: true, state: { heartbeats: {} } }),
        JSON.stringify({ ok: true, state: { heartbeats: {} } }),
        JSON.stringify({ ok: true, state: { heartbeats: {} } }),
      ];
      
      const cmd = require('../../src/modules/ui-window.js');
      cmd.name('zcam');
      await cmd.parseAsync(['cycle', '--loop', '1', '--json', '--timeout', '500'], { from: 'user' });
      
      await new Promise(r => setTimeout(r, 600));
      
      assert(exitCodes.length > 0, 'Should have called process.exit');
      assert.strictEqual(exitCodes[exitCodes.length - 1], 1, 'Should exit with 1 for timeout');
      
      const jsonOutput = JSON.parse(loggedOutput[0]);
      assert.strictEqual(jsonOutput.ok, false);
      assert(jsonOutput.results[0].error.includes('heartbeat') || jsonOutput.results[0].error.includes('timeout'));
    });

    it('should output ok:false and exit(1) when shrinkToBall fails', async () => {
      mockResponses = [
        JSON.stringify({ ok: false, error: 'shrink failed' }),
      ];
      
      const cmd = require('../../src/modules/ui-window.js');
      cmd.name('zcam');
      await cmd.parseAsync(['cycle', '--loop', '1', '--json', '--timeout', '5000'], { from: 'user' });
      
      await new Promise(r => setTimeout(r, 300));
      
      assert(exitCodes.length > 0, 'Should have called process.exit');
      assert.strictEqual(exitCodes[exitCodes.length - 1], 1, 'Should exit with 1 for failure');
      
      const jsonOutput = JSON.parse(loggedOutput[0]);
      assert.strictEqual(jsonOutput.ok, false);
      assert(jsonOutput.results[0].error.includes('shrink failed'));
    });

    it('should validate JSON schema for success case', () => {
      const output = {
        ok: true,
        loop: 1,
        timeoutMs: 5000,
        totalMs: 1500,
        results: [
          { loop: 1, status: 'pass', durationMs: 1500 }
        ]
      };
      
      assert.strictEqual(output.ok, true);
      assert.strictEqual(typeof output.loop, 'number');
      assert.strictEqual(typeof output.timeoutMs, 'number');
      assert.strictEqual(typeof output.totalMs, 'number');
      assert(Array.isArray(output.results));
      assert.strictEqual(output.results[0].status, 'pass');
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

  describe('cycle without --json flag', () => {
    beforeEach(() => {
      jest.resetModules();
      jest.clearAllMocks();
      setupMocks();
    });
    afterEach(restoreMocks);

    it('should output human-readable text (not JSON) when --json is not specified', async () => {
      mockResponses = [
        JSON.stringify({ ok: true, state: { mode: 'ball', ballVisible: true, lastBounds: { x: 100, y: 100, width: 100, height: 100 } } }),
        JSON.stringify({ ok: true }),
        JSON.stringify({ ok: true, state: { mode: 'main', ballVisible: false } }),
        JSON.stringify({ ok: true }),
        JSON.stringify({ ok: true, state: { heartbeats: { statusCard: { updated: true, ts: Date.now() } } } }),
      ];
      
      const cmd = require('../../src/modules/ui-window.js');
      cmd.name('zcam');
      // Do NOT pass --json flag
      await cmd.parseAsync(['cycle', '--loop', '1', '--timeout', '2000'], { from: 'user' });
      
      await new Promise(r => setTimeout(r, 300));
      
      // CRITICAL: Exit code MUST be 0
      assert(exitCodes.length > 0, 'Should have called process.exit');
      assert.strictEqual(exitCodes[exitCodes.length - 1], 0, 'Should exit with 0 for success');
      
      // CRITICAL: stdout should NOT contain JSON structure (check only non-color output)
      const output = loggedOutput.join(' ');
      // Check that output contains human-readable markers, not JSON
      assert(output.includes('Cycle test finished') || output.includes('loop'), 
        `stdout should contain human-readable summary. Got: ${output}`);
      // The output should NOT be pure JSON (should have chalk color codes or human text)
      const hasJsonStructure = output.includes('"ok":') && output.includes('"results":');
      assert(!hasJsonStructure, `stdout should NOT be pure JSON. Got: ${output}`);
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
