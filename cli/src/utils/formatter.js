const Table = require('cli-table3');
const chalk = require('chalk');
const { resolveOutputFormat } = require('./cli-helpers');

/**
 * 输出格式化工具
 * 支持表格、JSON、CSV等多种输出格式
 */

/**
 * 主格式化函数
 * @param {*} data 要格式化的数据
 * @param {string|boolean} format 输出格式 (table|json|csv|true for json)
 * @param {Object} options 格式化选项
 */
function formatOutput(data, format = 'table', options = {}) {
  // 处理null和undefined
  if (data === null) {
    return format === 'json' ? 'null' : 'No data';
  }
  if (data === undefined) {
    return format === 'json' ? 'undefined' : 'No data';
  }

  // 处理布尔值格式（兼容 --json 标志）
  let outputFormat = format;
  if (typeof format === 'boolean') {
    outputFormat = format ? 'json' : 'table';
  }

  // 确保格式是字符串类型
  if (typeof outputFormat !== 'string') {
    outputFormat = 'table';
  }

  switch (outputFormat.toLowerCase()) {
    case 'json':
      return formatJSON(data, options);
    case 'csv':
      return formatCSV(data, options);
    case 'table':
    default:
      return formatTable(data, options);
  }
}

/**
 * 表格格式化
 * @param {*} data 数据
 * @param {Object} options 选项
 */
function formatTable(data, options = {}) {
  if (data === null || data === undefined) {
    return 'No data';
  }

  if (typeof data === 'string') {
    return data;
  }

  if (typeof data === 'object' && !Array.isArray(data)) {
    // 单个对象，转换为键值对表格
    if (Object.keys(data).length === 0) {
      return 'No data';
    }
    return formatObjectTable(data, options);
  } else if (Array.isArray(data)) {
    // 数组，检查是否为对象数组
    if (data.length === 0) {
      return 'No data';
    }
    if (data.length > 0 && typeof data[0] === 'object') {
      return formatArrayTable(data, options);
    } else {
      // 简单数组
      return formatSimpleArray(data, options);
    }
  } else {
    return String(data);
  }
}

/**
 * 格式化单个对象为表格
 * @param {Object} obj 对象
 * @param {Object} options 选项
 */
function formatObjectTable(obj, options = {}) {
  const table = new Table({
    chars: {
      'top': '═',
      'top-mid': '╤',
      'top-left': '╔',
      'top-right': '╗',
      'bottom': '═',
      'bottom-mid': '╧',
      'bottom-left': '╚',
      'bottom-right': '╝',
      'left': '║',
      'left-mid': '╟',
      'mid': '─',
      'mid-mid': '┼',
      'right': '║',
      'right-mid': '╢',
      'middle': '│'
    },
    style: { 'padding-left': 1, 'padding-right': 1 }
  });

  Object.entries(obj).forEach(([key, value]) => {
    const formattedKey = options.highlight ? chalk.cyan(key) : key;
    const formattedValue = formatValue(value, options);
    table.push([formattedKey, formattedValue]);
  });

  return table.toString();
}

/**
 * 格式化对象数组为表格
 * @param {Array} arr 数组
 * @param {Object} options 选项
 */
function formatArrayTable(arr, options = {}) {
  if (arr.length === 0) {
    return 'No data';
  }

  // 获取所有列名
  const columns = [...new Set(arr.flatMap(item => Object.keys(item)))];

  const table = new Table({
    head: options.highlight ? columns.map(col => chalk.cyan(col)) : columns,
    chars: {
      'top': '═',
      'top-mid': '╤',
      'top-left': '╔',
      'top-right': '╗',
      'bottom': '═',
      'bottom-mid': '╧',
      'bottom-left': '╚',
      'bottom-right': '╝',
      'left': '║',
      'left-mid': '╟',
      'mid': '─',
      'mid-mid': '┼',
      'right': '║',
      'right-mid': '╢',
      'middle': '│'
    },
    style: { 'padding-left': 1, 'padding-right': 1 }
  });

  arr.forEach(item => {
    const row = columns.map(col => {
      const value = item[col];
      return formatValue(value, options);
    });
    table.push(row);
  });

  return table.toString();
}

/**
 * 格式化简单数组
 * @param {Array} arr 数组
 * @param {Object} options 选项
 */
function formatSimpleArray(arr, options = {}) {
  const lines = arr.map((item, index) => {
    const prefix = options.numbered ? `${index + 1}. ` : '';
    const formattedValue = formatValue(item, options);
    return `${prefix}${formattedValue}`;
  });
  return lines.join('\n');
}

/**
 * JSON格式化
 * @param {*} data 数据
 * @param {Object} options 选项
 */
function formatJSON(data, options = {}) {
  const indent = options.indent || 2;

  // 处理null和undefined
  if (data === null) return 'null';
  if (data === undefined) return 'undefined';

  // 处理循环引用
  const seen = new WeakSet();
  const jsonString = JSON.stringify(data, (key, val) => {
    if (val != null && typeof val === 'object') {
      if (seen.has(val)) {
        return '[Circular]';
      }
      seen.add(val);
    }
    return val;
  }, indent);

  return jsonString;
}

/**
 * CSV格式化
 * @param {*} data 数据
 * @param {Object} options 选项
 */
function formatCSV(data, options = {}) {
  if (!Array.isArray(data)) {
    data = [data];
  }

  if (data.length === 0 || Object.keys(data[0]).length === 0) {
    return '';
  }

  // 获取列名
  const columns = Object.keys(data[0]);
  const lines = [];

  // 输出标题行
  if (options.header !== false) {
    lines.push(columns.join(','));
  }

  // 输出数据行
  data.forEach(item => {
    const row = columns.map(col => {
      const value = item[col];
      return formatCSVValue(value);
    });
    lines.push(row.join(','));
  });

  return lines.join('\n');
}

/**
 * 格式化单个值
 * @param {*} value 值
 * @param {Object} options 选项
 * @returns {string} 格式化后的字符串
 */
function formatValue(value, options = {}) {
  if (value === null || value === undefined) {
    return chalk.gray('null');
  }

  if (typeof value === 'boolean') {
    return value ? chalk.green('true') : chalk.red('false');
  }

  if (typeof value === 'number') {
    return chalk.yellow(String(value));
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'object') {
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (Array.isArray(value)) {
      return `[${value.length} items]`;
    } else {
      return `{${Object.keys(value).length} keys}`;
    }
  }

  return String(value);
}

/**
 * 格式化CSV值
 * @param {*} value 值
 * @returns {string} CSV格式的值
 */
function formatCSVValue(value) {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'string') {
    // 如果包含逗号、引号或换行符，需要用引号包围并转义内部引号
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  return String(value);
}

/**
 * 创建进度条
 * @param {number} current 当前进度
 * @param {number} total 总数
 * @param {number} width 进度条宽度
 * @returns {string} 进度条字符串
 */
function createProgressBar(current, total, width = 30) {
  const percentage = Math.round((current / total) * 100);
  const filled = Math.round((current / total) * width);
  const empty = width - filled;

  const filledBar = '█'.repeat(filled);
  const emptyBar = '░'.repeat(empty);

  return `[${filledBar}${emptyBar}] ${percentage}% (${current}/${total})`;
}

/**
 * 格式化文件大小
 * @param {number} bytes 字节数
 * @returns {string} 格式化后的大小
 */
function formatFileSize(bytes) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * 格式化时间
 * @param {number} seconds 秒数
 * @returns {string} 格式化后的时间
 */
function formatDuration(seconds) {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes < 60) {
    return `${minutes}m ${remainingSeconds}s`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return `${hours}h ${remainingMinutes}m`;
}

/**
 * 格式化时间戳
 * @param {Date|string|number} timestamp 时间戳
 * @returns {string} 格式化后的时间
 */
function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleString();
}

/**
 * 成功消息
 * @param {string} message 消息
 */
function success(message) {
  console.log(chalk.green('✓'), message);
}

/**
 * 错误消息
 * @param {string} message 消息
 */
function error(message) {
  console.log(chalk.red('✗'), message);
}

/**
 * 警告消息
 * @param {string} message 消息
 */
function warn(message) {
  console.log(chalk.yellow('⚠'), message);
}

/**
 * 信息消息
 * @param {string} message 消息
 */
function info(message) {
  console.log(chalk.blue('ℹ'), message);
}

/**
 * 调试消息
 * @param {string} message 消息
 */
function debug(message) {
  console.log(chalk.gray('⚙'), message);
}

module.exports = {
  formatOutput,
  formatTable,
  formatJSON,
  formatCSV,
  formatValue,
  createProgressBar,
  formatFileSize,
  formatDuration,
  formatTimestamp,

  // 消息函数
  success,
  error,
  warn,
  info,
  debug
};