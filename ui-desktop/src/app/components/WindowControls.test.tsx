import '../../test/setupDom.js';

import assert from 'node:assert/strict';
import test from 'node:test';

import React from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';

import { WindowControls } from './WindowControls.js';
import { UiSceneStore } from '../framework/state/UiSceneStore.js';
import { UiSceneStoreContext } from '../app/contexts.js';

function renderWithStore(store: UiSceneStore) {
  return render(
    <UiSceneStoreContext.Provider value={store}>
      <WindowControls />
    </UiSceneStoreContext.Provider>,
  );
}

test('WindowControls triggers shrink when current mode is main', () => {
  const store = new UiSceneStore({ windowMode: 'main', layoutSize: 'normal' });
  const { getByTitle } = renderWithStore(store);

  const button = getByTitle('缩小成球');
  fireEvent.click(button);

  assert.equal(store.state.windowMode, 'ball');
});

test('WindowControls triggers restore when current mode is ball', () => {
  const store = new UiSceneStore({ windowMode: 'ball', layoutSize: 'studio' });
  const { getByTitle } = renderWithStore(store);

  const button = getByTitle('恢复主窗口');
  fireEvent.click(button);

  assert.equal(store.state.windowMode, 'main');
});

test('WindowControls toggles layout variants via layout button', () => {
  const store = new UiSceneStore({ windowMode: 'main', layoutSize: 'normal' });
  const { getByTitle } = renderWithStore(store);

  const toggle = getByTitle('布局方案 A');
  fireEvent.click(toggle);
  assert.equal(store.state.layoutSize, 'studio');

  fireEvent.click(getByTitle('布局方案 B'));
  assert.equal(store.state.layoutSize, 'normal');
});

test.afterEach(() => {
  cleanup();
});
