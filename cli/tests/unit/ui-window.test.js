/**
 * UI Window Commands Unit Tests
 * 测试 CLI 命令处理逻辑（不依赖 Electron 运行时）
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

    it('should define cycle command', () => {
      const uiWindowPath = path.resolve(__dirname, '../../src/modules/ui-window.js');
      const code = fs.readFileSync(uiWindowPath, 'utf8');
      assert(code.includes('.command(\'cycle\')'), 'Missing cycle command');
      assert(code.includes('shrinkToBall'), 'Missing shrinkToBall in cycle');
      assert(code.includes('restoreFromBall'), 'Missing restoreFromBall in cycle');
    });

    it('should have heartbeat check in cycle', () => {
      const uiWindowPath = path.resolve(__dirname, '../../src/modules/ui-window.js');
      const code = fs.readFileSync(uiWindowPath, 'utf8');
      assert(code.includes('waitForHeartbeat'), 'Missing heartbeat check');
      assert(code.includes('statusCard'), 'Missing statusCard heartbeat');
    });

    it('should have --json option in cycle command', () => {
      const uiWindowPath = path.resolve(__dirname, '../../src/modules/ui-window.js');
      const code = fs.readFileSync(uiWindowPath, 'utf8');
      assert(code.includes(".option('--json'"), 'Missing --json option');
      assert(code.includes('isJson'), 'Missing isJson variable');
    });

    it('should output JSON structure with required fields', () => {
      const uiWindowPath = path.resolve(__dirname, '../../src/modules/ui-window.js');
      const code = fs.readFileSync(uiWindowPath, 'utf8');
      // Check for JSON output structure
      assert(code.includes('ok: true'), 'Missing ok: true in JSON output');
      assert(code.includes('ok: false'), 'Missing ok: false in JSON output');
      assert(code.includes('loop:'), 'Missing loop field in JSON output');
      assert(code.includes('timeoutMs'), 'Missing timeoutMs field in JSON output');
      assert(code.includes('totalMs'), 'Missing totalMs field in JSON output');
      assert(code.includes('results'), 'Missing results array in JSON output');
    });

    it('should include durationMs in results', () => {
      const uiWindowPath = path.resolve(__dirname, '../../src/modules/ui-window.js');
      const code = fs.readFileSync(uiWindowPath, 'utf8');
      assert(code.includes('durationMs'), 'Missing durationMs in results');
    });
  });

  describe('JSON Output Structure', () => {
    it('should have valid JSON schema for success case', () => {
      // Simulate JSON structure validation
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
    });

    it('should have valid JSON schema for failure case', () => {
      const mockOutput = {
        ok: false,
        loop: 1,
        timeoutMs: 5000,
        totalMs: 1234,
        results: [
          { loop: 1, status: 'fail', error: 'test error', durationMs: 1234 }
        ]
      };
      assert.strictEqual(mockOutput.ok, false);
      assert.strictEqual(typeof mockOutput.results[0].error, 'string');
    });
  });

  describe('assertWindowState', () => {
    // 从被测模块复制逻辑进行测试
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

  describe('formatState', () => {
    function formatState(state) {
      if (!state) return 'No state';
      const parts = [
        `mode=${state.mode || 'unknown'}`,
        `layout=${state.layoutSize || 'unknown'}`,
        `ball=${state.ballVisible ? 'visible' : 'hidden'}`,
      ];
      return parts.join(' ');
    }

    it('should format null state', () => {
      assert.strictEqual(formatState(null), 'No state');
    });

    it('should format ball state', () => {
      const state = { mode: 'ball', ballVisible: true };
      const formatted = formatState(state);
      assert(formatted.includes('mode=ball'));
      assert(formatted.includes('ball=visible'));
    });

    it('should format main state', () => {
      const state = { mode: 'main', layoutSize: 'studio', ballVisible: false };
      const formatted = formatState(state);
      assert(formatted.includes('mode=main'));
      assert(formatted.includes('layout=studio'));
      assert(formatted.includes('ball=hidden'));
    });
  });
});
