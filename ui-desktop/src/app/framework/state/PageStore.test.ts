// PageStore.test.ts
// 使用 Node 内置 test runner 的简单单元测试, 验证 PageStore 与 OperationRegistry/CliChannel 协同工作

import test from 'node:test';
import assert from 'node:assert';
import { PageStore, type CameraState, type OperationContext, type OperationPayload, type OperationResult } from './PageStore.js';
import { OperationRegistry } from '../operations/OperationRegistry.js';
import { MockCliChannel } from '../transport/CliChannel.js';

// 简单的 Operation 定义: 设置 ptz.zoom.value
const setZoomOpId = 'ptz.setZoom';

test('PageStore.runOperation updates cameraState and calls CLI', async (t) => {
  const ops = new OperationRegistry();
  const cli = new MockCliChannel();

  ops.register({
    id: setZoomOpId,
    cliCommand: 'ptz.zoom',
    async handler(ctx: OperationContext, payload: OperationPayload): Promise<OperationResult> {
      const value = Number(payload.value ?? 0);
      const clamped = Math.max(0, Math.min(100, value));

      const newState: Partial<CameraState> = {
        ptz: {
          ...ctx.cameraState.ptz,
          zoom: { value: clamped, view: String(clamped) },
        },
      };

      return {
        newStatePartial: newState,
        cliRequest: {
          id: 'test-zoom',
          command: 'ptz.zoom',
          params: { value: clamped },
        },
      };
    },
  });

  const store = new PageStore({
    path: 'zcam.camera.pages.main',
    operations: ops,
    cli,
    initialCameraState: {
      ptz: {
        zoom: { value: 10, view: '10' },
      },
    },
  });

  // 初始值为 10
  assert.equal(store.cameraState.ptz?.zoom?.value, 10);

  // 运行 operation: 设置为 80
  await store.runOperation('zcam.camera.pages.main.ptz.zoom', 'ptz.zoom', setZoomOpId, { value: 80 });

  // 应该更新 cameraState
  assert.equal(store.cameraState.ptz?.zoom?.value, 80);
  assert.equal(store.cameraState.ptz?.zoom?.view, '80');
});
