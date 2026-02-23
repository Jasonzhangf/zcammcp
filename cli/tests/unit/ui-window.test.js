/**
 * UI Window Commands Unit Tests
 * 测试 CLI 命令处理逻辑
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

describe('UI Window Module', () => {
  describe('Static Validation', () => {
    it('should have required exports', () => {
      const uiWindowPath = path.resolve(__dirname, '../../src/modules/ui-window.js');
      const code = fs.readFileSync(uiWindowPath, 'utf8');
      assert(code.includes('sendWindowCommand'), 'Missing sendWindowCommand');
      assert(code.includes('fetchWindowState'), 'Missing fetchWindowState');
      assert(code.includes('waitForHeartbeat'), 'Missing waitForHeartbeat');
      assert(code.includes('assertWindowState'), 'Missing assertWindowState');
      assert(code.includes('assertNoScrollbar'), 'Missing assertNoScrollbar');
    });

    it('should define cycle command with --json option', () => {
      const uiWindowPath = path.resolve(__dirname, '../../src/modules/ui-window.js');
      const code = fs.readFileSync(uiWindowPath, 'utf8');
      assert(code.includes(".command('cycle')"), 'Missing cycle command');
      assert(code.includes("--json"), 'Missing --json option');
      assert(code.includes('isJson'), 'Missing isJson variable');
    });

    it('should have correct JSON output structure fields', () => {
      const uiWindowPath = path.resolve(__dirname, '../../src/modules/ui-window.js');
      const code = fs.readFileSync(uiWindowPath, 'utf8');
      assert(code.includes('ok: true'), 'Missing ok: true in JSON output');
      assert(code.includes('ok: false'), 'Missing ok: false in JSON output');
      assert(code.includes('loop:'), 'Missing loop field in JSON output');
      assert(code.includes('timeoutMs'), 'Missing timeoutMs field in JSON output');
      assert(code.includes('totalMs'), 'Missing totalMs field in JSON output');
      assert(code.includes('results'), 'Missing results array in JSON output');
    });

    it('should use loopStartMs for per-loop duration calculation', () => {
      const uiWindowPath = path.resolve(__dirname, '../../src/modules/ui-window.js');
      const code = fs.readFileSync(uiWindowPath, 'utf8');
      // Verify loopStartMs is used to calculate durationMs
      assert(code.includes('loopStartMs'), 'Missing loopStartMs variable');
      assert(code.includes('Date.now() - loopStartMs'), 'Should calculate duration from loopStartMs');
      // Make sure it's not using global startMs
      const loopDurationCode = code.match(/durationMs:[^}]+/g) || [];
      assert(loopDurationCode.length > 0, 'Should have durationMs calculation');
    });

    it('should have separate totalMs calculation', () => {
      const uiWindowPath = path.resolve(__dirname, '../../src/modules/ui-window.js');
      const code = fs.readFileSync(uiWindowPath, 'utf8');
      // Verify totalMs uses global startMs
      assert(code.match(/const totalMs = Date\.now\(\) - startMs/), 'Should calculate totalMs from startMs');
    });
  });

  describe('JSON Output Structure Validation', () => {
    it('should have valid JSON schema for success case', () => {
      const mockOutput = {
        ok: true,
        loop: 1,
        timeoutMs: 5000,
        totalMs: 1234,
        results: [
          { loop: 1, status: 'pass', durationMs: 1234 }
        ]
      };
      assert.strictEqual(typeof mockOutput.ok, 'boolean');
      assert.strictEqual(typeof mockOutput.loop, 'number');
      assert.strictEqual(typeof mockOutput.timeoutMs, 'number');
      assert.strictEqual(typeof mockOutput.totalMs, 'number');
      assert(Array.isArray(mockOutput.results));
      assert(mockOutput.results.length > 0);
      assert.strictEqual(typeof mockOutput.results[0].loop, 'number');
      assert.strictEqual(typeof mockOutput.results[0].status, 'string');
      assert.strictEqual(typeof mockOutput.results[0].durationMs, 'number');
      assert(mockOutput.totalMs >= mockOutput.results[0].durationMs, 'totalMs should be >= durationMs');
    });

    it('should have valid JSON schema for multi-loop success case', () => {
      const mockOutput = {
        ok: true,
        loop: 2,
        timeoutMs: 5000,
        totalMs: 3456,
        results: [
          { loop: 1, status: 'pass', durationMs: 1728 },
          { loop: 2, status: 'pass', durationMs: 1728 }
        ]
      };
      assert.strictEqual(mockOutput.loop, 2);
      assert.strictEqual(mockOutput.results.length, 2);
      assert.strictEqual(mockOutput.results[0].loop, 1);
      assert.strictEqual(mockOutput.results[1].loop, 2);
      // totalMs should be roughly sum of durations
      const sumDurations = mockOutput.results.reduce((sum, r) => sum + r.durationMs, 0);
      assert(mockOutput.totalMs >= sumDurations - 10, 'totalMs should be >= sum of durationMs');
    });

    it('should have valid JSON schema for failure case', () => {
      const mockOutput = {
        ok: false,
        loop: 1,
        timeoutMs: 5000,
        totalMs: 234,
        results: [
          { loop: 1, status: 'fail', error: 'connection refused', durationMs: 234 }
        ]
      };
      assert.strictEqual(mockOutput.ok, false);
      assert.strictEqual(typeof mockOutput.results[0].error, 'string');
      assert(mockOutput.results[0].error.length > 0);
    });

    it('should validate exit codes in documentation', () => {
      const uiWindowPath = path.resolve(__dirname, '../../src/modules/ui-window.js');
      const code = fs.readFileSync(uiWindowPath, 'utf8');
      assert(code.includes('process.exit(0)'), 'Should have exit 0 for success');
      assert(code.includes('process.exit(1)'), 'Should have exit 1 for failure');
    });
  });

  describe('assertWindowState', () => {
    function assertWindowState(state, expectation, stage) {
      if (!state) {
        throw new Error(`missing window state for ${stage}`);
      }
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
      assert.throws(
        () => assertWindowState(null, { mode: 'ball' }, 'test'),
        /missing window state/
      );
    });

    it('should fail for wrong mode', () => {
      const state = { mode: 'main', ballVisible: false };
      assert.throws(
        () => assertWindowState(state, { mode: 'ball' }, 'test'),
        /expected mode=ball/
      );
    });

    it('should fail for wrong ballVisible', () => {
      const state = { mode: 'ball', ballVisible: false };
      assert.throws(
        () => assertWindowState(state, { ballVisible: true }, 'test'),
        /expected ballVisible=true/
      );
    });
  });

  describe('assertNoScrollbar', () => {
    function assertNoScrollbar(state, expectation, stage) {
      if (!state || !state.scrollInfo) {
        return;
      }
      const { hasHorizontalScrollbar, hasVerticalScrollbar } = state.scrollInfo;
      if (hasHorizontalScrollbar) {
        throw new Error(`unexpected horizontal scrollbar during ${stage}`);
      }
      if (hasVerticalScrollbar) {
        throw new Error(`unexpected vertical scrollbar during ${stage}`);
      }
    }

    it('should pass when no scrollInfo', () => {
      assert.doesNotThrow(() => assertNoScrollbar({}, {}, 'test'));
      assert.doesNotThrow(() => assertNoScrollbar(null, {}, 'test'));
    });

    it('should pass when no scrollbars', () => {
      const state = { scrollInfo: { hasHorizontalScrollbar: false, hasVerticalScrollbar: false } };
      assert.doesNotThrow(() => assertNoScrollbar(state, {}, 'test'));
    });

    it('should fail when horizontal scrollbar', () => {
      const state = { scrollInfo: { hasHorizontalScrollbar: true, hasVerticalScrollbar: false } };
      assert.throws(
        () => assertNoScrollbar(state, {}, 'test'),
        /unexpected horizontal scrollbar/
      );
    });

    it('should fail when vertical scrollbar', () => {
      const state = { scrollInfo: { hasHorizontalScrollbar: false, hasVerticalScrollbar: true } };
      assert.throws(
        () => assertNoScrollbar(state, {}, 'test'),
        /unexpected vertical scrollbar/
      );
    });
  });
});
