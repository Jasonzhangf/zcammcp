#!/usr/bin/env node

const { Command } = require('commander');
const pkg = require('../package.json');
const { handleErrors } = require('./utils/error-handler');
const constants = require('./constants');
const NetworkValidator = require('./validators/network');
const FallbackManager = require('./config/fallback');
const EnvConfig = require('./config/env');

/**
 * Z CAM CLI 主入口
 * 负责初始化命令行界面和加载所有功能模块
 */

const program = new Command();

// 基础配置
program
  .name('zcam')
  .description('Z CAM Camera Control CLI - 官方命令行控制工具')
  .version(pkg.version, '-v, --version', '显示版本号')
  .helpOption('-h, --help', '显示帮助信息');

// 全局选项 - 使用常量避免硬编码
program
  .option('-h, --host <host>', `相机IP地址 (默认: ${constants.NETWORK.DEFAULT_HOST})`, constants.NETWORK.DEFAULT_HOST)
  .option('-p, --port <port>', `HTTP端口 (默认: ${constants.NETWORK.DEFAULT_PORT})`, constants.NETWORK.DEFAULT_PORT)
  .option('-t, --timeout <timeout>', `请求超时时间毫秒 (默认: ${constants.NETWORK.DEFAULT_TIMEOUT})`, constants.NETWORK.DEFAULT_TIMEOUT)
  .option('--json', 'JSON格式输出')
  .option('--verbose', '详细输出模式')
  .option('--profile <profile>', `使用配置文件中的profile (默认: ${constants.CONFIG.DEFAULT_PROFILE})`, constants.CONFIG.DEFAULT_PROFILE)
  .option('--no-color', '禁用颜色输出');

// 功能模块列表
const modules = [
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

// 改进的模块加载 - 无静默fallback，严格错误处理
let loadedModules = 0;
let failedModules = [];

// 只在详细模式或开发模式下显示加载信息
const isVerbose = process.argv.includes('--verbose') || process.env.NODE_ENV === 'development';
if (isVerbose) {
  console.log('Z CAM CLI - Loading modules...');
}

modules.forEach(moduleName => {
  try {
    const moduleCmd = require(`./modules/${moduleName}`);
    if (moduleCmd && typeof moduleCmd === 'object') {
      program.addCommand(moduleCmd);
      loadedModules++;
      if (isVerbose) {
        console.log(`✓ 模块加载成功: ${moduleName}`);
      }
    } else {
      throw new Error(`模块导出格式无效: 期望Command对象，实际为${typeof moduleCmd}`);
    }
  } catch (error) {
    failedModules.push({
      name: moduleName,
      error: error.message,
      stack: error.stack
    });

    // 在所有模式下都显示模块加载失败 - 不静默fallback
    console.error(`❌ 模块加载失败: ${moduleName} - ${error.message}`);

    // 在详细模式下显示堆栈信息
    if (isVerbose && error.stack) {
      console.error(`   堆栈: ${error.stack.split('\n')[1]?.trim()}`);
    }
  }
});

// 显示加载总结
if (loadedModules === 0) {
  console.error('🚫 严重错误: 没有成功加载任何模块！');
  console.error('请检查模块文件是否存在且格式正确。');
  process.exit(1);
}

if (failedModules.length > 0) {
  console.warn(`⚠️ 警告: ${failedModules.length} 个模块加载失败，${loadedModules} 个模块可用`);

  if (isVerbose) {
    console.log('\n失败的模块详情:');
    failedModules.forEach(({ name, error, stack }) => {
      console.log(`  - ${name}: ${error}`);
      if (process.env.NODE_ENV === 'development' && stack) {
        console.log(`    ${stack.split('\n').slice(1, 4).join('\n    ')}`);
      }
    });
  }
} else if (isVerbose) {
  console.log(`✓ 所有 ${loadedModules} 个模块加载成功`);
}

/**
 * 获取模块描述
 * @param {string} moduleName 模块名称
 * @returns {string} 模块描述
 */
function getModuleDescription(moduleName) {
  const descriptions = {
    'camera': '相机基础管理',
    'control': '运动控制（PTZ + 镜头）',
    'preset': '预设位置管理',
    'record': '录制控制',
    'stream': '流媒体控制',
    'image': '图像视频设置',
    'system': '系统管理',
    'network': '网络配置',
    'config': '配置管理'
  };
  return descriptions[moduleName] || '模块功能';
}

// 在开发模式下显示模块状态
if (process.env.NODE_ENV === 'development') {
  console.log(`Z CAM CLI - ${Object.keys(moduleMap).length} modules registered for lazy loading`);
}

// 全局错误处理
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:');
  handleErrors(error, program.opts());
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  const error = new Error(`Unhandled rejection: ${reason}`);
  handleErrors(error, program.opts());
});

// 如果没有提供参数，显示帮助
if (process.argv.length <= 2) {
  console.log();
  console.log('📹 Z CAM Camera Control CLI');
  console.log();
  console.log('Quick Start:');
  console.log('  zcam camera info                    # 获取相机信息');
  console.log('  zcam control ptz move up 5         # PTZ向上移动');
  console.log('  zcam record start                  # 开始录制');
  console.log('  zcam preset save 1                 # 保存预设位置');
  console.log();
  console.log('Configuration:');
  console.log('  zcam config favorites add          # 添加收藏相机');
  console.log('  zcam config settings show          # 查看设置');
  console.log('  zcam --host 192.168.1.100 camera info # 指定相机IP');
  console.log();
  console.log('For more help: zcam --help');
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