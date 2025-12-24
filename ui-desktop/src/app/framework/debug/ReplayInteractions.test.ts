// 验证 replayInteractions 能按时间窗口重放 slider commit 事件

import '../../../test/setupDom.js';

import test from 'node:test';
import assert from 'node:assert/strict';

import { logInteraction, clearInteractionLogs } from './InteractionLogger.js';
import type { OperationPayload, PageStore } from '../state/PageStore.js';
import { replayInteractions } from './ReplayInteractions.js';

class FakePageStore implements Pick<PageStore, 'runOperation'> {
  public calls: Array<{
    nodePath: string;
    kind: string;
    operationId: string;
    payload: OperationPayload;
  }> = [];

  async runOperation(
    nodePath: string,
    kind: string,
    operationId: string,
    payload: OperationPayload,
  ): Promise<void> {
    this.calls.push({ nodePath, kind, operationId, payload });
  }
}

test('replayInteractions replays slider commits within time range', async () => {
  clearInteractionLogs();

  const path = 'zcam.camera.ptz.zoomTest';

  // 先写一条较早的 commit
  logInteraction({
    source: 'slider',
    path,
    action: 'commit',
    data: {
      value: 1000,
      operationId: 'ptz.setZoom',
      kind: 'ptz.zoom',
      meta: { stepPerInterval: 100, intervalMs: 50 },
    },
  });

  // 写一条无关的事件（不应被回放）
  logInteraction({
    source: 'slider',
    path,
    action: 'startHold',
    data: { direction: 1 },
  });

  // 稍后再写一条 commit
  // 确保时间顺序不同
  await new Promise((resolve) => setTimeout(resolve, 10));

  logInteraction({
    source: 'slider',
    path,
    action: 'commit',
    data: {
      value: 1500,
      operationId: 'ptz.setZoom',
      kind: 'ptz.zoom',
      meta: { stepPerInterval: 200, intervalMs: 50 },
    },
  });

  const store = new FakePageStore();

  // 获取当前日志，计算一个时间窗口，只包含第二个 commit
  const now = Date.now();
  const startTs = now - 5; // 只覆盖“稍后”那条 commit

  const result = await replayInteractions(store as unknown as PageStore, {
    startTs,
  });

  assert.equal(result.count, 1);
  assert.equal(store.calls.length, 1);
  const call = store.calls[0];
  assert.equal(call.nodePath, path);
  assert.equal(call.operationId, 'ptz.setZoom');
  assert.equal(call.kind, 'ptz.zoom');
  assert.equal(call.payload.value, 1500);
  assert.deepEqual(call.payload.params, {
    sliderMeta: { stepPerInterval: 200, intervalMs: 50 },
  });
});

