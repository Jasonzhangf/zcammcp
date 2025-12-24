// whiteBalanceOperations.test.ts
// 验证白平衡相关 Operation 能通过 PageStore 正确更新 CameraState

import test from 'node:test';
import assert from 'node:assert';

import { OperationRegistry } from '../../framework/operations/OperationRegistry.js';
import { MockCliChannel } from '../../framework/transport/CliChannel.js';
import {
  PageStore,
  type CameraState,
  type OperationPayload,
} from '../../framework/state/PageStore.js';
import { whiteBalanceOperations } from './whiteBalanceOperations.js';

test('whiteBalance.setAwbEnabled / setTemperature', async () => {
  const ops = new OperationRegistry();
  const cli = new MockCliChannel();

  for (const def of whiteBalanceOperations) ops.register(def);

  const initialCameraState: CameraState = {
    whiteBalance: {
      awbEnabled: false,
      temperature: { value: 5600, view: '5600K' },
    },
  };

  const store = new PageStore({
    path: 'zcam.camera.pages.main',
    operations: ops,
    cli,
    initialCameraState,
  });

  await store.runOperation(
    'zcam.camera.pages.main.whiteBalance.awb',
    'wb.awb',
    'whiteBalance.setAwbEnabled',
    { value: true } satisfies OperationPayload,
  );

  assert.equal(store.cameraState.whiteBalance?.awbEnabled, false);

  await store.runOperation(
    'zcam.camera.pages.main.whiteBalance.temperature',
    'wb.temperature',
    'whiteBalance.setTemperature',
    { value: 6500 } satisfies OperationPayload,
  );

  assert.equal(store.cameraState.whiteBalance?.temperature?.value, 5600);
  assert.equal(store.cameraState.whiteBalance?.temperature?.view, '5600K');

  const requests = cli.getRequests();
  assert.equal(requests.length, 2);
  assert.deepEqual(requests[0].args, ['uvc', 'set', 'whitebalance', '--auto', 'true']);
  assert.deepEqual(requests[1].args, ['uvc', 'set', 'whitebalance', '--value', '6500']);
});
