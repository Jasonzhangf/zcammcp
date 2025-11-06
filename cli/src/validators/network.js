/**
 * 网络参数验证器
 * 提供IP地址、端口、超时时间等网络参数的验证功能
 */

const constants = require('../constants');

class NetworkValidator {
  /**
   * 验证主机地址（IP或域名）
   * @param {string} host 主机地址
   * @returns {boolean} 是否有效
   */
  static isValidHost(host) {
    if (!host || typeof host !== 'string') {
      return false;
    }

    // 检查长度
    if (host.length < 1 || host.length > 253) {
      return false;
    }

    // 使用正则表达式验证
    return constants.VALIDATION.HOST_PATTERN.test(host);
  }

  /**
   * 验证端口号
   * @param {number|string} port 端口号
   * @returns {boolean} 是否有效
   */
  static isValidPort(port) {
    const portNum = parseInt(port);
    return !isNaN(portNum) &&
           portNum >= constants.VALIDATION.PORT_RANGE.min &&
           portNum <= constants.VALIDATION.PORT_RANGE.max;
  }

  /**
   * 验证超时时间
   * @param {number|string} timeout 超时时间（毫秒）
   * @returns {boolean} 是否有效
   */
  static isValidTimeout(timeout) {
    const timeoutNum = parseInt(timeout);
    return !isNaN(timeoutNum) &&
           timeoutNum >= constants.VALIDATION.MIN_TIMEOUT &&
           timeoutNum <= constants.VALIDATION.MAX_TIMEOUT;
  }

  /**
   * 验证IP地址格式
   * @param {string} ip IP地址
   * @returns {boolean} 是否有效
   */
  static isValidIP(ip) {
    if (!ip || typeof ip !== 'string') {
      return false;
    }

    const parts = ip.split('.');
    if (parts.length !== 4) {
      return false;
    }

    for (const part of parts) {
      const num = parseInt(part);
      if (isNaN(num) || num < 0 || num > 255) {
        return false;
      }
    }

    return true;
  }

  /**
   * 验证域名格式
   * @param {string} domain 域名
   * @returns {boolean} 是否有效
   */
  static isValidDomain(domain) {
    if (!domain || typeof domain !== 'string') {
      return false;
    }

    // 基本域名格式检查
    const domainPattern = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return domainPattern.test(domain) && domain.length <= 253;
  }

  /**
   * 验证网络连接配置
   * @param {Object} config 网络配置
   * @param {string} config.host 主机地址
   * @param {number|string} config.port 端口号
   * @param {number|string} config.timeout 超时时间
   * @returns {Object} 验证结果
   */
  static validateNetworkConfig(config) {
    const result = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // 验证主机地址
    if (!config.host) {
      result.errors.push('主机地址不能为空');
      result.isValid = false;
    } else if (!this.isValidHost(config.host)) {
      result.errors.push(`无效的主机地址: ${config.host}`);
      result.isValid = false;
    }

    // 验证端口号
    if (!config.port) {
      result.errors.push('端口号不能为空');
      result.isValid = false;
    } else if (!this.isValidPort(config.port)) {
      result.errors.push(`无效的端口号: ${config.port} (有效范围: ${constants.VALIDATION.PORT_RANGE.min}-${constants.VALIDATION.PORT_RANGE.max})`);
      result.isValid = false;
    }

    // 验证超时时间
    if (config.timeout && !this.isValidTimeout(config.timeout)) {
      result.errors.push(`无效的超时时间: ${config.timeout}ms (有效范围: ${constants.VALIDATION.MIN_TIMEOUT}-${constants.VALIDATION.MAX_TIMEOUT}ms)`);
      result.isValid = false;
    }

    // 警告检查
    if (config.timeout && config.timeout < 5000) {
      result.warnings.push('超时时间过短，可能导致连接超时');
    }

    if (config.port && parseInt(config.port) !== 80) {
      result.warnings.push('使用了非标准HTTP端口，请确认相机配置');
    }

    return result;
  }

  /**
   * 规范化端口号
   * @param {number|string} port 端口号
   * @returns {number|null} 规范化后的端口号
   */
  static normalizePort(port) {
    const portNum = parseInt(port);
    return this.isValidPort(portNum) ? portNum : null;
  }

  /**
   * 规范化超时时间
   * @param {number|string} timeout 超时时间
   * @returns {number|null} 规范化后的超时时间
   */
  static normalizeTimeout(timeout) {
    const timeoutNum = parseInt(timeout);
    return this.isValidTimeout(timeoutNum) ? timeoutNum : null;
  }

  /**
   * 规范化主机地址
   * @param {string} host 主机地址
   * @returns {string|null} 规范化后的主机地址
   */
  static normalizeHost(host) {
    if (!host || typeof host !== 'string') {
      return null;
    }

    host = host.trim();
    return this.isValidHost(host) ? host : null;
  }
}

module.exports = NetworkValidator;