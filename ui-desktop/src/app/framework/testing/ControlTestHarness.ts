// ControlTestHarness.ts
// 控件测试框架 - 支持值域检查、点击测试、monkey 测试

import type { PageStore, ViewState } from '../state/PageStore.js';

export interface ControlValueRange {
  min: number;
  max: number;
  step?: number;
  expectedType: 'number' | 'string' | 'boolean' | 'enum';
  enumValues?: string[];
}

export interface ControlTestCase {
  id: string;
  path: string;
  kind: string;
  valueRange?: ControlValueRange;
  interactions?: string[]; // ['click', 'drag', 'keyboard']
}

export interface InteractionLog {
  timestamp: number;
  utc: string;
  local: string;
  controlId: string;
  action: string;
  params?: Record<string, unknown>;
  apiCall?: string;
  apiResponse?: unknown;
}

export class ControlTestHarness {
  private logs: InteractionLog[] = [];
  private store: PageStore | null = null;
  private expectedLogs: InteractionLog[] = [];

  constructor(store?: PageStore) {
    this.store = store || null;
  }

  /**
   * 记录交互日志
   */
  log(controlId: string, action: string, params?: Record<string, unknown>) {
    const now = Date.now();
    const log: InteractionLog = {
      timestamp: now,
      utc: new Date(now).toISOString(),
      local: new Date(now).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
      controlId,
      action,
      params,
    };
    this.logs.push(log);
    console.log(`[ControlTest] ${log.utc} | ${controlId} | ${action}`, params || '');
    return log;
  }

  /**
   * 记录 API 调用和响应
   */
  logApiCall(controlId: string, apiCall: string, request: unknown, response?: unknown) {
    const now = Date.now();
    const log: InteractionLog = {
      timestamp: now,
      utc: new Date(now).toISOString(),
      local: new Date(now).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
      controlId,
      action: 'api_call',
      apiCall,
      apiResponse: response,
      params: { request },
    };
    this.logs.push(log);
    console.log(`[ControlTest] ${log.utc} | ${controlId} | API: ${apiCall}`, { request, response });
    return log;
  }

  /**
   * 验证值域
   */
  validateValueRange(value: unknown, range: ControlValueRange): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (range.expectedType === 'number') {
      if (typeof value !== 'number') {
        errors.push(`Expected number, got ${typeof value}`);
        return { valid: false, errors };
      }
      if (value < range.min || value > range.max) {
        errors.push(`Value ${value} out of range [${range.min}, ${range.max}]`);
      }
      if (range.step && (value - range.min) % range.step !== 0) {
        errors.push(`Value ${value} not aligned to step ${range.step}`);
      }
    } else if (range.expectedType === 'enum') {
      if (typeof value !== 'string') {
        errors.push(`Expected string enum, got ${typeof value}`);
      } else if (range.enumValues && !range.enumValues.includes(value)) {
        errors.push(`Value "${value}" not in enum [${range.enumValues.join(', ')}]`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * 模拟点击测试
   */
  simulateClick(controlId: string, expectedApiCall?: string): InteractionLog {
    const log = this.log(controlId, 'click');
    
    if (expectedApiCall) {
      // 模拟 API 调用
      const response = { ok: true, timestamp: Date.now() };
      this.logApiCall(controlId, expectedApiCall, { action: 'click' }, response);
    }

    return log;
  }

  /**
   * 模拟拖拽测试
   */
  simulateDrag(controlId: string, from: number, to: number, expectedApiCall?: string): InteractionLog {
    const log = this.log(controlId, 'drag', { from, to });
    
    if (expectedApiCall) {
      const response = { ok: true, value: to };
      this.logApiCall(controlId, expectedApiCall, { action: 'drag', from, to }, response);
    }

    return log;
  }

  /**
   * Monkey 测试 - 随机交互
   */
  async runMonkeyTest(controls: ControlTestCase[], durationMs: number = 10000): Promise<{
    totalInteractions: number;
    logs: InteractionLog[];
    errors: string[];
  }> {
    const startTime = Date.now();
    const errors: string[] = [];

    console.log(`[MonkeyTest] Starting ${durationMs}ms random interaction test...`);
    console.log(`[MonkeyTest] Time: ${new Date().toISOString()}`);

    while (Date.now() - startTime < durationMs) {
      const control = controls[Math.floor(Math.random() * controls.length)];
      const action = control.interactions?.[Math.floor(Math.random() * (control.interactions?.length || 1))] || 'click';

      try {
        switch (action) {
          case 'click':
            this.simulateClick(control.id, `${control.kind}.set`);
            break;
          case 'drag':
            if (control.valueRange) {
              const { min, max } = control.valueRange;
              const value = Math.random() * (max - min) + min;
              this.simulateDrag(control.id, min, value, `${control.kind}.set`);
            }
            break;
          case 'keyboard':
            this.log(control.id, 'keyboard', { key: 'ArrowUp' });
            break;
        }
      } catch (err) {
        errors.push(`[${control.id}] ${action}: ${err}`);
      }

      // 随机延迟 100-500ms
      await new Promise(r => setTimeout(r, Math.random() * 400 + 100));
    }

    console.log(`[MonkeyTest] Completed. Total interactions: ${this.logs.length}`);

    return {
      totalInteractions: this.logs.length,
      logs: [...this.logs],
      errors,
    };
  }

  /**
   * 验证日志是否符合预期
   */
  verifyLogs(expectedLogs: Partial<InteractionLog>[]): {
    matched: boolean;
    mismatches: string[];
  } {
    const mismatches: string[] = [];

    for (let i = 0; i < expectedLogs.length; i++) {
      const expected = expectedLogs[i];
      const actual = this.logs[i];

      if (!actual) {
        mismatches.push(`Missing log at index ${i}`);
        continue;
      }

      if (expected.controlId && actual.controlId !== expected.controlId) {
        mismatches.push(`[${i}] controlId: expected ${expected.controlId}, got ${actual.controlId}`);
      }
      if (expected.action && actual.action !== expected.action) {
        mismatches.push(`[${i}] action: expected ${expected.action}, got ${actual.action}`);
      }
      if (expected.apiCall && actual.apiCall !== expected.apiCall) {
        mismatches.push(`[${i}] apiCall: expected ${expected.apiCall}, got ${actual.apiCall}`);
      }
    }

    return {
      matched: mismatches.length === 0,
      mismatches,
    };
  }

  /**
   * 导出日志
   */
  exportLogs(): string {
    return JSON.stringify({
      exportTime: new Date().toISOString(),
      totalLogs: this.logs.length,
      logs: this.logs,
    }, null, 2);
  }

  /**
   * 清空日志
   */
  clearLogs() {
    this.logs = [];
  }
}

export default ControlTestHarness;
