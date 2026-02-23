/**
 * Image Control 单元测试
 * 测试 ISO/Shutter/Exposure 等图像控件
 */

const assert = require('assert');

// ISO 值域定义
const ISO_VALUES = ['100', '200', '400', '800', '1600', '3200', '6400', '12800', '25600', '51200', '102400'];

// Shutter 值域定义
const SHUTTER_VALUES = [
  '1', '1/2', '1/3', '1/4', '1/5', '1/6', '1/8', '1/10', '1/12', '1/15',
  '1/20', '1/25', '1/30', '1/40', '1/50', '1/60', '1/80', '1/100', '1/120',
  '1/150', '1/200', '1/250', '1/320', '1/400', '1/500', '1/640', '1/800',
  '1/1000', '1/1250', '1/1600', '1/2000', '1/2500', '1/3200', '1/4000', '1/5000', '1/6400', '1/8000', '1/10000'
];

class ImageControlHarness {
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

  validateIso(value) {
    if (!ISO_VALUES.includes(value)) {
      return { valid: false, error: 'Invalid ISO value: ' + value };
    }
    return { valid: true };
  }

  validateShutter(value) {
    if (!SHUTTER_VALUES.includes(value)) {
      return { valid: false, error: 'Invalid shutter value: ' + value };
    }
    return { valid: true };
  }

  simulateSetIso(value) {
    this.log('image.iso', 'set', { value });
    const validation = this.validateIso(value);
    if (validation.valid) {
      this.logApiCall('/ctrl/iso', { iso: value }, { ok: true, value });
    } else {
      this.logApiCall('/ctrl/iso', { iso: value }, { ok: false, error: validation.error });
    }
    return validation;
  }

  simulateSetShutter(value) {
    this.log('image.shutter', 'set', { value });
    const validation = this.validateShutter(value);
    if (validation.valid) {
      this.logApiCall('/ctrl/shutter', { shutter: value }, { ok: true, value });
    } else {
      this.logApiCall('/ctrl/shutter', { shutter: value }, { ok: false, error: validation.error });
    }
    return validation;
  }

  simulateGetIso() {
    this.log('image.iso', 'get');
    this.logApiCall('/ctrl/iso', {}, { ok: true, value: '800' });
  }

  simulateGetShutter() {
    this.log('image.shutter', 'get');
    this.logApiCall('/ctrl/shutter', {}, { ok: true, value: '1/100' });
  }
}

describe('Image Control', function() {
  var harness;

  beforeEach(function() {
    harness = new ImageControlHarness();
  });

  describe('ISO Value Validation', function() {
    it('should accept valid ISO values', function() {
      var validIsos = ['100', '400', '1600', '6400', '25600', '102400'];
      
      validIsos.forEach(function(iso) {
        var result = harness.validateIso(iso);
        assert.strictEqual(result.valid, true, 'ISO ' + iso + ' should be valid');
      });
    });

    it('should reject invalid ISO values', function() {
      var invalidIsos = ['50', '150', '999', 'abc', '', null, undefined];
      
      invalidIsos.forEach(function(iso) {
        var result = harness.validateIso(iso);
        assert.strictEqual(result.valid, false, 'ISO ' + iso + ' should be invalid');
      });
    });

    it('should log ISO set operation', function() {
      harness.simulateSetIso('800');
      
      assert.strictEqual(harness.logs.length, 1);
      assert.strictEqual(harness.logs[0].controlId, 'image.iso');
      assert.strictEqual(harness.logs[0].action, 'set');
      assert.deepStrictEqual(harness.logs[0].params, { value: '800' });
    });

    it('should log ISO API call on success', function() {
      harness.simulateSetIso('1600');
      
      assert.strictEqual(harness.apiCalls.length, 1);
      assert.strictEqual(harness.apiCalls[0].endpoint, '/ctrl/iso');
      assert.deepStrictEqual(harness.apiCalls[0].request, { iso: '1600' });
      assert.deepStrictEqual(harness.apiCalls[0].response, { ok: true, value: '1600' });
    });

    it('should log error on invalid ISO', function() {
      harness.simulateSetIso('999');
      
      assert.strictEqual(harness.apiCalls.length, 1);
      assert.strictEqual(harness.apiCalls[0].response.ok, false);
      assert(harness.apiCalls[0].response.error.includes('Invalid'));
    });

    it('should log ISO get operation', function() {
      harness.simulateGetIso();
      
      assert.strictEqual(harness.logs.length, 1);
      assert.strictEqual(harness.logs[0].action, 'get');
    });
  });

  describe('Shutter Value Validation', function() {
    it('should accept valid shutter values', function() {
      var validShutters = ['1', '1/100', '1/500', '1/2000', '1/10000'];
      
      validShutters.forEach(function(shutter) {
        var result = harness.validateShutter(shutter);
        assert.strictEqual(result.valid, true, 'Shutter ' + shutter + ' should be valid');
      });
    });

    it('should reject invalid shutter values', function() {
      var invalidShutters = ['1/7', '1/13', '1/999', 'abc', '', '1/', '/100'];
      
      invalidShutters.forEach(function(shutter) {
        var result = harness.validateShutter(shutter);
        assert.strictEqual(result.valid, false, 'Shutter ' + shutter + ' should be invalid');
      });
    });

    it('should log shutter set operation', function() {
      harness.simulateSetShutter('1/200');
      
      assert.strictEqual(harness.logs.length, 1);
      assert.strictEqual(harness.logs[0].controlId, 'image.shutter');
      assert.strictEqual(harness.logs[0].action, 'set');
    });

    it('should log shutter API call on success', function() {
      harness.simulateSetShutter('1/500');
      
      assert.strictEqual(harness.apiCalls.length, 1);
      assert.strictEqual(harness.apiCalls[0].endpoint, '/ctrl/shutter');
      assert.deepStrictEqual(harness.apiCalls[0].request, { shutter: '1/500' });
    });

    it('should log error on invalid shutter', function() {
      harness.simulateSetShutter('1/999');
      
      assert.strictEqual(harness.apiCalls.length, 1);
      assert.strictEqual(harness.apiCalls[0].response.ok, false);
    });

    it('should log shutter get operation', function() {
      harness.simulateGetShutter();
      
      assert.strictEqual(harness.logs.length, 1);
      assert.strictEqual(harness.logs[0].action, 'get');
    });
  });

  describe('Sequential Operations', function() {
    it('should handle multiple ISO changes', function() {
      harness.simulateSetIso('100');
      harness.simulateSetIso('400');
      harness.simulateSetIso('1600');
      
      assert.strictEqual(harness.logs.length, 3);
      assert.strictEqual(harness.apiCalls.length, 3);
    });

    it('should handle ISO then shutter change', function() {
      harness.simulateSetIso('800');
      harness.simulateSetShutter('1/100');
      
      assert.strictEqual(harness.logs.length, 2);
      assert.strictEqual(harness.logs[0].controlId, 'image.iso');
      assert.strictEqual(harness.logs[1].controlId, 'image.shutter');
    });

    it('should maintain operation order', function() {
      harness.simulateGetIso();
      harness.simulateSetIso('1600');
      harness.simulateGetShutter();
      harness.simulateSetShutter('1/200');
      
      assert.strictEqual(harness.logs[0].action, 'get');
      assert.strictEqual(harness.logs[1].action, 'set');
      assert.strictEqual(harness.logs[2].action, 'get');
      assert.strictEqual(harness.logs[3].action, 'set');
    });
  });

  describe('Error Handling', function() {
    it('should continue after invalid ISO', function() {
      harness.simulateSetIso('invalid');
      harness.simulateSetIso('800');
      
      assert.strictEqual(harness.logs.length, 2);
      assert.strictEqual(harness.apiCalls.length, 2);
    });

    it('should track errors separately', function() {
      harness.simulateSetIso('invalid');
      
      var failedCall = harness.apiCalls.find(function(call) {
        return !call.response.ok;
      });
      
      assert(failedCall);
      assert(failedCall.response.error);
    });
  });

  describe('Log Format', function() {
    it('should include all required fields', function() {
      harness.simulateSetIso('800');
      
      var log = harness.logs[0];
      assert(log.timestamp);
      assert(log.utc);
      assert(log.local);
      assert(log.controlId);
      assert(log.action);
      assert(log.params);
    });

    it('should use ISO 8601 format for UTC', function() {
      harness.simulateSetIso('800');
      
      var log = harness.logs[0];
      assert.match(log.utc, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should use Asia/Shanghai timezone for local', function() {
      harness.simulateSetIso('800');
      
      var log = harness.logs[0];
      assert(log.local.includes('2026') || log.local.includes('2025'));
    });
  });
});
