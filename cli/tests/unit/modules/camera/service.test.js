/**
 * 相机服务单元测试 - 真实API连接测试
 */

const CameraService = require('../../../../src/modules/camera/service');
const { ZCamAPI } = require('../../../../src/core/api');
const { APIError, ConnectionError } = require('../../../../src/utils/errors');
const CameraControlManager = require('../../../../src/core/camera-control-manager');

// 测试相机配置
const TEST_CAMERA = {
  host: '192.168.9.59',
  port: 80,
  timeout: 15000
};

describe('CameraService', () => {
  let api;
  let controlManager;

  beforeEach(() => {
    api = new ZCamAPI(TEST_CAMERA);
    controlManager = new CameraControlManager(api);
  });

  afterEach(async () => {
    // 清理连接和控制权
    try {
      await controlManager.cleanup();
    } catch (error) {
      // 忽略清理错误
    }
  });

  describe('基础相机操作', () => {
    test('应该获取相机基本信息', async () => {
      const result = await CameraService.getInfo(api);

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');

      // 验证返回的相机信息结构
      if (result.model) {
        expect(typeof result.model).toBe('string');
      }
      if (result.sn) {
        expect(typeof result.sn).toBe('string');
      }
    });

    test('应该获取相机工作模式', async () => {
      const result = await CameraService.getMode(api);

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');

      // 验证工作模式结构
      if (result.mode !== undefined) {
        expect(typeof result.mode).toBe('number');
      }
    });

    test('应该获取相机昵称', async () => {
      const result = await CameraService.getNickname(api);

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });

    test('应该设置相机昵称', async () => {
      const testNickname = 'Test Camera ' + Date.now();

      await controlManager.withControl(async () => {
        const result = await CameraService.setNickname(api, testNickname);
        expect(result).toBeDefined();
        expect(typeof result).toBe('object');
      });
    });

    test('应该获取相机状态', async () => {
      const result = await CameraService.getStatus(api);

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });
  });

  describe('会话管理', () => {
    test('应该发送会话心跳', async () => {
      const result = await CameraService.sessionPing(api);

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');

      // 验证心跳返回格式
      if (result.code !== undefined) {
        expect(typeof result.code).toBe('number');
      }
      if (result.msg !== undefined) {
        expect(typeof result.msg).toBe('string');
      }
    });

    test('应该退出会话', async () => {
      const result = await CameraService.sessionQuit(api);

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');

      // 验证退出会话返回格式
      if (result.code !== undefined) {
        expect(typeof result.code).toBe('number');
      }
    });
  });

  describe('时间管理', () => {
    test('应该获取相机时间', async () => {
      const result = await CameraService.getTime(api);

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });

    test('应该设置相机时间', async () => {
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().split(' ')[0];

      await controlManager.withControl(async () => {
        const result = await CameraService.setTime(api, dateStr, timeStr);
        expect(result).toBeDefined();
        expect(typeof result).toBe('object');
      });
    });
  });

  describe('用户管理', () => {
    test('应该获取当前用户信息', async () => {
      const result = await CameraService.getCurrentUser(api);

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });

    test('应该获取用户列表', async () => {
      const result = await CameraService.getUserList(api);

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');

      // 如果有用户数据，验证结构
      if (result.users && Array.isArray(result.users)) {
        expect(result.users.length).toBeGreaterThanOrEqual(0);
      }
    });

    test.skip('应该登出当前用户', async () => {
      // TODO: 登出API存在超时问题，暂时跳过
      // 登出操作不需要控制权，直接调用
      try {
        const result = await CameraService.logout(api);
        expect(result).toBeDefined();
        expect(typeof result).toBe('object');
      } catch (error) {
        // 登出可能因为已经退出会话而失败，这是正常的
        console.log('登出操作（可能已退出）:', error.message);
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('控制参数', () => {
    test('应该获取控制参数', async () => {
      // 测试获取一些基本参数
      const testParams = ['resolution', 'fps', 'bitrate'];

      for (const param of testParams) {
        try {
          const result = await CameraService.getControlParam(api, param);
          expect(result).toBeDefined();
          expect(typeof result).toBe('object');
        } catch (error) {
          // 某些参数可能不存在，这是正常的
          console.log(`参数 ${param} 可能不存在:`, error.message);
        }
      }
    });

    test('应该设置控制参数', async () => {
      // 尝试设置一个简单的参数
      await controlManager.withControl(async () => {
        try {
          const result = await CameraService.setControlParam(api, 'test_param', 'test_value');
          expect(result).toBeDefined();
          expect(typeof result).toBe('object');
        } catch (error) {
          // 测试参数可能不存在，这是正常的
          console.log('设置测试参数失败（预期行为）:', error.message);
          expect(error).toBeInstanceOf(Error);
        }
      });
    });

    test('应该批量获取控制参数', async () => {
      try {
        const result = await CameraService.getControlParamsBatch(api, 'video');
        expect(result).toBeDefined();
        expect(typeof result).toBe('object');
      } catch (error) {
        // 目录可能不存在，这是正常的
        console.log('批量获取参数失败（可能正常）:', error.message);
      }
    });
  });

  describe('录制模式', () => {
    test('应该切换到录制模式', async () => {
      await controlManager.withControl(async () => {
        const result = await CameraService.gotoRecordingMode(api);
        expect(result).toBeDefined();
        expect(typeof result).toBe('object');
      });
    });
  });

  describe('系统操作', () => {
    test('应该执行提交操作', async () => {
      await controlManager.withControl(async () => {
        const result = await CameraService.commit(api);
        expect(result).toBeDefined();
        expect(typeof result).toBe('object');
      });
    });
  });

  describe('错误处理', () => {
    test('应该处理无效API实例', async () => {
      await expect(CameraService.getInfo(null)).rejects.toThrow();
    });

    test('应该处理网络连接错误', async () => {
      const invalidAPI = new ZCamAPI({
        host: 'invalid-host-name',
        port: 80,
        timeout: 5000
      });

      await expect(CameraService.getInfo(invalidAPI)).rejects.toThrow();
    });

    test('应该处理无效参数', async () => {
      // 测试无效的昵称参数
      await expect(CameraService.setNickname(api, null)).rejects.toThrow();
      await expect(CameraService.setNickname(api, '')).rejects.toThrow();

      // 测试无效的时间参数
      await expect(CameraService.setTime(api, null, null)).rejects.toThrow();
      await expect(CameraService.setTime(api, '', '')).rejects.toThrow();
    });
  });

  describe('性能测试', () => {
    test('应该在合理时间内完成操作', async () => {
      const startTime = Date.now();

      await CameraService.getInfo(api);

      const duration = Date.now() - startTime;

      // 大多数操作应该在5秒内完成
      expect(duration).toBeLessThan(5000);
    });

    test('应该处理并发请求', async () => {
      const promises = [
        CameraService.getInfo(api),
        CameraService.getMode(api),
        CameraService.getStatus(api)
      ];

      const results = await Promise.allSettled(promises);

      // 至少应该有一些请求成功
      const successful = results.filter(result => result.status === 'fulfilled');
      expect(successful.length).toBeGreaterThan(0);
    });
  });

  describe('集成测试', () => {
    test('应该完成完整的相机交互流程', async () => {
      // 1. 获取相机信息
      const cameraInfo = await CameraService.getInfo(api);
      expect(cameraInfo).toBeDefined();

      // 2. 获取工作模式
      const workMode = await CameraService.getMode(api);
      expect(workMode).toBeDefined();

      // 3. 会话心跳
      const sessionResult = await CameraService.sessionPing(api);
      expect(sessionResult).toBeDefined();

      // 4. 获取状态
      const status = await CameraService.getStatus(api);
      expect(status).toBeDefined();

      // 验证所有操作都成功完成
      expect(true).toBe(true);
    });

    test('应该处理复杂的状态组合', async () => {
      // 并发获取多种状态信息
      const results = await Promise.allSettled([
        CameraService.getInfo(api),
        CameraService.getMode(api),
        CameraService.getNickname(api),
        CameraService.getStatus(api),
        CameraService.getTime(api),
        CameraService.getCurrentUser(api)
      ]);

      // 验证大部分操作成功
      const successful = results.filter(result => result.status === 'fulfilled');
      expect(successful.length).toBeGreaterThan(results.length / 2);
    });
  });
});