const fetch = require('node-fetch');
const { APIError, ConnectionError } = require('../utils/errors');
const constants = require('../constants');
const NetworkValidator = require('../validators/network');
const FallbackManager = require('../config/fallback');
const EnvConfig = require('../config/env');

/**
 * Z CAM API客户端
 * 提供统一的HTTP请求接口，处理认证、超时、错误等
 */
class ZCamAPI {
  constructor(options = {}) {
    // 使用配置解析器处理选项，避免硬编码
    const config = FallbackManager.resolveConfig(
      options,
      {},
      {},
      {
        host: constants.NETWORK.DEFAULT_HOST,
        port: constants.NETWORK.DEFAULT_PORT,
        timeout: constants.NETWORK.DEFAULT_TIMEOUT,
        userAgent: constants.API.USER_AGENT,
        requestInterval: constants.NETWORK.MIN_REQUEST_INTERVAL
      },
      {
        host: NetworkValidator.isValidHost,
        port: NetworkValidator.isValidPort,
        timeout: NetworkValidator.isValidTimeout,
        userAgent: (value) => typeof value === 'string' && value.length > 0,
        requestInterval: (value) => {
          const num = parseInt(value);
          return !isNaN(num) && num >= 10 && num <= 5000;
        }
      }
    );

    this.host = config.host;
    this.port = NetworkValidator.normalizePort(config.port);
    this.timeout = NetworkValidator.normalizeTimeout(config.timeout);
    this.userAgent = config.userAgent;
    this.baseURL = `http://${this.host}:${this.port}`;
    this.sessionCookie = null;
    this.lastRequestTime = 0;
    this.minRequestInterval = parseInt(config.requestInterval);
  }

  /**
   * 发送HTTP请求
   * @param {string} endpoint API端点
   * @param {Object} options 请求选项
   * @returns {Promise<Object>} 响应数据
   */
  async request(endpoint, options = {}) {
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

      // 尝试解析JSON，如果失败则返回文本
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        const text = await response.text();
        try {
          return JSON.parse(text);
        } catch {
          return { success: true, data: text };
        }
      }
    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new ConnectionError(`Request timeout after ${this.timeout}ms`, url);
      }

      if (error.code === 'ECONNREFUSED') {
        throw new ConnectionError(`Cannot connect to camera at ${this.host}:${this.port}`, url);
      }

      if (error.code === 'ENOTFOUND') {
        throw new ConnectionError(`Camera host ${this.host} not found`, url);
      }

      if (error.code === 'ECONNRESET') {
        throw new ConnectionError(`Connection reset by camera`, url);
      }

      throw error;
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
      await this.get(constants.API.ENDPOINTS.INFO);
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
    return this.get(constants.API.ENDPOINTS.INFO);
  }

  /**
   * 会话心跳
   * @returns {Promise<Object>} 心跳响应
   */
  async sessionPing() {
    return this.get(constants.API.ENDPOINTS.CTRL_SESSION);
  }

  /**
   * 退出会话
   * @returns {Promise<Object>} 退出响应
   */
  async sessionQuit() {
    return this.get(`${constants.API.ENDPOINTS.CTRL_SESSION}?action=quit`);
  }

  /**
   * 清理会话
   */
  clearSession() {
    this.sessionCookie = null;
  }

  /**
   * 设置请求超时时间
   * @param {number} timeout 超时时间（毫秒）
   */
  setTimeout(timeout) {
    this.timeout = timeout;
  }

  /**
   * 设置请求间隔
   * @param {number} interval 间隔时间（毫秒）
   */
  setRequestInterval(interval) {
    this.minRequestInterval = interval;
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
      hasSession: !!this.sessionCookie
    };
  }
}

/**
 * 创建API实例
 * @param {Object} globalOptions 全局选项
 * @returns {ZCamAPI} API实例
 */
function createAPI(globalOptions = {}) {
  // 使用配置解析器，避免硬编码fallback
  const config = FallbackManager.resolveConfig(
    globalOptions,
    {},
    EnvConfig.load(),
    {
      host: constants.NETWORK.DEFAULT_HOST,
      port: constants.NETWORK.DEFAULT_PORT,
      timeout: constants.NETWORK.DEFAULT_TIMEOUT,
      userAgent: constants.API.USER_AGENT,
      requestInterval: constants.NETWORK.MIN_REQUEST_INTERVAL
    },
    {
      host: NetworkValidator.isValidHost,
      port: NetworkValidator.isValidPort,
      timeout: NetworkValidator.isValidTimeout,
      userAgent: (value) => typeof value === 'string' && value.length > 0,
      requestInterval: (value) => {
        const num = parseInt(value);
        return !isNaN(num) && num >= 10 && num <= 5000;
      }
    }
  );

  return new ZCamAPI(config);
}

module.exports = {
  ZCamAPI,
  createAPI
};