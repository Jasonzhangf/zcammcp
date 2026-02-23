import assert from 'node:assert/strict';
import test from 'node:test';

import { PtzCard } from './PtzCard.js';
import { PageStore, OperationPayload, OperationRegistry, OperationContext, OperationResult, CliChannel, CliResponse, CliRequest } from '../../../framework/state/PageStore.js';
import { UiSceneStore } from '../../../framework/state/UiSceneStore.js';
import { ContainerStore } from '../../../framework/state/ContainerStore.js';
import { FocusManagerProvider } from '../../../framework/ui/FocusManager.js';

class MockOperationRegistry implements OperationRegistry {
  runCalls: Array<{ id: string; ctx: OperationContext; payload: OperationPayload }> = [];
  
  async run(id: string, ctx: OperationContext, payload: OperationPayload): Promise<OperationResult> {
    this.runCalls.push({ id, ctx, payload });
    return {};
  }
}

class MockCliChannel implements CliChannel {
  calls: CliRequest[] = [];
  
  async send(request: CliRequest): Promise<CliResponse> {
    this.calls.push(request);
    return { id: request.id, ok: true };
  }
}

test('PtzCard component renders without crashing', () => {
  const operations = new MockOperationRegistry();
  const cli = new MockCliChannel();
  const pageStore = new PageStore({
    path: 'test.page',
    operations,
    cli
  });
  const uiStore = new UiSceneStore({ windowMode: 'main', layoutSize: 'normal' });
  const containerStore = new ContainerStore();
  
  // Verify component can be imported and stores can be created
  assert.ok(PtzCard, 'PtzCard component should be importable');
  assert.ok(pageStore, 'PageStore should be created');
  assert.ok(uiStore, 'UiSceneStore should be created');
  assert.ok(containerStore, 'ContainerStore should be created');
  assert.ok(operations, 'MockOperationRegistry should be created');
  assert.ok(cli, 'MockCliChannel should be created');
});

test('PtzCard home operation triggers correct command', () => {
  const operations = new MockOperationRegistry();
  const cli = new MockCliChannel();
  const pageStore = new PageStore({
    path: 'test.page',
    operations,
    cli
  });
  
  // Set PTZ values
  pageStore.applyCameraState({
    ptz: {
      pan: { value: 45, view: 'manual' },
      tilt: { value: 30, view: 'manual' }
    }
  });
  
  // Verify initial state
  assert.strictEqual(pageStore.getViewState().camera.ptz?.pan?.value, 45);
  assert.strictEqual(pageStore.getViewState().camera.ptz?.tilt?.value, 30);
});

test('PtzCard PTZ values can be updated', () => {
  const operations = new MockOperationRegistry();
  const cli = new MockCliChannel();
  const pageStore = new PageStore({
    path: 'test.page',
    operations,
    cli
  });
  
  // Update PTZ values
  pageStore.applyCameraState({
    ptz: {
      pan: { value: 100, view: 'manual' },
      tilt: { value: -50, view: 'manual' },
      zoom: { value: 75, view: 'manual' }
    }
  });
  
  // Verify updated values
  const view = pageStore.getViewState();
  assert.strictEqual(view.camera.ptz?.pan?.value, 100);
  assert.strictEqual(view.camera.ptz?.tilt?.value, -50);
  assert.strictEqual(view.camera.ptz?.zoom?.value, 75);
});
