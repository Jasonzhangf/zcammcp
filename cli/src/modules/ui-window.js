const { Command } = require('commander');
const chalk = require('chalk');
const http = require('http');

const STATE_HOST_PORT = parseInt(process.env.ZCAM_STATE_PORT || '6224', 10);
const STATE_HOST_HOST = process.env.ZCAM_STATE_HOST || '127.0.0.1';

function requestJson(path, method = 'GET', payload) {
  return new Promise((resolve, reject) => {
    const body = payload ? JSON.stringify(payload) : null;
    const options = {
      hostname: STATE_HOST_HOST,
      port: STATE_HOST_PORT,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': body ? Buffer.byteLength(body) : 0,
      },
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : {};
          resolve(json);
        } catch (err) {
          reject(new Error(`invalid JSON response: ${err.message}`));
        }
      });
    });
    req.on('error', (err) => reject(err));
    if (body) {
      req.write(body);
    }
    req.end();
  });
}

async function sendWindowCommand(action, payload = {}) {
  const res = await requestJson('/command', 'POST', { channel: 'window', action, payload });
  if (!res.ok) {
    throw new Error(res.error || 'window command failed');
  }
  await requestJson('/state', 'POST', {
    channel: 'cli',
    payload: { lastCommand: action, ts: Date.now(), state: res.state || null },
  }).catch(() => {});
  return res;
}

async function fetchWindowState() {
  const res = await requestJson('/state?channel=window', 'GET');
  if (!res.ok) {
    throw new Error(res.error || 'state unavailable');
  }
  return res.state || null;
}

function formatState(state) {
  if (!state) return chalk.gray('No state');
  const parts = [
    `mode=${state.mode || 'unknown'}`,
    `layout=${state.layoutSize || 'unknown'}`,
    `ball=${state.ballVisible ? 'visible' : 'hidden'}`,
  ];
  if (state.lastBounds) {
    parts.push(
      `bounds=[${state.lastBounds.x ?? '?'},${state.lastBounds.y ?? '?'} ${state.lastBounds.width ?? '?'}x${
        state.lastBounds.height ?? '?'
      }]`,
    );
  }
  return chalk.gray(parts.join(' '));
}

function assertWindowState(state, expectation, stage) {
  if (!state) {
    throw new Error(`missing window state for ${stage}`);
  }
  if (expectation.mode && state.mode !== expectation.mode) {
    throw new Error(`expected mode=${expectation.mode} during ${stage}, got ${state.mode}`);
  }
  if (typeof expectation.ballVisible === 'boolean' && Boolean(state.ballVisible) !== expectation.ballVisible) {
    throw new Error(`expected ballVisible=${expectation.ballVisible} during ${stage}, got ${state.ballVisible}`);
  }
  if (expectation.requireBounds && !state.lastBounds) {
    throw new Error(`expected lastBounds to be recorded during ${stage}`);
  }
}

function buildCommand() {
  const cmd = new Command('window');
  cmd.description('Desktop UI window control via state host');

  cmd
    .command('status')
    .description('Show current window state')
    .action(async () => {
      try {
        const state = await fetchWindowState();
        console.log(formatState(state));
      } catch (err) {
        console.error(chalk.red('[window] status failed'), err.message);
        process.exit(1);
      }
    });

  cmd
    .command('shrink')
    .description('Shrink main window to floating ball')
    .action(async () => {
      try {
        const res = await sendWindowCommand('shrinkToBall');
        console.log(chalk.green('✓ Shrunk to ball'), formatState(res.state));
      } catch (err) {
        console.error(chalk.red('✗ shrinkToBall failed'), err.message);
        process.exit(1);
      }
    });

  cmd
    .command('restore')
    .description('Restore main window from floating ball')
    .action(async () => {
      try {
        const res = await sendWindowCommand('restoreFromBall');
        console.log(chalk.green('✓ Restored main window'), formatState(res.state));
      } catch (err) {
        console.error(chalk.red('✗ restoreFromBall failed'), err.message);
        process.exit(1);
      }
    });

  cmd
    .command('toggle-size')
    .description('Toggle layout variant (Layout A ↔ Layout B)')
    .action(async () => {
      try {
        const res = await sendWindowCommand('toggleSize');
        console.log(chalk.green('✓ Toggled layout'), formatState(res.state));
      } catch (err) {
        console.error(chalk.red('✗ toggleSize failed'), err.message);
        process.exit(1);
      }
    });

  cmd
    .command('set-bounds')
    .description('Set window bounds (x/y/width/height)')
    .option('-x, --x <number>', 'Window left x', '')
    .option('-y, --y <number>', 'Window top y', '')
    .option('-w, --width <number>', 'Window width', '')
    .option('-h, --height <number>', 'Window height', '')
    .action(async (options) => {
      try {
        const payload = {};
        if (options.x !== '') payload.x = parseInt(options.x, 10);
        if (options.y !== '') payload.y = parseInt(options.y, 10);
        if (options.width !== '') payload.width = parseInt(options.width, 10);
        if (options.height !== '') payload.height = parseInt(options.height, 10);
        const res = await sendWindowCommand('setBounds', payload);
        console.log(chalk.green('✓ Set bounds'), JSON.stringify(payload), formatState(res.state));
      } catch (err) {
        console.error(chalk.red('✗ setBounds failed'), err.message);
        process.exit(1);
      }
    });

  cmd
    .command('cycle')
    .description('Run shrink→ball→restore cycle test')
    .option('-t, --timeout <ms>', 'Timeout per stage (ms)', '5000')
    .option('--loop <n>', 'Number of loops, default 1', '1')
    .action(async (options) => {
      const loop = Math.max(1, parseInt(options.loop, 10) || 1);
      console.log(chalk.cyan('[UI Cycle] Starting cycle test'));
      const startMs = Date.now();
      const results = [];

      for (let i = 1; i <= loop; i++) {
        try {
          console.log(chalk.gray(`Loop ${i}: shrink`));
          const shrinkState = await sendWindowCommand('shrinkToBall');
          assertWindowState(shrinkState.state, { mode: 'ball', ballVisible: true, requireBounds: true }, 'shrink');
          console.log(chalk.gray(`Loop ${i}: restore`));
          const restoreState = await sendWindowCommand('restoreFromBall');
          assertWindowState(restoreState.state, { mode: 'main', ballVisible: false }, 'restore');
          results.push({ loop: i, status: 'pass' });
        } catch (err) {
          results.push({ loop: i, status: 'fail', error: err.message });
          console.error(chalk.red(`✗ Cycle test failed (loop ${i})`), err.message);
          process.exit(1);
        }
      }

      console.log(chalk.green(`✓ Cycle test finished, ${results.length} loops, total ${Date.now() - startMs}ms`));
      results.forEach((r) => {
        const status = r.status === 'pass' ? chalk.green('✓') : chalk.red('✗');
        console.log(`${status} loop ${r.loop} : ${r.status}`);
      });
      process.exit(0);
    });

  return cmd;
}

module.exports = buildCommand();
