// headless-cycle.js
// 在后台启动 Electron，调用 shrinkToBall/restoreFromBall IPC，一次完整缩球/恢复测试

const { spawn } = require('child_process');
const path = require('path');

function run() {
  const electronBin = path.join(__dirname, 'node_modules', '.bin', 'electron');
  const mainEntry = path.join(__dirname, 'electron.main.cjs');

  const child = spawn(electronBin, [mainEntry], {
    env: { ...process.env, NODE_ENV: 'development' },
    stdio: 'ignore',
    detached: true,
  });

  console.log('[headless] electron pid', child.pid);

  // 小延时等待窗口准备好
  setTimeout(() => {
    // 这里后面可以接上 IPC 驱动脚本，例如通过 CLI 层
    console.log('[headless] TODO: 调用 shrinkToBall/restoreFromBall');
    process.exit(0);
  }, 2000);
}

run();
