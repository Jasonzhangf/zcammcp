const { Command } = require('commander');
const imageService = require('./service');
const { formatOutput } = require('../../utils/formatter');
const { createAPI } = require('../../core/api');
const { handleErrors } = require('../../utils/error-handler');

/**
 * 图像模块 - 图像视频设置
 * 功能: 曝光控制、白平衡、图像调整、视频设置、音频设置
 */
const imageCmd = new Command('image')
  .description('图像视频设置');

// ===== 曝光控制子命令 =====
const exposureCmd = new Command('exposure')
  .description('曝光控制');

exposureCmd
  .command('ev <value>')
  .description('设置EV补偿 (-3.0 到 +3.0)')
  .option('-j, --json', 'JSON格式输出')
  .action(async (value, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await imageService.setEv(api, value);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

exposureCmd
  .command('iris <value>')
  .description('设置光圈 (F1.4 - F22)')
  .option('-j, --json', 'JSON格式输出')
  .action(async (value, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await imageService.setIris(api, value);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

exposureCmd
  .command('iso <value>')
  .description('设置ISO感光度 (100 - 25600)')
  .option('-j, --json', 'JSON格式输出')
  .action(async (value, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await imageService.setIso(api, value);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

exposureCmd
  .command('shutter <value>')
  .description('设置快门速度 (度数或秒数)')
  .option('-j, --json', 'JSON格式输出')
  .action(async (value, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await imageService.setShutter(api, value);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

exposureCmd
  .command('anti-flicker <mode>')
  .description('设置防闪烁 (50/60/off)')
  .option('-j, --json', 'JSON格式输出')
  .action(async (mode, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await imageService.setAntiFlicker(api, mode);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

exposureCmd
  .command('meter-mode <mode>')
  .description('设置测光模式 (center/average/spot)')
  .option('-j, --json', 'JSON格式输出')
  .action(async (mode, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await imageService.setMeterMode(api, mode);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

imageCmd.addCommand(exposureCmd);

// ===== 白平衡控制子命令 =====
const whitebalanceCmd = new Command('whitebalance')
  .description('白平衡控制');

whitebalanceCmd
  .command('mode <mode>')
  .description('设置白平衡模式 (auto/manual/daylight/tungsten/fluorescent)')
  .option('-j, --json', 'JSON格式输出')
  .action(async (mode, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await imageService.setWhiteBalanceMode(api, mode);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

whitebalanceCmd
  .command('manual kelvin <value>')
  .description('设置手动色温 (2000K - 10000K)')
  .option('-j, --json', 'JSON格式输出')
  .action(async (value, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await imageService.setManualKelvin(api, value);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

whitebalanceCmd
  .command('manual tint <value>')
  .description('设置手动色调 (-50 到 +50)')
  .option('-j, --json', 'JSON格式输出')
  .action(async (value, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await imageService.setManualTint(api, value);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

whitebalanceCmd
  .command('one-push')
  .description('一键白平衡')
  .option('-j, --json', 'JSON格式输出')
  .action(async (options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await imageService.onePushWhiteBalance(api);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

whitebalanceCmd
  .command('awb-priority <priority>')
  .description('设置AWB优先级 (accuracy/speed)')
  .option('-j, --json', 'JSON格式输出')
  .action(async (priority, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await imageService.setAwbPriority(api, priority);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

imageCmd.addCommand(whitebalanceCmd);

// ===== 图像调整子命令 =====
const adjustCmd = new Command('adjust')
  .description('图像调整');

adjustCmd
  .command('brightness <value>')
  .description('设置亮度 (0-100)')
  .option('-j, --json', 'JSON格式输出')
  .action(async (value, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await imageService.setBrightness(api, value);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

adjustCmd
  .command('contrast <value>')
  .description('设置对比度 (0-100)')
  .option('-j, --json', 'JSON格式输出')
  .action(async (value, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await imageService.setContrast(api, value);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

adjustCmd
  .command('saturation <value>')
  .description('设置饱和度 (0-100)')
  .option('-j, --json', 'JSON格式输出')
  .action(async (value, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await imageService.setSaturation(api, value);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

adjustCmd
  .command('sharpness <value>')
  .description('设置锐度 (0-100)')
  .option('-j, --json', 'JSON格式输出')
  .action(async (value, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await imageService.setSharpness(api, value);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

adjustCmd
  .command('hue <value>')
  .description('设置色调 (-50 到 +50)')
  .option('-j, --json', 'JSON格式输出')
  .action(async (value, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await imageService.setHue(api, value);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

adjustCmd
  .command('profile <profile>')
  .description('设置图像配置文件 (rec709/slog3/zlog2)')
  .option('-j, --json', 'JSON格式输出')
  .action(async (profile, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await imageService.setImageProfile(api, profile);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

adjustCmd
  .command('noise-reduction <enable>')
  .description('设置降噪 (on/off)')
  .option('-j, --json', 'JSON格式输出')
  .action(async (enable, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await imageService.setNoiseReduction(api, enable);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

imageCmd.addCommand(adjustCmd);

// ===== 视频设置子命令 =====
const videoCmd = new Command('video')
  .description('视频设置');

videoCmd
  .command('encoder <encoder>')
  .description('设置视频编码器 (h264/h265)')
  .option('-j, --json', 'JSON格式输出')
  .action(async (encoder, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await imageService.setVideoEncoder(api, encoder);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

videoCmd
  .command('bitrate <level>')
  .description('设置码率级别 (low/medium/high/max)')
  .option('-j, --json', 'JSON格式输出')
  .action(async (level, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await imageService.setBitrateLevel(api, level);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

videoCmd
  .command('rotation <rotation>')
  .description('设置视频旋转 (0/90/180/270)')
  .option('-j, --json', 'JSON格式输出')
  .action(async (rotation, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await imageService.setVideoRotation(api, rotation);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

videoCmd
  .command('compose-mode <mode>')
  .description('设置合成模式 (normal/anamorphic)')
  .option('-j, --json', 'JSON格式输出')
  .action(async (mode, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await imageService.setComposeMode(api, mode);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

videoCmd
  .command('timelapse <interval>')
  .description('设置延时摄影间隔（秒）')
  .option('-j, --json', 'JSON格式输出')
  .action(async (interval, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await imageService.setVideoTimelapseInterval(api, interval);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

videoCmd
  .command('eis <enable>')
  .description('设置电子防抖 (on/off)')
  .option('-j, --json', 'JSON格式输出')
  .action(async (enable, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await imageService.setEisOnOff(api, enable);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

imageCmd.addCommand(videoCmd);

// ===== 音频设置子命令 =====
const audioCmd = new Command('audio')
  .description('音频设置');

audioCmd
  .command('encoder <encoder>')
  .description('设置音频编码器 (aac/pcm)')
  .option('-j, --json', 'JSON格式输出')
  .action(async (encoder, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await imageService.setAudioEncoder(api, encoder);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

audioCmd
  .command('channel <channel>')
  .description('设置音频通道 (stereo/mono)')
  .option('-j, --json', 'JSON格式输出')
  .action(async (channel, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await imageService.setAudioChannel(api, channel);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

audioCmd
  .command('gain <value>')
  .description('设置音频增益 (0-100)')
  .option('-j, --json', 'JSON格式输出')
  .action(async (value, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await imageService.setAudioInputGain(api, value);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

audioCmd
  .command('level <value>')
  .description('设置音频电平 (0-100)')
  .option('-j, --json', 'JSON格式输出')
  .action(async (value, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await imageService.setAudioInputLevel(api, value);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

audioCmd
  .command('phantom <power>')
  .description('设置幻象电源 (48/off)')
  .option('-j, --json', 'JSON格式输出')
  .action(async (power, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await imageService.setPhantomPower(api, power);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

audioCmd
  .command('noise-reduction <enable>')
  .description('设置音频降噪 (on/off)')
  .option('-j, --json', 'JSON格式输出')
  .action(async (enable, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await imageService.setAudioNoiseReduction(api, enable);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

imageCmd.addCommand(audioCmd);

module.exports = imageCmd;