import assert from 'node:assert/strict';
import test from 'node:test';

import { UiSceneStore } from '../state/UiSceneStore.js';
import { applyWindowCommand, nextLayoutSize } from './WindowCommands.js';

test('nextLayoutSize cycles normal -> compact -> large -> normal', () => {
  assert.equal(nextLayoutSize('normal'), 'compact');
  assert.equal(nextLayoutSize('compact'), 'large');
  assert.equal(nextLayoutSize('large'), 'normal');
});

test('applyWindowCommand: shrinkToBall sets windowMode to ball', () => {
  const store = new UiSceneStore({ windowMode: 'main', layoutSize: 'normal' });

  applyWindowCommand(store, 'shrinkToBall');

  assert.equal(store.state.windowMode, 'ball');
  assert.equal(store.state.layoutSize, 'normal');
});

test('applyWindowCommand: restoreFromBall sets windowMode to main', () => {
  const store = new UiSceneStore({ windowMode: 'ball', layoutSize: 'compact' });

  applyWindowCommand(store, 'restoreFromBall');

  assert.equal(store.state.windowMode, 'main');
  assert.equal(store.state.layoutSize, 'compact');
});

test('applyWindowCommand: toggleSize uses nextLayoutSize', () => {
  const store = new UiSceneStore({ windowMode: 'main', layoutSize: 'normal' });

  applyWindowCommand(store, 'toggleSize');
  assert.equal(store.state.layoutSize, 'compact');

  applyWindowCommand(store, 'toggleSize');
  assert.equal(store.state.layoutSize, 'large');
});
