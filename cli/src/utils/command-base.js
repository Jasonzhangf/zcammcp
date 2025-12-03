/**
 * 命令基础类
 * 为所有CLI命令提供统一的基础功能和工具方法
 */

const {
  resolveOutputFormat,
  getGlobalOptions,
  resolveConnectionOptions,
  resolveTimeout,
  isVerboseMode,
  isColorDisabled,
} = require('./cli-helpers');
const { formatOutput } = require('./formatter');
const { handleErrors } = require('./error-handler');
const { createAPI } = require('../core/api');

class CommandBase {
  constructor() {
    this.api = null;
  }

  /**
   * 初始化命令上下文
   * @param {Command} cmd Commander 命令实例
   * @returns {Object} 命令上下文对象
   */
  initContext(cmd) {
    const globalOptions = getGlobalOptions(cmd);
    const options = cmd.opts();

    return {
      cmd,
      options,
      globalOptions,
      outputFormat: resolveOutputFormat(options, globalOptions),
      connection: resolveConnectionOptions(options, globalOptions),
      timeout: resolveTimeout(options, globalOptions),
      verbose: isVerboseMode(options, globalOptions),
      noColor: isColorDisabled(options, globalOptions),
    };
  }

  /**
   * 初始化API客户端
   * @param {Object} context 命令上下文
   * @returns {Object} API客户端实例
   */
  initAPI(context) {
    if (!this.api) {
      const config = {
        ...context.connection,
        timeout: context.timeout,
      };
      this.api = createAPI(config);
    }
    return this.api;
  }

  /**
   * 安全执行命令
   * @param {Function} commandFunction 要执行的命令函数
   * @param {Object} context 命令上下文
   * @returns {Promise} 执行结果
   */
  async execute(commandFunction, context) {
    try {
      const result = await commandFunction(this, context);

      // 如果有结果数据，格式化输出
      if (result !== undefined && result !== null) {
        this.formatResult(result, context);
      }

      return result;
    } catch (error) {
      handleErrors(error, {
        ...context.globalOptions,
        verbose: context.verbose,
      });
    }
  }

  /**
   * 格式化输出结果
   * @param {*} result 要输出的结果
   * @param {Object} context 命令上下文
   */
  formatResult(result, context) {
    const formatOptions = {
      verbose: context.verbose,
      noColor: context.noColor,
    };

    formatOutput(result, context.outputFormat, formatOptions);
  }

  /**
   * 创建表格数据
   * @param {Array} headers 表头数组
   * @param {Array} rows 数据行数组
   * @param {Object} options 表格选项
   * @returns {Object} 表格数据对象
   */
  createTableData(headers, rows, options = {}) {
    return {
      headers,
      rows,
      options: {
        title: options.title,
        emptyMessage: options.emptyMessage || '暂无数据',
        ...options,
      },
    };
  }

  /**
   * 验证必需参数
   * @param {Object} params 参数对象
   * @param {Array} requiredFields 必需字段数组
   * @throws {Error} 如果缺少必需参数
   */
  validateRequiredParams(params, requiredFields) {
    const missing = requiredFields.filter((field) => !params[field]);

    if (missing.length > 0) {
      throw new Error(`缺少必需参数: ${missing.join(', ')}`);
    }
  }

  /**
   * 验证IP地址
   * @param {string} ip IP地址
   * @param {string} fieldName 字段名称
   * @throws {Error} 如果IP地址无效
   */
  validateIP(ip, fieldName = 'IP地址') {
    const ipRegex =
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

    if (!ipRegex.test(ip)) {
      throw new Error(`${fieldName}格式无效: ${ip}`);
    }
  }

  /**
   * 验证端口号
   * @param {number|string} port 端口号
   * @param {string} fieldName 字段名称
   * @throws {Error} 如果端口号无效
   */
  validatePort(port, fieldName = '端口号') {
    const portNum = parseInt(port);

    if (isNaN(portNum) || portNum <= 0 || portNum > 65535) {
      throw new Error(`${fieldName}无效: ${port} (应为1-65535之间的数字)`);
    }
  }

  /**
   * 创建成功响应
   * @param {*} data 响应数据
   * @param {string} message 成功消息
   * @returns {Object} 成功响应对象
   */
  createSuccessResponse(data, message = '操作成功') {
    return {
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 创建错误响应
   * @param {string} message 错误消息
   * @param {string} code 错误代码
   * @param {*} details 错误详情
   * @returns {Object} 错误响应对象
   */
  createErrorResponse(message, code = 'UNKNOWN_ERROR', details = null) {
    return {
      success: false,
      message,
      code,
      details,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 记录调试信息
   * @param {Object} context 命令上下文
   * @param {string} message 调试消息
   * @param {*} data 附加数据
   */
  logDebug(context, message, data = null) {
    if (context.verbose) {
      console.log(`[DEBUG] ${message}`);
      if (data) {
        console.log(JSON.stringify(data, null, 2));
      }
    }
  }

  /**
   * 记录警告信息
   * @param {string} message 警告消息
   */
  logWarning(message) {
    console.warn(`[WARNING] ${message}`);
  }

  /**
   * 记录信息
   * @param {string} message 信息消息
   */
  logInfo(message) {
    console.log(`[INFO] ${message}`);
  }

  /**
   * 清理资源
   */
  cleanup() {
    if (this.api) {
      // 如果API客户端需要清理资源，在这里处理
      this.api = null;
    }
  }
}

/**
 * 创建命令包装器
 * 为命令函数提供统一的包装和错误处理
 * @param {Function} commandFunction 命令函数
 * @returns {Function} 包装后的命令函数
 */
function wrapCommand(commandFunction) {
  return async (options, cmd) => {
    const commandBase = new CommandBase();
    const context = commandBase.initContext(cmd);

    try {
      await commandBase.execute(commandFunction, context);
    } finally {
      commandBase.cleanup();
    }
  };
}

module.exports = {
  CommandBase,
  wrapCommand,
};
