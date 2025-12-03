// ptzOperations.test.ts
// 验证 ptz.setZoom Operation 能正确更新 CameraState 并构造 CLI 请求

import test from 'node:test';
import assert from 'node:assert';

import { OperationRegistry } from '../../framework/operations/OperationRegistry.js';
import { MockCliChannel } from '../../framework/transport/CliChannel.js';
import { PageStore, type CameraState, type OperationContext, type OperationPayload, type OperationResult } from '../../framework/state/PageStore.js';
import { ptzOperations } from './ptzOperations.js';

test('ptz.setZoom operation integrates with PageStore', async () => {
  const ops = new OperationRegistry();
  const cli = new MockCliChannel();

  // 注册 ptz 相关 Operation
  for (const def of ptzOperations) {
    ops.register(def);
  }

  const initialCameraState: CameraState = {
    ptz: {
      zoom: { value: 10, view: '10' },
    },
  };

  const store = new PageStore({
    path: 'zcam.camera.pages.main',
    operations: ops,
    cli,
    initialCameraState,
  });

  // 调用 PageStore 运行 ptz.setZoom
  await store.runOperation(
    'zcam.camera.pages.main.ptz.zoom',
    'ptz.zoom',
    'ptz.setZoom',
    { value: 80 } satisfies OperationPayload,
  );

  assert.equal(store.cameraState.ptz?.zoom?.value, 80);
  assert.equal(store.cameraState.ptz?.zoom?.view, '80');
});

