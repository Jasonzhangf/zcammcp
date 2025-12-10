import React from 'react';
import ReactDOM from 'react-dom/client';

import { PageStoreContext, UiSceneStoreContext } from './app/contexts.js';
import { createPageStore, createUiSceneStore } from './app/createStores.js';
import { RootScene } from './app/RootScene.js';

import '../styles/main.css';

const rootEl = document.getElementById('root');

if (rootEl) {
  const root = ReactDOM.createRoot(rootEl);
  const pageStore = createPageStore();
  const uiSceneStore = createUiSceneStore();

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
