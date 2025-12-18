#!/usr/bin/env node

const { Command } = require('commander');
const pkg = require('../package.json');
const { handleErrors } = require('./utils/error-handler');
const constants = require('./constants');
const ExactConfigResolver = require('./config/exact-resolver');
const { getProfile, validateProfileCompleteness } = require('./config/strict-config');
const { ValidationError } = require('./utils/errors');
const { getServiceContainer } = require('./core/service-container');

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
  .option('-H, --host <host>', '相机IP地址 (必需)')
  .option('-p, --port <port>', 'HTTP端口 (必需)')
  .option('-t, --timeout <timeout>', '请求超时时间毫秒 (必需)')
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
  'uvc',
  'ui',
  'config',
  'camera-state'
];

// 初始化服务容器 - 支持依赖注入
console.log('Z CAM CLI - 启动...');
console.log('🔧 初始化服务容器...');
const serviceContainer = getServiceContainer();
console.log(`✓ 服务容器已初始化，支持 ${serviceContainer.getRegisteredServices().length} 个服务`);

// 严格模块加载 - 失败时直接报错
let loadedModules = 0;
let failedModules = [];

modules.forEach(moduleName => {
  try {
    const moduleCmd = require(`./modules/${moduleName}`);
    program.addCommand(moduleCmd);
    loadedModules++;
  } catch (error) {
    failedModules.push({
      name: moduleName,
      error: error.message,
      stack: error.stack
    });

    // 模块加载失败时直接报错，不继续运行
    console.error(`❌ 模块加载失败: ${moduleName} - ${error.message}`);
    console.error('请检查模块文件是否存在且格式正确');
    process.exit(1);
  }
});

// 显示加载统计
if (loadedModules > 0) {
  console.log(`✓ 成功加载 ${loadedModules} 个必需模块`);
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
  console.log(`Z CAM CLI - ${modules.length} modules registered`);
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
