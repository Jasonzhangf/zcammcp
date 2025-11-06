const { Command } = require('commander');
const systemService = require('./service');
const { formatOutput } = require('../../utils/formatter');
const { createAPI } = require('../../core/api');
const { handleErrors } = require('../../utils/error-handler');

/**
 * 系统模块 - 系统管理
 * 功能: 电源管理、系统状态、存储卡、文件管理、安全设置、固件升级
 */
const systemCmd = new Command('system')
  .description('系统管理');

// ===== 电源管理子命令 =====
const powerCmd = new Command('power')
  .description('电源管理');

powerCmd
  .command('reboot')
  .description('重启相机')
  .option('-j, --json', 'JSON格式输出')
  .action(async (options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await systemService.reboot(api);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

powerCmd
  .command('shutdown')
  .description('关闭相机')
  .option('-j, --json', 'JSON格式输出')
  .action(async (options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await systemService.shutdown(api);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

powerCmd
  .command('standby')
  .description('进入待机模式')
  .option('-j, --json', 'JSON格式输出')
  .action(async (options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await systemService.standby(api);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

powerCmd
  .command('wakeup')
  .description('从待机唤醒')
  .option('-j, --json', 'JSON格式输出')
  .action(async (options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await systemService.wakeup(api);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

powerCmd
  .command('auto-off <time>')
  .description('设置自动关机时间（分钟）')
  .option('-j, --json', 'JSON格式输出')
  .action(async (time, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await systemService.setAutoOff(api, time);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

powerCmd
  .command('auto-standby <time>')
  .description('设置自动待机时间（分钟）')
  .option('-j, --json', 'JSON格式输出')
  .action(async (time, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await systemService.setAutoStandby(api, time);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

systemCmd.addCommand(powerCmd);

// ===== 系统状态子命令 =====
const statusCmd = new Command('status')
  .description('系统状态');

statusCmd
  .command('temperature')
  .description('获取系统温度')
  .option('-j, --json', 'JSON格式输出')
  .action(async (options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await systemService.getTemperature(api);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

statusCmd
  .command('led <enable>')
  .description('设置LED指示灯 (on/off)')
  .option('-j, --json', 'JSON格式输出')
  .action(async (enable, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await systemService.setLed(api, enable);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

statusCmd
  .command('color-bar <enable>')
  .description('设置彩条生成 (on/off)')
  .option('-j, --json', 'JSON格式输出')
  .action(async (enable, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await systemService.setColorBar(api, enable);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

statusCmd
  .command('tally <brightness>')
  .description('设置Tally指示灯亮度 (0-100)')
  .option('-j, --json', 'JSON格式输出')
  .action(async (brightness, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await systemService.setTallyBrightness(api, brightness);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

systemCmd.addCommand(statusCmd);

// ===== 存储卡管理子命令 =====
const cardCmd = new Command('card')
  .description('存储卡管理');

cardCmd
  .command('present')
  .description('检查存储卡是否存在')
  .option('-j, --json', 'JSON格式输出')
  .action(async (options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await systemService.isCardPresent(api);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

cardCmd
  .command('query-format')
  .description('查询存储卡格式化信息')
  .option('-j, --json', 'JSON格式输出')
  .action(async (options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await systemService.queryCardFormat(api);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

cardCmd
  .command('format')
  .description('格式化存储卡')
  .option('-j, --json', 'JSON格式输出')
  .action(async (options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await systemService.formatCard(api);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

systemCmd.addCommand(cardCmd);

// ===== 文件管理子命令 =====
const filesCmd = new Command('files')
  .description('文件管理');

filesCmd
  .command('list [folder]')
  .description('列出文件夹内容')
  .option('-j, --json', 'JSON格式输出')
  .action(async (folder = '', options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await systemService.listFiles(api, folder);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

filesCmd
  .command('delete <filepath>')
  .description('删除文件')
  .option('-j, --json', 'JSON格式输出')
  .action(async (filepath, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await systemService.deleteFile(api, filepath);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

systemCmd.addCommand(filesCmd);

// ===== 安全设置子命令 =====
const securityCmd = new Command('security')
  .description('安全设置');

securityCmd
  .command('https <enable>')
  .description('设置HTTPS (on/off)')
  .option('-j, --json', 'JSON格式输出')
  .action(async (enable, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await systemService.setHttps(api, enable);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

securityCmd
  .command('auth <enable>')
  .description('设置认证 (on/off)')
  .option('-j, --json', 'JSON格式输出')
  .action(async (enable, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await systemService.setAuth(api, enable);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

// 证书管理子命令
const certCmd = new Command('certificate')
  .description('证书管理');

certCmd
  .command('generate')
  .description('生成证书')
  .option('-j, --json', 'JSON格式输出')
  .action(async (options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await systemService.generateCertificate(api);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent.parent);
    }
  });

certCmd
  .command('info')
  .description('查询证书信息')
  .option('-j, --json', 'JSON格式输出')
  .action(async (options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await systemService.getCertificateInfo(api);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent.parent);
    }
  });

certCmd
  .command('delete')
  .description('删除证书')
  .option('-j, --json', 'JSON格式输出')
  .action(async (options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await systemService.deleteCertificate(api);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent.parent);
    }
  });

certCmd
  .command('source <source>')
  .description('设置证书来源 (generate/import)')
  .option('-j, --json', 'JSON格式输出')
  .action(async (source, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await systemService.setCertificateSource(api, source);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent.parent);
    }
  });

securityCmd.addCommand(certCmd);

systemCmd.addCommand(securityCmd);

// ===== 固件升级子命令 =====
const upgradeCmd = new Command('upgrade')
  .description('固件升级');

upgradeCmd
  .command('check')
  .description('检查固件升级')
  .option('-j, --json', 'JSON格式输出')
  .action(async (options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await systemService.checkUpgrade(api);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

upgradeCmd
  .command('run')
  .description('执行固件升级')
  .option('-j, --json', 'JSON格式输出')
  .action(async (options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await systemService.runUpgrade(api);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

upgradeCmd
  .command('ui-check')
  .description('检查UI升级')
  .option('-j, --json', 'JSON格式输出')
  .action(async (options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await systemService.checkUiUpgrade(api);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

systemCmd.addCommand(upgradeCmd);

// ===== 系统设置子命令 =====
const settingsCmd = new Command('settings')
  .description('系统设置');

settingsCmd
  .command('clear')
  .description('清除所有设置')
  .option('-j, --json', 'JSON格式输出')
  .action(async (options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await systemService.clearSettings(api);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

settingsCmd
  .command('desqueeze <enable>')
  .description('设置去挤压 (on/off)')
  .option('-j, --json', 'JSON格式输出')
  .action(async (enable, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await systemService.setDesqueeze(api, enable);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

systemCmd.addCommand(settingsCmd);

module.exports = systemCmd;