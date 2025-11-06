const { Command } = require('commander');
const networkService = require('./service');
const { formatOutput } = require('../../utils/formatter');
const { createAPI } = require('../../core/api');
const { handleErrors } = require('../../utils/error-handler');

/**
 * 网络模块 - 网络配置
 * 功能: 以太网配置、WiFi设置、IP访问控制
 */
const networkCmd = new Command('network')
  .description('网络配置');

// ===== 以太网配置子命令 =====
const ethernetCmd = new Command('ethernet')
  .description('以太网配置');

ethernetCmd
  .command('info')
  .description('查询网络信息')
  .option('-j, --json', 'JSON格式输出')
  .action(async (options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await networkService.getNetworkInfo(api);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

ethernetCmd
  .command('dhcp')
  .description('设置为DHCP模式')
  .option('-j, --json', 'JSON格式输出')
  .action(async (options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await networkService.setDhcpMode(api);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

ethernetCmd
  .command('static <ip> <netmask> <gateway> [dns]')
  .description('设置静态IP')
  .option('-j, --json', 'JSON格式输出')
  .action(async (ip, netmask, gateway, dns = '', options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await networkService.setStaticIp(api, ip, netmask, gateway, dns);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

ethernetCmd
  .command('mode <mode>')
  .description('设置网络模式 (auto/auto100/auto1000/fixed100/fixed1000)')
  .option('-j, --json', 'JSON格式输出')
  .action(async (mode, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await networkService.setEthernetMode(api, mode);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

networkCmd.addCommand(ethernetCmd);

// ===== WiFi设置子命令 =====
const wifiCmd = new Command('wifi')
  .description('WiFi设置');

wifiCmd
  .command('query')
  .description('查询WiFi状态')
  .option('-j, --json', 'JSON格式输出')
  .action(async (options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await networkService.queryWifi(api);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

wifiCmd
  .command('enable <enable>')
  .description('启用/禁用WiFi (on/off)')
  .option('-j, --json', 'JSON格式输出')
  .action(async (enable, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await networkService.setWifiEnable(api, enable);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

wifiCmd
  .command('channel <enable>')
  .description('设置WiFi频道选择 (on/off)')
  .option('-j, --json', 'JSON格式输出')
  .action(async (enable, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await networkService.setWifiChannel(api, enable);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

networkCmd.addCommand(wifiCmd);

// ===== IP访问控制子命令 =====
const ipManagerCmd = new Command('ip-manager')
  .description('IP访问控制');

// 白名单管理
const allowListCmd = new Command('allow')
  .description('白名单管理');

allowListCmd
  .command('enable')
  .description('启用白名单')
  .option('-j, --json', 'JSON格式输出')
  .action(async (options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await networkService.enableAllowList(api);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent.parent);
    }
  });

allowListCmd
  .command('disable')
  .description('禁用白名单')
  .option('-j, --json', 'JSON格式输出')
  .action(async (options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await networkService.disableAllowList(api);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent.parent);
    }
  });

allowListCmd
  .command('add <ip>')
  .description('添加IP到白名单')
  .option('-j, --json', 'JSON格式输出')
  .action(async (ip, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await networkService.addToAllowList(api, ip);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent.parent);
    }
  });

allowListCmd
  .command('delete <ip>')
  .description('从白名单删除IP')
  .option('-j, --json', 'JSON格式输出')
  .action(async (ip, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await networkService.deleteFromAllowList(api, ip);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent.parent);
    }
  });

ipManagerCmd.addCommand(allowListCmd);

// 黑名单管理
const denyListCmd = new Command('deny')
  .description('黑名单管理');

denyListCmd
  .command('enable')
  .description('启用黑名单')
  .option('-j, --json', 'JSON格式输出')
  .action(async (options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await networkService.enableDenyList(api);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent.parent);
    }
  });

denyListCmd
  .command('disable')
  .description('禁用黑名单')
  .option('-j, --json', 'JSON格式输出')
  .action(async (options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await networkService.disableDenyList(api);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent.parent);
    }
  });

denyListCmd
  .command('add <ip>')
  .description('添加IP到黑名单')
  .option('-j, --json', 'JSON格式输出')
  .action(async (ip, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await networkService.addToDenyList(api, ip);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent.parent);
    }
  });

denyListCmd
  .command('delete <ip>')
  .description('从黑名单删除IP')
  .option('-j, --json', 'JSON格式输出')
  .action(async (ip, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await networkService.deleteFromDenyList(api, ip);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent.parent);
    }
  });

ipManagerCmd.addCommand(denyListCmd);

networkCmd.addCommand(ipManagerCmd);

module.exports = networkCmd;