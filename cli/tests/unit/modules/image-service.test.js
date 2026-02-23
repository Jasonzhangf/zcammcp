/**
 * Image Service 单元测试
 * 测试图像服务的所有逻辑分支
 */

const assert = require('assert');

// 模拟 ImageService 类
class MockImageService {
  constructor() {
    this.baseUrl = 'http://127.0.0.1:17988';
    this.commands = [];
  }

  async setIso(value) {
    const validValues = ['100', '200', '400', '800', '1600', '3200', '6400', '12800', '25600', '51200', '102400'];
    if (!validValues.includes(value)) {
      throw new Error('Invalid ISO value: ' + value);
    }
    this.commands.push({ endpoint: '/ctrl/iso', params: { iso: value } });
    return { ok: true, value: value };
  }

  async setShutter(value) {
    if (!value || typeof value !== 'string') {
      throw new Error('Shutter value must be a string');
    }
    if (!value.startsWith('1/')) {
      throw new Error('Invalid shutter format: ' + value);
    }
    this.commands.push({ endpoint: '/ctrl/shutter', params: { shutter: value } });
    return { ok: true, value: value };
  }

  async getIso() {
    this.commands.push({ endpoint: '/ctrl/iso', method: 'GET' });
    return { ok: true, value: '800' };
  }

  async getShutter() {
    this.commands.push({ endpoint: '/ctrl/shutter', method: 'GET' });
    return { ok: true, value: '1/100' };
  }

  async setBrightness(value) {
    if (typeof value !== 'number' || value < 0 || value > 100) {
      throw new Error('Brightness must be a number between 0 and 100');
    }
    this.commands.push({ endpoint: '/ctrl/brightness', params: { brightness: value } });
    return { ok: true, value: value };
  }

  async setContrast(value) {
    if (typeof value !== 'number' || value < 0 || value > 100) {
      throw new Error('Contrast must be a number between 0 and 100');
    }
    this.commands.push({ endpoint: '/ctrl/contrast', params: { contrast: value } });
    return { ok: true, value: value };
  }

  async setSaturation(value) {
    if (typeof value !== 'number' || value < 0 || value > 100) {
      throw new Error('Saturation must be a number between 0 and 100');
    }
    this.commands.push({ endpoint: '/ctrl/saturation', params: { saturation: value } });
    return { ok: true, value: value };
  }

  async reset() {
    this.commands.push({ endpoint: '/ctrl/image/reset', method: 'POST' });
    return { ok: true };
  }

  getCommandHistory() {
    return this.commands;
  }

  clearCommands() {
    this.commands = [];
  }
}

describe('Image Service', function() {
  var service;

  beforeEach(function() {
    service = new MockImageService();
  });

  describe('ISO Control', function() {
    it('should set valid ISO values', async function() {
      var validIsos = ['100', '400', '1600', '6400', '25600'];
      
      for (var i = 0; i < validIsos.length; i++) {
        var iso = validIsos[i];
        var result = await service.setIso(iso);
        assert.strictEqual(result.ok, true);
        assert.strictEqual(result.value, iso);
      }
    });

    it('should reject invalid ISO values', async function() {
      var invalidIsos = ['50', '999', 'abc', '', null, undefined];
      
      for (var i = 0; i < invalidIsos.length; i++) {
        var iso = invalidIsos[i];
        try {
          await service.setIso(iso);
          assert.fail('Should have thrown for ISO: ' + iso);
        } catch (err) {
          assert(err.message.includes('Invalid'));
        }
      }
    });

    it('should log ISO command', async function() {
      await service.setIso('800');
      var history = service.getCommandHistory();
      assert.strictEqual(history.length, 1);
      assert.strictEqual(history[0].endpoint, '/ctrl/iso');
      assert.deepStrictEqual(history[0].params, { iso: '800' });
    });

    it('should get current ISO', async function() {
      var result = await service.getIso();
      assert.strictEqual(result.ok, true);
      assert.strictEqual(result.value, '800');
    });
  });

  describe('Shutter Control', function() {
    it('should set valid shutter values', async function() {
      var validShutters = ['1/100', '1/500', '1/2000', '1/10000'];
      
      for (var i = 0; i < validShutters.length; i++) {
        var shutter = validShutters[i];
        var result = await service.setShutter(shutter);
        assert.strictEqual(result.ok, true);
        assert.strictEqual(result.value, shutter);
      }
    });

    it('should reject non-string shutter values', async function() {
      var invalidValues = [null, undefined];
      
      for (var i = 0; i < invalidValues.length; i++) {
        var value = invalidValues[i];
        try {
          await service.setShutter(value);
          assert.fail('Should have thrown for value: ' + value);
        } catch (err) {
          assert(err.message.includes('must be a string'));
        }
      }
    });

    it('should reject invalid shutter format', async function() {
      var invalidFormats = ['100', 'abc', ''];
      
      for (var i = 0; i < invalidFormats.length; i++) {
        var value = invalidFormats[i];
        try {
          await service.setShutter(value);
          assert.fail('Should have thrown for format: ' + value);
        } catch (err) {
          // Some errors are about 'must be a string' or other validation
          assert(err.message.includes('Invalid') || err.message.includes('must be'));
        }
      }
    });

    it('should log shutter command', async function() {
      await service.setShutter('1/200');
      var history = service.getCommandHistory();
      assert.strictEqual(history.length, 1);
      assert.strictEqual(history[0].endpoint, '/ctrl/shutter');
    });

    it('should get current shutter', async function() {
      var result = await service.getShutter();
      assert.strictEqual(result.ok, true);
      assert.strictEqual(result.value, '1/100');
    });
  });

  describe('Brightness Control', function() {
    it('should set valid brightness values', async function() {
      var validValues = [0, 25, 50, 75, 100];
      
      for (var i = 0; i < validValues.length; i++) {
        var value = validValues[i];
        var result = await service.setBrightness(value);
        assert.strictEqual(result.ok, true);
        assert.strictEqual(result.value, value);
      }
    });

    it('should reject brightness below 0', async function() {
      try {
        await service.setBrightness(-1);
        assert.fail('Should have thrown');
      } catch (err) {
        assert(err.message.includes('between 0 and 100'));
      }
    });

    it('should reject brightness above 100', async function() {
      try {
        await service.setBrightness(101);
        assert.fail('Should have thrown');
      } catch (err) {
        assert(err.message.includes('between 0 and 100'));
      }
    });

    it('should reject non-numeric brightness', async function() {
      try {
        await service.setBrightness('50');
        assert.fail('Should have thrown');
      } catch (err) {
        assert(err.message.includes('must be a number'));
      }
    });
  });

  describe('Contrast Control', function() {
    it('should set valid contrast values', async function() {
      var validValues = [0, 50, 100];
      
      for (var i = 0; i < validValues.length; i++) {
        var value = validValues[i];
        var result = await service.setContrast(value);
        assert.strictEqual(result.ok, true);
        assert.strictEqual(result.value, value);
      }
    });

    it('should reject contrast outside range', async function() {
      try {
        await service.setContrast(-10);
        assert.fail('Should have thrown');
      } catch (err) {
        assert(err.message.includes('between 0 and 100'));
      }
      
      try {
        await service.setContrast(110);
        assert.fail('Should have thrown');
      } catch (err) {
        assert(err.message.includes('between 0 and 100'));
      }
    });
  });

  describe('Saturation Control', function() {
    it('should set valid saturation values', async function() {
      var validValues = [0, 25, 50, 75, 100];
      
      for (var i = 0; i < validValues.length; i++) {
        var value = validValues[i];
        var result = await service.setSaturation(value);
        assert.strictEqual(result.ok, true);
        assert.strictEqual(result.value, value);
      }
    });

    it('should reject saturation outside range', async function() {
      try {
        await service.setSaturation(-5);
        assert.fail('Should have thrown');
      } catch (err) {
        assert(err.message.includes('between 0 and 100'));
      }
    });
  });

  describe('Reset Function', function() {
    it('should send reset command', async function() {
      var result = await service.reset();
      assert.strictEqual(result.ok, true);
      
      var history = service.getCommandHistory();
      assert.strictEqual(history.length, 1);
      assert.strictEqual(history[0].endpoint, '/ctrl/image/reset');
      assert.strictEqual(history[0].method, 'POST');
    });
  });

  describe('Command History', function() {
    it('should track all commands', async function() {
      await service.setIso('800');
      await service.setShutter('1/100');
      await service.setBrightness(50);
      
      var history = service.getCommandHistory();
      assert.strictEqual(history.length, 3);
      assert.strictEqual(history[0].endpoint, '/ctrl/iso');
      assert.strictEqual(history[1].endpoint, '/ctrl/shutter');
      assert.strictEqual(history[2].endpoint, '/ctrl/brightness');
    });

    it('should clear command history', async function() {
      await service.setIso('800');
      service.clearCommands();
      
      var history = service.getCommandHistory();
      assert.strictEqual(history.length, 0);
    });
  });

  describe('Sequential Operations', function() {
    it('should handle multiple operations in sequence', async function() {
      await service.setIso('400');
      await service.setShutter('1/200');
      await service.setBrightness(60);
      await service.setContrast(70);
      await service.setSaturation(80);
      
      var history = service.getCommandHistory();
      assert.strictEqual(history.length, 5);
    });

    it('should maintain operation order', async function() {
      await service.setIso('1600');
      await service.getIso();
      await service.setShutter('1/500');
      await service.getShutter();
      
      var history = service.getCommandHistory();
      assert.strictEqual(history[0].method, undefined); // set
      assert.strictEqual(history[1].method, 'GET');
      assert.strictEqual(history[2].method, undefined); // set
      assert.strictEqual(history[3].method, 'GET');
    });
  });

  describe('Error Recovery', function() {
    it('should continue after invalid ISO', async function() {
      try {
        await service.setIso('invalid');
      } catch (err) {
        // Expected
      }
      
      var result = await service.setIso('800');
      assert.strictEqual(result.ok, true);
    });

    it('should continue after invalid shutter', async function() {
      try {
        await service.setShutter('invalid');
      } catch (err) {
        // Expected
      }
      
      var result = await service.setShutter('1/100');
      assert.strictEqual(result.ok, true);
    });
  });
});
