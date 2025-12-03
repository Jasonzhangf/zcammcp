const { Command } = require('commander');
const { formatOutput } = require('../../utils/formatter');
const { createAPI } = require('../../core/api');
const { handleErrors } = require('../../utils/error-handler');
const { getGlobalOptions, resolveOutputFormat } = require('../../utils/cli-helpers');
const { getServiceContainer } = require('../../core/service-container');

/**
 * 相机模块 - 相机基础管理和用户管理
 * 功能: 信息查询、昵称管理、状态监控、用户管理
 */
const cameraCmd = new Command('camera')
  .description('相机基础管理');

/**
 * 统一执行相机相关命令
 */
async function executeCameraCommand(options, cmd, handler) {
  const globalOptions = getGlobalOptions(cmd);
  try {
    const api = createAPI(globalOptions);
    const serviceContainer = getServiceContainer(api);
    const cameraService = serviceContainer.getService('camera');
    const outputFormat = resolveOutputFormat(options, globalOptions);
    const result = await handler(cameraService);
    formatOutput(result, outputFormat);
  } catch (error) {
    handleErrors(error, globalOptions);
  }
}

// 相机信息查询
cameraCmd
  .command('info')
  .description('获取相机基本信息')
  .option('-j, --json', 'JSON格式输出')
  .action(async (options, cmd) => {
    await executeCameraCommand(options, cmd, (cameraService) => cameraService.getInfo());
  });

// 相机模式
cameraCmd
  .command('mode')
  .description('获取相机工作模式')
  .option('-j, --json', 'JSON格式输出')
  .action(async (options, cmd) => {
    await executeCameraCommand(options, cmd, (cameraService) => cameraService.getMode());
  });

// 相机昵称管理
cameraCmd
  .command('nickname [name]')
  .description('设置或获取相机昵称')
  .option('-j, --json', 'JSON格式输出')
  .action(async (name, options, cmd) => {
    await executeCameraCommand(options, cmd, (cameraService) => {
      return name ? cameraService.setNickname(name) : cameraService.getNickname();
    });
  });

// 相机状态
cameraCmd
  .command('status')
  .description('获取相机运行状态')
  .option('-j, --json', 'JSON格式输出')
  .action(async (options, cmd) => {
    await executeCameraCommand(options, cmd, (cameraService) => cameraService.getStatus());
  });

// 提交设置
cameraCmd
  .command('commit')
  .description('提交相机设置')
  .option('-j, --json', 'JSON格式输出')
  .action(async (options, cmd) => {
    await executeCameraCommand(options, cmd, (cameraService) => cameraService.commit());
  });

// 切换到录制模式
cameraCmd
  .command('goto-rec')
  .description('切换到录制模式')
  .option('-j, --json', 'JSON格式输出')
  .action(async (options, cmd) => {
    await executeCameraCommand(options, cmd, (cameraService) => cameraService.gotoRecordingMode());
  });

// 时间管理子命令
const timeCmd = new Command('time')
  .description('时间管理');

timeCmd
  .command('get')
  .description('获取相机时间')
  .option('-j, --json', 'JSON格式输出')
  .action(async (options, cmd) => {
    await executeCameraCommand(options, cmd, (cameraService) => cameraService.getTime());
  });

timeCmd
  .command('set <date> <time>')
  .description('设置相机时间')
  .option('-j, --json', 'JSON格式输出')
  .action(async (date, timeValue, options, cmd) => {
    await executeCameraCommand(options, cmd, (cameraService) => cameraService.setTime(date, timeValue));
  });

timeCmd
  .command('timezone <timezone>')
  .description('设置时区')
  .option('-j, --json', 'JSON格式输出')
  .action(async (timezone, options, cmd) => {
    await executeCameraCommand(options, cmd, (cameraService) => cameraService.setTimezone(timezone));
  });

cameraCmd.addCommand(timeCmd);

// 用户管理子命令
const userCmd = new Command('user')
  .description('用户管理');

userCmd
  .command('me')
  .description('获取当前用户信息')
  .option('-j, --json', 'JSON格式输出')
  .action(async (options, cmd) => {
    await executeCameraCommand(options, cmd, (cameraService) => cameraService.getCurrentUser());
  });

userCmd
  .command('list')
  .description('获取用户列表')
  .option('-j, --json', 'JSON格式输出')
  .action(async (options, cmd) => {
    await executeCameraCommand(options, cmd, (cameraService) => cameraService.getUserList());
  });

userCmd
  .command('add <username> <password> <permission>')
  .description('添加用户')
  .option('-j, --json', 'JSON格式输出')
  .action(async (username, password, permission, options, cmd) => {
    await executeCameraCommand(options, cmd, (cameraService) => cameraService.addUser(username, password, permission));
  });

userCmd
  .command('delete <username>')
  .description('删除用户')
  .option('-j, --json', 'JSON格式输出')
  .action(async (username, options, cmd) => {
    await executeCameraCommand(options, cmd, (cameraService) => cameraService.deleteUser(username));
  });

userCmd
  .command('password <username> <oldPassword> <newPassword>')
  .description('修改用户密码')
  .option('-j, --json', 'JSON格式输出')
  .action(async (username, oldPassword, newPassword, options, cmd) => {
    await executeCameraCommand(options, cmd, (cameraService) => cameraService.changePassword(username, oldPassword, newPassword));
  });

userCmd
  .command('logout')
  .description('登出当前用户')
  .option('-j, --json', 'JSON格式输出')
  .action(async (options, cmd) => {
    await executeCameraCommand(options, cmd, (cameraService) => cameraService.logout());
  });

cameraCmd.addCommand(userCmd);

module.exports = cameraCmd;
