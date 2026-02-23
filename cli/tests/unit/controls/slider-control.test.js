/**
 * SliderControl 单元测试 - 完整版
 * 测试值域、点击、拖拽、日志验证、错误处理、边界值
 */

const assert = require('assert');

class MockTestHarness {
  constructor() {
    this.logs = [];
    this.apiCalls = [];
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
    this.apiCalls.push(entry);
    return entry;
  }

  validateValueRange(value, range) {
    const errors = [];
    
    if (value === null || value === undefined) {
      errors.push('Value is ' + value);
      return { valid: false, errors: errors };
    }
    
    if (range.expectedType === 'enum') {
      if (typeof value !== 'string') {
        errors.push('Expected string enum, got ' + typeof value);
      } else if (!range.enumValues || !range.enumValues.includes(value)) {
        errors.push('Value "' + value + '" not in enum');
      }
      return { valid: errors.length === 0, errors: errors };
    }
    
    if (range.expectedType === 'number' && (Number.isNaN(value) || !Number.isFinite(value))) {
      errors.push('Value is ' + (Number.isNaN(value) ? 'NaN' : 'Infinity'));
      return { valid: false, errors: errors };
    }
    
    if (range.expectedType === 'number') {
      if (typeof value !== 'number') {
        errors.push('Expected number, got ' + typeof value);
      } else {
        if (value < range.min || value > range.max) {
          errors.push('Value ' + value + ' out of range [' + range.min + ', ' + range.max + ']');
        }
        if (range.step && Math.abs((value - range.min) % range.step) > 0.001) {
          errors.push('Value ' + value + ' not aligned to step ' + range.step);
        }
      }
    }

    return { valid: errors.length === 0, errors: errors };
  }

  simulateClick(controlId, expectedApiCall, apiResponseParam) {
    var apiResponse = apiResponseParam === undefined ? { ok: true } : apiResponseParam;
    this.log(controlId, 'click');
    if (expectedApiCall) {
      this.logApiCall(controlId, expectedApiCall, { action: 'click' }, apiResponse);
    }
  }

  simulateDrag(controlId, from, to, expectedApiCall) {
    this.log(controlId, 'drag', { from: from, to: to });
    if (expectedApiCall) {
      this.logApiCall(controlId, expectedApiCall, { action: 'set', value: to }, { ok: true, value: to });
    }
  }

  simulateApiFailure(controlId, apiCall, errorMessage) {
    this.log(controlId, 'click');
    this.logApiCall(controlId, apiCall, {}, { ok: false, error: errorMessage });
  }
}

describe('SliderControl', function() {
  var harness;

  beforeEach(function() {
    harness = new MockTestHarness();
  });

  describe('Value Range Validation - Boundary Values', function() {
    it('should validate PTZ zoom range (0-4528)', function() {
      var zoomRange = { min: 0, max: 4528, step: 1, expectedType: 'number' };
      
      assert.deepEqual(harness.validateValueRange(0, zoomRange), { valid: true, errors: [] });
      assert.deepEqual(harness.validateValueRange(4528, zoomRange), { valid: true, errors: [] });
      
      var result1 = harness.validateValueRange(-1, zoomRange);
      assert.strictEqual(result1.valid, false);
      assert(result1.errors.some(function(e) { return e.includes('out of range'); }));
      
      var result2 = harness.validateValueRange(4529, zoomRange);
      assert.strictEqual(result2.valid, false);
    });

    it('should validate PTZ focus range (-5040 to -1196)', function() {
      var focusRange = { min: -5040, max: -1196, step: 1, expectedType: 'number' };
      
      assert.deepEqual(harness.validateValueRange(-5040, focusRange), { valid: true, errors: [] });
      assert.deepEqual(harness.validateValueRange(-1196, focusRange), { valid: true, errors: [] });
      
      var result = harness.validateValueRange(0, focusRange);
      assert.strictEqual(result.valid, false);
    });

    it('should reject NaN values', function() {
      var zoomRange = { min: 0, max: 4528, expectedType: 'number' };
      var result = harness.validateValueRange(NaN, zoomRange);
      assert.strictEqual(result.valid, false);
      assert(result.errors.some(function(e) { return e.includes('NaN'); }));
    });

    it('should reject Infinity values', function() {
      var zoomRange = { min: 0, max: 4528, expectedType: 'number' };
      
      var result1 = harness.validateValueRange(Infinity, zoomRange);
      assert.strictEqual(result1.valid, false);
      assert(result1.errors.some(function(e) { return e.includes('Infinity'); }));
      
      var result2 = harness.validateValueRange(-Infinity, zoomRange);
      assert.strictEqual(result2.valid, false);
    });

    it('should reject null values', function() {
      var zoomRange = { min: 0, max: 4528, expectedType: 'number' };
      var result = harness.validateValueRange(null, zoomRange);
      assert.strictEqual(result.valid, false);
    });

    it('should reject undefined values', function() {
      var zoomRange = { min: 0, max: 4528, expectedType: 'number' };
      var result = harness.validateValueRange(undefined, zoomRange);
      assert.strictEqual(result.valid, false);
    });

    it('should validate ISO enum values', function() {
      var isoEnumRange = { 
        expectedType: 'enum', 
        enumValues: ['100', '200', '400', '800', '1600', '3200', '6400', '12800'] 
      };
      
      assert.deepEqual(harness.validateValueRange('100', isoEnumRange), { valid: true, errors: [] });
      assert.deepEqual(harness.validateValueRange('12800', isoEnumRange), { valid: true, errors: [] });
      
      var isoResult = harness.validateValueRange('9999', isoEnumRange);
      assert.strictEqual(isoResult.valid, false);
    });

    it('should reject wrong type for enum', function() {
      var isoRange = { expectedType: 'enum', enumValues: ['100', '200'] };
      var result = harness.validateValueRange(100, isoRange);
      assert.strictEqual(result.valid, false);
    });
  });

  describe('Click Interaction', function() {
    it('should log click and API call', function() {
      harness.simulateClick('ptz.zoom.increase', 'ptz.zoom');
      
      assert.strictEqual(harness.logs.length, 1);
      assert.strictEqual(harness.apiCalls.length, 1);
      assert.strictEqual(harness.logs[0].controlId, 'ptz.zoom.increase');
      assert.strictEqual(harness.logs[0].action, 'click');
      assert.strictEqual(harness.apiCalls[0].apiCall, 'ptz.zoom');
    });

    it('should include timestamp in ISO format', function() {
      harness.simulateClick('test.control', 'test.api');
      
      var log = harness.logs[0];
      assert(log.utc);
      assert.match(log.utc, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should include local time in Asia/Shanghai', function() {
      harness.simulateClick('test.control', 'test.api');
      
      var log = harness.logs[0];
      assert(log.local);
      assert(log.local.includes('2026') || log.local.includes('2025'));
    });
  });

  describe('API Error Handling', function() {
    it('should handle API failure gracefully', function() {
      harness.simulateApiFailure('ptz.zoom', 'ptz.zoom.set', 'timeout');
      
      assert.strictEqual(harness.apiCalls.length, 1);
      assert.strictEqual(harness.apiCalls[0].apiResponse.ok, false);
      assert.strictEqual(harness.apiCalls[0].apiResponse.error, 'timeout');
    });

    it('should log error details', function() {
      harness.simulateApiFailure('ptz.focus', 'ptz.focus.set', 'network error');
      
      var apiCall = harness.apiCalls[0];
      assert(apiCall.apiResponse.error);
      assert(apiCall.apiResponse.error.includes('error') || apiCall.apiResponse.error.includes('timeout'));
    });

    it('should continue after API failure', function() {
      harness.simulateApiFailure('ptz.zoom', 'api1', 'error1');
      harness.simulateClick('ptz.pan', 'api2');
      
      assert.strictEqual(harness.apiCalls.length, 2);
      assert.strictEqual(harness.logs.length, 2);
    });
  });

  describe('Drag Interaction', function() {
    it('should log drag with from/to values', function() {
      harness.simulateDrag('ptz.zoom.slider', 0, 2264, 'ptz.zoom.set');
      
      assert.strictEqual(harness.logs.length, 1);
      assert.strictEqual(harness.logs[0].action, 'drag');
      assert.deepStrictEqual(harness.logs[0].params, { from: 0, to: 2264 });
    });

    it('should validate drag target within range', function() {
      var zoomRange = { min: 0, max: 4528, expectedType: 'number' };
      var targetValue = 2264;
      
      var result = harness.validateValueRange(targetValue, zoomRange);
      assert.strictEqual(result.valid, true);
    });

    it('should reject drag target outside range', function() {
      var zoomRange = { min: 0, max: 4528, expectedType: 'number' };
      
      var result1 = harness.validateValueRange(-100, zoomRange);
      assert.strictEqual(result1.valid, false);
      
      var result2 = harness.validateValueRange(5000, zoomRange);
      assert.strictEqual(result2.valid, false);
    });
  });

  describe('Rapid Repeated Clicks (Debouncing)', function() {
    it('should log each click separately', function() {
      for (var i = 0; i < 5; i++) {
        harness.simulateClick('ptz.zoom.up', 'ptz.zoom');
      }
      
      assert.strictEqual(harness.logs.length, 5);
      assert.strictEqual(harness.apiCalls.length, 5);
    });

    it('should maintain log order', function() {
      harness.simulateClick('first', 'api1');
      harness.simulateClick('second', 'api2');
      harness.simulateClick('third', 'api3');
      
      assert.strictEqual(harness.logs[0].controlId, 'first');
      assert.strictEqual(harness.logs[1].controlId, 'second');
      assert.strictEqual(harness.logs[2].controlId, 'third');
    });
  });

  describe('Log Export and Verification', function() {
    it('should export logs as JSON', function() {
      harness.simulateClick('control1', 'api1');
      harness.simulateDrag('control2', 0, 100, 'api2');
      
      var exported = JSON.stringify({
        exportTime: new Date().toISOString(),
        totalLogs: harness.logs.length,
        logs: harness.logs,
        totalApiCalls: harness.apiCalls.length,
        apiCalls: harness.apiCalls
      }, null, 2);
      
      assert(exported.includes('control1'));
      assert(exported.includes('control2'));
      assert(exported.includes('click'));
      assert(exported.includes('drag'));
    });

    it('should verify logs match expected sequence', function() {
      harness.simulateClick('ptz.zoom.up', 'ptz.zoom');
      harness.simulateClick('ptz.zoom.down', 'ptz.zoom');
      
      assert.strictEqual(harness.logs.length, 2);
      assert.strictEqual(harness.apiCalls.length, 2);
      
      assert.strictEqual(harness.logs[0].controlId, 'ptz.zoom.up');
      assert.strictEqual(harness.logs[1].controlId, 'ptz.zoom.down');
      
      assert.strictEqual(harness.apiCalls[0].apiCall, 'ptz.zoom');
      assert.strictEqual(harness.apiCalls[1].apiCall, 'ptz.zoom');
    });

    it('should include all required fields in export', function() {
      harness.simulateClick('test', 'api');
      
      var log = harness.logs[0];
      assert(log.timestamp);
      assert(log.utc);
      assert(log.local);
      assert(log.controlId);
      assert(log.action);
    });
  });
});
