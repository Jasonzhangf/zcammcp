/**
 * 自定义错误类定义
 * 提供详细的错误信息和错误类型分类
 */

/**
 * 基础Z CAM错误类
 */
class ZCamError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'ZCamError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();

    // 保持堆栈跟踪
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ZCamError);
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }
}

/**
 * API错误 - HTTP请求错误
 */
class APIError extends ZCamError {
  constructor(status, message, url = '') {
    const code = `API_${status}`;
    const details = {
      status,
      url,
      statusText: message
    };

    let userMessage = `Camera API Error`;
    switch (status) {
      case 400:
        userMessage = `Bad Request - 无效的请求参数`;
        break;
      case 401:
        userMessage = `Unauthorized - 认证失败，请检查用户名和密码`;
        break;
      case 403:
        userMessage = `Forbidden - 权限不足`;
        break;
      case 404:
        userMessage = `Not Found - API端点不存在，请检查相机固件版本`;
        break;
      case 429:
        userMessage = `Too Many Requests - 请求过于频繁，请稍后重试`;
        break;
      case 500:
        userMessage = `Internal Server Error - 相机内部错误`;
        break;
      case 502:
        userMessage = `Bad Gateway - 相机网关错误`;
        break;
      case 503:
        userMessage = `Service Unavailable - 相机服务不可用`;
        break;
      default:
        userMessage = `HTTP Error ${status}: ${message}`;
    }

    super(userMessage, code, details);
    this.name = 'APIError';
    this.status = status;
    this.url = url;
  }
}

/**
 * 连接错误 - 网络连接问题
 */
class ConnectionError extends ZCamError {
  constructor(message, url = '', originalError = null) {
    const details = {
      url,
      originalError: originalError ? originalError.message : null
    };

    let userMessage = `Connection Error`;
    if (originalError) {
      switch (originalError.code) {
        case 'ECONNREFUSED':
          userMessage = `Cannot connect to camera - 请检查相机IP地址和端口`;
          break;
        case 'ENOTFOUND':
          userMessage = `Camera host not found - 请检查相机IP地址`;
          break;
        case 'ECONNRESET':
          userMessage = `Connection reset by camera`;
          break;
        case 'ETIMEDOUT':
          userMessage = `Connection timeout - 请检查网络连接`;
          break;
        default:
          userMessage = `Network Error: ${originalError.message}`;
      }
    }

    super(userMessage, 'CONNECTION_ERROR', details);
    this.name = 'ConnectionError';
    this.originalError = originalError;
  }
}

/**
 * 验证错误 - 参数验证失败
 */
class ValidationError extends ZCamError {
  constructor(message, field = null, value = null) {
    const details = {
      field,
      value
    };

    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
    this.field = field;
    this.value = value;
  }
}

/**
 * 配置错误 - 配置文件问题
 */
class ConfigError extends ZCamError {
  constructor(message, configPath = '', line = null) {
    const details = {
      configPath,
      line
    };

    super(message, 'CONFIG_ERROR', details);
    this.name = 'ConfigError';
    this.configPath = configPath;
    this.line = line;
  }
}

/**
 * 模块错误 - 模块加载或执行错误
 */
class ModuleError extends ZCamError {
  constructor(message, moduleName = '', originalError = null) {
    const details = {
      moduleName,
      originalError: originalError ? originalError.message : null
    };

    super(message, 'MODULE_ERROR', details);
    this.name = 'ModuleError';
    this.moduleName = moduleName;
    this.originalError = originalError;
  }
}

/**
 * 相机状态错误 - 相机状态不允许的操作
 */
class CameraStateError extends ZCamError {
  constructor(message, currentState = '', requiredState = '') {
    const details = {
      currentState,
      requiredState
    };

    super(message, 'CAMERA_STATE_ERROR', details);
    this.name = 'CameraStateError';
    this.currentState = currentState;
    this.requiredState = requiredState;
  }
}

/**
 * 权限错误 - 用户权限不足
 */
class PermissionError extends ZCamError {
  constructor(message, requiredPermission = '', currentUser = '') {
    const details = {
      requiredPermission,
      currentUser
    };

    super(message, 'PERMISSION_ERROR', details);
    this.name = 'PermissionError';
    this.requiredPermission = requiredPermission;
    this.currentUser = currentUser;
  }
}

/**
 * 硬件错误 - 相机硬件问题
 */
class HardwareError extends ZCamError {
  constructor(message, component = '', errorCode = null) {
    const details = {
      component,
      errorCode
    };

    super(message, 'HARDWARE_ERROR', details);
    this.name = 'HardwareError';
    this.component = component;
    this.errorCode = errorCode;
  }
}

/**
 * 超时错误 - 操作超时
 */
class TimeoutError extends ZCamError {
  constructor(message, operation = '', timeout = null) {
    const details = {
      operation,
      timeout
    };

    super(message, 'TIMEOUT_ERROR', details);
    this.name = 'TimeoutError';
    this.operation = operation;
    this.timeout = timeout;
  }
}

/**
 * 创建验证错误
 */
function createValidationError(message, field, value) {
  return new ValidationError(message, field, value);
}

/**
 * 创建API错误
 */
function createAPIError(status, message, url) {
  return new APIError(status, message, url);
}

/**
 * 创建连接错误
 */
function createConnectionError(message, url, originalError) {
  return new ConnectionError(message, url, originalError);
}

/**
 * 创建配置错误
 */
function createConfigError(message, configPath, line) {
  return new ConfigError(message, configPath, line);
}

/**
 * 创建模块错误
 */
function createModuleError(message, moduleName, originalError) {
  return new ModuleError(message, moduleName, originalError);
}

/**
 * 创建相机状态错误
 */
function createCameraStateError(message, currentState, requiredState) {
  return new CameraStateError(message, currentState, requiredState);
}

/**
 * 创建权限错误
 */
function createPermissionError(message, requiredPermission, currentUser) {
  return new PermissionError(message, requiredPermission, currentUser);
}

/**
 * 创建硬件错误
 */
function createHardwareError(message, component, errorCode) {
  return new HardwareError(message, component, errorCode);
}

/**
 * 创建超时错误
 */
function createTimeoutError(message, operation, timeout) {
  return new TimeoutError(message, operation, timeout);
}

/**
 * 判断错误类型
 */
function isAPIError(error) {
  return error instanceof APIError;
}

function isConnectionError(error) {
  return error instanceof ConnectionError;
}

function isValidationError(error) {
  return error instanceof ValidationError;
}

function isConfigError(error) {
  return error instanceof ConfigError;
}

function isModuleError(error) {
  return error instanceof ModuleError;
}

function isCameraStateError(error) {
  return error instanceof CameraStateError;
}

function isPermissionError(error) {
  return error instanceof PermissionError;
}

function isHardwareError(error) {
  return error instanceof HardwareError;
}

function isTimeoutError(error) {
  return error instanceof TimeoutError;
}

/**
 * 格式化错误信息
 */
function formatError(error, includeStack = false) {
  const errorObj = {
    type: error.name || 'Error',
    message: error.message,
    code: error.code || 'UNKNOWN'
  };

  if (error.details && Object.keys(error.details).length > 0) {
    errorObj.details = error.details;
  }

  if (error.timestamp) {
    errorObj.timestamp = error.timestamp;
  }

  if (includeStack && error.stack) {
    errorObj.stack = error.stack;
  }

  return errorObj;
}

module.exports = {
  // 错误类
  ZCamError,
  APIError,
  ConnectionError,
  ValidationError,
  ConfigError,
  ModuleError,
  CameraStateError,
  PermissionError,
  HardwareError,
  TimeoutError,

  // 创建函数
  createValidationError,
  createAPIError,
  createConnectionError,
  createConfigError,
  createModuleError,
  createCameraStateError,
  createPermissionError,
  createHardwareError,
  createTimeoutError,

  // 判断函数
  isAPIError,
  isConnectionError,
  isValidationError,
  isConfigError,
  isModuleError,
  isCameraStateError,
  isPermissionError,
  isHardwareError,
  isTimeoutError,

  // 工具函数
  formatError
};