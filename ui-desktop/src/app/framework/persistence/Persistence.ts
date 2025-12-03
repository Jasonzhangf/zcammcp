// Persistence.ts
// UI 持久化层设计: 将 PageStore 相关状态持久化到 ~/.zcam 目录

import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { CameraState, UiState } from '../state/PageStore.js';

export interface PersistedPageState {
  pagePath: string;
  cameraState: CameraState;
  uiState: UiState;
  savedAt: number;
}

/**
 * 负责将页面级状态持久化到 ~/.zcam/zcammcp-ui/<hash>.json
 * 粗粒度: 以 pagePath 为粒度存储整个 cameraState + uiState
 */
export class PagePersistence {
  private readonly baseDir: string;

  constructor(baseDir?: string) {
    const home = os.homedir();
    this.baseDir = baseDir ?? path.join(home, '.zcam', 'zcammcp-ui');
  }

  private getFilePath(pagePath: string): string {
    // 简单做法: 将路径中的 '.' 替换为 '_' 作为文件名
    const safe = pagePath.replace(/[^a-zA-Z0-9_.-]/g, '_').replace(/\./g, '_');
    return path.join(this.baseDir, `${safe}.json`);
  }

  /** 确保目录存在 */
  private async ensureDir(): Promise<void> {
    await fs.mkdir(this.baseDir, { recursive: true });
  }

  /**
   * 将页面状态持久化到磁盘
   */
  async save(pagePath: string, cameraState: CameraState, uiState: UiState): Promise<void> {
    await this.ensureDir();
    const filePath = this.getFilePath(pagePath);
    const payload: PersistedPageState = {
      pagePath,
      cameraState,
      uiState,
      savedAt: Date.now(),
    };
    const json = JSON.stringify(payload, null, 2);
    await fs.writeFile(filePath, json, 'utf-8');
  }

  /**
   * 从磁盘加载页面状态, 若文件不存在或解析失败则返回 undefined
   */
  async load(pagePath: string): Promise<PersistedPageState | undefined> {
    const filePath = this.getFilePath(pagePath);
    try {
      const buf = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(buf) as PersistedPageState;
      if (parsed.pagePath !== pagePath) {
        return undefined;
      }
      return parsed;
    } catch (err: any) {
      if (err && (err.code === 'ENOENT' || err.code === 'ENOTDIR')) {
        // 文件不存在: 视为未有持久化
        return undefined;
      }
      // 其他错误: 为了健壮性返回 undefined, 并交给调用方决定是否报警
      return undefined;
    }
  }
}

