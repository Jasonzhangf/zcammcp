// Persistence.test.ts
// 验证 PagePersistence 能在临时目录中正确读写 JSON

import test from 'node:test';
import assert from 'node:assert';
import os from 'node:os';
import path from 'node:path';
import { promises as fs } from 'node:fs';

import { PagePersistence } from './Persistence.js';
import type { CameraState, UiState } from '../state/PageStore.js';

test('PagePersistence.save/load roundtrip', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'zcammcp-ui-test-'));
  const persistence = new PagePersistence(tmpDir);

  const cameraState: CameraState = {
    ptz: {
      zoom: { value: 10, view: '10' },
      speed: { value: 5, view: '5' },
      focus: { value: 40, view: '40' },
    },
  };

  const uiState: UiState = {
    selectedNodes: ['zcam.camera.pages.main.ptz'],
    debugMode: 'debug',
    highlightMap: {
      'zcam.camera.pages.main.ptz': 'active',
    },
  };

  const pagePath = 'zcam.camera.pages.main';

  await persistence.save(pagePath, cameraState, uiState);

  const loaded = await persistence.load(pagePath);
  assert.ok(loaded, 'should load persisted state');
  assert.equal(loaded?.pagePath, pagePath);
  assert.deepEqual(loaded?.cameraState, cameraState);
  assert.deepEqual(loaded?.uiState, uiState);
});

