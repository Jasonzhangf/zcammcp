#!/usr/bin/env node
/**
 * Monkey Test - 随机交互测试
 * 在 UI 界面上进行随机点击、拖拽测试
 */

const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const CLI_DIR = path.join(PROJECT_ROOT, 'cli');
const STATE_HOST_PORT = 6224;
const LOG_DIR = path.join(PROJECT_ROOT, '.test-results', 'monkey');

// 控件定义
const CONTROLS = [
  { id: 'ptz.pan', kind: 'slider', valueRange: { min: -17500, max: 17500 }, interactions: ['click', 'drag', 'keyboard'] },
  { id: 'ptz.tilt', kind: 'slider', valueRange: { min: -3000, max: 21000 }, interactions: ['click', 'drag'] },
  { id: 'ptz.zoom', kind: 'slider', valueRange: { min: 0, max: 4528 }, interactions: ['click', 'drag', 'keyboard'] },
  { id: 'ptz.focus', kind: 'slider', valueRange: { min: -5040, max: -1196 }, interactions: ['click', 'drag'] },
  { id: 'exposure.iso', kind: 'select', valueRange: { enumValues: ['100', '200', '400', '800', '1600', '3200', '6400'] }, interactions: ['click'] },
  { id: 'exposure.shutter', kind: 'select', interactions: ['click'] },
  { id: 'whitebalance.temperature', kind: 'slider', valueRange: { min: 2500, max: 9000 }, interactions: ['drag'] },
  { id: 'window.shrink', kind: 'button', interactions: ['click'] },
  { id: 'window.restore', kind: 'button', interactions: ['click'] },
];

class MonkeyTestRunner {
  constructor(options = {}) {
    this.duration = options.duration || 30000;
    this.logs = [];
    this.apiCalls = [];
    this.errors = [];
    this.stats = {
      totalInteractions: 0,
      clicks: 0,
      drags: 0,
      keyboard: 0,
      apiSuccess: 0,
      apiFailed: 0
    };
  }

  getTimestamp() {
    const now = Date.now();
    return {
      timestamp: now,
      utc: new Date(now).toISOString(),
      local: new Date(now).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
    };
  }

  logInteraction(controlId, action, params = {}) {
    const entry = {
      ...this.getTimestamp(),
      controlId,
      action,
      params
    };
    this.logs.push(entry);
    console.log(`[${entry.utc}] ${controlId} | ${action}`, params);
    return entry;
  }

  logApiCall(apiCall, request, response) {
    const entry = {
      ...this.getTimestamp(),
      apiCall,
      request,
      response
    };
    this.apiCalls.push(entry);
    
    if (response.ok) {
      this.stats.apiSuccess++;
    } else {
      this.stats.apiFailed++;
    }
    
    return entry;
  }

  async sendCommand(channel, action, payload) {
    return new Promise((resolve) => {
      const body = JSON.stringify({ channel, action, payload });
      const req = http.request({
        hostname: '127.0.0.1',
        port: STATE_HOST_PORT,
        path: '/command',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            resolve(json);
          } catch {
            resolve({ ok: false });
          }
        });
      });
      req.on('error', () => resolve({ ok: false }));
      req.setTimeout(5000, () => {
        req.destroy();
        resolve({ ok: false });
      });
      req.write(body);
      req.end();
    });
  }

  randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  async simulateClick(control) {
    this.logInteraction(control.id, 'click');
    this.stats.clicks++;
    
    // 发送对应的命令
    if (control.id === 'window.shrink') {
      const res = await this.sendCommand('window', 'shrinkToBall', {});
      this.logApiCall('window.shrinkToBall', {}, res);
    } else if (control.id === 'window.restore') {
      const res = await this.sendCommand('window', 'restoreFromBall', {});
      this.logApiCall('window.restoreFromBall', {}, res);
    } else {
      // 通用控件点击
      const res = await this.sendCommand('command', 'execute', { 
        command: control.id + '.click' 
      });
      this.logApiCall(control.id + '.click', {}, res);
    }

    this.stats.totalInteractions++;
  }

  async simulateDrag(control) {
    if (!control.valueRange) return;

    const { min, max } = control.valueRange;
    const from = this.randomBetween(min, max);
    const to = this.randomBetween(min, max);
    
    this.logInteraction(control.id, 'drag', { from, to });
    this.stats.drags++;

    const res = await this.sendCommand('command', 'execute', {
      command: control.id + '.set',
      params: { value: to }
    });
    this.logApiCall(control.id + '.set', { value: to }, res);

    this.stats.totalInteractions++;
  }

  async simulateKeyboard(control) {
    const keys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
    const key = this.randomChoice(keys);
    
    this.logInteraction(control.id, 'keyboard', { key });
    this.stats.keyboard++;
    this.stats.totalInteractions++;
  }

  async run() {
    console.log('========================================');
    console.log('Monkey Test Runner');
    console.log(`Duration: ${this.duration}ms`);
    console.log(`Time: ${new Date().toISOString()}`);
    console.log('========================================\n');

    const startTime = Date.now();
    
    while (Date.now() - startTime < this.duration) {
      const control = this.randomChoice(CONTROLS);
      const action = this.randomChoice(control.interactions || ['click']);

      try {
        switch (action) {
          case 'click':
            await this.simulateClick(control);
            break;
          case 'drag':
            await this.simulateDrag(control);
            break;
          case 'keyboard':
            await this.simulateKeyboard(control);
            break;
        }
      } catch (err) {
        this.errors.push({
          ...this.getTimestamp(),
          controlId: control.id,
          action,
          error: err.message
        });
      }

      // 随机延迟 100-500ms
      await new Promise(r => setTimeout(r, this.randomBetween(100, 500)));
    }

    return this.generateReport();
  }

  generateReport() {
    const report = {
      summary: {
        duration: this.duration,
        startTime: this.logs[0]?.utc,
        endTime: this.logs[this.logs.length - 1]?.utc,
        ...this.stats,
        errors: this.errors.length
      },
      controls: CONTROLS.map(c => ({
        id: c.id,
        kind: c.kind,
        valueRange: c.valueRange
      })),
      logs: this.logs.slice(0, 100), // 限制日志数量
      apiCalls: this.apiCalls.slice(0, 100),
      errors: this.errors
    };

    return report;
  }
}

async function main() {
  const duration = parseInt(process.argv[2]) || 30000;
  
  // 检查 StateHost 是否可用
  try {
    await new Promise((resolve, reject) => {
      const req = http.get(`http://127.0.0.1:${STATE_HOST_PORT}/state`, (res) => {
        if (res.statusCode === 200) resolve();
        else reject(new Error('StateHost not ready'));
      });
      req.on('error', reject);
      req.setTimeout(5000, () => reject(new Error('Timeout')));
    });
  } catch (err) {
    console.error('Error: StateHost not available. Start Electron first.');
    console.error('Run: cd ui-desktop && npm run electron');
    process.exit(1);
  }

  const runner = new MonkeyTestRunner({ duration });
  const report = await runner.run();

  // 保存报告
  fs.mkdirSync(LOG_DIR, { recursive: true });
  const reportPath = path.join(LOG_DIR, `monkey-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log('\n========================================');
  console.log('Monkey Test Complete');
  console.log('========================================');
  console.log(JSON.stringify(report.summary, null, 2));
  console.log(`\nReport saved: ${reportPath}`);

  process.exit(report.summary.errors > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
