import React from 'react';
import ReactDOM from 'react-dom/client';

import { PageStoreContext, UiSceneStoreContext } from './app/contexts.js';
import { createPageStore, createUiSceneStore } from './app/createStores.js';
import type { UiSceneStore } from './framework/state/UiSceneStore.js';
import { RootScene } from './app/RootScene.js';

import '../styles/main.css';

function attachUiStateReporter(store: UiSceneStore) {
  if (typeof window === 'undefined') {
    return;
  }

  const api = window.electronAPI;
  const pushState = api?.pushState;
  if (!api || !pushState) {
    return;
  }

  const pushSnapshot = () => {
    try {
      void pushState.call(api, 'ui', {
        windowMode: store.state.windowMode,
        layoutSize: store.state.layoutSize,
      });
    } catch {
      // ignore telemetry failures
    }
  };

  store.subscribe(() => pushSnapshot());
  pushSnapshot();
}

const rootEl = document.getElementById('root');

if (rootEl) {
  const root = ReactDOM.createRoot(rootEl);
  const pageStore = createPageStore();
  const uiSceneStore = createUiSceneStore();
  attachUiStateReporter(uiSceneStore);

  root.render(
    <React.StrictMode>
      <UiSceneStoreContext.Provider value={uiSceneStore}>
        <PageStoreContext.Provider value={pageStore}>
          <RootScene />
        </PageStoreContext.Provider>
      </UiSceneStoreContext.Provider>
    </React.StrictMode>,
  );
}
