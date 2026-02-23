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
 * 发送 UI 命令 (通过 command channel)
 * 返回结构: { ok, result: { ok, data/commands } }
 */
async function sendCommand(command, params = {}) {
  const res = await requestJson('/command', 'POST', { 
    channel: 'command', 
    action: 'execute',
    payload: { command, params }
  });
  
  if (!res.ok) {
    throw new Error(res.error || 'Command failed');
  }
  
  // 从 res.result 获取实际数据
  return res.result || res;
}

/**
 * 获取命令列表
 * 返回结构: { ok, result: { ok, commands: [...] } }
 */
async function listCommands() {
  const res = await requestJson('/command', 'POST', { 
    channel: 'command', 
    action: 'list',
    payload: {}
  });
  
  if (!res.ok) {
    throw new Error(res.error || 'List commands failed');
  }
  
  // 从 res.result.commands 获取列表
  return res.result?.commands || [];
}

function buildCommand() {
  const cmd = new Command('control');
  cmd.description('UI control commands via CommandRegistry');

  // Window shrink command
  cmd
    .command('shrink')
    .description('Shrink main window to ball (ui.window.shrinkToBall)')
    .action(async () => {
      try {
        const startTime = Date.now();
        const result = await sendCommand('ui.window.shrinkToBall');
        const elapsed = Date.now() - startTime;
        console.log(chalk.green('✓ ui.window.shrinkToBall executed'));
        console.log(`  Elapsed: ${elapsed}ms`);
        console.log(`  Result: ${JSON.stringify(result.data || result)}`);
      } catch (err) {
        console.error(chalk.red('✗ ui.window.shrinkToBall failed'), err.message);
        process.exit(1);
      }
    });

  // Window restore command
  cmd
    .command('restore')
    .description('Restore window from ball (ui.window.restoreFromBall)')
    .action(async () => {
      try {
        const startTime = Date.now();
        const result = await sendCommand('ui.window.restoreFromBall');
        const elapsed = Date.now() - startTime;
        console.log(chalk.green('✓ ui.window.restoreFromBall executed'));
        console.log(`  Elapsed: ${elapsed}ms`);
        console.log(`  Result: ${JSON.stringify(result.data || result)}`);
      } catch (err) {
        console.error(chalk.red('✗ ui.window.restoreFromBall failed'), err.message);
        process.exit(1);
      }
    });

  // List all commands
  cmd
    .command('list')
    .description('List all available UI commands')
    .action(async () => {
      try {
        const commands = await listCommands();
        console.log(chalk.cyan('Available UI Commands:'));
        commands.forEach(c => {
          console.log(`  ${chalk.green(c.id)} - ${c.description}`);
        });
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
        
        const startTime = Date.now();
        const result = await sendCommand(commandId, params);
        const elapsed = Date.now() - startTime;
        console.log(chalk.green(`✓ ${commandId} executed`));
        console.log(`  Elapsed: ${elapsed}ms`);
        console.log(`  Result: ${JSON.stringify(result.data || result)}`);
      } catch (err) {
        console.error(chalk.red(`✗ ${commandId} failed`), err.message);
        process.exit(1);
      }
    });

  return cmd;
}

module.exports = buildCommand();
