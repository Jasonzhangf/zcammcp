// imageOperations.test.ts
// 验证图像相关 Operation 能通过 PageStore 正确更新 CameraState

import test from 'node:test';
import assert from 'node:assert';

import { OperationRegistry } from '../../framework/operations/OperationRegistry.js';
import { MockCliChannel } from '../../framework/transport/CliChannel.js';
import {
  PageStore,
  type CameraState,
  type OperationPayload,
} from '../../framework/state/PageStore.js';
import { imageOperations } from './imageOperations.js';

test('image.setBrightness / setContrast / setSaturation', async () => {
  const ops = new OperationRegistry();
  const cli = new MockCliChannel();

  for (const def of imageOperations) ops.register(def);

  const initialCameraState: CameraState = {
    image: {
      brightness: 40,
      contrast: 40,
      saturation: 40,
    },
  };

  const store = new PageStore({
    path: 'zcam.camera.pages.main',
    operations: ops,
    cli,
    initialCameraState,
  });

  await store.runOperation(
    'zcam.camera.pages.main.image.brightness',
    'image.brightness',
    'image.setBrightness',
    { value: 60 } satisfies OperationPayload,
  );

  await store.runOperation(
    'zcam.camera.pages.main.image.contrast',
    'image.contrast',
    'image.setContrast',
    { value: 70 } satisfies OperationPayload,
  );

  await store.runOperation(
    'zcam.camera.pages.main.image.saturation',
    'image.saturation',
    'image.setSaturation',
    { value: 80 } satisfies OperationPayload,
  );

  assert.equal(store.cameraState.image?.brightness, 60);
  assert.equal(store.cameraState.image?.contrast, 70);
  assert.equal(store.cameraState.image?.saturation, 80);

  const requests = cli.getRequests();
  assert.equal(requests.length, 3);
  const [brightnessReq, contrastReq, saturationReq] = requests;
  assert.deepEqual(brightnessReq.args, ['uvc', 'set', 'brightness', '--value', '60']);
  assert.deepEqual(contrastReq.args, ['uvc', 'set', 'contrast', '--value', '70']);
  assert.deepEqual(saturationReq.args, ['uvc', 'set', 'saturation', '--value', '80']);
});
