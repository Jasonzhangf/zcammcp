import '../../test/setupDom.js';

import assert from 'node:assert/strict';
import test from 'node:test';

import React from 'react';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';

import { MainScene } from '../pages/main-scene/index.js';
import { RootScene } from './RootScene.js';
import { UiSceneStore } from '../framework/state/UiSceneStore.js';
import { UiSceneStoreContext, PageStoreContext } from './contexts.js';
import { createPageStore } from './createStores.js';
import type { PageStore } from '../framework/state/PageStore.js';

function withProviders(children: React.ReactNode, uiStore: UiSceneStore, pageStore?: PageStore) {
  const store = pageStore ?? createPageStore();
  return (
    <UiSceneStoreContext.Provider value={uiStore}>
      <PageStoreContext.Provider value={store}>{children}</PageStoreContext.Provider>
    </UiSceneStoreContext.Provider>
  );
}

function getShellElement(): HTMLElement {
  const el = document.querySelector('[data-path="ui.window.shell"]');
  if (!el) {
    throw new Error('ui.window.shell not rendered');
  }
  return el as HTMLElement;
}

test('MainScene layout attribute toggles between layout variants', async () => {
  const store = new UiSceneStore({ windowMode: 'main', layoutSize: 'normal' });
  const { getByTitle } = render(withProviders(<MainScene />, store));

  assert.equal(getShellElement().getAttribute('data-layout'), 'normal');

  fireEvent.click(getByTitle('布局方案 A'));
  await waitFor(() => assert.equal(getShellElement().getAttribute('data-layout'), 'studio'));

  fireEvent.click(getByTitle('布局方案 B'));
  await waitFor(() => assert.equal(getShellElement().getAttribute('data-layout'), 'normal'));
});

test('RootScene switches windowMode to ball via control button', async () => {
  const store = new UiSceneStore({ windowMode: 'main', layoutSize: 'normal' });
  const { getAllByTitle } = render(withProviders(<RootScene />, store));

  fireEvent.click(getAllByTitle('缩小成球')[0]);

  await waitFor(() => {
    assert.equal(store.state.windowMode, 'ball');
  });

  fireEvent.click(getAllByTitle('恢复主窗口')[0]);
  await waitFor(() => {
    assert.equal(store.state.windowMode, 'main');
  });
});

test.afterEach(() => {
  cleanup();
});
