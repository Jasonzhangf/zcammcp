// SnapshotPersistence.ts
// 保存/加载页面级 snapshot 到 ~/.zcam/zcammcp-ui/snapshots/<pageId>/

import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { CameraState, UiState } from '../state/PageStore.js';

export interface SnapshotRecord {
  pagePath: string;
  timestamp: number;
  cameraState: CameraState;
  uiState: UiState;
}

export class SnapshotPersistence {
  private readonly baseDir: string;

  constructor(baseDir?: string) {
    const home = os.homedir();
    this.baseDir = baseDir ?? path.join(home, '.zcam', 'zcammcp-ui', 'snapshots');
  }

  private safePageId(pagePath: string): string {
    return pagePath.replace(/[^a-zA-Z0-9_.-]/g, '_').replace(/\./g, '_');
  }

  private getPageDir(pagePath: string): string {
    return path.join(this.baseDir, this.safePageId(pagePath));
  }

  private async ensureDir(pagePath: string): Promise<string> {
    const dir = this.getPageDir(pagePath);
    await fs.mkdir(dir, { recursive: true });
    return dir;
  }

  async saveSnapshot(pagePath: string, cameraState: CameraState, uiState: UiState): Promise<string> {
    const dir = await this.ensureDir(pagePath);
    const ts = Date.now();
    const d = new Date(ts);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    const fileName = `${yyyy}${mm}${dd}-${hh}${mi}${ss}.json`;
    const filePath = path.join(dir, fileName);

    const payload: SnapshotRecord = {
      pagePath,
      timestamp: ts,
      cameraState,
      uiState,
    };
    const json = JSON.stringify(payload, null, 2);
    await fs.writeFile(filePath, json, 'utf-8');
    return fileName;
  }

  async listSnapshots(pagePath: string): Promise<string[]> {
    const dir = this.getPageDir(pagePath);
    try {
      const files = await fs.readdir(dir);
      return files.filter((f) => f.endsWith('.json')).sort();
    } catch (err: any) {
      if (err && (err.code === 'ENOENT' || err.code === 'ENOTDIR')) {
        return [];
      }
      return [];
    }
  }

  async loadSnapshot(pagePath: string, fileName: string): Promise<SnapshotRecord | undefined> {
    const filePath = path.join(this.getPageDir(pagePath), fileName);
    try {
      const buf = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(buf) as SnapshotRecord;
      if (parsed.pagePath !== pagePath) return undefined;
      return parsed;
    } catch (err: any) {
      if (err && (err.code === 'ENOENT' || err.code === 'ENOTDIR')) {
        return undefined;
      }
      return undefined;
    }
  }
}

