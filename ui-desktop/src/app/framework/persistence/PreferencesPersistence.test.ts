// PreferencesPersistence.test.ts
import test from 'node:test';
import assert from 'node:assert';
import type { ShortcutItem } from '../ui/ShortcutConfig.js';
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
  const baseDir = await fs.mkdtemp(path.join(os.tmpdir(), 'prefs-test-'));
  const prefs = new PreferencesPersistence(baseDir);
  const pagePath = 'zcam.camera.pages.main';

  const uiPrefs: UiPreferences = {
    theme: 'dark',
    language: 'zh-CN',
    window: { alwaysOnTop: true },
  };

  await prefs.saveUiPreferences(uiPrefs);
  const loadedUiPrefs = await prefs.loadUiPreferences();
  assert.deepEqual(loadedUiPrefs, uiPrefs);

  const layout: PageLayoutConfig = {
    pagePath,
    layout: { grid: '2x2' },
  };

  await prefs.saveLayout(pagePath, layout);
  const loadedLayout = await prefs.loadLayout(pagePath);
  assert.deepEqual(loadedLayout, layout);

  const shortcuts: PageShortcutsConfig = {
    pagePath,
    shortcuts: [{ id: 's1', label: '快捷1' }],
  };

  await prefs.saveShortcuts(pagePath, shortcuts);
  const loadedShortcuts = await prefs.loadShortcuts(pagePath);
  assert.deepEqual(loadedShortcuts, shortcuts);
});
