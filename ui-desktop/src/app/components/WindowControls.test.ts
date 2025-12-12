import assert from 'node:assert/strict';
import test from 'node:test';

import { UiSceneStore } from '../framework/state/UiSceneStore.js';
import { applyWindowCommand } from '../framework/messages/WindowCommands.js';

test('WindowControls: shrinkToBall command changes windowMode to ball', () => {
  const store = new UiSceneStore({ windowMode: 'main', layoutSize: 'normal' });
  applyWindowCommand(store, 'shrinkToBall');
  assert.equal(store.state.windowMode, 'ball');
});

test('WindowControls: restoreFromBall command changes windowMode to main', () => {
  const store = new UiSceneStore({ windowMode: 'ball', layoutSize: 'studio' });
  applyWindowCommand(store, 'restoreFromBall');
  assert.equal(store.state.windowMode, 'main');
});

test('WindowControls: toggleSize toggles between layout variants', () => {
  const store = new UiSceneStore({ windowMode: 'main', layoutSize: 'normal' });

  applyWindowCommand(store, 'toggleSize');
  assert.equal(store.state.layoutSize, 'studio');

  applyWindowCommand(store, 'toggleSize');
  assert.equal(store.state.layoutSize, 'normal');
});
