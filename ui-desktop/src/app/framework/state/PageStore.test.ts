// PageStore.test.ts
// 使用 Node 内置 test runner 的简单单��测试, 验证 PageStore 与 OperationRegistry/CliChannel 协同工作

import test from 'node:test';
import assert from 'node:assert';
import { PageStore, type CameraState, type OperationContext, type OperationPayload, type OperationResult, type CliRequest } from './PageStore.js';
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

  // newStatePartial 立即写回 cameraState
  assert.equal(store.cameraState.ptz?.zoom?.value, 80);
  assert.equal(store.cameraState.ptz?.zoom?.view, '80');

  const requests = cli.getRequests();
  assert.equal(requests.length, 1);
  assert.equal(requests[0].command, 'ptz.zoom');
});

test('clearActiveNode clears active highlight and activeNodePath', () => {
  const ops = new OperationRegistry();
  const cli = new MockCliChannel();
  
  const store = new PageStore({
    path: 'test',
    operations: ops,
    cli,
    initialUiState: {
      selectedNodes: [],
      debugMode: 'normal',
      highlightMap: {
        'node1': 'active',
        'node2': 'hover',
      },
      activeNodePath: 'node1',
      layoutMode: 'full',
    },
  });

  // 验证初始状态
  assert.equal(store.uiState.activeNodePath, 'node1');
  assert.equal(store.uiState.highlightMap['node1'], 'active');
  assert.equal(store.uiState.highlightMap['node2'], 'hover');

  // 清除 active node
  store.clearActiveNode();

  // 验证清除后状态
  assert.equal(store.uiState.activeNodePath, undefined);
  assert.equal(store.uiState.highlightMap['node1'], undefined);
  assert.equal(store.uiState.highlightMap['node2'], 'hover'); // 其他高亮保持
});

test('setLayoutMode with same value does not trigger notification', () => {
  const ops = new OperationRegistry();
  const cli = new MockCliChannel();
  
  let notificationCount = 0;
  
  const store = new PageStore({
    path: 'test',
    operations: ops,
    cli,
    initialUiState: {
      selectedNodes: [],
      debugMode: 'normal',
      highlightMap: {},
      layoutMode: 'full',
    },
  });

  // 订阅状态变化
  store.subscribe(() => {
    notificationCount++;
  });

  // 设置相同值
  store.setLayoutMode('full');

  // 验证不会触发通知
  assert.equal(notificationCount, 0);
  assert.equal(store.uiState.layoutMode, 'full');
});

test('setLayoutMode with different value triggers notification', () => {
  const ops = new OperationRegistry();
  const cli = new MockCliChannel();
  
  let notificationCount = 0;
  
  const store = new PageStore({
    path: 'test',
    operations: ops,
    cli,
    initialUiState: {
      selectedNodes: [],
      debugMode: 'normal',
      highlightMap: {},
      layoutMode: 'full',
    },
  });

  store.subscribe(() => {
    notificationCount++;
  });

  // 设置不同值
  store.setLayoutMode('compact');

  // 验证触发通知
  assert.equal(notificationCount, 1);
  assert.equal(store.uiState.layoutMode, 'compact');
});

test('runOperation sends cliRequest and cliRequests in order', async () => {
  const ops = new OperationRegistry();
  const cli = new MockCliChannel();
  
  ops.register({
    id: 'multi.cli.test',
    cliCommand: 'test',
    async handler(): Promise<OperationResult> {
      return {
        cliRequest: {
          id: 'single-request',
          command: 'first',
        },
        cliRequests: [
          {
            id: 'multi-request-1',
            command: 'second',
          },
          {
            id: 'multi-request-2',
            command: 'third',
          },
        ],
      };
    },
  });

  const store = new PageStore({
    path: 'test',
    operations: ops,
    cli,
  });

  await store.runOperation('test.node', 'test', 'multi.cli.test', {});

  const requests = cli.getRequests();
  
  // cliRequest 在前, cliRequests 在后
  assert.equal(requests.length, 3);
  assert.equal(requests[0].command, 'first');
  assert.equal(requests[1].command, 'second');
  assert.equal(requests[2].command, 'third');
});

test('runOperation handles only cliRequest', async () => {
  const ops = new OperationRegistry();
  const cli = new MockCliChannel();
  
  ops.register({
    id: 'single.cli.only',
    cliCommand: 'test',
    async handler(): Promise<OperationResult> {
      return {
        cliRequest: {
          id: 'only-request',
          command: 'single',
        },
      };
    },
  });

  const store = new PageStore({
    path: 'test',
    operations: ops,
    cli,
  });

  await store.runOperation('test.node', 'test', 'single.cli.only', {});

  const requests = cli.getRequests();
  assert.equal(requests.length, 1);
  assert.equal(requests[0].command, 'single');
});

test('runOperation handles only cliRequests array', async () => {
  const ops = new OperationRegistry();
  const cli = new MockCliChannel();
  
  ops.register({
    id: 'multi.cli.only',
    cliCommand: 'test',
    async handler(): Promise<OperationResult> {
      return {
        cliRequests: [
          { id: 'r1', command: 'first' },
          { id: 'r2', command: 'second' },
        ],
      };
    },
  });

  const store = new PageStore({
    path: 'test',
    operations: ops,
    cli,
  });

  await store.runOperation('test.node', 'test', 'multi.cli.only', {});

  const requests = cli.getRequests();
  assert.equal(requests.length, 2);
  assert.equal(requests[0].command, 'first');
  assert.equal(requests[1].command, 'second');
});

test('subscribe returns unsubscribe function', () => {
  const ops = new OperationRegistry();
  const cli = new MockCliChannel();
  
  const store = new PageStore({
    path: 'test',
    operations: ops,
    cli,
  });

  let callCount = 0;
  const unsubscribe = store.subscribe(() => {
    callCount++;
  });

  store.setLayoutMode('compact');
  assert.equal(callCount, 1);

  unsubscribe();

  store.setLayoutMode('ball');
  assert.equal(callCount, 1); // 取消订阅后不再触发
});
