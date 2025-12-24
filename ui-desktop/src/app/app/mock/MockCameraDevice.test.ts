import assert from 'node:assert/strict';
import test from 'node:test';

import type { CameraState } from '../../framework/state/PageStore.js';
import { PTZ_ZOOM_RANGE } from '../operations/ptzOperations.js';
import { buildUvcCliRequest } from '../operations/uvcCliRequest.js';
import { MockCameraDevice } from './MockCameraDevice.js';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function createInitialState(startValue: number): CameraState {
  return {
    ptz: {
      pan: { value: 0, view: '0' },
      tilt: { value: 0, view: '0' },
      zoom: { value: startValue, view: String(startValue) },
      speed: { value: 50, view: '50' },
      focus: { value: 0, view: '0' },
    },
  };
}

test('zoom motor resumes after repeated start/stop cycles', async (t) => {
  const startValue = PTZ_ZOOM_RANGE.min;
  const device = new MockCameraDevice(createInitialState(startValue));
  t.after(() => device.dispose());

  await device.handleRequest(
    buildUvcCliRequest('zoom', startValue + 800, {
      meta: { stepPerInterval: 250, intervalMs: 50 },
    }),
  );
  await wait(200);

  let zoomValue = device.getState().ptz?.zoom?.value ?? startValue;
  assert.ok(zoomValue > startValue, `zoom should move upward, received ${zoomValue}`);

  await device.handleRequest(
    buildUvcCliRequest('zoom', zoomValue, {
      meta: { stop: true },
    }),
  );
  await wait(120);
  const stoppedValue = device.getState().ptz?.zoom?.value ?? startValue;

  await device.handleRequest(
    buildUvcCliRequest('zoom', stoppedValue + 600, {
      meta: { stepPerInterval: 200, intervalMs: 50 },
    }),
  );
  await wait(220);
  zoomValue = device.getState().ptz?.zoom?.value ?? stoppedValue;
  assert.ok(
    zoomValue > stoppedValue,
    `zoom should continue increasing after restart, stopped at ${stoppedValue}, now ${zoomValue}`,
  );
});
