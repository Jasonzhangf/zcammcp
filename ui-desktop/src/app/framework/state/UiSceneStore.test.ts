import assert from 'node:assert/strict';
import test from 'node:test';

import { UiSceneStore, type UiSceneState } from './UiSceneStore.js';

test('UiSceneStore: stores initial state as-is', () => {
  const initial: UiSceneState = { windowMode: 'main', layoutSize: 'normal' };
  const store = new UiSceneStore(initial);

  assert.equal(store.state.windowMode, 'main');
  assert.equal(store.state.layoutSize, 'normal');
});
