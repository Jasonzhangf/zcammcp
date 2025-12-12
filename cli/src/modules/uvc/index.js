const { Command } = require('commander');
const chalk = require('chalk');
const { UvcService } = require('../../services/uvc-service');

const DEFAULT_BASE_URL = process.env.ZCAM_UVC_BASE || 'http://127.0.0.1:17988';
const DEFAULT_TIMEOUT = process.env.ZCAM_UVC_TIMEOUT || '5000';

function createService(cmd) {
  const opts = collectOptions(cmd);
  return new UvcService({ baseUrl: opts.baseUrl, timeoutMs: opts.timeout });
}

function collectOptions(command) {
  const root = command?.parent ?? command;
  const opts = root?.opts ? root.opts() : {};
  const timeout = parseInt(opts.timeout || DEFAULT_TIMEOUT, 10);
  return {
    baseUrl: opts.baseUrl || DEFAULT_BASE_URL,
    timeout: Number.isFinite(timeout) ? timeout : parseInt(DEFAULT_TIMEOUT, 10),
    json: Boolean(opts.json),
  };
}

function outputResult(data, options) {
  if (options.json || process.stdout.isTTY === false) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  console.log(chalk.green('✓'), chalk.gray(JSON.stringify(data)));
}

const uvcCmd = new Command('uvc')
  .description('UVC 相机服务控制 (ImvtCameraService)')
  .option('--base-url <url>', 'UVC 服务地址', DEFAULT_BASE_URL)
  .option('--timeout <ms>', '请求超时 (毫秒)', DEFAULT_TIMEOUT)
  .option('--json', 'JSON 格式输出');

uvcCmd
  .command('status')
  .description('查询 UVC 服务 capabilities')
  .action(async (options, cmd) => {
    try {
      const service = createService(cmd);
      const payload = await service.queryAll();
      outputResult(payload, collectOptions(cmd));
    } catch (err) {
      console.error(chalk.red('✗ status failed'), err.message);
      process.exit(1);
    }
  });

uvcCmd
  .command('get <key>')
  .description('读取单个属性')
  .action(async (key, options, cmd) => {
    try {
      const service = createService(cmd);
      const payload = await service.getProperty(key);
      outputResult(payload, collectOptions(cmd));
    } catch (err) {
      console.error(chalk.red('✗ get failed'), err.message);
      process.exit(1);
    }
  });

uvcCmd
  .command('set <key>')
  .description('设置属性值')
  .option('-v, --value <value>', '属性值')
  .option('--auto', '启用 auto 模式')
  .action(async (key, options, cmd) => {
    try {
      const service = createService(cmd);
      const payload = await service.setProperty(key, options.value, { auto: options.auto === true });
      outputResult(payload, collectOptions(cmd));
    } catch (err) {
      console.error(chalk.red('✗ set failed'), err.message);
      process.exit(1);
    }
  });

uvcCmd
  .command('list-resolutions')
  .description('列出支持的分辨率')
  .action(async (options, cmd) => {
    try {
      const service = createService(cmd);
      const payload = await service.listResolutions();
      outputResult(payload, collectOptions(cmd));
    } catch (err) {
      console.error(chalk.red('✗ list-resolutions failed'), err.message);
      process.exit(1);
    }
  });

uvcCmd
  .command('set-resolution')
  .description('设置分辨率')
  .requiredOption('-w, --width <width>', '宽度')
  .requiredOption('-h, --height <height>', '高度')
  .action(async (options, cmd) => {
    try {
      const service = createService(cmd);
      const payload = await service.setResolution(options.width, options.height);
      outputResult(payload, collectOptions(cmd));
    } catch (err) {
      console.error(chalk.red('✗ set-resolution failed'), err.message);
      process.exit(1);
    }
  });

uvcCmd
  .command('list-framerates')
  .description('列出支持的帧率')
  .action(async (options, cmd) => {
    try {
      const service = createService(cmd);
      const payload = await service.listFramerates();
      outputResult(payload, collectOptions(cmd));
    } catch (err) {
      console.error(chalk.red('✗ list-framerates failed'), err.message);
      process.exit(1);
    }
  });

uvcCmd
  .command('set-framerate <value>')
  .description('设置帧率')
  .action(async (value, options, cmd) => {
    try {
      const service = createService(cmd);
      const payload = await service.setFramerate(value);
      outputResult(payload, collectOptions(cmd));
    } catch (err) {
      console.error(chalk.red('✗ set-framerate failed'), err.message);
      process.exit(1);
    }
  });

module.exports = uvcCmd;
