const { formatError, isValidationError, isAPIError, isConnectionError } = require('./errors');
const { error: logError, warn, info } = require('./formatter');
const { formatErrorMessage } = require('./cli-helpers');

/**
 * 全局错误处理器
 * 提供统一的错误处理和用户友好的错误信息
 */

/**
 * 主错误处理函数
 * @param {Error} error 错误对象
 * @param {Object} globalOptions 全局选项
 */
function handleErrors(error, globalOptions = {}) {
  const verbose = globalOptions.verbose || false;

  if (isValidationError(error)) {
    handleValidationError(error);
  } else if (isAPIError(error)) {
    handleAPIError(error, verbose);
  } else if (isConnectionError(error)) {
    handleConnectionError(error, verbose);
  } else if (error.name === 'ModuleError') {
    handleModuleError(error, verbose);
  } else if (error.name === 'ConfigError') {
    handleConfigError(error, verbose);
  } else if (error.name === 'CameraStateError') {
    handleCameraStateError(error);
  } else if (error.name === 'PermissionError') {
    handlePermissionError(error);
  } else if (error.name === 'HardwareError') {
    handleHardwareError(error);
  } else if (error.name === 'TimeoutError') {
    handleTimeoutError(error);
  } else {
    handleGenericError(error, verbose);
  }

  // 显示解决建议
  showSuggestions(error, globalOptions);

  // 设置退出码
  process.exitCode = 1;
}

/**
 * 处理验证错误
 * @param {Error} error 验证错误
 */
function handleValidationError(error) {
  error(`参数验证失败: ${error.message}`);

  if (error.field) {
    info(`问题字段: ${error.field}`);
  }

  if (error.value !== undefined) {
    info(`问题值: ${JSON.stringify(error.value)}`);
  }
}

/**
 * 处理API错误
 * @param {Error} error API错误
 * @param {boolean} verbose 详细模式
 */
function handleAPIError(error, verbose) {
  switch (error.status) {
    case 400:
      error(`请求参数错误: ${error.message}`);
      break;
    case 401:
      error(`认证失败: ${error.message}`);
      break;
    case 403:
      error(`权限不足: ${error.message}`);
      break;
    case 404:
      error(`API端点不存在: ${error.message}`);
      break;
    case 429:
      error(`请求过于频繁: ${error.message}`);
      break;
    case 500:
      error(`相机内部错误: ${error.message}`);
      break;
    case 502:
      error(`相机网关错误: ${error.message}`);
      break;
    case 503:
      error(`相机服务不可用: ${error.message}`);
      break;
    default:
      error(`相机API错误 (${error.status}): ${error.message}`);
  }

  if (error.url && verbose) {
    info(`请求URL: ${error.url}`);
  }
}

/**
 * 处理连接错误
 * @param {Error} error 连接错误
 * @param {boolean} verbose 详细模式
 */
function handleConnectionError(error, verbose) {
  logError(`连接相机失败: ${error.message}`);

  if (error.originalError && verbose) {
    info(`原始错误: ${error.originalError.message}`);
    info(`错误代码: ${error.originalError.code || 'N/A'}`);
  }

  if (error.url && verbose) {
    info(`目标地址: ${error.url}`);
  }
}

/**
 * 处理模块错误
 * @param {Error} error 模块错误
 * @param {boolean} verbose 详细模式
 */
function handleModuleError(error, verbose) {
  error(`模块错误: ${error.message}`);

  if (error.moduleName) {
    info(`问题模块: ${error.moduleName}`);
  }

  if (error.originalError && verbose) {
    info(`原始错误: ${error.originalError.message}`);
    if (error.originalError.stack) {
      info(`堆栈跟踪:\n${error.originalError.stack}`);
    }
  }
}

/**
 * 处理配置错误
 * @param {Error} error 配置错误
 * @param {boolean} verbose 详细模式
 */
function handleConfigError(error, verbose) {
  error(`配置错误: ${error.message}`);

  if (error.configPath) {
    info(`配置文件: ${error.configPath}`);
  }

  if (error.line && verbose) {
    info(`问题行号: ${error.line}`);
  }
}

/**
 * 处理相机状态错误
 * @param {Error} error 相机状态错误
 */
function handleCameraStateError(error) {
  error(`相机状态错误: ${error.message}`);

  if (error.currentState) {
    info(`当前状态: ${error.currentState}`);
  }

  if (error.requiredState) {
    info(`需要状态: ${error.requiredState}`);
  }
}

/**
 * 处理权限错误
 * @param {Error} error 权限错误
 */
function handlePermissionError(error) {
  error(`权限不足: ${error.message}`);

  if (error.requiredPermission) {
    info(`需要权限: ${error.requiredPermission}`);
  }

  if (error.currentUser) {
    info(`当前用户: ${error.currentUser}`);
  }
}

/**
 * 处理硬件错误
 * @param {Error} error 硬件错误
 */
function handleHardwareError(error) {
  error(`硬件错误: ${error.message}`);

  if (error.component) {
    info(`问题组件: ${error.component}`);
  }

  if (error.errorCode) {
    info(`错误代码: ${error.errorCode}`);
  }
}

/**
 * 处理超时错误
 * @param {Error} error 超时错误
 */
function handleTimeoutError(error) {
  error(`操作超时: ${error.message}`);

  if (error.operation) {
    info(`超时操作: ${error.operation}`);
  }

  if (error.timeout) {
    info(`超时时间: ${error.timeout}ms`);
  }
}

/**
 * 处理通用错误
 * @param {Error} error 通用错误
 * @param {boolean} verbose 详细模式
 */
function handleGenericError(error, verbose) {
  const message = formatErrorMessage(error, verbose, verbose);
  logError(message);
}

/**
 * 显示解决建议
 * @param {Error} error 错误对象
 * @param {Object} globalOptions 全局选项
 */
function showSuggestions(error, globalOptions) {
  if (isValidationError(error)) {
    showValidationSuggestions(error);
  } else if (isAPIError(error)) {
    showAPISuggestions(error, globalOptions);
  } else if (isConnectionError(error)) {
    showConnectionSuggestions(error, globalOptions);
  } else if (error.name === 'ModuleError') {
    showModuleSuggestions(error);
  } else if (error.name === 'ConfigError') {
    showConfigSuggestions(error);
  }
}

/**
 * 显示验证错误建议
 * @param {Error} error 验证错误
 */
function showValidationSuggestions(error) {
  console.log();
  info('💡 解决建议:');

  if (error.field && error.field.includes('speed')) {
    console.log('   • 速度参数必须是1-9之间的数字');
    console.log('   • 例如: zcam control ptz move up 5');
  }

  if (error.field && error.field.includes('index')) {
    console.log('   • 索引参数必须是1-255之间的数字');
    console.log('   • 例如: zcam preset recall 1');
  }

  if (error.field && error.field.includes('host')) {
    console.log('   • 检查相机IP地址格式');
    console.log('   • 例如: 192.168.1.100 或 camera.local');
  }

  console.log('   • 使用 --help 查看命令帮助');
  console.log('   • 使用 --verbose 获取更多错误信息');
}

/**
 * 显示API错误建议
 * @param {Error} error API错误
 * @param {Object} globalOptions 全局选项
 */
function showAPISuggestions(error, globalOptions) {
  console.log();
  info('💡 解决建议:');

  switch (error.status) {
    case 401:
      console.log('   • 检查用户名和密码是否正确');
      console.log('   • 确认用户有相应的权限');
      break;
    case 403:
      console.log('   • 当前用户权限不足');
      console.log('   • 联系相机管理员分配相应权限');
      break;
    case 404:
      console.log('   • 检查相机固件版本是否支持该功能');
      console.log('   • 更新相机固件到最新版本');
      break;
    case 429:
      console.log('   • 请求过于频繁，请稍后重试');
      console.log('   • 避免连续快速发送命令');
      break;
    case 500:
      console.log('   • 相机内部错误，尝试重启相机');
      console.log('   • 检查相机日志获取更多信息');
      break;
  }

  if (!globalOptions.host || globalOptions.host === '192.168.1.100') {
    console.log('   • 确认相机IP地址: --host 192.168.1.xxx');
  }
}

/**
 * 显示连接错误建议
 * @param {Error} error 连接错误
 * @param {Object} globalOptions 全局选项
 */
function showConnectionSuggestions(error, globalOptions) {
  console.log();
  info('💡 解决建议:');

  console.log('   • 检查相机是否开机');
  console.log('   • 检查网络连接是否正常');
  console.log('   • 确认相机IP地址是否正确');

  if (!globalOptions.host || globalOptions.host === '192.168.1.100') {
    console.log('   • 设置正确的相机IP: --host 192.168.1.xxx');
  }

  if (globalOptions.port && globalOptions.port !== '80') {
    console.log('   • 确认HTTP端口是否正确');
  }

  console.log('   • 尝试ping相机地址确认连通性');
  console.log('   • 检查防火墙设置');
}

/**
 * 显示模块错误建议
 * @param {Error} error 模块错误
 */
function showModuleSuggestions(error) {
  console.log();
  info('💡 解决建议:');

  if (error.moduleName) {
    console.log(`   • 检查 ${error.moduleName} 模块是否正确安装`);
    console.log(`   • 尝试重新安装 CLI: npm install -g zcam-cli`);
  }

  console.log('   • 检查 Node.js 版本是否支持 (需要 >= 14.0.0)');
  console.log('   • 查看项目文档获取更多信息');
}

/**
 * 显示配置错误建议
 * @param {Error} error 配置错误
 */
function showConfigSuggestions(error) {
  console.log();
  info('💡 解决建议:');

  if (error.configPath) {
    console.log(`   • 检查配置文件: ${error.configPath}`);
    console.log('   • 确认配置文件格式正确');
  }

  console.log('   • 可以删除配置文件让CLI重新生成');
  console.log('   • 使用 --profile default 使用默认配置');
}

/**
 * 非致命错误处理 - 不退出程序
 * @param {Error} error 错误对象
 * @param {Object} options 选项
 */
function handleNonFatalError(error, options = {}) {
  if (options.verbose) {
    warn(`警告: ${error.message}`);
    if (error.stack) {
      console.log(error.stack);
    }
  } else {
    warn(`警告: ${error.message}`);
  }
}

/**
 * 异步错误处理包装器
 * @param {Function} fn 异步函数
 * @param {Object} globalOptions 全局选项
 * @returns {Function} 包装后的函数
 */
function asyncErrorHandler(fn, globalOptions = {}) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      handleErrors(error, globalOptions);
    }
  };
}

/**
 * 处理配置错误
 * @param {Error} error 配置错误
 * @param {boolean} verbose 详细模式
 */
function handleConfigError(error, verbose) {
  logError(`配置错误: ${error.message}`);

  if (error.details) {
    info(`配置详情: ${error.details}`);
  }

  if (verbose && error.stack) {
    info(`堆栈跟踪:\n${error.stack}`);
  }
}

/**
 * 处理模块错误
 * @param {Error} error 模块错误
 * @param {boolean} verbose 详细模式
 */
function handleModuleError(error, verbose) {
  logError(`模块加载错误: ${error.message}`);

  if (error.module) {
    info(`失败模块: ${error.module}`);
  }

  if (error.suggestion) {
    info(`建议: ${error.suggestion}`);
  }

  if (verbose && error.stack) {
    info(`堆栈跟踪:\n${error.stack}`);
  }
}

/**
 * 处理权限错误
 * @param {Error} error 权限错误
 */
function handlePermissionError(error) {
  logError(`权限错误: ${error.message}`);
  info('请检查用户权限或联系管理员');
}

/**
 * 处理硬件错误
 * @param {Error} error 硬件错误
 */
function handleHardwareError(error) {
  logError(`硬件错误: ${error.message}`);
  info('请检查设备连接状态');
}

/**
 * 处理超时错误
 * @param {Error} error 超时错误
 */
function handleTimeoutError(error) {
  logError(`操作超时: ${error.message}`);
  info('请增加超时时间或检查网络连接');
}

module.exports = {
  handleErrors,
  handleNonFatalError,
  asyncErrorHandler,
  handleConfigError,
  handleModuleError,
  handlePermissionError,
  handleHardwareError,
  handleTimeoutError
};