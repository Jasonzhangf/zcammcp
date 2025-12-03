/**
 * 精确Z CAM API客户端
 * 移除所有默认值回退，要求显式配置
 */

// Node.js 18+ 内置fetch，如果不存在则报错
let fetch;
if (typeof global.fetch === 'function') {
  fetch = global.fetch;
} else {
  try {
    fetch = require('node-fetch');
  } catch (error) {
    throw new Error('Z CAM CLI 需要Node.js 18+ 或安装 node-fetch: npm install node-fetch');
  }
}

const { APIError, ConnectionError, ValidationError } = require('../utils/errors');
const constants = require('../constants');
const NetworkValidator = require('../validators/network');

/**
 * 精确Z CAM API客户端
 * 不提供任何默认值，要求显式配置所有参数
 */
class ExactZCamAPI {
  constructor(options = {}) {
    // 验证必需的配置参数
    this.validateConstructorOptions(options);

    this.host = options.host;
    this.port = NetworkValidator.normalizePort(options.port);
    this.timeout = options.timeout;
    this.baseURL = `http://${this.host}:${this.port}`;
    this.sessionCookie = null;
    this.lastRequestTime = 0;
    this.minRequestInterval = options.requestInterval || constants.NETWORK.MIN_REQUEST_INTERVAL;
    this.userAgent = options.userAgent || constants.API.USER_AGENT;

    // 验证配置的合理性
    this.validateConfiguration();
  }

  /**
   * 验证构造函数选项
   * @param {Object} options 构造选项
   * @throws {ValidationError} 如果缺少必需参数或参数无效
   */
  validateConstructorOptions(options) {
    if (!options || typeof options !== 'object') {
      throw new ValidationError('API客户端配置选项必须是对象');
    }

    // 验证必需参数
    const requiredFields = ['host', 'port', 'timeout'];
    for (const field of requiredFields) {
      if (options[field] === undefined || options[field] === null) {
        throw new ValidationError(`API客户端缺少必需参数: ${field}`);
      }
    }

    // 验证参数类型和值
    if (typeof options.host !== 'string' || !options.host.trim()) {
      throw new ValidationError('host 必须是非空字符串');
    }

    if (!NetworkValidator.isValidHost(options.host)) {
      throw new ValidationError(`无效的主机地址: ${options.host}`);
    }

    if (!NetworkValidator.isValidPort(options.port)) {
      throw new ValidationError(`无效的端口号: ${options.port}`);
    }

    if (!NetworkValidator.isValidTimeout(options.timeout)) {
      throw new ValidationError(`无效的超时时间: ${options.timeout}`);
    }

    // 可选参数验证
    if (options.requestInterval !== undefined) {
      const interval = parseInt(options.requestInterval);
      if (isNaN(interval) || interval < 10 || interval > 5000) {
        throw new ValidationError(`请求间隔必须在 10-5000 毫秒范围内`);
      }
    }

    if (options.userAgent !== undefined) {
      if (typeof options.userAgent !== 'string' || !options.userAgent.trim()) {
        throw new ValidationError('User-Agent 必须是非空字符串');
      }
    }
  }

  /**
   * 验证最终配置的合理性
   * @throws {ValidationError} 如果配置不合理
   */
  validateConfiguration() {
    // 验证超时时间与请求间隔的关系
    if (this.timeout < this.minRequestInterval * 10) {
      throw new ValidationError('超时时间应该至少是请求间隔的10倍');
    }

    // 验证URL构建
    try {
      new URL(this.baseURL);
    } catch (error) {
      throw new ValidationError(`无效的基础URL: ${this.baseURL}`);
    }
  }

  /**
   * 发送HTTP请求
   * @param {string} endpoint API端点
   * @param {Object} options 请求选项
   * @returns {Promise<Object>} 响应数据
   * @throws {APIError|ConnectionError|ValidationError} 如果请求失败
   */
  async request(endpoint, options = {}) {
    // 验证参数
    if (!endpoint || typeof endpoint !== 'string') {
      throw new ValidationError('API端点必须是非空字符串');
    }

    if (!endpoint.startsWith('/')) {
      throw new ValidationError('API端点必须以 / 开头');
    }

    const url = `${this.baseURL}${endpoint}`;

    // 请求限流
    await this._rateLimit();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    const requestOptions = {
      signal: controller.signal,
      headers: {
        'User-Agent': this.userAgent,
        ...options.headers
      },
      ...options
    };

    // 添加会话Cookie
    if (this.sessionCookie) {
      requestOptions.headers['Cookie'] = this.sessionCookie;
    }

    try {
      const response = await fetch(url, requestOptions);

      clearTimeout(timeoutId);

      // 保存会话Cookie
      const setCookieHeader = response.headers.get('set-cookie');
      if (setCookieHeader) {
        this.sessionCookie = setCookieHeader.split(';')[0];
      }

      if (!response.ok) {
        throw new APIError(response.status, response.statusText, url);
      }

      // 解析响应
      return this._parseResponse(response);

    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new ConnectionError(`请求超时 (${this.timeout}ms): ${url}`);
      }

      if (error.code === 'ECONNREFUSED') {
        throw new ConnectionError(`连接被拒绝 - 无法连接到 ${this.host}:${this.port}`);
      }

      if (error.code === 'ENOTFOUND') {
        throw new ConnectionError(`主机未找到 - ${this.host}`);
      }

      if (error.code === 'ECONNRESET') {
        throw new ConnectionError(`连接被相机重置`);
      }

      // 重新抛出已知错误类型
      if (error instanceof APIError || error instanceof ConnectionError || error instanceof ValidationError) {
        throw error;
      }

      // 包装未知错误
      throw new ConnectionError(`网络请求失败: ${error.message}`);
    }
  }

  /**
   * 解析响应数据
   * @param {Response} response fetch响应对象
   * @returns {Promise<Object>} 解析后的数据
   * @throws {APIError} 如果解析失败
   */
  async _parseResponse(response) {
    try {
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        const text = await response.text();
        
        // 尝试解析为JSON
        try {
          return JSON.parse(text);
        } catch {
          // 如果不是JSON，返回文本数据
          if (text.trim()) {
            return { success: true, data: text };
          } else {
            return { success: true, data: null };
          }
        }
      }
    } catch (error) {
      throw new APIError(0, `响应解析失败: ${error.message}`);
    }
  }

  /**
   * GET请求
   * @param {string} endpoint API端点
   * @param {Object} params 查询参数
   * @returns {Promise<Object>} 响应数据
   */
  async get(endpoint, params = {}) {
    let url = endpoint;

    if (Object.keys(params).length > 0) {
      // 验证查询参数
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && typeof value === 'object') {
          throw new ValidationError(`查询参数 ${key} 不能是对象类型`);
        }
      }

      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, value);
        }
      });
      url += `?${searchParams.toString()}`;
    }

    return this.request(url);
  }

  /**
   * POST请求
   * @param {string} endpoint API端点
   * @param {Object} data 请求数据
   * @returns {Promise<Object>} 响应数据
   */
  async post(endpoint, data = {}) {
    if (data && typeof data !== 'object') {
      throw new ValidationError('POST请求数据必须是对象类型');
    }

    return this.request(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
  }

  /**
   * PUT请求
   * @param {string} endpoint API端点
   * @param {Object} data 请求数据
   * @returns {Promise<Object>} 响应数据
   */
  async put(endpoint, data = {}) {
    if (data && typeof data !== 'object') {
      throw new ValidationError('PUT请求数据必须是对象类型');
    }

    return this.request(endpoint, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
  }

  /**
   * DELETE请求
   * @param {string} endpoint API端点
   * @returns {Promise<Object>} 响应数据
   */
  async delete(endpoint) {
    return this.request(endpoint, {
      method: 'DELETE'
    });
  }

  /**
   * 请求限流
   * @private
   */
  async _rateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * 测试连接
   * @returns {Promise<boolean>} 连接是否成功
   */
  async testConnection() {
    try {
      await this.get('/info');
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取相机信息（用于连接测试）
   * @returns {Promise<Object>} 相机信息
   */
  async getCameraInfo() {
    return this.get('/info');
  }

  /**
   * 会话心跳
   * @returns {Promise<Object>} 心跳响应
   */
  async sessionPing() {
    return this.get('/ctrl/session');
  }

  /**
   * 退出会话
   * @returns {Promise<Object>} 退出响应
   */
  async sessionQuit() {
    return this.get('/ctrl/session?action=quit');
  }

  /**
   * 清理会话
   */
  clearSession() {
    this.sessionCookie = null;
  }

  /**
   * 获取API基础URL
   * @returns {string} 基础URL
   */
  getBaseURL() {
    return this.baseURL;
  }

  /**
   * 获取连接信息
   * @returns {Object} 连接信息
   */
  getConnectionInfo() {
    return {
      host: this.host,
      port: this.port,
      timeout: this.timeout,
      baseURL: this.baseURL,
      hasSession: !!this.sessionCookie,
      userAgent: this.userAgent,
      requestInterval: this.minRequestInterval
    };
  }
}

/**
 * 创建精确的API实例
 * @param {Object} globalOptions 全局选项
 * @returns {ExactZCamAPI} API实例
 * @throws {ValidationError} 如果配置无效
 */
function createExactAPI(globalOptions = {}) {
  // 验证全局选项
  if (!globalOptions || typeof globalOptions !== 'object') {
    throw new ValidationError('全局选项必须是对象');
  }

  // 构建API配置，不提供任何默认值
  const apiConfig = {
    host: globalOptions.host,
    port: parseInt(globalOptions.port),
    timeout: parseInt(globalOptions.timeout),
    userAgent: globalOptions.userAgent,
    requestInterval: globalOptions.requestInterval
  };

  return new ExactZCamAPI(apiConfig);
}

module.exports = {
  ExactZCamAPI,
  createExactAPI
};