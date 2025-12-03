/**
 * CLI 辅助工具
 * 统一处理命令行参数和格式
 */

const { ValidationError } = require('./errors');
const constants = require('../constants');
const NetworkValidator = require('../validators/network');

/**
 * 解析输出格式
 * @param {Object} options 命令选项
 * @param {Object} globalOptions 全局选项
 * @returns {string} 输出格式 ('table'|'json'|'csv')
 */
function resolveOutputFormat(options = {}, globalOptions = {}) {
  // 精确解析，无回退
  const format = options.json === true ? 'json' :
    globalOptions.json === true ? 'json' :
    typeof globalOptions.output === 'string' ? globalOptions.output.toLowerCase() :
    typeof options.output === 'string' ? options.output.toLowerCase() :
    null;

  if (!format) {
    return constants.OUTPUT.DEFAULT_FORMAT;
  }

  if (!constants.OUTPUT.FORMATS.includes(format.toLowerCase())) {
    throw new ValidationError(`无效的输出格式: ${format}，支持的格式: ${constants.OUTPUT.FORMATS.join(', ')}`);
  }

  return format.toLowerCase();
}

/**
 * 获取全局选项
 * @param {Command} cmd Commander 命令实例
 * @returns {Object} 全局选项对象
 */
function getGlobalOptions(cmd) {
  try {
    // 安全地获取全局选项，避免深层 parent 链接访问
    let current = cmd;
    while (current && current.parent) {
      current = current.parent;
    }

    // 如果找到了根命令，返回其选项
    if (current && current.opts) {
      return current.opts() || {};
    }

    // 如果没有找到，返回空对象
    return {};
  } catch (error) {
    console.warn('获取全局选项时出错:', error.message);
    return {};
  }
}

/**
 * 解析连接选项
 * @param {Object} options 命令选项
 * @param {Object} globalOptions 全局选项
 * @returns {Object} 连接配置
 */
function resolveConnectionOptions(options = {}, globalOptions = {}) {
  // 精确解析，无回退
  const config = {
    host: options.host || globalOptions.host,
    port: options.port || globalOptions.port,
    timeout: options.timeout || globalOptions.timeout,
    username: options.username || globalOptions.username,
    password: options.password || globalOptions.password,
  };

  // 验证必需的参数
  if (!config.host) {
    throw new ValidationError('host参数是必需的');
  }
  if (!NetworkValidator.isValidHost(config.host)) {
    throw new ValidationError(`无效的主机地址: ${config.host}`);
  }

  if (!config.port) {
    throw new ValidationError('port参数是必需的');
  }
  if (!NetworkValidator.isValidPort(config.port)) {
    throw new ValidationError(`无效的端口号: ${config.port}`);
  }

  if (!config.timeout) {
    throw new ValidationError('timeout参数是必需的');
  }
  if (!NetworkValidator.isValidTimeout(config.timeout)) {
    throw new ValidationError(`无效的超时时间: ${config.timeout}`);
  }

  if (config.username && typeof config.username !== 'string') {
    throw new ValidationError(`无效的用户名: ${config.username}`);
  }

  if (config.password && typeof config.password !== 'string') {
    throw new ValidationError(`无效的密码`);
  }

  return config;
}

/**
 * 解析超时设置
 * @param {Object} options 命令选项
 * @param {Object} globalOptions 全局选项
 * @returns {number} 超时时间（毫秒）
 */
function resolveTimeout(options = {}, globalOptions = {}) {
  // 精确解析，无回退
  const timeout = options.timeout || globalOptions.timeout;

  if (!timeout) {
    throw new ValidationError('timeout参数是必需的');
  }

  if (!NetworkValidator.isValidTimeout(timeout)) {
    throw new ValidationError(`无效的超时时间: ${timeout}`);
  }

  return NetworkValidator.normalizeTimeout(timeout);
}

/**
 * 检查是否启用详细模式
 * @param {Object} options 命令选项
 * @param {Object} globalOptions 全局选项
 * @returns {boolean} 是否启用详细模式
 */
function isVerboseMode(options = {}, globalOptions = {}) {
  return options.verbose === true || globalOptions.verbose === true;
}

/**
 * 检查是否禁用颜色输出
 * @param {Object} options 命令选项
 * @param {Object} globalOptions 全局选项
 * @returns {boolean} 是否禁用颜色
 */
function isColorDisabled(options = {}, globalOptions = {}) {
  return options.noColor === true || globalOptions.noColor === true;
}

/**
 * 格式化错误消息
 * @param {Error} error 错误对象
 * @param {boolean} verbose 是否详细模式
 * @param {boolean} showStack 是否显示堆栈
 * @returns {string} 格式化的错误消息
 */
function formatErrorMessage(error, verbose = false, showStack = false) {
  let message = error.message || '未知错误';

  // 添加错误类型信息
  if (error.code) {
    message = `[${error.code}] ${message}`;
  }

  // 添加堆栈信息
  if (verbose && showStack && error.stack) {
    message += '\n\n堆栈信息:\n' + error.stack;
  }

  return message;
}

/**
 * 验证IP地址格式
 * @param {string} ip IP地址字符串
 * @returns {boolean} 是否有效
 */
function isValidIP(ip) {
  return NetworkValidator.isValidIP(ip);
}

/**
 * 验证端口号
 * @param {number|string} port 端口号
 * @returns {boolean} 是否有效
 */
function isValidPort(port) {
  return NetworkValidator.isValidPort(port);
}

/**
 * 安全解析JSON
 * @param {string} jsonString JSON字符串
 * @param {*} defaultValue 解析失败时的默认值
 * @returns {*} 解析结果或默认值
 */
function safeParseJSON(jsonString, defaultValue = null) {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    return defaultValue;
  }
}

/**
 * 创建格式化的命令选项说明
 * @param {Array} options 选项数组
 * @returns {string} 格式化的说明文本
 */
function formatOptionsHelp(options) {
  if (!Array.isArray(options) || options.length === 0) {
    return '';
  }

  return options
    .map((opt) => {
      const flags = opt.flags || '';
      const description = opt.description || '';
      const defaultValue = opt.defaultValue !== undefined ? ` (默认: ${opt.defaultValue})` : '';
      return `  ${flags.padEnd(20)} ${description}${defaultValue}`;
    })
    .join('\n');
}

/**
 * 延迟执行函数
 * @param {number} ms 延迟时间（毫秒）
 * @returns {Promise} Promise对象
 */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 重试函数
 * @param {Function} fn 要重试的函数
 * @param {number} maxAttempts 最大重试次数
 * @param {number} delayMs 重试间隔（毫秒）
 * @returns {Promise} 函数执行结果
 */
async function retry(fn, maxAttempts = 3, delayMs = 1000) {
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxAttempts) {
        throw lastError;
      }

      // 等待后重试
      await delay(delayMs * attempt);
    }
  }

  throw lastError;
}

module.exports = {
  resolveOutputFormat,
  getGlobalOptions,
  resolveConnectionOptions,
  resolveTimeout,
  isVerboseMode,
  isColorDisabled,
  formatErrorMessage,
  isValidIP,
  isValidPort,
  safeParseJSON,
  formatOptionsHelp,
  delay,
  retry,
};
