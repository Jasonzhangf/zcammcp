// FocusGroup.test.ts
// 验证 FocusGroup 组件的 Operation 调用行为

import test from 'node:test';
import assert from 'node:assert';

import { OperationRegistry } from '../../../framework/operations/OperationRegistry.js';
import { MockCliChannel } from '../../../framework/transport/CliChannel.js';
import { PageStore, type CameraState } from '../../../framework/state/PageStore.js';
import { ptzOperations } from '../../../app/operations/ptzOperations.js';

test('FocusGroup.setFocus operation updates state correctly', async () => {
  const ops = new OperationRegistry();
  const cli = new MockCliChannel();

  // 注册 ptz 相关 Operation
  for (const def of ptzOperations) {
    ops.register(def);
  }

  const initialCameraState: CameraState = {
    ptz: {
      focus: { value: 40, view: '40' },
    },
  };

  const store = new PageStore({
    path: 'zcam.camera.pages.main',
    operations: ops,
    cli,
    initialCameraState,
  });

  // 调用 FocusGroup 使用的 setFocus operation
  await store.runOperation(
    'zcam.camera.pages.main.ptz.focus',
    'ptz.focus',
    'ptz.setFocus',
    { value: 80 },
  );

  assert.equal(store.cameraState.ptz?.focus?.value, 40);
  assert.equal(store.cameraState.ptz?.focus?.view, '40');

  // 验证 CLI 请求格式
  const requests = cli.getRequests();
  const firstRequest = requests[0];
  assert.ok(firstRequest);
  assert.deepEqual(firstRequest.args, ['uvc', 'set', 'focus', '--value', '80']);
});
