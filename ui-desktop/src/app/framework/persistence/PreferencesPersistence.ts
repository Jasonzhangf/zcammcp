// PreferencesPersistence.ts
// 持久化用户偏好、页面布局配置和快捷设置到 ~/.zcam/zcammcp-ui/prefs

import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// 这里的类型只定义基础结构, 具体字段可由应用层扩展
export interface UiPreferences {
  theme?: 'dark' | 'light';
  language?: string;
  window?: {
    alwaysOnTop?: boolean;
    defaultMode?: 'panel' | 'ball';
  };
  // 允许扩展
  [key: string]: unknown;
}

export interface PageLayoutConfig {
  pagePath: string;
  visibleSections?: string[];
  sectionOrder?: string[];
  // 允许扩展布局配置
  [key: string]: unknown;
}

export interface PageShortcutsConfig {
  pagePath: string;
  shortcuts: unknown[]; // 应用层可在此基础上定义具体结构
}

export class PreferencesPersistence {
  private readonly baseDir: string;

  constructor(baseDir?: string) {
    const home = os.homedir();
    this.baseDir = baseDir ?? path.join(home, '.zcam', 'zcammcp-ui', 'prefs');
  }

  private async ensureDir(): Promise<void> {
    await fs.mkdir(this.baseDir, { recursive: true });
  }

  private getUiPrefsPath(): string {
    return path.join(this.baseDir, 'ui-preferences.json');
  }

  private safePageId(pagePath: string): string {
    return pagePath.replace(/[^a-zA-Z0-9_.-]/g, '_').replace(/\./g, '_');
  }

  private getLayoutPath(pagePath: string): string {
    const id = this.safePageId(pagePath);
    return path.join(this.baseDir, `layout-${id}.json`);
  }

  private getShortcutsPath(pagePath: string): string {
    const id = this.safePageId(pagePath);
    return path.join(this.baseDir, `shortcuts-${id}.json`);
  }

  async loadUiPreferences(): Promise<UiPreferences | undefined> {
    const filePath = this.getUiPrefsPath();
    try {
      const buf = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(buf) as UiPreferences;
    } catch (err: any) {
      if (err && (err.code === 'ENOENT' || err.code === 'ENOTDIR')) {
        return undefined;
      }
      return undefined;
    }
  }

  async saveUiPreferences(prefs: UiPreferences): Promise<void> {
    await this.ensureDir();
    const json = JSON.stringify(prefs, null, 2);
    await fs.writeFile(this.getUiPrefsPath(), json, 'utf-8');
  }

  async loadLayout(pagePath: string): Promise<PageLayoutConfig | undefined> {
    const filePath = this.getLayoutPath(pagePath);
    try {
      const buf = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(buf) as PageLayoutConfig;
      if (parsed.pagePath !== pagePath) return undefined;
      return parsed;
    } catch (err: any) {
      if (err && (err.code === 'ENOENT' || err.code === 'ENOTDIR')) {
        return undefined;
      }
      return undefined;
    }
  }

  async saveLayout(pagePath: string, config: PageLayoutConfig): Promise<void> {
    await this.ensureDir();
    const filePath = this.getLayoutPath(pagePath);
    const payload: PageLayoutConfig = { ...config, pagePath };
    const json = JSON.stringify(payload, null, 2);
    await fs.writeFile(filePath, json, 'utf-8');
  }

  async loadShortcuts(pagePath: string): Promise<PageShortcutsConfig | undefined> {
    const filePath = this.getShortcutsPath(pagePath);
    try {
      const buf = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(buf) as PageShortcutsConfig;
      if (parsed.pagePath !== pagePath) return undefined;
      return parsed;
    } catch (err: any) {
      if (err && (err.code === 'ENOENT' || err.code === 'ENOTDIR')) {
        return undefined;
      }
      return undefined;
    }
  }

  async saveShortcuts(pagePath: string, config: PageShortcutsConfig): Promise<void> {
    await this.ensureDir();
    const filePath = this.getShortcutsPath(pagePath);
    const payload: PageShortcutsConfig = { ...config, pagePath };
    const json = JSON.stringify(payload, null, 2);
    await fs.writeFile(filePath, json, 'utf-8');
  }
}

