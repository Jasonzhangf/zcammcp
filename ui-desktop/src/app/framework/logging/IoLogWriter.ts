// IoLogWriter.ts
// 将 IoLogEntry 追加写入 ~/.zcam/zcammcp-ui/logs/io 下的 JSONL 文件

import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { CliRequest, CliResponse } from '../state/PageStore.js';

export interface IoLogEntry {
  ts: number;
  dir: 'out' | 'in';
  pagePath: string;
  nodePath: string;
  operationId: string;
  request?: CliRequest;
  response?: CliResponse;
}

export class IoLogWriter {
  private readonly baseDir: string;

  constructor(baseDir?: string) {
    const home = os.homedir();
    this.baseDir = baseDir ?? path.join(home, '.zcam', 'zcammcp-ui', 'logs', 'io');
  }

  private async ensureDir(): Promise<void> {
    await fs.mkdir(this.baseDir, { recursive: true });
  }

  private getFilePath(pagePath: string, ts: number): string {
    const d = new Date(ts);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const pageId = pagePath.replace(/[^a-zA-Z0-9_.-]/g, '_').replace(/\./g, '_');
    return path.join(this.baseDir, `${pageId}-${yyyy}${mm}${dd}.log`);
  }

  async append(entry: IoLogEntry): Promise<void> {
    await this.ensureDir();
    const filePath = this.getFilePath(entry.pagePath, entry.ts);
    const line = JSON.stringify(entry) + '\n';
    await fs.appendFile(filePath, line, 'utf-8');
  }
}

