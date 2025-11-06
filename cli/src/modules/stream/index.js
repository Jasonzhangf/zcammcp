const { Command } = require('commander');
const streamService = require('./service');
const { formatOutput } = require('../../utils/formatter');
const { createAPI } = require('../../core/api');
const { handleErrors } = require('../../utils/error-handler');

/**
 * 流媒体模块 - RTMP/SRT/NDI/RTSP流媒体推流
 * 功能: 推流控制、流设置、性能监控
 */
const streamCmd = new Command('stream')
  .description('流媒体控制');

// ===== RTMP推流子命令 =====
const rtmpCmd = new Command('rtmp')
  .description('RTMP推流控制');

rtmpCmd
  .command('start [url] [key]')
  .description('启动RTMP推流')
  .option('-j, --json', 'JSON格式输出')
  .action(async (url, key, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await streamService.startRtmpStream(api, url, key);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

rtmpCmd
  .command('stop <index>')
  .description('停止RTMP推流 (1-4)')
  .option('-j, --json', 'JSON格式输出')
  .action(async (index, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await streamService.stopRtmpStream(api, index);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

rtmpCmd
  .command('query <index>')
  .description('查询RTMP流状态 (1-4)')
  .option('-j, --json', 'JSON格式输出')
  .action(async (index, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await streamService.getRtmpStreamStatus(api, index);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

rtmpCmd
  .command('set <url> <key>')
  .description('设置RTMP推流参数')
  .option('-j, --json', 'JSON格式输出')
  .action(async (url, key, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await streamService.setRtmpStream(api, url, key);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

rtmpCmd
  .command('auto-restart <enable>')
  .description('设置RTMP自动重启 (on/off)')
  .option('-j, --json', 'JSON格式输出')
  .action(async (enable, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await streamService.setRtmpAutoRestart(api, enable);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

streamCmd.addCommand(rtmpCmd);

// ===== SRT推流子命令 =====
const srtCmd = new Command('srt')
  .description('SRT推流控制');

srtCmd
  .command('start <url>')
  .description('启动SRT推流')
  .option('-j, --json', 'JSON格式输出')
  .action(async (url, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await streamService.startSrtStream(api, url);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

srtCmd
  .command('stop')
  .description('停止SRT推流')
  .option('-j, --json', 'JSON格式输出')
  .action(async (options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await streamService.stopSrtStream(api);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

srtCmd
  .command('query')
  .description('查询SRT流状态')
  .option('-j, --json', 'JSON格式输出')
  .action(async (options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await streamService.getSrtStreamStatus(api);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

srtCmd
  .command('set [mode] [passphrase] [pbkeylen] [latency] [ttl]')
  .description('设置SRT参数')
  .option('-j, --json', 'JSON格式输出')
  .action(async (mode, passphrase, pbkeylen, latency, ttl, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const params = { mode, passphrase, pbkeylen, latency, ttl };
      const result = await streamService.setSrtParams(api, params);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

srtCmd
  .command('auto-restart <enable>')
  .description('设置SRT自动重启 (on/off)')
  .option('-j, --json', 'JSON格式输出')
  .action(async (enable, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await streamService.setSrtAutoRestart(api, enable);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

srtCmd
  .command('set-url <url>')
  .description('设置SRT URL')
  .option('-j, --json', 'JSON格式输出')
  .action(async (url, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await streamService.setSrtUrl(api, url);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

streamCmd.addCommand(srtCmd);

// ===== NDI推流子命令 =====
const ndiCmd = new Command('ndi')
  .description('NDI推流控制');

ndiCmd
  .command('query')
  .description('查询NDI流状态')
  .option('-j, --json', 'JSON格式输出')
  .action(async (options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await streamService.getNdiStreamStatus(api);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

ndiCmd
  .command('set [machine] [stream] [group] [ttl] [multicast] [multicast_net] [multicast_prefix] [discover1] [discover2] [bridge_name] [bridge_encry] [bridge_server] [bridge_port]')
  .description('设置NDI参数')
  .option('-j, --json', 'JSON格式输出')
  .action(async (machine, stream, group, ttl, multicast, multicast_net, multicast_prefix, discover1, discover2, bridge_name, bridge_encry, bridge_server, bridge_port, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const params = {
        machine, stream, group, ttl, multicast, multicast_net,
        multicast_prefix, discover1, discover2, bridge_name,
        bridge_encry, bridge_server, bridge_port
      };
      const result = await streamService.setNdiParams(api, params);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

streamCmd.addCommand(ndiCmd);

// ===== RTSP设置子命令 =====
const rtspCmd = new Command('rtsp')
  .description('RTSP设置');

rtspCmd
  .command('query')
  .description('查询RTSP状态')
  .option('-j, --json', 'JSON格式输出')
  .action(async (options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await streamService.getRtspStatus(api);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

rtspCmd
  .command('set-auth <enable>')
  .description('设置RTSP认证 (on/off)')
  .option('-j, --json', 'JSON格式输出')
  .action(async (enable, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await streamService.setRtspAuth(api, enable);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

streamCmd.addCommand(rtspCmd);

// ===== 流设置子命令 =====
const settingCmd = new Command('setting')
  .description('流媒体设置');

settingCmd
  .command('bitrate <index> <bitrate>')
  .description('设置流码率 (1-4, kbps)')
  .option('-j, --json', 'JSON格式输出')
  .action(async (index, bitrate, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await streamService.setStreamBitrate(api, index, bitrate);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

settingCmd
  .command('resolution <index> <resolution>')
  .description('设置流分辨率 (1-4, 如: 1920x1080)')
  .option('-j, --json', 'JSON格式输出')
  .action(async (index, resolution, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await streamService.setStreamResolution(api, index, resolution);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

settingCmd
  .command('fps <index> <fps>')
  .description('设置流帧率 (1-4)')
  .option('-j, --json', 'JSON格式输出')
  .action(async (index, fps, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await streamService.setStreamFps(api, index, fps);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

settingCmd
  .command('encoder <index> <encoder>')
  .description('设置流编码器 (1-4, h264/h265)')
  .option('-j, --json', 'JSON格式输出')
  .action(async (index, encoder, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await streamService.setStreamEncoder(api, index, encoder);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

settingCmd
  .command('performance <index>')
  .description('查询流性能 (1-4)')
  .option('-j, --json', 'JSON格式输出')
  .action(async (index, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await streamService.getStreamPerformance(api, index);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

streamCmd.addCommand(settingCmd);

module.exports = streamCmd;