import test from 'node:test';
import assert from 'node:assert';

import { OperationRegistry } from '../../framework/operations/OperationRegistry.js';
import { MockCliChannel } from '../../framework/transport/CliChannel.js';
import { PageStore, type CameraState, type OperationPayload } from '../../framework/state/PageStore.js';
import { ptzOperations, PTZ_ZOOM_RANGE } from './ptzOperations.js';

test('ptz.setZoom operation integrates with PageStore', async () => {
  const ops = new OperationRegistry();
  const cli = new MockCliChannel();

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

  const targetZoom = Math.min(PTZ_ZOOM_RANGE.min + 50, PTZ_ZOOM_RANGE.max);
  await store.runOperation(
    'zcam.camera.pages.main.ptz.zoom',
    'ptz.zoom',
    'ptz.setZoom',
    { value: targetZoom } satisfies OperationPayload,
  );

  assert.equal(store.cameraState.ptz?.zoom?.value, targetZoom);
  assert.equal(store.cameraState.ptz?.zoom?.view, String(targetZoom));

  const requests = cli.getRequests();
  assert.equal(requests.length, 1);
  assert.deepEqual(requests[0].args, ['uvc', 'set', 'zoom', '--value', String(targetZoom)]);
});

test('ptz.nudge updates pan/tilt and emits CLI requests', async () => {
  const ops = new OperationRegistry();
  const cli = new MockCliChannel();

  for (const def of ptzOperations) {
    ops.register(def);
  }

  const store = new PageStore({
    path: 'zcam.camera.pages.main',
    operations: ops,
    cli,
    initialCameraState: {
      ptz: {
        pan: { value: 0, view: '0' },
        tilt: { value: 0, view: '0' },
        speed: { value: 50, view: '50' },
      },
    },
  });

  await store.runOperation(
    'zcam.camera.pages.main.ptz.moveUpRight',
    'ptz.move',
    'ptz.nudge',
    { params: { direction: 'up-right' } },
  );

  const panValue = store.cameraState.ptz?.pan?.value ?? 0;
  const tiltValue = store.cameraState.ptz?.tilt?.value ?? 0;
  assert.ok(panValue > 0);
  assert.ok(tiltValue > 0);

  const requests = cli.getRequests();
  assert.equal(requests.length, 2);
  assert.deepEqual(requests[0].args, ['uvc', 'set', 'pan', '--value', String(panValue)]);
  assert.deepEqual(requests[1].args, ['uvc', 'set', 'tilt', '--value', String(tiltValue)]);
});
