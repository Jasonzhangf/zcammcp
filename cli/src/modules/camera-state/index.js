const { Command } = require('commander');
const chalk = require('chalk');
const http = require('http');

const DEFAULT_HOST = process.env.ZCAM_CAMERA_STATE_HOST || '127.0.0.1';
const DEFAULT_PORT = parseInt(process.env.ZCAM_CAMERA_STATE_PORT || '6292', 10);

function fetchState(host, port, path = '/state', method = 'GET', payload) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: host,
      port,
      path,
      method,
      headers: {},
    };
    let body = null;
    if (payload) {
      body = JSON.stringify(payload);
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(body);
    }
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve(data ? JSON.parse(data) : {});
        } catch (err) {
          reject(err);
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function outputResult(data, options) {
  if (options.json || process.stdout.isTTY === false) {
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log(chalk.green('✓'), chalk.gray(JSON.stringify(data)));
  }
}

const cameraStateCmd = new Command('camera-state')
  .description('Camera-state service bridge (cached UVC values)')
  .option('--host <host>', 'camera-state service host', DEFAULT_HOST)
  .option('--port <port>', 'camera-state service port', String(DEFAULT_PORT))
  .option('--json', 'JSON output');

cameraStateCmd
  .command('status')
  .description('Fetch latest cached camera state')
  .action(async (_options, cmd) => {
    const parent = cmd.parent;
    const opts = parent.opts();
    try {
      const payload = await fetchState(opts.host, parseInt(opts.port, 10) || DEFAULT_PORT);
      outputResult(payload, opts);
    } catch (err) {
      console.error(chalk.red('✗ camera-state status failed'), err.message);
      process.exit(1);
    }
  });

cameraStateCmd
  .command('refresh')
  .description('Trigger a refresh for specific keys (comma-separated list)')
  .option('--keys <keys>', 'Keys to refresh, e.g. pan,tilt,zoom', '')
  .action(async (options, cmd) => {
    const parent = cmd.parent;
    const opts = parent.opts();
    const keys = options.keys
      ? options.keys
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean)
      : [];
    try {
      const payload = await fetchState(
        opts.host,
        parseInt(opts.port, 10) || DEFAULT_PORT,
        '/refresh',
        'POST',
        keys.length ? { keys } : {},
      );
      outputResult(payload, opts);
    } catch (err) {
      console.error(chalk.red('✗ camera-state refresh failed'), err.message);
      process.exit(1);
    }
  });

module.exports = cameraStateCmd;
