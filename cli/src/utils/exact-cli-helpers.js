/**
 * 精确CLI辅助工具
 * 移除所有回退策略，实现严格的参数处理
 */

const ExactConfigResolver = require('../config/exact-resolver');
const { getProfile } = require('../config/strict-config');
const { ValidationError } = require('../utils/errors');

/**
 * 精确解析输出格式
 * @param {Object} options 命令选项
 * @param {Object} globalOptions 全局选项
 * @returns {string} 输出格式 ('table'|'json'|'csv')
 * @throws {ValidationError} 如果格式无效
 */
function resolveOutputFormat(options = {}, globalOptions = {}) {
  // 优先使用命令级别的 --json 参数
  if (options.json === true || globalOptions.json === true) {
    return 'json';
  }

  // 其次使用全局输出格式设置
  if (typeof globalOptions.output === 'string' && globalOptions.output.trim()) {
    return ExactConfigResolver.resolveOutputFormat(globalOptions.output);
  }

  // 最后使用命令级别的格式设置
  if (typeof options.output === 'string' && options.output.trim()) {
    return ExactConfigResolver.resolveOutputFormat(options.output);
  }

  // 输出格式是唯一可以有合理默认值的配置
  return 'table';
}

/**
 * 精确获取全局选项
 * @param {Command} cmd Commander 命令实例
 * @returns {Object} 全局选项对象
 * @throws {ValidationError} 如果无法获取全局选项
 */
function getGlobalOptions(cmd) {
  if (!cmd || !cmd.parent) {
    throw new ValidationError('无法获取全局命令上下文');
  }

  try {
    // 安全地获取全局选项
    let current = cmd;
    while (current && current.parent) {
      current = current.parent;
    }

    if (current && typeof current.opts === 'function') {
      const options = current.opts();
      if (!options || typeof options !== 'object') {
        throw new ValidationError('全局选项格式无效');
      }
      return options;
    }

    throw new ValidationError('无法找到根命令实例');
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new ValidationError(`获取全局选项失败: ${error.message}`);
  }
}

/**
 * 精确解析连接选项
 * @param {Object} options 命令选项
 * @param {Object} globalOptions 全局选项
 * @returns {Object} 连接配置
 * @throws {ValidationError} 如果任何必需参数缺失或无效
 */
function resolveConnectionOptions(options = {}, globalOptions = {}) {
  // 尝试从配置文件加载
  let profileConfig = {};
  if (globalOptions.profile) {
    try {
      profileConfig = getProfile(globalOptions.profile);
    } catch (error) {
      // 配置文件不存在不是致命错误，继续使用命令行参数
    }
  }

  // 构建候选值，按优先级排序
  const candidates = {
    host: options.host || globalOptions.host || profileConfig.host,
    port: options.port || globalOptions.port || profileConfig.port,
    timeout: options.timeout || globalOptions.timeout || profileConfig.timeout,
    username: options.username || globalOptions.username || profileConfig.username,
    password: options.password || globalOptions.password || profileConfig.password,
  };

  // 精确解析每个参数
  return {
    host: ExactConfigResolver.resolveHost(candidates.host),
    port: ExactConfigResolver.resolvePort(candidates.port),
    timeout: ExactConfigResolver.resolveTimeout(candidates.timeout),
    username: ExactConfigResolver.resolveStringOption(candidates.username, 'username', ''),
    password: ExactConfigResolver.resolveStringOption(candidates.password, 'password', ''),
  };
}

/**
 * 精确解析超时设置
 * @param {Object} options 命令选项
 * @param {Object} globalOptions 全局选项
 * @returns {number} 超时时间（毫秒）
 * @throws {ValidationError} 如果超时时间无效
 */
function resolveTimeout(options = {}, globalOptions = {}) {
  const timeout = options.timeout || globalOptions.timeout;
  return ExactConfigResolver.resolveTimeout(timeout);
}

/**
 * 精确检查是否启用详细模式
 * @param {Object} options 命令选项
 * @param {Object} globalOptions 全局选项
 * @returns {boolean} 是否启用详细模式
 */
function isVerboseMode(options = {}, globalOptions = {}) {
  return ExactConfigResolver.resolveBooleanOption(
    options.verbose !== undefined ? options.verbose : globalOptions.verbose,
    'verbose',
    false
  );
}

/**
 * 精确检查是否禁用颜色输出
 * @param {Object} options 命令选项
 * @param {Object} globalOptions 全局选项
 * @returns {boolean} 是否禁用颜色
 */
function isColorDisabled(options = {}, globalOptions = {}) {
  return ExactConfigResolver.resolveBooleanOption(
    options.noColor !== undefined ? options.noColor : globalOptions.noColor,
    'no-color',
    false
  );
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
  return ExactConfigResolver.resolveHost(ip) === ip;
}

/**
 * 验证端口号
 * @param {number|string} port 端口号
 * @returns {boolean} 是否有效
 */
function isValidPort(port) {
  try {
    ExactConfigResolver.resolvePort(port);
    return true;
  } catch {
    return false;
  }
}

/**
 * 精确解析JSON
 * @param {string} jsonString JSON字符串
 * @param {*} defaultValue 解析失败时的默认值
 * @returns {*} 解析结果或默认值
 * @throws {ValidationError} 如果JSON格式无效且没有默认值
 */
function safeParseJSON(jsonString, defaultValue = null) {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    if (defaultValue !== null) {
      return defaultValue;
    }
    throw new ValidationError(`JSON格式无效: ${error.message}`);
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
  if (typeof ms !== 'number' || ms < 0) {
    throw new ValidationError('延迟时间必须是非负数');
  }
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 精确重试函数
 * @param {Function} fn 要重试的函数
 * @param {number} maxAttempts 最大重试次数
 * @param {number} delayMs 重试间隔（毫秒）
 * @returns {Promise} 函数执行结果
 * @throws {ValidationError} 如果参数无效
 * @throws {Error} 如果所有重试都失败
 */
async function retry(fn, maxAttempts = 3, delayMs = 1000) {
  if (typeof fn !== 'function') {
    throw new ValidationError('重试函数必须是一个函数');
  }

  if (typeof maxAttempts !== 'number' || maxAttempts < 1 || maxAttempts > 10) {
    throw new ValidationError('最大重试次数必须在 1-10 范围内');
  }

  if (typeof delayMs !== 'number' || delayMs < 0 || delayMs > 60000) {
    throw new ValidationError('重试间隔必须在 0-60000 毫秒范围内');
  }

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

/**
 * 精确验证必需参数
 * @param {Object} params 参数对象
 * @param {Array<string>} requiredFields 必需字段列表
 * @throws {ValidationError} 如果缺少必需参数
 */
function validateRequiredParams(params, requiredFields) {
  if (!params || typeof params !== 'object') {
    throw new ValidationError('参数对象必须是有效的对象');
  }

  const missing = requiredFields.filter((field) => {
    const value = params[field];
    return value === undefined || value === null || value === '';
  });

  if (missing.length > 0) {
    throw new ValidationError(`缺少必需参数: ${missing.join(', ')}`);
  }
}

/**
 * 精确解析数值范围
 * @param {number|string} value 数值
 * @param {number} min 最小值
 * @param {number} max 最大值
 * @param {string} fieldName 字段名称
 * @returns {number} 验证后的数值
 * @throws {ValidationError} 如果数值超出范围
 */
function validateNumberRange(value, min, max, fieldName = '参数') {
  return ExactConfigResolver.resolveNumberOption(value, fieldName, { min, max });
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
  validateRequiredParams,
  validateNumberRange,
};
