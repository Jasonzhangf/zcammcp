/**
 * 服务基类
 * 为所有模块服务提供统一的基础功能和工具方法
 */

class BaseService {
  constructor() {
    this.api = null;
  }

  /**
   * 初始化API客户端
   * @param {Object} api API客户端实例
   */
  setAPI(api) {
    this.api = api;
  }

  /**
   * 验证API是否已初始化
   * @throws {Error} 如果API未初始化
   */
  ensureAPI() {
    if (!this.api) {
      throw new Error('API客户端未初始化，请先调用 setAPI()');
    }
  }

  /**
   * 执行API请求的通用方法
   * @param {Function} apiCall API调用函数
   * @param {string} errorMessage 错误消息
   * @returns {Promise} API调用结果
   */
  async executeAPI(apiCall, errorMessage = 'API调用失败') {
    this.ensureAPI();

    try {
      return await apiCall();
    } catch (error) {
      throw new Error(`${errorMessage}: ${error.message}`);
    }
  }

  /**
   * 构建查询字符串
   * @param {Object} params 参数对象
   * @returns {string} 查询字符串
   */
  buildQueryString(params) {
    const searchParams = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        searchParams.append(key, value);
      }
    }

    const queryString = searchParams.toString();
    return queryString ? `?${queryString}` : '';
  }

  /**
   * 验证必需参数
   * @param {Object} params 参数对象
   * @param {Array} requiredFields 必需字段数组
   * @throws {Error} 如果缺少必需参数
   */
  validateParams(params, requiredFields) {
    const missing = requiredFields.filter(field => {
      const value = params[field];
      return value === undefined || value === null || value === '';
    });

    if (missing.length > 0) {
      throw new Error(`缺少必需参数: ${missing.join(', ')}`);
    }
  }

  /**
   * 验证数值范围
   * @param {number} value 数值
   * @param {number} min 最小值
   * @param {number} max 最大值
   * @param {string} fieldName 字段名称
   * @throws {Error} 如果数值超出范围
   */
  validateRange(value, min, max, fieldName = '参数') {
    const numValue = Number(value);
    if (isNaN(numValue) || numValue < min || numValue > max) {
      throw new Error(`${fieldName}必须在 ${min} 到 ${max} 之间，当前值: ${value}`);
    }
    return numValue;
  }

  /**
   * 验证枚举值
   * @param {string} value 值
   * @param {Array} allowedValues 允许的值数组
   * @param {string} fieldName 字段名称
   * @throws {Error} 如果值不在允许范围内
   */
  validateEnum(value, allowedValues, fieldName = '参数') {
    if (!allowedValues.includes(value)) {
      throw new Error(`${fieldName}无效，允许的值: ${allowedValues.join(', ')}, 当前值: ${value}`);
    }
    return value;
  }

  /**
   * 格式化响应数据
   * @param {*} data 原始数据
   * @param {Object} options 格式化选项
   * @returns {Object} 格式化后的数据
   */
  formatResponse(data, options = {}) {
    const {
      includeTimestamp = true,
      includeStatus = true,
      transform = null
    } = options;

    let response = {
      success: true,
      data: transform ? transform(data) : data
    };

    if (includeTimestamp) {
      response.timestamp = new Date().toISOString();
    }

    if (includeStatus) {
      response.status = 'completed';
    }

    return response;
  }

  /**
   * 创建分页响应
   * @param {Array} items 数据项
   * @param {number} page 页码（从1开始）
   * @param {number} pageSize 每页大小
   * @param {Object} options 额外选项
   * @returns {Object} 分页响应
   */
  createPaginatedResponse(items, page = 1, pageSize = 10, options = {}) {
    const total = items.length;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedItems = items.slice(startIndex, endIndex);

    return {
      success: true,
      data: paginatedItems,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
        hasNext: endIndex < total,
        hasPrev: page > 1
      },
      timestamp: new Date().toISOString(),
      ...options
    };
  }

  /**
   * 处理批量操作
   * @param {Array} items 要处理的项目
   * @param {Function} processor 处理函数
   * @param {Object} options 选项
   * @returns {Promise} 批量处理结果
   */
  async processBatch(items, processor, options = {}) {
    const {
      batchSize = 10,
      delay = 100,
      stopOnError = false
    } = options;

    const results = [];
    const errors = [];

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);

      for (const item of batch) {
        try {
          const result = await processor(item);
          results.push({ item, result, success: true });
        } catch (error) {
          errors.push({ item, error: error.message, success: false });

          if (stopOnError) {
            throw new Error(`批量处理失败: ${error.message}`);
          }
        }

        // 添加延迟避免API限制
        if (delay > 0 && i + 1 < items.length) {
          await this.delay(delay);
        }
      }
    }

    return {
      success: errors.length === 0,
      results,
      errors,
      total: items.length,
      successCount: results.length,
      errorCount: errors.length,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 延迟执行
   * @param {number} ms 延迟时间（毫秒）
   * @returns {Promise} Promise对象
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 重试机制
   * @param {Function} fn 要重试的函数
   * @param {number} maxAttempts 最大重试次数
   * @param {number} delayMs 重试间隔
   * @param {Function} shouldRetry 是否重试的判断函数
   * @returns {Promise} 执行结果
   */
  async retry(fn, maxAttempts = 3, delayMs = 1000, shouldRetry = null) {
    let lastError;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        // 检查是否应该重试
        if (shouldRetry && !shouldRetry(error, attempt)) {
          throw error;
        }

        // 最后一次尝试失败
        if (attempt === maxAttempts) {
          throw error;
        }

        // 等待后重试
        await this.delay(delayMs * attempt);
      }
    }

    throw lastError;
  }

  /**
   * 缓存管理
   */
  createCache() {
    const cache = new Map();
    const ttlMap = new Map();

    return {
      set(key, value, ttl = 300000) { // 默认5分钟
        cache.set(key, value);
        if (ttl > 0) {
          ttlMap.set(key, Date.now() + ttl);
        }
      },

      get(key) {
        const ttl = ttlMap.get(key);
        if (ttl && Date.now() > ttl) {
          cache.delete(key);
          ttlMap.delete(key);
          return null;
        }
        return cache.get(key) || null;
      },

      delete(key) {
        cache.delete(key);
        ttlMap.delete(key);
      },

      clear() {
        cache.clear();
        ttlMap.clear();
      },

      size() {
        return cache.size;
      }
    };
  }

  /**
   * 日志记录
   */
  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] [${this.constructor.name}] ${message}`;

    switch (level) {
      case 'error':
        console.error(logMessage);
        break;
      case 'warn':
        console.warn(logMessage);
        break;
      case 'debug':
        if (process.env.NODE_ENV === 'development') {
          console.log(logMessage);
        }
        break;
      default:
        console.log(logMessage);
    }
  }
}

module.exports = BaseService;