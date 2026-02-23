/**
 * PTZ Control 单元测试
 * 测试 pan/tilt/zoom/focus 值域和交互
 */

const assert = require('assert');

// PTZ 值域定义
const PTZ_RANGES = {
  pan: { min: -17500, max: 17500, step: 1, expectedType: 'number' },
  tilt: { min: -3000, max: 21000, step: 1, expectedType: 'number' },
  zoom: { min: 0, max: 4528, step: 1, expectedType: 'number' },
  focus: { min: -5040, max: -1196, step: 1, expectedType: 'number' }
};

// 测试框架
class PtzTestHarness {
  constructor() {
    this.logs = [];
    this.apiCalls = [];
  }

  logInteraction(axis, action, params) {
    const entry = {
      timestamp: Date.now(),
      utc: new Date().toISOString(),
      local: new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
      controlId: `ptz.${axis}`,
      action,
      params
    };
    this.logs.push(entry);
    return entry;
  }

  logApiCall(endpoint, request, response) {
    const entry = {
      timestamp: Date.now(),
      utc: new Date().toISOString(),
      endpoint,
      request,
      response
    };
    this.apiCalls.push(entry);
    return entry;
  }

  validateValue(axis, value) {
    const range = PTZ_RANGES[axis];
    if (!range) return { valid: false, errors: [`Unknown axis: ${axis}`] };

    const errors = [];
    if (typeof value !== 'number') {
      errors.push(`Expected number, got ${typeof value}`);
    } else {
      if (value < range.min || value > range.max) {
        errors.push(`${axis} value ${value} out of range [${range.min}, ${range.max}]`);
      }
    }
    return { valid: errors.length === 0, errors };
  }

  simulateMove(axis, direction, speed = 50) {
    this.logInteraction(axis, 'move', { direction, speed });
    this.logApiCall('/ctrl/pt', { action: 'pt', pan_speed: direction === 'left' ? -speed : speed }, { ok: true });
  }

  simulateStop(axis) {
    this.logInteraction(axis, 'stop', {});
    this.logApiCall('/ctrl/pt', { action: 'stop' }, { ok: true });
  }

  simulateSetValue(axis, value) {
    this.logInteraction(axis, 'set', { value });
    this.logApiCall('/ctrl/set', { [axis]: value }, { ok: true });
  }
}

describe('PTZ Control', () => {
  let harness;

  beforeEach(() => {
    harness = new PtzTestHarness();
  });

  describe('Pan Value Range', () => {
    it('should accept valid pan values', () => {
      assert.deepEqual(harness.validateValue('pan', 0), { valid: true, errors: [] });
      assert.deepEqual(harness.validateValue('pan', -17500), { valid: true, errors: [] });
      assert.deepEqual(harness.validateValue('pan', 17500), { valid: true, errors: [] });
      assert.deepEqual(harness.validateValue('pan', 8750), { valid: true, errors: [] });
    });

    it('should reject out of range pan values', () => {
      const result1 = harness.validateValue('pan', -20000);
      assert.strictEqual(result1.valid, false);
      
      const result2 = harness.validateValue('pan', 20000);
      assert.strictEqual(result2.valid, false);
    });
  });

  describe('Tilt Value Range', () => {
    it('should accept valid tilt values', () => {
      assert.deepEqual(harness.validateValue('tilt', -3000), { valid: true, errors: [] });
      assert.deepEqual(harness.validateValue('tilt', 0), { valid: true, errors: [] });
      assert.deepEqual(harness.validateValue('tilt', 21000), { valid: true, errors: [] });
    });

    it('should reject invalid tilt values', () => {
      const result = harness.validateValue('tilt', -5000);
      assert.strictEqual(result.valid, false);
    });
  });

  describe('Zoom Value Range', () => {
    it('should accept valid zoom values', () => {
      assert.deepEqual(harness.validateValue('zoom', 0), { valid: true, errors: [] });
      assert.deepEqual(harness.validateValue('zoom', 2264), { valid: true, errors: [] });
      assert.deepEqual(harness.validateValue('zoom', 4528), { valid: true, errors: [] });
    });

    it('should reject negative zoom values', () => {
      const result = harness.validateValue('zoom', -100);
      assert.strictEqual(result.valid, false);
    });
  });

  describe('Focus Value Range', () => {
    it('should accept valid focus values', () => {
      assert.deepEqual(harness.validateValue('focus', -5040), { valid: true, errors: [] });
      assert.deepEqual(harness.validateValue('focus', -3118), { valid: true, errors: [] });
      assert.deepEqual(harness.validateValue('focus', -1196), { valid: true, errors: [] });
    });

    it('should reject positive focus values', () => {
      const result = harness.validateValue('focus', 0);
      assert.strictEqual(result.valid, false);
    });
  });

  describe('Move Interaction', () => {
    it('should log move command with direction and speed', () => {
      harness.simulateMove('pan', 'right', 75);
      
      assert.strictEqual(harness.logs.length, 1);
      assert.strictEqual(harness.logs[0].controlId, 'ptz.pan');
      assert.strictEqual(harness.logs[0].action, 'move');
      assert.deepStrictEqual(harness.logs[0].params, { direction: 'right', speed: 75 });
    });

    it('should log API call to /ctrl/pt', () => {
      harness.simulateMove('pan', 'left', 50);
      
      assert.strictEqual(harness.apiCalls.length, 1);
      assert.strictEqual(harness.apiCalls[0].endpoint, '/ctrl/pt');
    });
  });

  describe('Stop Interaction', () => {
    it('should log stop command', () => {
      harness.simulateStop('pan');
      
      assert.strictEqual(harness.logs[0].action, 'stop');
    });
  });

  describe('Set Value Interaction', () => {
    it('should log set value and API call', () => {
      harness.simulateSetValue('zoom', 2264);
      
      assert.strictEqual(harness.logs[0].action, 'set');
      assert.deepStrictEqual(harness.logs[0].params, { value: 2264 });
      assert.strictEqual(harness.apiCalls[0].endpoint, '/ctrl/set');
    });
  });

  describe('Log Format', () => {
    it('should include UTC timestamp', () => {
      harness.simulateMove('zoom', 'in', 50);
      
      const log = harness.logs[0];
      assert(log.utc);
      assert.match(log.utc, /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should include local timestamp', () => {
      harness.simulateMove('zoom', 'in', 50);
      
      const log = harness.logs[0];
      assert(log.local);
    });
  });
});
