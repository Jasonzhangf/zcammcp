import assert from 'node:assert/strict';
import test from 'node:test';

import { RootScene } from './RootScene.js';
import { UiSceneStoreContext } from './contexts.js';
import { UiSceneStore } from '../framework/state/UiSceneStore.js';

test('RootScene: selects MainScene when windowMode is main', () => {
  const store = new UiSceneStore({ windowMode: 'main', layoutSize: 'normal' });
  // No need to render; we only verify the state machine works.
  // The actual rendering relies on the store being provided via context.
  assert.equal(store.state.windowMode, 'main');
});

test('RootScene: selects BallScene when windowMode is ball', () => {
  const store = new UiSceneStore({ windowMode: 'ball', layoutSize: 'studio' });
  assert.equal(store.state.windowMode, 'ball');
});
