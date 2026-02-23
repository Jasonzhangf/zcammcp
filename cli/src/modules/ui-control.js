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

/**
 * 发送 UI 控制命令
 */
async function sendUICommand(command, params = {}) {
  const res = await requestJson('/command', 'POST', { 
    channel: 'ui', 
    action: 'executeCommand',
    payload: { command, params }
  });
  
  if (!res.ok) {
    throw new Error(res.error || 'UI command failed');
  }
  
  return res;
}

/**
 * 获取 UI 状态
 */
async function fetchUIState() {
  const res = await requestJson('/state?channel=camera', 'GET');
  if (!res.ok) {
    throw new Error(res.error || 'state unavailable');
  }
  return res.state || null;
}

function buildCommand() {
  const cmd = new Command('control');
  cmd.description('UI control commands via CommandRegistry');

  // PTZ Commands
  const ptzCmd = new Command('ptz');
  ptzCmd.description('PTZ control commands');

  ptzCmd
    .command('move <direction>')
    .description('Move PTZ (up/down/left/right/up-left/up-right/down-left/down-right)')
    .option('-s, --speed <number>', 'Movement speed (0-100)', '50')
    .action(async (direction, options) => {
      try {
        const speed = parseInt(options.speed, 10);
        const res = await sendUICommand('ptz.move', { direction, speed });
        console.log(chalk.green('✓ PTZ move:'), direction, `speed=${speed}`);
        console.log(JSON.stringify(res.data, null, 2));
      } catch (err) {
        console.error(chalk.red('✗ PTZ move failed'), err.message);
        process.exit(1);
      }
    });

  ptzCmd
    .command('stop')
    .description('Stop PTZ movement')
    .action(async () => {
      try {
        await sendUICommand('ptz.stop');
        console.log(chalk.green('✓ PTZ stopped'));
      } catch (err) {
        console.error(chalk.red('✗ PTZ stop failed'), err.message);
        process.exit(1);
      }
    });

  ptzCmd
    .command('zoom <action>')
    .description('Zoom control (in/out/stop/set)')
    .option('-v, --value <number>', 'Zoom value for set')
    .option('-s, --speed <number>', 'Zoom speed (0-100)', '50')
    .action(async (action, options) => {
      try {
        const params = { action, speed: parseInt(options.speed, 10) };
        if (options.value) params.value = parseInt(options.value, 10);
        const res = await sendUICommand('ptz.zoom', params);
        console.log(chalk.green('✓ PTZ zoom:'), action);
      } catch (err) {
        console.error(chalk.red('✗ PTZ zoom failed'), err.message);
        process.exit(1);
      }
    });

  ptzCmd
    .command('focus <action>')
    .description('Focus control (near/far/stop/set/auto)')
    .option('-v, --value <number>', 'Focus value for set')
    .option('-s, --speed <number>', 'Focus speed (0-100)', '50')
    .action(async (action, options) => {
      try {
        const params = { action, speed: parseInt(options.speed, 10) };
        if (options.value) params.value = parseInt(options.value, 10);
        const res = await sendUICommand('ptz.focus', params);
        console.log(chalk.green('✓ PTZ focus:'), action);
      } catch (err) {
        console.error(chalk.red('✗ PTZ focus failed'), err.message);
        process.exit(1);
      }
    });

  ptzCmd
    .command('state')
    .description('Get PTZ state')
    .action(async () => {
      try {
        const res = await sendUICommand('ptz.getState');
        console.log(chalk.green('✓ PTZ state:'));
        console.log(JSON.stringify(res.data, null, 2));
      } catch (err) {
        console.error(chalk.red('✗ Get PTZ state failed'), err.message);
        process.exit(1);
      }
    });

  cmd.addCommand(ptzCmd);

  // List all commands
  cmd
    .command('list')
    .description('List all available UI commands')
    .action(async () => {
      try {
        const res = await requestJson('/commands', 'GET');
        if (res.ok && res.commands) {
          console.log(chalk.cyan('Available UI Commands:'));
          console.log(JSON.stringify(res.commands, null, 2));
        } else {
          console.log(chalk.yellow('No commands registered'));
        }
      } catch (err) {
        console.error(chalk.red('✗ List commands failed'), err.message);
        process.exit(1);
      }
    });

  // Execute arbitrary command
  cmd
    .command('exec <command-id>')
    .description('Execute a UI command by ID')
    .option('-p, --params <json>', 'Parameters as JSON string', '{}')
    .action(async (commandId, options) => {
      try {
        let params = {};
        try {
          params = JSON.parse(options.params);
        } catch {
          console.error(chalk.red('Invalid JSON params'));
          process.exit(1);
        }
        
        const res = await sendUICommand(commandId, params);
        console.log(chalk.green(`✓ Command ${commandId} executed:`));
        console.log(JSON.stringify(res.data, null, 2));
      } catch (err) {
        console.error(chalk.red(`✗ Command ${commandId} failed`), err.message);
        process.exit(1);
      }
    });

  return cmd;
}

module.exports = buildCommand();
