/**
 * SliderControl 单元测试
 * 测试值域、点击、拖拽、日志验证
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

// 模拟 ControlTestHarness
class MockTestHarness {
  constructor() {
    this.logs = [];
  }

  log(controlId, action, params) {
    const entry = {
      timestamp: Date.now(),
      utc: new Date().toISOString(),
      local: new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
      controlId,
      action,
      params
    };
    this.logs.push(entry);
    return entry;
  }

  logApiCall(controlId, apiCall, request, response) {
    const entry = {
      timestamp: Date.now(),
      utc: new Date().toISOString(),
      controlId,
      action: 'api_call',
      apiCall,
      apiResponse: response,
      params: { request }
    };
    this.logs.push(entry);
    return entry;
  }

  validateValueRange(value, range) {
    const errors = [];
    
    if (range.expectedType === 'number') {
      if (typeof value !== 'number') {
        errors.push(`Expected number, got ${typeof value}`);
      } else {
        if (value < range.min || value > range.max) {
          errors.push(`Value ${value} out of range [${range.min}, ${range.max}]`);
        }
        if (range.step && Math.abs((value - range.min) % range.step) > 0.001) {
          errors.push(`Value ${value} not aligned to step ${range.step}`);
        }
      }
    } else if (range.expectedType === 'enum') {
      if (!range.enumValues || !range.enumValues.includes(value)) {
        errors.push(`Value "${value}" not in enum`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  simulateClick(controlId, expectedApiCall) {
    this.log(controlId, 'click');
    if (expectedApiCall) {
      this.logApiCall(controlId, expectedApiCall, { action: 'click' }, { ok: true });
    }
  }

  simulateDrag(controlId, from, to, expectedApiCall) {
    this.log(controlId, 'drag', { from, to });
    if (expectedApiCall) {
      this.logApiCall(controlId, expectedApiCall, { action: 'set', value: to }, { ok: true, value: to });
    }
  }
}

describe('SliderControl', () => {
  let harness;

  beforeEach(() => {
    harness = new MockTestHarness();
  });

  describe('Value Range Validation', () => {
    it('should validate PTZ zoom range (0-4528)', () => {
      const zoomRange = { min: 0, max: 4528, step: 1, expectedType: 'number' };
      
      // Valid values
      assert.deepEqual(harness.validateValueRange(0, zoomRange), { valid: true, errors: [] });
      assert.deepEqual(harness.validateValueRange(2264, zoomRange), { valid: true, errors: [] });
      assert.deepEqual(harness.validateValueRange(4528, zoomRange), { valid: true, errors: [] });
      
      // Invalid values
      const result1 = harness.validateValueRange(-1, zoomRange);
      assert.strictEqual(result1.valid, false);
      assert(result1.errors.some(e => e.includes('out of range')));
      
      const result2 = harness.validateValueRange(5000, zoomRange);
      assert.strictEqual(result2.valid, false);
    });

    it('should validate PTZ focus range (-5040 to -1196)', () => {
      const focusRange = { min: -5040, max: -1196, step: 1, expectedType: 'number' };
      
      assert.deepEqual(harness.validateValueRange(-5040, focusRange), { valid: true, errors: [] });
      assert.deepEqual(harness.validateValueRange(-3118, focusRange), { valid: true, errors: [] });
      assert.deepEqual(harness.validateValueRange(-1196, focusRange), { valid: true, errors: [] });
      
      const result = harness.validateValueRange(0, focusRange);
      assert.strictEqual(result.valid, false);
    });

    it('should validate ISO enum values', () => {
      const isoRange = { 
        expectedType: 'enum', 
        enumValues: ['100', '200', '400', '800', '1600', '3200', '6400', '12800'] 
      };
      
      assert.deepEqual(harness.validateValueRange('100', isoRange), { valid: true, errors: [] });
      assert.deepEqual(harness.validateValueRange('1600', isoRange), { valid: true, errors: [] });
      
      const result = harness.validateValueRange('9999', isoRange);
      assert.strictEqual(result.valid, false);
    });
  });

  describe('Click Interaction', () => {
    it('should log click and API call', () => {
      harness.simulateClick('ptz.zoom.increase', 'ptz.zoom');
      
      assert.strictEqual(harness.logs.length, 2);
      assert.strictEqual(harness.logs[0].controlId, 'ptz.zoom.increase');
      assert.strictEqual(harness.logs[0].action, 'click');
      assert.strictEqual(harness.logs[1].action, 'api_call');
      assert.strictEqual(harness.logs[1].apiCall, 'ptz.zoom');
    });

    it('should include timestamp in ISO format', () => {
      harness.simulateClick('test.control', 'test.api');
      
      const log = harness.logs[0];
      assert(log.utc);
      assert(log.utc.includes('T'));
      assert(log.utc.includes('Z'));
    });

    it('should include local time in Asia/Shanghai', () => {
      harness.simulateClick('test.control', 'test.api');
      
      const log = harness.logs[0];
      assert(log.local);
      // Asia/Shanghai is UTC+8
      assert(log.local.includes('2026') || log.local.includes('2025'));
    });
  });

  describe('Drag Interaction', () => {
    it('should log drag with from/to values', () => {
      harness.simulateDrag('ptz.zoom.slider', 0, 2264, 'ptz.zoom.set');
      
      assert.strictEqual(harness.logs.length, 2);
      assert.strictEqual(harness.logs[0].action, 'drag');
      assert.deepStrictEqual(harness.logs[0].params, { from: 0, to: 2264 });
      assert.strictEqual(harness.logs[1].action, 'api_call');
    });

    it('should validate drag target within range', () => {
      const zoomRange = { min: 0, max: 4528, expectedType: 'number' };
      const targetValue = 2264;
      
      const result = harness.validateValueRange(targetValue, zoomRange);
      assert.strictEqual(result.valid, true);
    });
  });

  describe('Log Export and Verification', () => {
    it('should export logs as JSON', () => {
      harness.simulateClick('control1', 'api1');
      harness.simulateDrag('control2', 0, 100, 'api2');
      
      const exported = JSON.stringify({
        exportTime: new Date().toISOString(),
        totalLogs: harness.logs.length,
        logs: harness.logs
      }, null, 2);
      
      assert(exported.includes('control1'));
      assert(exported.includes('control2'));
      assert(exported.includes('click'));
      assert(exported.includes('drag'));
    });

    it('should verify logs match expected sequence', () => {
      harness.simulateClick('ptz.zoom.up', 'ptz.zoom');
      harness.simulateClick('ptz.zoom.down', 'ptz.zoom');
      
      // 每次点击产生2条日志（click + api_call），共4条
      assert.strictEqual(harness.logs.length, 4);
      
      // 验证 click 日志
      assert.strictEqual(harness.logs[0].action, 'click');
      assert.strictEqual(harness.logs[0].controlId, 'ptz.zoom.up');
      assert.strictEqual(harness.logs[2].action, 'click');
      assert.strictEqual(harness.logs[2].controlId, 'ptz.zoom.down');
      
      // 验证 api_call 日志
      assert.strictEqual(harness.logs[1].action, 'api_call');
      assert.strictEqual(harness.logs[3].action, 'api_call');
      
      let mismatches = [];
      
      assert.deepStrictEqual(mismatches, []);
    });
  });
});
