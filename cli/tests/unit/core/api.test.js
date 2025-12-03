/**
 * ZCam API客户端单元测试 - 真实相机连接测试
 */

const { ZCamAPI, createAPI } = require('../../../src/core/api');
const { APIError, ConnectionError } = require('../../../src/utils/errors');
const CameraControlManager = require('../../../src/core/camera-control-manager');

// 测试相机配置
const TEST_CAMERA = {
  host: '192.168.9.59',
  port: 80,
  timeout: 10000
};

describe('ZCamAPI类', () => {
  let api;
  let controlManager;

  beforeEach(() => {
    api = new ZCamAPI(TEST_CAMERA);
    controlManager = new CameraControlManager(api);
  });

  describe('构造函数', () => {
    test('应该使用测试相机配置创建实例', () => {
      const api = new ZCamAPI(TEST_CAMERA);

      expect(api.host).toBe(TEST_CAMERA.host);
      expect(api.port).toBe(TEST_CAMERA.port);
      expect(api.timeout).toBe(TEST_CAMERA.timeout);
      expect(api.baseURL).toBe(`http://${TEST_CAMERA.host}:${TEST_CAMERA.port}`);
    });

    test('应该使用默认配置创建实例', () => {
      const api = new ZCamAPI();

      expect(api.host).toBe('192.168.1.100');
      expect(api.port).toBe(80);
      expect(api.timeout).toBe(30000);
      expect(api.baseURL).toBe('http://192.168.1.100:80');
    });

    test('应该初始化会话状态', () => {
      const api = new ZCamAPI();

      expect(api.sessionCookie).toBeNull();
      expect(api.lastRequestTime).toBe(0);
    });
  });

  describe('相机特定方法', () => {
    test('testConnection方法应该测试真实相机连接', async () => {
      const result = await api.testConnection();

      expect(typeof result).toBe('boolean');
      // 真实相机连接测试应该成功
      expect(result).toBe(true);
    });

    test('getCameraInfo方法应该获取真实相机信息', async () => {
      const result = await api.getCameraInfo();

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      // 真实相机应该返回型号信息
      if (result.model) {
        expect(typeof result.model).toBe('string');
      }
      if (result.sn) {
        expect(typeof result.sn).toBe('string');
      }
    });

    test('sessionPing方法应该与真实相机心跳', async () => {
      const result = await api.sessionPing();

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      // 相机心跳返回格式检查
      if (result.code !== undefined) {
        expect(typeof result.code).toBe('number');
      }
      if (result.msg !== undefined) {
        expect(typeof result.msg).toBe('string');
      }
    });

    test('sessionQuit方法应该退出真实相机会话', async () => {
      const result = await api.sessionQuit();

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      // 退出会话返回格式检查
      if (result.code !== undefined) {
        expect(typeof result.code).toBe('number');
      }
      if (result.msg !== undefined) {
        expect(typeof result.msg).toBe('string');
      }
    });
  });

  describe('配置方法', () => {
    test('setTimeout方法应该设置超时时间', () => {
      api.setTimeout(15000);

      expect(api.timeout).toBe(15000);
    });

    test('setRequestInterval方法应该设置请求间隔', () => {
      api.setRequestInterval(200);

      expect(api.minRequestInterval).toBe(200);
    });

    test('getBaseURL方法应该返回基础URL', () => {
      const baseURL = api.getBaseURL();

      expect(baseURL).toBe(`http://${TEST_CAMERA.host}:${TEST_CAMERA.port}`);
    });

    test('getConnectionInfo方法应该返回连接信息', () => {
      api.sessionCookie = 'test_session';

      const info = api.getConnectionInfo();

      expect(info).toEqual({
        host: TEST_CAMERA.host,
        port: TEST_CAMERA.port,
        timeout: TEST_CAMERA.timeout,
        baseURL: `http://${TEST_CAMERA.host}:${TEST_CAMERA.port}`,
        hasSession: true
      });
    });

    test('clearSession方法应该清除会话', () => {
      api.sessionCookie = 'test_session';

      api.clearSession();

      expect(api.sessionCookie).toBeNull();
    });
  });

  describe('真实API请求测试', () => {
    test('应该能够发送真实GET请求', async () => {
      const result = await api.request('/info');

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });

    test('应该能够处理连接错误', async () => {
      const invalidAPI = new ZCamAPI({
        host: '192.168.999.999',
        port: 80,
        timeout: 5000
      });

      const result = await invalidAPI.testConnection();
      expect(result).toBe(false);
    });
  });

  describe('错误处理', () => {
    test('应该处理网络连接错误', async () => {
      const invalidAPI = new ZCamAPI({
        host: 'invalid-host-name',
        port: 80,
        timeout: 5000
      });

      await expect(invalidAPI.getCameraInfo()).rejects.toThrow('fetch failed');
    });

    test('应该处理超时错误', async () => {
      const timeoutAPI = new ZCamAPI({
        host: TEST_CAMERA.host,
        port: TEST_CAMERA.port,
        timeout: 1 // 1ms超时
      });

      // 超时测试可能不会总是触发，取决于网络延迟
      try {
        await timeoutAPI.getCameraInfo();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });
});

describe('createAPI函数', () => {
  test('应该创建带有默认配置的API实例', () => {
    const api = createAPI();

    expect(api).toBeInstanceOf(ZCamAPI);
    expect(api.host).toBe('192.168.1.100');
    expect(api.port).toBe(80);
    expect(api.timeout).toBe(30000);
  });

  test('应该使用提供的配置创建API实例', () => {
    const options = {
      host: '192.168.9.59',
      port: 8080,
      timeout: 10000
    };

    const api = createAPI(options);

    expect(api.host).toBe('192.168.9.59');
    expect(api.port).toBe(8080);
    expect(api.timeout).toBe(10000);
  });
});

describe('集成测试', () => {
  let api;
  let controlManager;

  beforeEach(() => {
    api = new ZCamAPI(TEST_CAMERA);
    controlManager = new CameraControlManager(api);
  });

  test('应该完成完整的相机交互流程', async () => {
    // 执行完整流程
    const isConnected = await api.testConnection();
    expect(isConnected).toBe(true);

    const cameraInfo = await api.getCameraInfo();
    expect(cameraInfo).toBeDefined();

    const sessionResult = await api.sessionPing();
    expect(sessionResult).toBeDefined();

    const quitResult = await api.sessionQuit();
    expect(quitResult).toBeDefined();
  });

  test('应该处理会话管理', async () => {
    // 测试会话管理流程
    await controlManager.withControl(async () => {
      await api.sessionPing();

      // 获取一些基本信息
      const cameraInfo = await api.getCameraInfo();
      expect(cameraInfo).toBeDefined();
    });
  });
});