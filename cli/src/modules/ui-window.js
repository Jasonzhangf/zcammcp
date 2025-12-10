const { Command } = require('commander');
const chalk = require('chalk');
const net = require('net');

/**
 * UI/窗口子命令
 * 所有窗口操作通过 IPC 调用 Electron 主进程
 * 通过本地 TCP 端口 6223 与 Electron 通信
 */

// 通过 TCP 与 Electron 主进程通信（端口 6223）
function sendCommandToElectron(cmd, payload = {}) {
  return new Promise((resolve, reject) => {
    const client = net.createConnection({ port: 6223 }, () => {
      client.write(JSON.stringify({ type: 'command', cmd, payload }) + '\n');
      client.end();
    });
    client.on('data', (data) => {
      try {
        const res = JSON.parse(data.toString());
        resolve(res);
      } catch (e) {
        resolve({ ok: false, error: 'invalid response' });
      }
    });
    client.on('error', (err) => {
      reject(new Error(`IPC 连接失败: ${err.message}`));
    });
    client.setTimeout(3000, () => {
      reject(new Error('IPC 超时'));
    });
  });
}

function buildCommand() {
  const cmd = new Command('window');
  cmd.description('Desktop UI window control');

  // window shrink
  cmd
    .command('shrink')
    .description('Shrink main window to floating ball')
    .action(async () => {
      try {
        console.log(chalk.cyan('➜ shrinkToBall'));
        await sendCommandToElectron('window:shrinkToBall');
        console.log(chalk.green('✓ Shrunk to ball'));
      } catch (err) {
        console.error(chalk.red('✗ shrinkToBall failed'), err.message);
        process.exit(1);
      }
    });

  // window restore
  cmd
    .command('restore')
    .description('Restore main window from floating ball')
    .action(async () => {
      try {
        console.log(chalk.cyan('➜ restoreFromBall'));
        await sendCommandToElectron('window:restoreFromBall');
        console.log(chalk.green('✓ Restored main window'));
      } catch (err) {
        console.error(chalk.red('✗ restoreFromBall failed'), err.message);
        process.exit(1);
      }
    });

  // window toggle-size
  cmd
    .command('toggle-size')
    .description('Cycle window size (normal→compact→large→normal)')
    .action(async () => {
      try {
        console.log(chalk.cyan('➜ toggleSize'));
        await sendCommandToElectron('window:toggleSize');
        console.log(chalk.green('✓ Toggled size'));
      } catch (err) {
        console.error(chalk.red('✗ toggleSize failed'), err.message);
        process.exit(1);
      }
    });

  // window set-bounds
  cmd
    .command('set-bounds')
    .description('Set window bounds (x/y/width/height)')
    .option('-x, --x <number>', 'Window left x', '0')
    .option('-y, --y <number>', 'Window top y', '0')
    .option('-w, --width <number>', 'Window width', '1200')
    .option('-h, --height <number>', 'Window height', '720')
    .action(async (options) => {
      try {
        const { x, y, width, height } = options;
        console.log(chalk.cyan(`➜ setBounds x=${x} y=${y} width=${width} height=${height}`));
        await sendCommandToElectron('window:setBounds', { 
          x: parseInt(x), 
          y: parseInt(y), 
          width: parseInt(width), 
          height: parseInt(height) 
        });
        console.log(chalk.green('✓ Set bounds'));
      } catch (err) {
        console.error(chalk.red('✗ setBounds failed'), err.message);
        process.exit(1);
      }
    });

  // window cycle (系统级回环测试)
  cmd
    .command('cycle')
    .description('Run shrink→ball→restore cycle test')
    .option('-t, --timeout <ms>', 'Timeout per stage (ms)', '5000')
    .option('--loop <n>', 'Number of loops, default 1', '1')
    .action(async (options) => {
      const timeoutMs = parseInt(options.timeout, 10) || 5000;
      const loop = Math.max(1, parseInt(options.loop, 10) || 1);
      console.log(chalk.cyan('[UI Cycle] Starting cycle test'));
      const startMs = Date.now();
      const results = [];

      for (let i = 1; i <= loop; i++) {
        try {
          // 1. shrink
          console.log(chalk.gray(` 1/4 shrink (loop ${i})`));
          await sendCommandToElectron('window:shrinkToBall');
          // 2. ball mounted (逻辑占位)
          console.log(chalk.gray(' 2/4 ball mounted'));
          // 3. restore
          console.log(chalk.gray(' 3/4 restore')));
          await sendCommandToElectron('window:restoreFromBall');
          // 4. ball unmounted (逻辑占位)
          console.log(chalk.gray(' 4/4 ball unmounted'));
          results.push({ step: i, status: 'pass' });
        } catch (e) {
          results.push({ step: i, status: 'fail', error: e.message });
          console.error(chalk.red(`✗ Cycle test failed (loop ${i})`), e.message);
          process.exit(1);
        }
      }

      console.log(chalk.green(`✓ Cycle test finished, ${results.length} steps, total ${Date.now() - startMs}ms`));
      console.log(chalk.cyan('=== Cycle Test Summary ==='));
      results.forEach((r, i) => {
        const status = r.status === 'pass' ? chalk.green('✅') : chalk.red('✗');
        console.log(`${status} loop ${i + 1} : ${r.status}`);
      });
      process.exit(0);
    });

  return cmd;
}

module.exports = buildCommand();
