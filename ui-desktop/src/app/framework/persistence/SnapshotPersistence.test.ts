// SnapshotPersistence.test.ts
// 验证 SnapshotPersistence 能保存/列出/加载快照

import test from 'node:test';
import assert from 'node:assert';
import os from 'node:os';
import path from 'node:path';
import { promises as fs } from 'node:fs';

import { SnapshotPersistence } from './SnapshotPersistence.js';
import type { CameraState, UiState } from '../state/PageStore.js';

test('SnapshotPersistence save/list/load', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'zcammcp-ui-snap-test-'));
  const persistence = new SnapshotPersistence(tmpDir);

  const cameraState: CameraState = {
    ptz: {
      zoom: { value: 10, view: '10' },
    },
  };

  const uiState: UiState = {
    selectedNodes: [],
    debugMode: 'normal',
    highlightMap: {},
    layoutMode: 'full',
  };

  const pagePath = 'zcam.camera.pages.main';

  const fileName = await persistence.saveSnapshot(pagePath, cameraState, uiState);
  const list = await persistence.listSnapshots(pagePath);
  assert.ok(list.includes(fileName));

  const loaded = await persistence.loadSnapshot(pagePath, fileName);
  assert.ok(loaded);
  assert.deepEqual(loaded?.cameraState, cameraState);
  assert.deepEqual(loaded?.uiState, uiState);
});
