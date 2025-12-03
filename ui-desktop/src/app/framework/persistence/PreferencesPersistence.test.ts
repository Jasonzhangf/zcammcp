// PreferencesPersistence.test.ts
// 验证 PreferencesPersistence 能读写 UI 偏好、布局和快捷设置

import test from 'node:test';
import assert from 'node:assert';
import os from 'node:os';
import path from 'node:path';
import { promises as fs } from 'node:fs';

import {
  PreferencesPersistence,
  type UiPreferences,
  type PageLayoutConfig,
  type PageShortcutsConfig,
} from './PreferencesPersistence.js';

test('PreferencesPersistence save/load ui preferences, layout, shortcuts', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'zcammcp-ui-prefs-test-'));
  const prefs = new PreferencesPersistence(tmpDir);

  const uiPrefs: UiPreferences = {
    theme: 'dark',
    language: 'zh-CN',
    window: { alwaysOnTop: true, defaultMode: 'panel' },
  };

  await prefs.saveUiPreferences(uiPrefs);
  const loadedUi = await prefs.loadUiPreferences();
  assert.deepEqual(loadedUi, uiPrefs);

  const pagePath = 'zcam.camera.pages.main';
  const layout: PageLayoutConfig = {
    pagePath,
    visibleSections: ['status', 'ptz'],
    sectionOrder: ['status', 'ptz', 'imageControl', 'shortcuts'],
  };

  await prefs.saveLayout(pagePath, layout);
  const loadedLayout = await prefs.loadLayout(pagePath);
  assert.deepEqual(loadedLayout, layout);

  const shortcuts: PageShortcutsConfig = {
    pagePath,
    shortcuts: [{ id: 's1', label: '快捷1' } as any],
  };

  await prefs.saveShortcuts(pagePath, shortcuts);
  const loadedShortcuts = await prefs.loadShortcuts(pagePath);
  assert.deepEqual(loadedShortcuts, shortcuts);
});

