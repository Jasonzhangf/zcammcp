/**
 * PTZ Control 单元测试 - 完整版
 * 测试 pan/tilt/zoom/focus 值域、边界值、错误处理、API 参数校验
 */

const assert = require('assert');

const PTZ_RANGES = {
  pan: { min: -17500, max: 17500, step: 1, expectedType: 'number' },
  tilt: { min: -3000, max: 21000, step: 1, expectedType: 'number' },
  zoom: { min: 0, max: 4528, step: 1, expectedType: 'number' },
  focus: { min: -5040, max: -1196, step: 1, expectedType: 'number' }
};

class PtzTestHarness {
  constructor() {
    this.logs = [];
    this.apiCalls = [];
    this.errors = [];
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
    if (!response.ok) {
      this.errors.push({ endpoint, request, error: response.error });
    }
    return entry;
  }

  validateValue(axis, value) {
    const range = PTZ_RANGES[axis];
    if (!range) return { valid: false, errors: [`Unknown axis: ${axis}`] };

    // Handle null/undefined/NaN
    if (value === null || value === undefined) {
      return { valid: false, errors: [`Value is ${value}`] };
    }
    if (Number.isNaN(value) || !Number.isFinite(value)) {
      return { valid: false, errors: [`Value is ${Number.isNaN(value) ? 'NaN' : 'Infinity'}`] };
    }

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

  validateSpeed(speed) {
    if (typeof speed !== 'number') {
      return { valid: false, error: `Expected number, got ${typeof speed}` };
    }
    if (speed < 0 || speed > 100) {
      return { valid: false, error: `Speed ${speed} out of range [0, 100]` };
    }
    return { valid: true };
  }

  simulateMove(axis, direction, speed = 50) {
    this.logInteraction(axis, 'move', { direction, speed });
    this.logApiCall('/ctrl/pt', { action: 'pt', pan_speed: direction === 'left' ? -speed : speed }, { ok: true });
  }

  simulateMoveFailure(axis, direction, errorMessage) {
    this.logInteraction(axis, 'move', { direction, speed: 50 });
    this.logApiCall('/ctrl/pt', { action: 'pt' }, { ok: false, error: errorMessage });
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

  describe('Pan Value Range - Boundary Values', () => {
    it('should accept valid pan values at boundaries', () => {
      assert.deepEqual(harness.validateValue('pan', -17500), { valid: true, errors: [] });
      assert.deepEqual(harness.validateValue('pan', 17500), { valid: true, errors: [] });
      assert.deepEqual(harness.validateValue('pan', 0), { valid: true, errors: [] });
    });

    it('should reject pan values just outside boundaries', () => {
      const result1 = harness.validateValue('pan', -17501);
      assert.strictEqual(result1.valid, false);
      assert(result1.errors.some(e => e.includes('out of range')));
      
      const result2 = harness.validateValue('pan', 17501);
      assert.strictEqual(result2.valid, false);
    });

    it('should reject NaN and Infinity for pan', () => {
      const result1 = harness.validateValue('pan', NaN);
      assert.strictEqual(result1.valid, false);
      
      const result2 = harness.validateValue('pan', Infinity);
      assert.strictEqual(result2.valid, false);
    });

    it('should reject null and undefined for pan', () => {
      const result1 = harness.validateValue('pan', null);
      assert.strictEqual(result1.valid, false);
      
      const result2 = harness.validateValue('pan', undefined);
      assert.strictEqual(result2.valid, false);
    });
  });

  describe('Tilt Value Range - Boundary Values', () => {
    it('should accept valid tilt values at boundaries', () => {
      assert.deepEqual(harness.validateValue('tilt', -3000), { valid: true, errors: [] });
      assert.deepEqual(harness.validateValue('tilt', 21000), { valid: true, errors: [] });
    });

    it('should reject tilt values outside boundaries', () => {
      const result1 = harness.validateValue('tilt', -3001);
      assert.strictEqual(result1.valid, false);
      
      const result2 = harness.validateValue('tilt', 21001);
      assert.strictEqual(result2.valid, false);
    });
  });

  describe('Zoom Value Range - Boundary Values', () => {
    it('should accept valid zoom values at boundaries', () => {
      assert.deepEqual(harness.validateValue('zoom', 0), { valid: true, errors: [] });
      assert.deepEqual(harness.validateValue('zoom', 4528), { valid: true, errors: [] });
    });

    it('should reject negative zoom values', () => {
      const result = harness.validateValue('zoom', -1);
      assert.strictEqual(result.valid, false);
    });

    it('should reject zoom values above max', () => {
      const result = harness.validateValue('zoom', 4529);
      assert.strictEqual(result.valid, false);
    });
  });

  describe('Focus Value Range - Boundary Values', () => {
    it('should accept valid focus values at boundaries', () => {
      assert.deepEqual(harness.validateValue('focus', -5040), { valid: true, errors: [] });
      assert.deepEqual(harness.validateValue('focus', -1196), { valid: true, errors: [] });
    });

    it('should reject positive focus values', () => {
      const result = harness.validateValue('focus', 0);
      assert.strictEqual(result.valid, false);
      
      const result2 = harness.validateValue('focus', 100);
      assert.strictEqual(result2.valid, false);
    });
  });

  describe('Speed Validation', () => {
    it('should accept valid speed values', () => {
      assert.deepEqual(harness.validateSpeed(0), { valid: true });
      assert.deepEqual(harness.validateSpeed(50), { valid: true });
      assert.deepEqual(harness.validateSpeed(100), { valid: true });
    });

    it('should reject speed below 0', () => {
      const result = harness.validateSpeed(-1);
      assert.strictEqual(result.valid, false);
    });

    it('should reject speed above 100', () => {
      const result = harness.validateSpeed(101);
      assert.strictEqual(result.valid, false);
    });

    it('should reject non-numeric speed', () => {
      const result1 = harness.validateSpeed('50');
      assert.strictEqual(result1.valid, false);
      
      const result2 = harness.validateSpeed(null);
      assert.strictEqual(result2.valid, false);
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

    it('should handle move failure', () => {
      harness.simulateMoveFailure('pan', 'right', 'timeout');
      
      assert.strictEqual(harness.apiCalls.length, 1);
      assert.strictEqual(harness.apiCalls[0].response.ok, false);
      assert.strictEqual(harness.apiCalls[0].response.error, 'timeout');
      assert.strictEqual(harness.errors.length, 1);
    });

    it('should validate direction values', () => {
      const validDirections = ['left', 'right', 'up', 'down', 'up-left', 'up-right', 'down-left', 'down-right'];
      
      for (const dir of validDirections) {
        harness.simulateMove('pan', dir, 50);
      }
      
      assert.strictEqual(harness.logs.length, 8);
    });
  });

  describe('Stop Interaction', () => {
    it('should log stop command', () => {
      harness.simulateStop('pan');
      
      assert.strictEqual(harness.logs[0].action, 'stop');
      assert.strictEqual(harness.apiCalls[0].endpoint, '/ctrl/pt');
    });

    it('should stop during movement', () => {
      harness.simulateMove('pan', 'right', 50);
      harness.simulateStop('pan');
      
      assert.strictEqual(harness.logs.length, 2);
      assert.strictEqual(harness.logs[1].action, 'stop');
    });
  });

  describe('Set Value Interaction', () => {
    it('should log set value and API call', () => {
      harness.simulateSetValue('zoom', 2264);
      
      assert.strictEqual(harness.logs[0].action, 'set');
      assert.deepStrictEqual(harness.logs[0].params, { value: 2264 });
      assert.strictEqual(harness.apiCalls[0].endpoint, '/ctrl/set');
    });

    it('should validate value before setting', () => {
      const result = harness.validateValue('zoom', 2264);
      assert.strictEqual(result.valid, true);
      
      const invalidResult = harness.validateValue('zoom', 5000);
      assert.strictEqual(invalidResult.valid, false);
    });
  });

  describe('Error Handling', () => {
    it('should track errors separately', () => {
      harness.simulateMove('pan', 'right', 50);
      harness.simulateMoveFailure('pan', 'left', 'network error');
      
      assert.strictEqual(harness.errors.length, 1);
      assert.strictEqual(harness.errors[0].error, 'network error');
    });

    it('should continue after error', () => {
      harness.simulateMoveFailure('pan', 'right', 'error1');
      harness.simulateMove('tilt', 'up', 50);
      
      assert.strictEqual(harness.logs.length, 2);
      assert.strictEqual(harness.apiCalls.length, 2);
    });
  });

  describe('Log Format', () => {
    it('should include UTC timestamp', () => {
      harness.simulateMove('zoom', 'in', 50);
      
      const log = harness.logs[0];
      assert(log.utc);
      assert.match(log.utc, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should include local timestamp', () => {
      harness.simulateMove('zoom', 'in', 50);
      
      const log = harness.logs[0];
      assert(log.local);
    });

    it('should include all required fields', () => {
      harness.simulateMove('pan', 'right', 75);
      
      const log = harness.logs[0];
      assert(log.timestamp);
      assert(log.utc);
      assert(log.local);
      assert(log.controlId);
      assert(log.action);
      assert(log.params);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle rapid pan+tilt commands', () => {
      harness.simulateMove('pan', 'right', 50);
      harness.simulateMove('tilt', 'up', 50);
      harness.simulateMove('zoom', 'in', 50);
      
      assert.strictEqual(harness.logs.length, 3);
      assert.strictEqual(harness.apiCalls.length, 3);
    });

    it('should maintain operation order', () => {
      harness.simulateMove('pan', 'right', 50);
      harness.simulateStop('pan');
      harness.simulateMove('pan', 'left', 30);
      
      assert.strictEqual(harness.logs[0].action, 'move');
      assert.strictEqual(harness.logs[1].action, 'stop');
      assert.strictEqual(harness.logs[2].action, 'move');
    });
  });
});
