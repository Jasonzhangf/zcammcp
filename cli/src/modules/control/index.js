const { Command } = require('commander');
const controlService = require('./service');
const { formatOutput } = require('../../utils/formatter');
const { createAPI } = require('../../core/api');
const { handleErrors } = require('../../utils/error-handler');

/**
 * 控制模块 - PTZ云台控制和镜头控制
 * 功能: PTZ移动、变焦、对焦、自动对焦控制
 */
const controlCmd = new Command('control')
  .description('运动控制（PTZ + 镜头）');

// ===== PTZ控制子命令 =====
const ptzCmd = new Command('ptz')
  .description('PTZ云台控制');

ptzCmd
  .command('query')
  .description('查询PTZ位置')
  .option('-d, --detail', '显示详细信息')
  .option('-j, --json', 'JSON格式输出')
  .action(async (options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = options.detail
        ? await controlService.getPTZDetail(api)
        : await controlService.getPTZPosition(api);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

ptzCmd
  .command('move <direction> <speed>')
  .description('方向移动 (up/down/left/right/up-left/up-right/down-left/down-right)')
  .option('-j, --json', 'JSON格式输出')
  .action(async (direction, speed, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await controlService.ptzDirectionMove(api, direction, speed);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

ptzCmd
  .command('pt-move <panSpeed> <tiltSpeed>')
  .description('PTZ精确移动')
  .option('-j, --json', 'JSON格式输出')
  .action(async (panSpeed, tiltSpeed, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await controlService.ptzMove(api, panSpeed, tiltSpeed);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

ptzCmd
  .command('analog <panSpeed> <tiltSpeed>')
  .description('PTZ模拟移动 (支持浮点数)')
  .option('-j, --json', 'JSON格式输出')
  .allowUnknownOption()
  .action(async (panSpeed, tiltSpeed, options, cmd) => {
    try {
      // Handle negative numbers interpreted as options
      // If tiltSpeed is undefined, it might be in cmd.args or implicit
      // With allowUnknownOption, unknown flags are passed through.
      // But Commander might still not assign it to tiltSpeed if it looks like a flag.

      // Manual recovery for negative values if they were skipped by position
      // If tiltSpeed is an object (it happens when optional args are missing and options shifts), handle it.
      // But here both are required <>.

      // If tiltSpeed is missing/undefined, check if we have extra args or raw args?
      // Actually, standard Commander behavior with allowed unknown options:
      // attributes starting with - are treated as unknown options, not positional args.

      // A better fix might be to use a custom parser or just inspect the raw arguments if needed,
      // but let's try to see if binding works first. 
      // Actually, if we use passThroughOptions it might work?

      // Let's assume for now that if we suppress the error, we might need to fetch the value manually if it wasn't assigned.
      let finalTilt = tiltSpeed;
      if (typeof tiltSpeed !== 'string' && typeof tiltSpeed !== 'number') {
        // If tiltSpeed is the options object because the second arg was skipped
        // We need to look elsewhere?
        // However, let's just use the raw args from the command if needed.
        // But let's verify first.
      }

      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await controlService.ptzAnalogMove(api, panSpeed, finalTilt);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

ptzCmd
  .command('stop')
  .description('停止PTZ移动')
  .option('-j, --json', 'JSON格式输出')
  .action(async (options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await controlService.ptzStop(api);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

ptzCmd
  .command('stop-all')
  .description('停止所有PTZ移动')
  .option('-j, --json', 'JSON格式输出')
  .action(async (options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await controlService.ptzStopAll(api);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

ptzCmd
  .command('home')
  .description('回到原点')
  .option('-j, --json', 'JSON格式输出')
  .action(async (options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await controlService.ptzHome(api);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

ptzCmd
  .command('reset')
  .description('重置PTZ')
  .option('-j, --json', 'JSON格式输出')
  .action(async (options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await controlService.ptzReset(api);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

ptzCmd
  .command('zoomin [speed]')
  .description('放大 (速度0-1浮点数或1-9整数)')
  .option('-j, --json', 'JSON格式输出')
  .action(async (speed = '0.5', options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await controlService.zoomIn(api, speed);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

ptzCmd
  .command('zoomout [speed]')
  .description('缩小 (速度0-1浮点数或1-9整数)')
  .option('-j, --json', 'JSON格式输出')
  .action(async (speed = '0.5', options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await controlService.zoomOut(api, speed);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

ptzCmd
  .command('zoomstop')
  .description('停止变焦')
  .option('-j, --json', 'JSON格式输出')
  .action(async (options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await controlService.zoomStop(api);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

ptzCmd
  .command('focusnear [speed]')
  .description('近焦 (速度0-1浮点数或1-9整数)')
  .option('-j, --json', 'JSON格式输出')
  .action(async (speed = '0.5', options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await controlService.focusNear(api, speed);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

ptzCmd
  .command('focusfar [speed]')
  .description('远焦 (速度0-1浮点数或1-9整数)')
  .option('-j, --json', 'JSON格式输出')
  .action(async (speed = '0.5', options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await controlService.focusFar(api, speed);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

ptzCmd
  .command('focusstop')
  .description('停止对焦')
  .option('-j, --json', 'JSON格式输出')
  .action(async (options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await controlService.focusStop(api);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

controlCmd.addCommand(ptzCmd);

// ===== 变焦控制子命令 =====
const zoomCmd = new Command('zoom')
  .description('变焦控制');

zoomCmd
  .command('in [speed]')
  .description('放大 (速度1-9)')
  .option('-j, --json', 'JSON格式输出')
  .action(async (speed = '5', options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await controlService.zoomIn(api, speed);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

zoomCmd
  .command('out [speed]')
  .description('缩小 (速度1-9)')
  .option('-j, --json', 'JSON格式输出')
  .action(async (speed = '5', options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await controlService.zoomOut(api, speed);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

zoomCmd
  .command('stop')
  .description('停止变焦')
  .option('-j, --json', 'JSON格式输出')
  .action(async (options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await controlService.zoomStop(api);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

zoomCmd
  .command('status')
  .description('查询变焦状态')
  .option('-j, --json', 'JSON格式输出')
  .action(async (options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await controlService.getZoomStatus(api);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

zoomCmd
  .command('mode <mode>')
  .description('设置变焦模式 (optical/digital)')
  .option('-j, --json', 'JSON格式输出')
  .action(async (mode, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await controlService.setZoomMode(api, mode);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

zoomCmd
  .command('pos <value>')
  .description('设置变焦位置 (0-99999)')
  .option('-j, --json', 'JSON格式输出')
  .action(async (value, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await controlService.zoomValue(api, value);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

controlCmd.addCommand(zoomCmd);

// ===== 对焦控制子命令 =====
const focusCmd = new Command('focus')
  .description('对焦控制');

focusCmd
  .command('near [speed]')
  .description('近焦 (速度1-9)')
  .option('-j, --json', 'JSON格式输出')
  .action(async (speed = '5', options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await controlService.focusNear(api, speed);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

focusCmd
  .command('far [speed]')
  .description('远焦 (速度1-9)')
  .option('-j, --json', 'JSON格式输出')
  .action(async (speed = '5', options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await controlService.focusFar(api, speed);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

focusCmd
  .command('stop')
  .description('停止对焦')
  .option('-j, --json', 'JSON格式输出')
  .action(async (options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await controlService.focusStop(api);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

focusCmd
  .command('status')
  .description('查询对焦状态')
  .option('-j, --json', 'JSON格式输出')
  .action(async (options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await controlService.getFocusStatus(api);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

controlCmd.addCommand(focusCmd);

// ===== 自动对焦子命令 =====
const afCmd = new Command('af')
  .description('自动对焦控制');

afCmd
  .command('one-push')
  .description('单次自动对焦')
  .option('-j, --json', 'JSON格式输出')
  .action(async (options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await controlService.afOnePush(api);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

afCmd
  .command('mode <mode>')
  .description('设置对焦模式 (auto/manual)')
  .option('-j, --json', 'JSON格式输出')
  .action(async (mode, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await controlService.setFocusMethod(api, mode);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

afCmd
  .command('roi <x> <y>')
  .description('设置ROI区域中心点')
  .option('-j, --json', 'JSON格式输出')
  .action(async (x, y, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await controlService.updateROICenter(api, x, y);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

afCmd
  .command('roi-type <type>')
  .description('设置ROI类型')
  .option('-j, --json', 'JSON格式输出')
  .action(async (type, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await controlService.setROIType(api, type);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

afCmd
  .command('caf <enable>')
  .description('连续自动对焦 (on/off)')
  .option('-j, --json', 'JSON格式输出')
  .action(async (enable, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await controlService.setCAF(api, enable);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

afCmd
  .command('live-caf <enable>')
  .description('实时连续自动对焦 (on/off)')
  .option('-j, --json', 'JSON格式输出')
  .action(async (enable, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await controlService.setLiveCAF(api, enable);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

afCmd
  .command('mf-assist <enable>')
  .description('MF辅助 (on/off)')
  .option('-j, --json', 'JSON格式输出')
  .action(async (enable, options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent.parent;
      const api = createAPI(globalOptions);
      const result = await controlService.setMFAssist(api, enable);
      formatOutput(result, options.json || globalOptions.json);
    } catch (error) {
      handleErrors(error, cmd.parent.parent.parent);
    }
  });

controlCmd.addCommand(afCmd);

module.exports = controlCmd;