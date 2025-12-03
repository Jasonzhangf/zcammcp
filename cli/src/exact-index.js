#!/usr/bin/env node

const { Command } = require('commander');
const pkg = require('../package.json');
const { handleErrors } = require('./utils/error-handler');
const constants = require('./constants');
const ExactConfigResolver = require('./config/exact-resolver');
const { getProfile, validateProfileCompleteness } = require('./config/strict-config');
const { ValidationError } = require('./utils/errors');

/**
 * 精确Z CAM CLI 主入口
 * 移除所有回退策略，实现严格的参数验证和错误处理
 */

const program = new Command();

// 基础配置
program
  .name('zcam')
  .description('Z CAM Camera Control CLI - 官方命令行控制工具')
  .version(pkg.version, '-v, --version', '显示版本号')
  .helpOption('-h, --help', '显示帮助信息');

// 全局选项 - 移除默认值，要求显式指定或使用配置文件
program
  .option('-h, --host <host>', '相机IP地址 (必需)')
  .option('-p, --port <port>', 'HTTP端口 (必需)')
  .option('-t, --timeout <timeout>', '请求超时时间毫秒 (必需)')
  .option('--json', 'JSON格式输出')
  .option('--verbose', '详细输出模式')
  .option('--profile <profile>', `使用配置文件中的profile (默认: ${constants.CONFIG.DEFAULT_PROFILE})`, constants.CONFIG.DEFAULT_PROFILE)
  .option('--no-color', '禁用颜色输出');

// 功能模块列表 - 严格定义，不允许动态添加
const REQUIRED_MODULES = [
  'camera',
  'control', 
  'preset',
  'record',
  'stream',
  'image',
  'system',
  'network',
  'config'
];

/**
 * 精确验证全局参数
 * @param {Object} options 全局选项
 * @throws {ValidationError} 如果参数无效
 */
function validateGlobalOptions(options) {
  // 如果使用了profile，验证profile存在且完整
  if (options.profile) {
    try {
      const profileConfig = getProfile(options.profile);
      
      // 验证profile中是否包含必需的连接信息
      validateProfileCompleteness(options.profile, ['host', 'port', 'timeout']);
      
      // 如果命令行也提供了参数，验证它们不冲突
      ['host', 'port', 'timeout'].forEach(field => {
        if (options[field] && profileConfig[field]) {
          console.warn(`警告: 命令行参数 --${field} 将覆盖配置文件中的值`);
        }
      });
      
    } catch (error) {
      if (error instanceof ValidationError) {
        throw new ValidationError(`配置文件错误: ${error.message}`);
      }
      throw new ValidationError(`无法加载配置 profile "${options.profile}": ${error.message}`);
    }
  } else {
    // 如果没有使用profile，验证命令行是否提供了所有必需参数
    const requiredFields = ['host', 'port', 'timeout'];
    const missing = requiredFields.filter(field => !options[field]);
    
    if (missing.length > 0) {
      throw new ValidationError(
        `缺少必需的连接参数: ${missing.join(', ')}。` +
        '请使用命令行参数指定或创建配置文件。'
      );
    }
  }

  // 验证提供的参数格式
  if (options.host) {
    ExactConfigResolver.resolveHost(options.host); // 会抛出异常如果无效
  }
  
  if (options.port) {
    ExactConfigResolver.resolvePort(options.port);
  }
  
  if (options.timeout) {
    ExactConfigResolver.resolveTimeout(options.timeout);
  }
}

/**
 * 精确加载模块
 * @param {Array<string>} moduleNames 要加载的模块名称列表
 * @returns {Object} 加载结果
 * @throws {Error} 如果任何必需模块加载失败
 */
function loadModulesExactly(moduleNames) {
  const loadedModules = [];
  const failedModules = [];

  for (const moduleName of moduleNames) {
    try {
      const modulePath = `./modules/${moduleName}`;
      const moduleCmd = require(modulePath);
      
      // 验证模块格式
      if (!moduleCmd || typeof moduleCmd !== 'object') {
        throw new Error(`模块 ${moduleName} 导出格式无效`);
      }
      
      program.addCommand(moduleCmd);
      loadedModules.push(moduleName);
      
    } catch (error) {
      failedModules.push({
        name: moduleName,
        error: error.message,
        stack: error.stack
      });
    }
  }

  // 严格检查：如果有必需模块加载失败，直接报错
  if (failedModules.length > 0) {
    const errorDetails = failedModules
      .map(({ name, error }) => `  - ${name}: ${error}`)
      .join('\n');
    
    throw new Error(
      `以下必需模块加载失败:\n${errorDetails}\n\n` +
      '请检查模块文件是否存在且格式正确。'
    );
  }

  return {
    loaded: loadedModules,
    failed: failedModules,
    total: moduleNames.length
  };
}

// 精确的全局参数验证
program.hook('preAction', (thisCommand) => {
  try {
    const options = thisCommand.opts();
    validateGlobalOptions(options);
  } catch (error) {
    console.error('❌ 参数验证失败:');
    console.error(error.message);
    process.exit(1);
  }
});

// 严格加载所有必需模块
let moduleLoadResult;
try {
  moduleLoadResult = loadModulesExactly(REQUIRED_MODULES);
  console.log(`✓ 成功加载 ${moduleLoadResult.loaded.length}/${moduleLoadResult.total} 个必需模块`);
} catch (error) {
  console.error('❌ 模块加载失败:');
  console.error(error.message);
  process.exit(1);
}

// 全局错误处理
process.on('uncaughtException', (error) => {
  console.error('❌ 未捕获的异常:');
  handleErrors(error, program.opts());
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 未处理的Promise拒绝:');
  console.error('原因:', reason);
  const error = new Error(`Unhandled rejection: ${reason}`);
  handleErrors(error, program.opts());
});

// 精确的帮助信息 - 不提供任何回退
if (process.argv.length <= 2) {
  console.log();
  console.log('📹 Z CAM Camera Control CLI');
  console.log();
  console.log('必需参数:');
  console.log('  --host <ip>        相机IP地址');
  console.log('  --port <port>      HTTP端口');
  console.log('  --timeout <ms>     请求超时时间(毫秒)');
  console.log();
  console.log('使用方式:');
  console.log('  # 直接指定连接参数');
  console.log('  zcam --host 192.168.1.100 --port 80 --timeout 30000 camera info');
  console.log();
  console.log('  # 使用配置文件');
  console.log('  zcam --profile studio camera info');
  console.log();
  console.log('可用命令:');
  console.log('  camera              相机基础管理');
  console.log('  control             运动控制(PTZ + 镜头)');
  console.log('  preset              预设位置管理');
  console.log('  record              录制控制');
  console.log('  stream              流媒体控制');
  console.log('  image               图像视频设置');
  console.log('  system              系统管理');
  console.log('  network             网络配置');
  console.log('  config              配置管理');
  console.log();
  console.log('获取帮助:');
  console.log('  zcam --help                    显示全局帮助');
  console.log('  zcam camera --help             显示camera命令帮助');
  console.log();
  console.log('配置文件:');
  console.log('  位置: ~/.zcamrc');
  console.log('  格式: INI格式，包含不同的profile');
  console.log();
  process.exit(0);
}

// 解析命令行参数
try {
  program.parse(process.argv);
} catch (error) {
  handleErrors(error, program.opts());
}

// 导出程序实例（用于测试）
module.exports = program;