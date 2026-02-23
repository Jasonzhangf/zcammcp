/**
 * White Balance Control 单元测试
 * 测试 AWB/色温等白平衡控件
 */

const assert = require('assert');

// AWB 模式定义
const AWB_MODES = ['Auto', 'Manual', 'Indoor', 'Outdoor', 'Daylight', 'Cloudy', 'Tungsten', 'Fluorescent'];

// 色温范围
const TEMP_RANGE = { min: 2000, max: 15000, step: 100 };

class WhiteBalanceHarness {
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

  validateAwbMode(mode) {
    if (!AWB_MODES.includes(mode)) {
      return { valid: false, error: 'Invalid AWB mode: ' + mode };
    }
    return { valid: true };
  }

  validateTemperature(temp) {
    if (typeof temp !== 'number') {
      return { valid: false, error: 'Temperature must be a number' };
    }
    if (temp < TEMP_RANGE.min || temp > TEMP_RANGE.max) {
      return { valid: false, error: 'Temperature ' + temp + ' out of range [' + TEMP_RANGE.min + ', ' + TEMP_RANGE.max + ']' };
    }
    if ((temp - TEMP_RANGE.min) % TEMP_RANGE.step !== 0) {
      return { valid: false, error: 'Temperature ' + temp + ' not aligned to step ' + TEMP_RANGE.step };
    }
    return { valid: true };
  }

  simulateSetAwbMode(mode) {
    this.log('wb.mode', 'set', { mode });
    const validation = this.validateAwbMode(mode);
    if (validation.valid) {
      this.logApiCall('/ctrl/awb', { mode }, { ok: true, mode });
    } else {
      this.logApiCall('/ctrl/awb', { mode }, { ok: false, error: validation.error });
    }
    return validation;
  }

  simulateSetTemperature(temp) {
    this.log('wb.temperature', 'set', { temperature: temp });
    const validation = this.validateTemperature(temp);
    if (validation.valid) {
      this.logApiCall('/ctrl/temp', { temperature: temp }, { ok: true, value: temp });
    } else {
      this.logApiCall('/ctrl/temp', { temperature: temp }, { ok: false, error: validation.error });
    }
    return validation;
  }

  simulateGetTemperature() {
    this.log('wb.temperature', 'get');
    this.logApiCall('/ctrl/temp', {}, { ok: true, value: 5600 });
  }

  simulateToggleAwb() {
    this.log('wb.toggle', 'toggle');
    this.logApiCall('/ctrl/awb', { toggle: true }, { ok: true });
  }
}

describe('White Balance Control', function() {
  var harness;

  beforeEach(function() {
    harness = new WhiteBalanceHarness();
  });

  describe('AWB Mode Validation', function() {
    it('should accept valid AWB modes', function() {
      var validModes = ['Auto', 'Manual', 'Indoor', 'Outdoor', 'Daylight', 'Cloudy', 'Tungsten', 'Fluorescent'];
      
      validModes.forEach(function(mode) {
        var result = harness.validateAwbMode(mode);
        assert.strictEqual(result.valid, true, 'AWB mode ' + mode + ' should be valid');
      });
    });

    it('should reject invalid AWB modes', function() {
      var invalidModes = ['auto', 'AUTO', 'Unknown', '', null, undefined, 123];
      
      invalidModes.forEach(function(mode) {
        var result = harness.validateAwbMode(mode);
        assert.strictEqual(result.valid, false, 'AWB mode ' + mode + ' should be invalid');
      });
    });

    it('should log AWB mode set operation', function() {
      harness.simulateSetAwbMode('Daylight');
      
      assert.strictEqual(harness.logs.length, 1);
      assert.strictEqual(harness.logs[0].controlId, 'wb.mode');
      assert.strictEqual(harness.logs[0].action, 'set');
      assert.deepStrictEqual(harness.logs[0].params, { mode: 'Daylight' });
    });

    it('should log AWB API call on success', function() {
      harness.simulateSetAwbMode('Indoor');
      
      assert.strictEqual(harness.apiCalls.length, 1);
      assert.strictEqual(harness.apiCalls[0].endpoint, '/ctrl/awb');
      assert.deepStrictEqual(harness.apiCalls[0].request, { mode: 'Indoor' });
    });

    it('should log error on invalid AWB mode', function() {
      harness.simulateSetAwbMode('Invalid');
      
      assert.strictEqual(harness.apiCalls.length, 1);
      assert.strictEqual(harness.apiCalls[0].response.ok, false);
      assert(harness.apiCalls[0].response.error.includes('Invalid'));
    });
  });

  describe('Temperature Validation', function() {
    it('should accept valid temperature values', function() {
      var validTemps = [2000, 3200, 5600, 6500, 10000, 15000];
      
      validTemps.forEach(function(temp) {
        var result = harness.validateTemperature(temp);
        assert.strictEqual(result.valid, true, 'Temperature ' + temp + ' should be valid');
      });
    });

    it('should reject temperature below min', function() {
      var result = harness.validateTemperature(1900);
      assert.strictEqual(result.valid, false);
      assert(result.error.includes('out of range'));
    });

    it('should reject temperature above max', function() {
      var result = harness.validateTemperature(15100);
      assert.strictEqual(result.valid, false);
      assert(result.error.includes('out of range'));
    });

    it('should reject non-numeric temperature', function() {
      var result1 = harness.validateTemperature('5600');
      assert.strictEqual(result1.valid, false);
      
      var result2 = harness.validateTemperature(null);
      assert.strictEqual(result2.valid, false);
    });

    it('should reject temperature not aligned to step', function() {
      var result = harness.validateTemperature(5650);
      assert.strictEqual(result.valid, false);
      assert(result.error.includes('not aligned'));
    });

    it('should log temperature set operation', function() {
      harness.simulateSetTemperature(5600);
      
      assert.strictEqual(harness.logs.length, 1);
      assert.strictEqual(harness.logs[0].controlId, 'wb.temperature');
      assert.strictEqual(harness.logs[0].action, 'set');
    });

    it('should log temperature API call on success', function() {
      harness.simulateSetTemperature(6500);
      
      assert.strictEqual(harness.apiCalls.length, 1);
      assert.strictEqual(harness.apiCalls[0].endpoint, '/ctrl/temp');
      assert.deepStrictEqual(harness.apiCalls[0].request, { temperature: 6500 });
    });

    it('should log error on invalid temperature', function() {
      harness.simulateSetTemperature(99999);
      
      assert.strictEqual(harness.apiCalls.length, 1);
      assert.strictEqual(harness.apiCalls[0].response.ok, false);
    });

    it('should log temperature get operation', function() {
      harness.simulateGetTemperature();
      
      assert.strictEqual(harness.logs.length, 1);
      assert.strictEqual(harness.logs[0].action, 'get');
    });
  });

  describe('AWB Toggle', function() {
    it('should log toggle operation', function() {
      harness.simulateToggleAwb();
      
      assert.strictEqual(harness.logs.length, 1);
      assert.strictEqual(harness.logs[0].action, 'toggle');
    });

    it('should log toggle API call', function() {
      harness.simulateToggleAwb();
      
      assert.strictEqual(harness.apiCalls.length, 1);
      assert.strictEqual(harness.apiCalls[0].endpoint, '/ctrl/awb');
      assert.deepStrictEqual(harness.apiCalls[0].request, { toggle: true });
    });
  });

  describe('Sequential Operations', function() {
    it('should handle mode then temperature change', function() {
      harness.simulateSetAwbMode('Manual');
      harness.simulateSetTemperature(5600);
      
      assert.strictEqual(harness.logs.length, 2);
      assert.strictEqual(harness.logs[0].controlId, 'wb.mode');
      assert.strictEqual(harness.logs[1].controlId, 'wb.temperature');
    });

    it('should handle multiple temperature changes', function() {
      harness.simulateSetTemperature(3200);
      harness.simulateSetTemperature(5600);
      harness.simulateSetTemperature(6500);
      
      assert.strictEqual(harness.logs.length, 3);
      assert.strictEqual(harness.apiCalls.length, 3);
    });

    it('should maintain operation order', function() {
      harness.simulateGetTemperature();
      harness.simulateSetAwbMode('Auto');
      harness.simulateSetTemperature(5600);
      
      assert.strictEqual(harness.logs[0].action, 'get');
      assert.strictEqual(harness.logs[1].action, 'set');
      assert.strictEqual(harness.logs[2].action, 'set');
    });
  });

  describe('Error Handling', function() {
    it('should continue after invalid mode', function() {
      harness.simulateSetAwbMode('Invalid');
      harness.simulateSetAwbMode('Auto');
      
      assert.strictEqual(harness.logs.length, 2);
      assert.strictEqual(harness.apiCalls.length, 2);
    });

    it('should continue after invalid temperature', function() {
      harness.simulateSetTemperature(99999);
      harness.simulateSetTemperature(5600);
      
      assert.strictEqual(harness.logs.length, 2);
      assert.strictEqual(harness.apiCalls.length, 2);
    });

    it('should track errors separately', function() {
      harness.simulateSetAwbMode('Invalid');
      
      var failedCall = harness.apiCalls.find(function(call) {
        return !call.response.ok;
      });
      
      assert(failedCall);
      assert(failedCall.response.error);
    });
  });

  describe('Log Format', function() {
    it('should include all required fields', function() {
      harness.simulateSetTemperature(5600);
      
      var log = harness.logs[0];
      assert(log.timestamp);
      assert(log.utc);
      assert(log.local);
      assert(log.controlId);
      assert(log.action);
      assert(log.params);
    });

    it('should use ISO 8601 format for UTC', function() {
      harness.simulateSetAwbMode('Auto');
      
      var log = harness.logs[0];
      assert.match(log.utc, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });
});
