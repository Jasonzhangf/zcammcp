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

function parseAutoOption(raw) {
  if (typeof raw === 'string') {
    const value = raw.trim().toLowerCase();
    if (value === 'true' || value === '1' || value === 'on') return true;
    if (value === 'false' || value === '0' || value === 'off') return false;
  } else if (raw === true) {
    return true;
  }
  return undefined;
}

const uvcCmd = new Command('uvc')
  .description('UVC service control (ImvtCameraService)')
  .option('--base-url <url>', 'UVC service base URL', DEFAULT_BASE_URL)
  .option('--timeout <ms>', 'request timeout in milliseconds', DEFAULT_TIMEOUT)
  .option('--json', 'force JSON output');

uvcCmd
  .command('status')
  .description('Query the UVC service capabilities')
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
  .description('Read a single property')
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
  .description('Set a property value')
  .option('-v, --value <value>', 'property value')
  .option('--auto [state]', 'auto mode true/false')
  .action(async (key, options, cmd) => {
    try {
      const service = createService(cmd);
      const auto = parseAutoOption(options.auto);
      const payload = await service.setProperty(key, options.value, { auto });
      outputResult(payload, collectOptions(cmd));
    } catch (err) {
      console.error(chalk.red('✗ set failed'), err.message);
      process.exit(1);
    }
  });

uvcCmd
  .command('list-resolutions')
  .description('List supported resolutions')
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
  .description('Set resolution')
  .requiredOption('-w, --width <width>', 'width')
  .requiredOption('-h, --height <height>', 'height')
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
  .description('List supported frame rates')
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
  .description('Set frame rate')
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
