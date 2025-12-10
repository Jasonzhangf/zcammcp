import assert from 'node:assert/strict';
import test from 'node:test';

import React from 'react';
import { render, fireEvent } from '@testing-library/react';

import { WindowControls } from './WindowControls.js';
import { UiSceneStore } from '../framework/state/UiSceneStore.js';
import { UiSceneStoreContext } from '../app/contexts.js';

function renderWithScene(store: UiSceneStore) {
  return render(
    <UiSceneStoreContext.Provider value={store}>
      <WindowControls />
    </UiSceneStoreContext.Provider>
  );
}

test('WindowControls: ball button calls shrinkToBall when in main mode', () => {
  const store = new UiSceneStore({ windowMode: 'main', layoutSize: 'normal' });
  const { getByTitle } = renderWithScene(store);

  const btn = getByTitle('缩小成球');
  fireEvent.click(btn);

  assert.equal(store.state.windowMode, 'ball');
});

test('WindowControls: ball button calls restoreFromBall when in ball mode', () => {
  const store = new UiSceneStore({ windowMode: 'ball', layoutSize: 'compact' });
  const { getByTitle } = renderWithScene(store);

  const btn = getByTitle('恢复主窗口');
  fireEvent.click(btn);

  assert.equal(store.state.windowMode, 'main');
});

test('WindowControls: size button cycles layoutSize', () => {
  const store = new UiSceneStore({ windowMode: 'main', layoutSize: 'normal' });
  const { getByTitle } = renderWithScene(store);

  const btn = getByTitle('切换尺寸');
  fireEvent.click(btn);
  assert.equal(store.state.layoutSize, 'compact');

  fireEvent.click(btn);
  assert.equal(store.state.layoutSize, 'large');

  fireEvent.click(btn);
  assert.equal(store.state.layoutSize, 'normal');
});
