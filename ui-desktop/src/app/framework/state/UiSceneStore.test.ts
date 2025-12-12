import assert from 'node:assert/strict';
import test from 'node:test';

import { UiSceneStore, type UiSceneState } from './UiSceneStore.js';

test('UiSceneStore stores initial snapshot', () => {
  const initial: UiSceneState = { windowMode: 'main', layoutSize: 'normal' };
  const store = new UiSceneStore(initial);

  assert.equal(store.state.windowMode, 'main');
  assert.equal(store.state.layoutSize, 'normal');
});

test('UiSceneStore notifies subscribers when state mutates', () => {
  const store = new UiSceneStore({ windowMode: 'main', layoutSize: 'normal' });
  let calls = 0;

  store.subscribe((state) => {
    calls += 1;
    assert.equal(state.layoutSize, 'studio');
  });

  store.update({ layoutSize: 'studio' });
  assert.equal(calls, 1);
  assert.equal(store.state.layoutSize, 'studio');
});
