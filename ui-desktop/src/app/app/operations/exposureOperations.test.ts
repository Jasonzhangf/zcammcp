// exposureOperations.test.ts
// 验证曝光相关 Operation 能通过 PageStore 正确更新 CameraState

import test from 'node:test';
import assert from 'node:assert';

import { OperationRegistry } from '../../framework/operations/OperationRegistry.js';
import { MockCliChannel } from '../../framework/transport/CliChannel.js';
import {
  PageStore,
  type CameraState,
  type OperationPayload,
} from '../../framework/state/PageStore.js';
import { exposureOperations } from './exposureOperations.js';

test('exposure.setAeEnabled / setShutter / setIso', async () => {
  const ops = new OperationRegistry();
  const cli = new MockCliChannel();

  for (const def of exposureOperations) ops.register(def);

  const initialCameraState: CameraState = {
    exposure: {
      aeEnabled: false,
      shutter: { value: 30, view: '30' },
      iso: { value: 400, view: '400' },
    },
  };

  const store = new PageStore({
    path: 'zcam.camera.pages.main',
    operations: ops,
    cli,
    initialCameraState,
  });

  await store.runOperation(
    'zcam.camera.pages.main.exposure.ae',
    'exposure.ae',
    'exposure.setAeEnabled',
    { value: true } satisfies OperationPayload,
  );

  assert.equal(store.cameraState.exposure?.aeEnabled, false);

  await store.runOperation(
    'zcam.camera.pages.main.exposure.shutter',
    'exposure.shutter',
    'exposure.setShutter',
    { value: 60 } satisfies OperationPayload,
  );

  assert.equal(store.cameraState.exposure?.shutter?.value, 30);

  await store.runOperation(
    'zcam.camera.pages.main.exposure.iso',
    'exposure.iso',
    'exposure.setIso',
    { value: 800 } satisfies OperationPayload,
  );

  assert.equal(store.cameraState.exposure?.iso?.value, 400);

  const requests = cli.getRequests();
  assert.equal(requests.length, 3);
  assert.deepEqual(requests[0].args, ['uvc', 'set', 'exposure', '--auto', 'true']);
  assert.deepEqual(requests[1].args, ['uvc', 'set', 'exposure', '--value', '60']);
  assert.deepEqual(requests[2].args, ['uvc', 'set', 'gain', '--value', '800']);
});
