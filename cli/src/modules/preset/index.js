const { Command } = require('commander');
const presetService = require('./service');
const { formatOutput } = require('../../utils/formatter');
const { createAPI } = require('../../core/api');
const { handleErrors } = require('../../utils/error-handler');

/**
 * 预设模块 - 预设位置管理
 * 功能: 保存、调用、删除、配置预设位置
 */
const presetCmd = new Command('preset')
  .description('预设位置管理');

// 基础预设操作
presetCmd
  .command('recall <index>')
  .description('调用预设位置 (1-255)')
  .option('-j, --json', 'JSON格式输出')
  .action(async (index, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent;
      const api = createAPI(globalOptions);
      const result = await presetService.recallPreset(api, index);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent);
    }
  });

presetCmd
  .command('save <index>')
  .description('保存当前位置到预设 (1-255)')
  .option('-j, --json', 'JSON格式输出')
  .action(async (index, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent;
      const api = createAPI(globalOptions);
      const result = await presetService.savePreset(api, index);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent);
    }
  });

presetCmd
  .command('delete <index>')
  .description('删除预设位置 (1-255)')
  .option('-j, --json', 'JSON格式输出')
  .action(async (index, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent;
      const api = createAPI(globalOptions);
      const result = await presetService.deletePreset(api, index);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent);
    }
  });

presetCmd
  .command('info <index>')
  .description('查询预设信息 (1-255)')
  .option('-j, --json', 'JSON格式输出')
  .action(async (index, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent;
      const api = createAPI(globalOptions);
      const result = await presetService.getPresetInfo(api, index);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent);
    }
  });

presetCmd
  .command('list')
  .description('列出所有预设')
  .option('-j, --json', 'JSON格式输出')
  .action(async (options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent;
      const api = createAPI(globalOptions);
      const result = await presetService.listPresets(api);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent);
    }
  });

// 预设配置子命令
const configCmd = new Command('config')
  .description('预设配置');

configCmd
  .command('name <index> <name>')
  .description('设置预设名称')
  .option('-j, --json', 'JSON格式输出')
  .action(async (index, name, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await presetService.setPresetName(api, index, name);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

configCmd
  .command('speed <index> <speed>')
  .description('设置预设速度 (1-9)')
  .option('-j, --json', 'JSON格式输出')
  .action(async (index, speed, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await presetService.setPresetSpeed(api, index, speed, 'speed');
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

configCmd
  .command('time <index> <time>')
  .description('设置预设时间 (秒)')
  .option('-j, --json', 'JSON格式输出')
  .action(async (index, time, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await presetService.setPresetSpeed(api, index, time, 'time');
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

configCmd
  .command('mode <mode>')
  .description('设置预设调用模式 (normal/smooth)')
  .option('-j, --json', 'JSON格式输出')
  .action(async (mode, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await presetService.setRecallMode(api, mode);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

configCmd
  .command('freeze <enable>')
  .description('设置预设调用时冻结画面 (on/off)')
  .option('-j, --json', 'JSON格式输出')
  .action(async (enable, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await presetService.setFreezeDuringRecall(api, enable);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

presetCmd.addCommand(configCmd);

module.exports = presetCmd;