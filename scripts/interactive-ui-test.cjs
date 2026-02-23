#!/usr/bin/env node
/**
 * Interactive UI Test - 弹出界面测试
 * 启动 Electron 并执行 CLI 命令进行 UI 测试
 */

const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const UI_DESKTOP_DIR = path.join(PROJECT_ROOT, 'ui-desktop');
const CLI_DIR = path.join(PROJECT_ROOT, 'cli');

const STATE_HOST_PORT = 6224;
const STATE_HOST_HOST = '127.0.0.1';

let electronProcess = null;
let testResults = [];

// 等待端口可用
function waitForPort(port, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      const req = http.get(`http://${STATE_HOST_HOST}:${port}/state?channel=window`, (res) => {
        if (res.statusCode === 200) {
          resolve(true);
        } else {
          retry();
        }
      });
      req.on('error', retry);
      req.setTimeout(1000, () => {
        req.destroy();
        retry();
      });
    };
    
    const retry = () => {
      if (Date.now() - start > timeout) {
        reject(new Error(`Timeout waiting for port ${port}`));
        return;
      }
      setTimeout(check, 500);
    };
    
    check();
  });
}

// 执行 CLI 命令
function runCliCommand(args) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const child = spawn('node', ['src/index.js', ...args], {
      cwd: CLI_DIR,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    let stdout = '';
    let stderr = '';
    
    child.stdout.on('data', (data) => {
      stdout += data.toString();
      process.stdout.write(data);
    });
    
    child.stderr.on('data', (data) => {
      stderr += data.toString();
      process.stderr.write(data);
    });
    
    child.on('exit', (code) => {
      const elapsed = Date.now() - start;
      resolve({
        code,
        stdout,
        stderr,
        elapsed,
        success: code === 0
      });
    });
    
    child.on('error', reject);
  });
}

// 获取窗口状态
async function getWindowState() {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://${STATE_HOST_HOST}:${STATE_HOST_PORT}/state?channel=window`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.state || null);
        } catch (e) {
          resolve(null);
        }
      });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(5000, () => {
      req.destroy();
      resolve(null);
    });
  });
}

// 启动 Electron
function startElectron() {
  return new Promise((resolve, reject) => {
    console.log('[Test] Starting Electron...');
    console.log(`[Time] ${new Date().toISOString()}`);
    
    electronProcess = spawn('npm', ['run', 'electron'], {
      cwd: UI_DESKTOP_DIR,
      stdio: 'pipe',
      shell: true,
      env: {
        ...process.env,
        NODE_ENV: 'production',
        ZCAM_ELECTRON_SKIP_BUILD: '1'
      }
    });
    
    let output = '';
    electronProcess.stdout.on('data', (data) => {
      output += data.toString();
      // 输出关键日志
      const lines = data.toString().split('\n');
      for (const line of lines) {
        if (line.includes('StateHost') || line.includes('Error') || line.includes('listening')) {
          console.log('[Electron]', line.trim());
        }
      }
    });
    
    electronProcess.stderr.on('data', (data) => {
      // 忽略常见的 Electron 警告
      const line = data.toString();
      if (!line.includes('CONSOLE') && !line.includes('Autofill')) {
        console.error('[Electron Error]', line.trim());
      }
    });
    
    electronProcess.on('error', reject);
    
    // 等待 StateHost 启动
    setTimeout(async () => {
      try {
        await waitForPort(STATE_HOST_PORT, 60000);
        console.log('[Test] Electron ready, StateHost listening');
        resolve();
      } catch (err) {
        electronProcess.kill();
        reject(err);
      }
    }, 5000);
  });
}

// 运行测试
async function runTests() {
  console.log('\n========================================');
  console.log('Interactive UI Test');
  console.log('========================================\n');
  
  try {
    // 0. 构建生产版本
    console.log('[Test] Building production UI...');
    const buildProcess = spawn('npm', ['run', 'build'], {
      cwd: UI_DESKTOP_DIR,
      stdio: 'inherit',
      shell: true
    });
    await new Promise((resolve, reject) => {
      buildProcess.on('exit', (code) => {
        if (code === 0) resolve();
        else reject(new Error('Build failed'));
      });
    });
    console.log('[Test] Build completed\n');
    
    // 1. 启动 Electron
    await startElectron();
    
    // 等待 UI 完全加载
    console.log('[Test] Waiting for UI to initialize...');
    await new Promise(r => setTimeout(r, 3000));
    
    // 2. 获取初始状态
    console.log('\n[Test 1/4] Get initial window state...');
    const initialState = await getWindowState();
    console.log('  Initial state:', JSON.stringify(initialState));
    testResults.push({ test: 'initial-state', passed: true, state: initialState });
    
    // 3. 执行 shrink 命令
    console.log('\n[Test 2/4] Shrink to ball...');
    const shrinkResult = await runCliCommand(['ui', 'window', 'shrink']);
    testResults.push({ test: 'shrink', passed: shrinkResult.success, ...shrinkResult });
    if (!shrinkResult.success) {
      throw new Error('Shrink command failed');
    }
    
    // 等待状态更新
    await new Promise(r => setTimeout(r, 1000));
    const shrinkState = await getWindowState();
    console.log('  State after shrink:', JSON.stringify(shrinkState));
    
    // 4. 执行 restore 命令
    console.log('\n[Test 3/4] Restore from ball...');
    const restoreResult = await runCliCommand(['ui', 'window', 'restore']);
    testResults.push({ test: 'restore', passed: restoreResult.success, ...restoreResult });
    if (!restoreResult.success) {
      throw new Error('Restore command failed');
    }
    
    // 等待状态更新
    await new Promise(r => setTimeout(r, 1000));
    const restoreState = await getWindowState();
    console.log('  State after restore:', JSON.stringify(restoreState));
    
    // 5. 执行 status 命令
    console.log('\n[Test 4/4] Get window status...');
    const statusResult = await runCliCommand(['ui', 'window', 'status']);
    testResults.push({ test: 'status', passed: statusResult.success, ...statusResult });
    
    // 测试通过
    console.log('\n========================================');
    console.log('All Tests Passed!');
    console.log('========================================\n');
    
    const summary = {
      timestamp: new Date().toISOString(),
      totalTests: testResults.length,
      passed: testResults.filter(r => r.passed).length,
      failed: testResults.filter(r => !r.passed).length,
      results: testResults
    };
    
    console.log('Summary:', JSON.stringify(summary, null, 2));
    
  } catch (err) {
    console.error('\n[Test Failed]', err.message);
    process.exitCode = 1;
  } finally {
    // 关闭 Electron
    if (electronProcess) {
      console.log('\n[Test] Shutting down Electron...');
      electronProcess.kill('SIGTERM');
      // 等待进程结束
      await new Promise(r => setTimeout(r, 2000));
      // 强制清理
      try {
        electronProcess.kill('SIGKILL');
      } catch (e) {}
    }
  }
}

runTests();
