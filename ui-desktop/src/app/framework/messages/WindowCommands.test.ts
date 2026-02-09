import assert from 'node:assert/strict';
import test from 'node:test';

import { UiSceneStore } from '../state/UiSceneStore.js';
import { applyWindowCommand, nextLayoutSize } from './WindowCommands.js';

test('nextLayoutSize cycles through normal/studio/ptz', () => {
  assert.equal(nextLayoutSize('normal'), 'studio');
  assert.equal(nextLayoutSize('studio'), 'ptz');
  assert.equal(nextLayoutSize('ptz'), 'normal');
});

test('applyWindowCommand: shrinkToBall sets windowMode to ball', () => {
  const store = new UiSceneStore({ windowMode: 'main', layoutSize: 'normal' });

  applyWindowCommand(store, 'shrinkToBall');

  assert.equal(store.state.windowMode, 'ball');
  assert.equal(store.state.layoutSize, 'normal');
});

test('applyWindowCommand: restoreFromBall sets windowMode to main', () => {
  const store = new UiSceneStore({ windowMode: 'ball', layoutSize: 'studio' });

  applyWindowCommand(store, 'restoreFromBall');

  assert.equal(store.state.windowMode, 'main');
  assert.equal(store.state.layoutSize, 'studio');
});

test('applyWindowCommand: toggleSize uses nextLayoutSize', () => {
  const store = new UiSceneStore({ windowMode: 'main', layoutSize: 'normal' });

  applyWindowCommand(store, 'toggleSize');
  assert.equal(store.state.layoutSize, 'studio');

  applyWindowCommand(store, 'toggleSize');
  assert.equal(store.state.layoutSize, 'ptz');

  applyWindowCommand(store, 'toggleSize');
  assert.equal(store.state.layoutSize, 'normal');
});
