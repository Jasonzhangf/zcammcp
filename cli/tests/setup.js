/**
 * Jest测试环境设置
 * 配置全局测试环境和工具函数
 */

// 设置测试环境变量
process.env.NODE_ENV = 'test';

// 模拟console方法以避免测试输出污染
const originalConsole = { ...console };

// 在测试期间静默某些console输出
beforeAll(() => {
  console.warn = jest.fn();
  console.error = jest.fn();
  console.log = jest.fn();
});

// 测试后恢复console
afterAll(() => {
  Object.assign(console, originalConsole);
});

// 全局测试工具函数
global.testUtils = {
  /**
   * 创建模拟的fetch响应
   */
  createMockResponse: (data, status = 200, headers = {}) => ({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: new Map(Object.entries(headers)),
    json: async () => data,
    text: async () => JSON.stringify(data)
  }),

  /**
   * 创建模拟的错误响应
   */
  createMockErrorResponse: (message, status = 500, url = 'http://test') => {
    const error = new Error(message);
    error.status = status;
    error.url = url;
    return error;
  },

  /**
   * 等待指定时间
   */
  delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  /**
   * 生成随机测试数据
   */
  randomData: {
    ip: () => `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
    port: () => Math.floor(Math.random() * 1000) + 8000,
    string: (length = 10) => Math.random().toString(36).substring(2, 2 + length),
    number: (min = 1, max = 100) => Math.floor(Math.random() * (max - min + 1)) + min
  },

  /**
   * 模拟相机信息数据
   */
  mockCameraInfo: (overrides = {}) => ({
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
    ...overrides
  }),

  /**
   * 模拟会话数据
   */
  mockSessionData: (overrides = {}) => ({
    code: 0,
    desc: "",
    msg: "session_ok",
    ...overrides
  }),

  /**
   * 模拟错误响应
   */
  mockErrorResponse: (code = 1, desc = "Error", msg = "Error message") => ({
    code,
    desc,
    msg
  }),

  /**
   * 清理所有mock
   */
  clearAllMocks: () => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  }
};

// 设置测试超时
jest.setTimeout(10000);