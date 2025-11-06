/**
 * Mock对象工厂
 * 创建各种测试用的模拟对象
 */

class MockFactory {
  /**
   * 创建模拟的ZCamAPI实例
   */
  static createMockAPI(overrides = {}) {
    return {
      host: overrides.host || '192.168.1.100',
      port: overrides.port || 80,
      timeout: overrides.timeout || 30000,
      baseURL: overrides.baseURL || 'http://192.168.1.100:80',
      sessionCookie: overrides.sessionCookie || null,
      lastRequestTime: 0,
      minRequestInterval: overrides.minRequestInterval || 50,

      // 模拟方法
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      request: jest.fn(),
      testConnection: jest.fn(),
      getCameraInfo: jest.fn(),
      sessionPing: jest.fn(),
      sessionQuit: jest.fn(),
      clearSession: jest.fn(),
      setTimeout: jest.fn(),
      setRequestInterval: jest.fn(),
      getBaseURL: jest.fn(),
      getConnectionInfo: jest.fn(),

      ...overrides
    };
  }

  /**
   * 创建模拟的网络配置
   */
  static createMockNetworkConfig(overrides = {}) {
    return {
      host: '192.168.1.100',
      port: 80,
      timeout: 30000,
      ...overrides
    };
  }

  /**
   * 创建模拟的环境变量配置
   */
  static createMockEnvConfig(overrides = {}) {
    return {
      host: overrides.host,
      port: overrides.port,
      timeout: overrides.timeout,
      output: overrides.output,
      verbose: overrides.verbose || false,
      debug: overrides.debug || false,
      configDir: overrides.configDir,
      logLevel: overrides.logLevel,
      userAgent: overrides.userAgent,
      requestInterval: overrides.requestInterval,
      maxRetries: overrides.maxRetries,
      ...overrides
    };
  }

  /**
   * 创建模拟的命令选项
   */
  static createMockCommandOptions(overrides = {}) {
    return {
      host: overrides.host,
      port: overrides.port,
      timeout: overrides.timeout,
      json: overrides.json,
      verbose: overrides.verbose,
      output: overrides.output,
      profile: overrides.profile,
      noColor: overrides.noColor,
      ...overrides
    };
  }

  /**
   * 创建模拟的相机响应数据
   */
  static createMockCameraResponse(overrides = {}) {
    return {
      cameraName: "P2-R1-18x_002216",
      model: "e2ptz",
      number: "1",
      sw: "1.0.2",
      hw: "2.0",
      mac: "62:d3:9a:40:8a:77",
      sn: "91PT0002216",
      nickName: "P2-R1-18x",
      eth_ip: "192.168.9.59",
      ip: "192.168.9.59",
      pixelLinkMode: "Single",
      feature: {
        product_catalog: "",
        rebootAfterClearSettings: "0",
        autoFraming: true,
        ezFraming: true,
        rtsp: true,
        rtmp: true,
        srt: true
      },
      ...overrides
    };
  }

  /**
   * 创建模拟的会话响应
   */
  static createMockSessionResponse(overrides = {}) {
    return {
      code: 0,
      desc: "",
      msg: "session_ok",
      ...overrides
    };
  }

  /**
   * 创建模拟的错误响应
   */
  static createMockErrorResponse(overrides = {}) {
    return {
      code: overrides.code || 1,
      desc: overrides.desc || "Error description",
      msg: overrides.msg || "Error message",
      ...overrides
    };
  }

  /**
   * 创建模拟的录制状态响应
   */
  static createMockRecordStatusResponse(overrides = {}) {
    return {
      code: 0,
      desc: "",
      msg: "rec", // rec, rec_ing, rec_paused
      remain: 3600, // 剩余秒数
      ...overrides
    };
  }

  /**
   * 创建模拟的流设置响应
   */
  static createMockStreamResponse(overrides = {}) {
    return {
      stream0: {
        width: 1920,
        height: 1080,
        bitrate: 8000000,
        fps: 30,
        venc: "h264",
        enable: true
      },
      stream1: {
        width: 1280,
        height: 720,
        bitrate: 4000000,
        fps: 30,
        venc: "h264",
        enable: false
      },
      ...overrides
    };
  }

  /**
   * 创建模拟的用户列表响应
   */
  static createMockUserListResponse(overrides = {}) {
    return {
      users: [
        {
          username: "admin",
          group: "admin",
          login: false
        },
        {
          username: "operator",
          group: "operator",
          login: false
        }
      ],
      ...overrides
    };
  }

  /**
   * 创建模拟的网络状态响应
   */
  static createMockNetworkStatusResponse(overrides = {}) {
    return {
      mode: "Router", // Router, Direct, Static
      ip: "192.168.9.59",
      netmask: "255.255.255.0",
      gateway: "192.168.9.1",
      dns: "8.8.8.8",
      mac: "62:d3:9a:40:8a:77",
      ...overrides
    };
  }

  /**
   * 创建模拟的预设位置列表
   */
  static createMockPresetListResponse(overrides = {}) {
    return {
      presets: [
        { index: 1, name: "预设1", saved: true },
        { index: 2, name: "预设2", saved: true },
        { index: 3, name: "预设3", saved: false }
      ],
      ...overrides
    };
  }

  /**
   * 创建fetch mock
   */
  static createFetchMock(responses = []) {
    const mockFn = jest.fn();

    responses.forEach((response, index) => {
      if (response instanceof Error) {
        mockFn.mockRejectedValueOnce(response);
      } else {
        mockFn.mockResolvedValueOnce(response);
      }
    });

    return mockFn;
  }

  /**
   * 创建模拟的Commander命令对象
   */
  static createMockCommand(overrides = {}) {
    return {
      opts: jest.fn(() => overrides.globalOptions || {}),
      parent: {
        parent: {
          opts: jest.fn(() => overrides.rootOptions || {})
        }
      },
      ...overrides
    };
  }
}

module.exports = MockFactory;