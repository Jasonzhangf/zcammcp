const { Command } = require('commander');
const recordService = require('./service');
const { formatOutput } = require('../../utils/formatter');
const { createAPI } = require('../../core/api');
const { handleErrors } = require('../../utils/error-handler');

/**
 * 录制模块 - 录制控制、格式设置、拍照
 * 功能: 录制控制、格式参数设置、时间码、元数据、拍照、回放
 */
const recordCmd = new Command('record')
  .description('录制控制');

// ===== 基础录制操作 =====
recordCmd
  .command('start')
  .description('开始录制')
  .option('-j, --json', 'JSON格式输出')
  .action(async (options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent;
      const api = createAPI(globalOptions);
      const result = await recordService.startRecording(api);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent);
    }
  });

recordCmd
  .command('stop')
  .description('停止录制')
  .option('-j, --json', 'JSON格式输出')
  .action(async (options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent;
      const api = createAPI(globalOptions);
      const result = await recordService.stopRecording(api);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent);
    }
  });

recordCmd
  .command('status')
  .description('查询录制状态')
  .option('-j, --json', 'JSON格式输出')
  .action(async (options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent;
      const api = createAPI(globalOptions);
      const result = await recordService.getRecordingStatus(api);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent);
    }
  });

recordCmd
  .command('remain')
  .description('查询剩余录制时间')
  .option('-j, --json', 'JSON格式输出')
  .action(async (options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent;
      const api = createAPI(globalOptions);
      const result = await recordService.getRemainingTime(api);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent);
    }
  });

recordCmd
  .command('repair-status')
  .description('查询修复状态')
  .option('-j, --json', 'JSON格式输出')
  .action(async (options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent;
      const api = createAPI(globalOptions);
      const result = await recordService.getRepairStatus(api);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent);
    }
  });

// ===== 时间码控制子命令 =====
const tcCmd = new Command('tc')
  .description('时间码控制');

tcCmd
  .command('query')
  .description('查询时间码')
  .option('-j, --json', 'JSON格式输出')
  .action(async (options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await recordService.getTimecode(api);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

tcCmd
  .command('reset')
  .description('重置时间码')
  .option('-j, --json', 'JSON格式输出')
  .action(async (options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await recordService.resetTimecode(api);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

tcCmd
  .command('set-current')
  .description('设置为当前时间')
  .option('-j, --json', 'JSON格式输出')
  .action(async (options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await recordService.setTimecodeToCurrent(api);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

tcCmd
  .command('set <timecode>')
  .description('手动设置时间码 (格式: HH:MM:SS:FF)')
  .option('-j, --json', 'JSON格式输出')
  .action(async (timecode, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await recordService.setTimecode(api, timecode);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

recordCmd.addCommand(tcCmd);

// ===== 格式设置子命令 =====
const formatCmd = new Command('format')
  .description('录制格式设置');

formatCmd
  .command('resolution <resolution>')
  .description('设置分辨率 (如: 3840x2160, 1920x1080, 1280x720)')
  .option('-j, --json', 'JSON格式输出')
  .action(async (resolution, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await recordService.setResolution(api, resolution);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

formatCmd
  .command('fps <fps>')
  .description('设置录制帧率')
  .option('-j, --json', 'JSON格式输出')
  .action(async (fps, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await recordService.setRecordingFps(api, fps);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

formatCmd
  .command('codec <codec>')
  .description('设置编码器 (h264, h265)')
  .option('-j, --json', 'JSON格式输出')
  .action(async (codec, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await recordService.setVideoEncoder(api, codec);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

formatCmd
  .command('file <format>')
  .description('设置文件格式 (mov, mp4)')
  .option('-j, --json', 'JSON格式输出')
  .action(async (format, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await recordService.setFileFormat(api, format);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

formatCmd
  .command('rotation <rotation>')
  .description('设置文件旋转角度 (0, 90, 180, 270)')
  .option('-j, --json', 'JSON格式输出')
  .action(async (rotation, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await recordService.setRotation(api, rotation);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

formatCmd
  .command('split-duration <duration>')
  .description('设置分段录制时长（秒）')
  .option('-j, --json', 'JSON格式输出')
  .action(async (duration, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await recordService.setSplitDuration(api, duration);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

recordCmd.addCommand(formatCmd);

// ===== 元数据子命令 =====
const metaCmd = new Command('meta')
  .description('录制元数据设置');

metaCmd
  .command('enable <enable>')
  .description('启用/禁用录制元数据 (on/off)')
  .option('-j, --json', 'JSON格式输出')
  .action(async (enable, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await recordService.setRecordMeta(api, enable);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

metaCmd
  .command('camera-id <id>')
  .description('设置相机ID')
  .option('-j, --json', 'JSON格式输出')
  .action(async (id, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await recordService.setCameraId(api, id);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

metaCmd
  .command('reelname <name>')
  .description('设置卷名')
  .option('-j, --json', 'JSON格式输出')
  .action(async (name, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await recordService.setReelname(api, name);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

recordCmd.addCommand(metaCmd);

// ===== 拍照功能 =====
const photoCmd = new Command('photo')
  .description('拍照功能');

photoCmd
  .command('capture')
  .description('拍摄照片')
  .option('-j, --json', 'JSON格式输出')
  .action(async (options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await recordService.capturePhoto(api);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

recordCmd.addCommand(photoCmd);

// ===== 回放功能 =====
const playbackCmd = new Command('playback')
  .description('回放控制');

playbackCmd
  .command('query')
  .description('查询回放状态')
  .option('-j, --json', 'JSON格式输出')
  .action(async (options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await recordService.getPlaybackStatus(api);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

recordCmd.addCommand(playbackCmd);

module.exports = recordCmd;