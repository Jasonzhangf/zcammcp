const { Command } = require('commander');
const cameraService = require('./service');
const { formatOutput } = require('../../utils/formatter');
const { createAPI } = require('../../core/api');
const { handleErrors } = require('../../utils/error-handler');
const { getGlobalOptions, resolveOutputFormat } = require('../../utils/cli-helpers');

/**
 * 相机模块 - 相机基础管理和用户管理
 * 功能: 信息查询、昵称管理、状态监控、用户管理
 */
const cameraCmd = new Command('camera')
  .description('相机基础管理');

// 相机信息查询
cameraCmd
  .command('info')
  .description('获取相机基本信息')
  .option('-j, --json', 'JSON格式输出')
  .action(async (options, cmd) => {
    try {
      const globalOptions = getGlobalOptions(cmd);
      const api = createAPI(globalOptions);
      const outputFormat = resolveOutputFormat(options, globalOptions);
      const result = await cameraService.getInfo(api);
      formatOutput(result, outputFormat);
    } catch (error) {
      handleErrors(error, globalOptions);
    }
  });

// 相机模式
cameraCmd
  .command('mode')
  .description('获取相机工作模式')
  .option('-j, --json', 'JSON格式输出')
  .action(async (options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent;
      const api = createAPI(globalOptions);
      const result = await cameraService.getMode(api);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent);
    }
  });

// 相机昵称管理
cameraCmd
  .command('nickname [name]')
  .description('设置或获取相机昵称')
  .option('-j, --json', 'JSON格式输出')
  .action(async (name, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent;
      const api = createAPI(globalOptions);
      const result = name
        ? await cameraService.setNickname(api, name)
        : await cameraService.getNickname(api);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent);
    }
  });

// 相机状态
cameraCmd
  .command('status')
  .description('获取相机运行状态')
  .option('-j, --json', 'JSON格式输出')
  .action(async (options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent;
      const api = createAPI(globalOptions);
      const result = await cameraService.getStatus(api);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent);
    }
  });

// 提交设置
cameraCmd
  .command('commit')
  .description('提交相机设置')
  .option('-j, --json', 'JSON格式输出')
  .action(async (options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent;
      const api = createAPI(globalOptions);
      const result = await cameraService.commit(api);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent);
    }
  });

// 切换到录制模式
cameraCmd
  .command('goto-rec')
  .description('切换到录制模式')
  .option('-j, --json', 'JSON格式输出')
  .action(async (options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent;
      const api = createAPI(globalOptions);
      const result = await cameraService.gotoRecordingMode(api);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent);
    }
  });

// 时间管理子命令
const timeCmd = new Command('time')
  .description('时间管理');

timeCmd
  .command('get')
  .description('获取相机时间')
  .option('-j, --json', 'JSON格式输出')
  .action(async (options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await cameraService.getTime(api);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

timeCmd
  .command('set <date> <time>')
  .description('设置相机时间')
  .option('-j, --json', 'JSON格式输出')
  .action(async (date, time, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await cameraService.setTime(api, date, time);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

timeCmd
  .command('timezone <timezone>')
  .description('设置时区')
  .option('-j, --json', 'JSON格式输出')
  .action(async (timezone, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await cameraService.setTimezone(api, timezone);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
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
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await cameraService.getCurrentUser(api);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

userCmd
  .command('list')
  .description('获取用户列表')
  .option('-j, --json', 'JSON格式输出')
  .action(async (options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await cameraService.getUserList(api);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

userCmd
  .command('add <username> <password> <permission>')
  .description('添加用户')
  .option('-j, --json', 'JSON格式输出')
  .action(async (username, password, permission, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await cameraService.addUser(api, username, password, permission);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

userCmd
  .command('delete <username>')
  .description('删除用户')
  .option('-j, --json', 'JSON格式输出')
  .action(async (username, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await cameraService.deleteUser(api, username);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

userCmd
  .command('password <username> <oldPassword> <newPassword>')
  .description('修改用户密码')
  .option('-j, --json', 'JSON格式输出')
  .action(async (username, oldPassword, newPassword, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await cameraService.changePassword(api, username, oldPassword, newPassword);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

userCmd
  .command('logout')
  .description('登出当前用户')
  .option('-j, --json', 'JSON格式输出')
  .action(async (options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await cameraService.logout(api);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

cameraCmd.addCommand(userCmd);

module.exports = cameraCmd;