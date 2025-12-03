/**
 * 控制服务单元测试 - 真实API连接测试
 * 测试PTZ云台控制和镜头控制功能
 */

const ControlService = require('../../../../src/modules/control/service');
const CameraControlManager = require('../../../../src/core/camera-control-manager');
const { ZCamAPI } = require('../../../../src/core/api');
const { APIError, ConnectionError } = require('../../../../src/utils/errors');

// 测试相机配置
const TEST_CAMERA = {
  host: '192.168.9.59',
  port: 80,
  timeout: 15000
};

describe('ControlService', () => {
  let api;
  let controlManager;

  beforeEach(async () => {
    api = new ZCamAPI(TEST_CAMERA);
    controlManager = new CameraControlManager(api);

    // 自动获取控制权
    await controlManager.ensureControl('recording');
    console.log('✅ 控制权管理器初始化完成');
  });

  afterEach(async () => {
    // 清理资源：释放控制权和会话
    try {
      await controlManager.cleanup();
      await api.sessionQuit();
    } catch (error) {
      console.warn('⚠️ 清理资源时出错:', error.message);
    }
  });

  // ===== PTZ位置查询测试 =====
  describe('PTZ位置查询', () => {
    test('应该获取PTZ当前位置', async () => {
      // 验证控制权上下文
      expect(controlManager.validateControlContext()).toBe(true);

      const result = await controlManager.ensureControlContext(async () => {
        return await ControlService.getPTZPosition(api);
      });

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      // PTZ控制API返回connected和status字段，不是code字段
      expect(result.connected).toBe(true);
      expect(result.status).toBe('okay');

      console.log('PTZ位置信息:', JSON.stringify(result, null, 2));
    });

    test('应该获取PTZ详细信息', async () => {
      // 验证控制权上下文
      expect(controlManager.validateControlContext()).toBe(true);

      const result = await controlManager.ensureControlContext(async () => {
        return await ControlService.getPTZDetail(api);
      });

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      // PTZ控制API返回connected和status字段，不是code字段
      expect(result.connected).toBe(true);
      expect(result.status).toBe('okay');

      console.log('PTZ详细信息:', JSON.stringify(result, null, 2));
    });
  });

  // ===== PTZ方向移动测试 =====
  describe('PTZ方向移动', () => {
    const directions = ['up', 'down', 'left', 'right', 'up-left', 'up-right', 'down-left', 'down-right'];

    test.each(directions)('应该支持%s方向移动', async (direction) => {
      // 验证控制权上下文
      expect(controlManager.validateControlContext()).toBe(true);

      const result = await controlManager.ensureControlContext(async () => {
        return await ControlService.ptzDirectionMove(api, direction, 5);
      });

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      // PTZ移动操作API返回connected和status字段，不是code字段
      expect(result.connected).toBe(true);
      expect(result.status).toBe('okay');

      // 短暂移动后停止
      await new Promise(resolve => setTimeout(resolve, 500));
      await controlManager.ensureControlContext(async () => {
        return await ControlService.ptzStop(api);
      });
    });

    test('应该拒绝无效方向', async () => {
      const invalidDirections = ['invalid', 'diagonal', '45deg'];

      for (const direction of invalidDirections) {
        await expect(ControlService.ptzDirectionMove(api, direction, 5)).rejects.toThrow();
      }
    });

    test('应该拒绝无效速度值', async () => {
      const invalidSpeeds = [0, 10, -1, 'invalid', null];

      for (const speed of invalidSpeeds) {
        await expect(ControlService.ptzDirectionMove(api, 'up', speed)).rejects.toThrow();
      }
    });
  });

  // ===== PTZ精确控制测试 =====
  describe('PTZ精确控制', () => {
    test('应该执行精确PTZ移动', async () => {
      const testCases = [
        { pan: 3, tilt: 2 },
        { pan: 5, tilt: 5 },
        { pan: 2, tilt: 7 }
      ];

      for (const { pan, tilt } of testCases) {
        const result = await controlManager.ensureControlContext(async () => {
          return await ControlService.ptzMove(api, pan, tilt);
        });

        expect(result).toBeDefined();
        expect(typeof result).toBe('object');
        // PTZ移动操作API返回connected和status字段，不是code字段
        expect(result.connected).toBe(true);
        expect(result.status).toBe('okay');

        // 短暂移动后停止
        await new Promise(resolve => setTimeout(resolve, 500));
        await controlManager.ensureControlContext(async () => {
          return await ControlService.ptzStop(api);
        });
      }
    });

    test('应该拒绝无效的精确移动参数', async () => {
      const invalidCases = [
        { pan: -1, tilt: 5, reason: '负数pan' },
        { pan: 5, tilt: 10, reason: '超出范围tilt' },
        { pan: 'invalid', tilt: 5, reason: '非数字pan' },
        { pan: 5, tilt: null, reason: 'null tilt' }
      ];

      for (const { pan, tilt, reason } of invalidCases) {
        await expect(ControlService.ptzMove(api, pan, tilt)).rejects.toThrow();
      }
    });
  });

  // ===== PTZ停止控制测试 =====
  describe('PTZ停止控制', () => {
    test('应该停止PTZ移动', async () => {
      // 先开始移动
      await ControlService.ptzDirectionMove(api, 'up', 5);

      // 等待一小段时间
      await new Promise(resolve => setTimeout(resolve, 500));

      // 停止移动
      const result = await ControlService.ptzStop(api);

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      expect(result.connected).toBe(true); expect(result.status).toBe("okay");
    });

    test('应该停止所有PTZ移动', async () => {
      const result = await ControlService.ptzStopAll(api);

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      expect(result.connected).toBe(true); expect(result.status).toBe("okay");
    });
  });

  // ===== PTZ重置和回原点测试 =====
  describe('PTZ重置操作', () => {
    test('应该执行PTZ回原点', async () => {
      const result = await ControlService.ptzHome(api);

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      expect(result.connected).toBe(true); expect(result.status).toBe("okay");

      // 回原点需要时间，等待完成
      await new Promise(resolve => setTimeout(resolve, 3000));
    });

    test('应该重置PTZ', async () => {
      const result = await ControlService.ptzReset(api);

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      expect(result.connected).toBe(true); expect(result.status).toBe("okay");

      // 重置需要时间，等待完成
      await new Promise(resolve => setTimeout(resolve, 3000));
    });
  });

  // ===== PTZ限制设置测试 =====
  describe('PTZ限制设置', () => {
    test('应该设置PTZ起始限制', async () => {
      const result = await ControlService.ptzLimitUpdate(api, 'start', -100, 50);

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      expect(result.connected).toBe(true); expect(result.status).toBe("okay");
    });

    test('应该设置PTZ结束限制', async () => {
      const result = await ControlService.ptzLimitUpdate(api, 'end', 100, -50);

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      expect(result.connected).toBe(true); expect(result.status).toBe("okay");
    });

    test('应该拒绝无效限制方向', async () => {
      const invalidDirections = ['invalid', 'middle', 'center'];

      for (const direction of invalidDirections) {
        await expect(ControlService.ptzLimitUpdate(api, direction, 0, 0)).rejects.toThrow();
      }
    });

    test('应该拒绝无效限制参数', async () => {
      const invalidCases = [
        { direction: 'start', pan: 'invalid', tilt: 0 },
        { direction: 'end', pan: 0, tilt: null },
        { direction: 'start', pan: NaN, tilt: 0 }
      ];

      for (const { direction, pan, tilt } of invalidCases) {
        await expect(ControlService.ptzLimitUpdate(api, direction, pan, tilt)).rejects.toThrow();
      }
    });
  });

  // ===== PTZ限制控制测试 =====
  describe('PTZ限制控制', () => {
    test('应该启用PTZ限制', async () => {
      const result = await ControlService.setPTZLimit(api, true);

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      expect(result.connected).toBe(true); expect(result.status).toBe("okay");

      // 验证设置是否生效
      const status = await ControlService.getPTZLimit(api);
      expect(status).toBeDefined();
      expect(status.code).toBe(0);
    });

    test('应该禁用PTZ限制', async () => {
      const result = await ControlService.setPTZLimit(api, false);

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      expect(result.connected).toBe(true); expect(result.status).toBe("okay");

      // 验证设置是否生效
      const status = await ControlService.getPTZLimit(api);
      expect(status).toBeDefined();
      expect(status.code).toBe(0);
    });

    test('应该获取PTZ限制状态', async () => {
      const result = await ControlService.getPTZLimit(api);

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      expect(result.connected).toBe(true); expect(result.status).toBe("okay");

      if (result.value !== undefined) {
        console.log('PTZ限制状态:', result.value);
      }
    });

    test('应该支持多种启用/禁用格式', async () => {
      const enableCases = [true, '1', 'on'];
      const disableCases = [false, '0', 'off'];

      // 测试启用
      for (const enable of enableCases) {
        const result = await ControlService.setPTZLimit(api, enable);
        expect(result.connected).toBe(true); expect(result.status).toBe("okay");
      }

      // 测试禁用
      for (const disable of disableCases) {
        const result = await ControlService.setPTZLimit(api, disable);
        expect(result.connected).toBe(true); expect(result.status).toBe("okay");
      }
    });
  });

  // ===== PTZ速度模式测试 =====
  describe('PTZ速度模式', () => {
    test('应该设置PTZ速度模式', async () => {
      const modes = ['normal', 'precision', 'fast'];

      for (const mode of modes) {
        const result = await ControlService.setPTZSpeedMode(api, mode);

        expect(result).toBeDefined();
        expect(typeof result).toBe('object');
        expect(result.connected).toBe(true); expect(result.status).toBe("okay");

        console.log(`设置速度模式 ${mode}:`, JSON.stringify(result, null, 2));
      }
    });

    test('应该拒绝无效速度模式', async () => {
      const invalidModes = ['invalid', 'slow', 'quick', 'medium'];

      for (const mode of invalidModes) {
        await expect(ControlService.setPTZSpeedMode(api, mode)).rejects.toThrow();
      }
    });
  });

  // ===== 变焦控制测试 =====
  describe('变焦控制', () => {
    test('应该执行变焦操作', async () => {
      const directions = ['in', 'out'];

      for (const direction of directions) {
        const result = await ControlService.zoom(api, direction, 5);

        expect(result).toBeDefined();
        expect(typeof result).toBe('object');
        expect(result.connected).toBe(true); expect(result.status).toBe("okay");

        // 短暂变焦后停止
        await new Promise(resolve => setTimeout(resolve, 500));
        await ControlService.zoomStop(api);
      }
    });

    test('应该停止变焦', async () => {
      const result = await ControlService.zoomStop(api);

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      expect(result.connected).toBe(true); expect(result.status).toBe("okay");
    });

    test('应该执行精确变焦', async () => {
      const testValues = [1000, 2000, 3000];

      for (const value of testValues) {
        const result = await ControlService.zoomValue(api, value);

        expect(result).toBeDefined();
        expect(typeof result).toBe('object');
        expect(result.connected).toBe(true); expect(result.status).toBe("okay");

        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    });

    test('应该拒绝无效变焦参数', async () => {
      const invalidCases = [
        { direction: 'invalid', speed: 5, reason: '无效方向' },
        { direction: 'in', speed: 10, reason: '超出范围速度' },
        { direction: 'out', speed: -1, reason: '负数速度' },
        { direction: null, speed: 5, reason: 'null方向' }
      ];

      for (const { direction, speed, reason } of invalidCases) {
        await expect(ControlService.zoom(api, direction, speed)).rejects.toThrow();
      }
    });
  });

  // ===== 焦点控制测试 =====
  describe('焦点控制', () => {
    test('应该执行手动对焦', async () => {
      const directions = ['near', 'far'];

      for (const direction of directions) {
        const result = await ControlService.focus(api, direction, 5);

        expect(result).toBeDefined();
        expect(typeof result).toBe('object');
        expect(result.connected).toBe(true); expect(result.status).toBe("okay");

        // 短暂对焦后停止
        await new Promise(resolve => setTimeout(resolve, 500));
        await ControlService.focusStop(api);
      }
    });

    test('应该执行精确对焦', async () => {
      const testValues = [1000, 1500, 2000];

      for (const value of testValues) {
        const result = await ControlService.focusValue(api, value);

        expect(result).toBeDefined();
        expect(typeof result).toBe('object');
        expect(result.connected).toBe(true); expect(result.status).toBe("okay");

        await new Promise(resolve => setTimeout(resolve, 500));
      }
    });

    test('应该执行自动对焦', async () => {
      const result = await ControlService.autoFocus(api);

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      expect(result.connected).toBe(true); expect(result.status).toBe("okay");

      // 等待自动对焦完成
      await new Promise(resolve => setTimeout(resolve, 3000));
    });

    test('应该停止对焦', async () => {
      const result = await ControlService.focusStop(api);

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      expect(result.connected).toBe(true); expect(result.status).toBe("okay");
    });

    test('应该切换自动对焦模式', async () => {
      const result = await ControlService.setAutoFocus(api, true);

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      expect(result.connected).toBe(true); expect(result.status).toBe("okay");
    });
  });

  // ===== 集成测试 =====
  describe('集成测试', () => {
    test('应该完成完整的PTZ控制流程', async () => {
      // 1. 获取当前位置
      const initialPosition = await ControlService.getPTZPosition(api);
      expect(initialPosition).toBeDefined();

      // 2. 方向移动
      await ControlService.ptzDirectionMove(api, 'up', 3);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 3. 精确移动
      await ControlService.ptzMove(api, 2, 2);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 4. 停止
      await ControlService.ptzStop(api);

      // 5. 回原点
      await ControlService.ptzHome(api);
      await new Promise(resolve => setTimeout(resolve, 3000));

      expect(true).toBe(true); // 流程完成
    }, 15000);

    test('应该完成完整的变焦和对焦流程', async () => {
      // 1. 变焦
      await ControlService.zoom(api, 'in', 5);
      await new Promise(resolve => setTimeout(resolve, 1000));
      await ControlService.zoomStop(api);

      // 2. 精确变焦
      await ControlService.zoomValue(api, 1500);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 3. 自动对焦
      await ControlService.autoFocus(api);
      await new Promise(resolve => setTimeout(resolve, 3000));

      // 4. 手动对焦
      await ControlService.focus(api, 'near', 3);
      await new Promise(resolve => setTimeout(resolve, 1000));
      await ControlService.focusStop(api);

      expect(true).toBe(true); // 流程完成
    }, 15000);
  });

  // ===== 错误处理测试 =====
  describe('错误处理', () => {
    test('应该处理无效API实例', async () => {
      await expect(ControlService.getPTZPosition(null)).rejects.toThrow();
      await expect(ControlService.ptzDirectionMove(null, 'up', 5)).rejects.toThrow();
    });

    test('应该处理网络连接错误', async () => {
      const invalidAPI = new ZCamAPI({
        host: 'invalid-host-name',
        port: 80,
        timeout: 5000
      });

      await expect(ControlService.getPTZPosition(invalidAPI)).rejects.toThrow();
    });

    test('应该处理参数验证错误', async () => {
      const invalidOperations = [
        { method: 'ptzDirectionMove', args: ['invalid', 5] },
        { method: 'ptzMove', args: [-1, 5] },
        { method: 'ptzLimitUpdate', args: ['invalid', 0, 0] },
        { method: 'setPTZSpeedMode', args: ['invalid'] },
        { method: 'zoom', args: ['invalid', 5] },
        { method: 'focusValue', args: [-1000] }
      ];

      for (const { method, args } of invalidOperations) {
        await expect(ControlService[method](api, ...args)).rejects.toThrow();
      }
    });
  });

  // ===== 性能测试 =====
  describe('性能测试', () => {
    test('应该在合理时间内完成PTZ操作', async () => {
      const startTime = Date.now();

      await ControlService.getPTZPosition(api);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(2000); // 2秒内完成
    });

    test('应该处理并发PTZ操作', async () => {
      const operations = [
        ControlService.getPTZPosition(api),
        ControlService.getPTZDetail(api),
        ControlService.getPTZLimit(api)
      ];

      const results = await Promise.allSettled(operations);

      // 至少应该有一些请求成功
      const successful = results.filter(result => result.status === 'fulfilled');
      expect(successful.length).toBeGreaterThan(0);
    }, 10000);
  });
});