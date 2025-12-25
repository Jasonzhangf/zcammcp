import React from 'react';
import ReactDOM from 'react-dom/client';
import { ContainerStoreContext, PageStoreContext, UiSceneStoreContext } from './app/contexts.js';
import { createContainerStore, createPageStore, createUiSceneStore, shouldUseMockApi } from './app/createStores.js';
import { startMockCameraState } from './app/mock/mockCameraState.js';
import type { UiSceneState, UiSceneStore } from './framework/state/UiSceneStore.js';
import type { CameraState, PageStore } from './framework/state/PageStore.js';
import { RootScene } from './app/RootScene.js';
import { FocusManagerProvider } from './framework/ui/FocusManager.js';
import { installTestHarness } from './app/TestHarness.js';

import '../styles/main.css';

if (typeof document !== 'undefined' && document.body) {
  document.body.style.margin = '0';
  document.body.style.padding = '0';
  document.body.style.background = '#151515';
}

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

function attachWindowStateBridge(store: UiSceneStore) {
  if (typeof window === 'undefined') {
    return;
  }
  const api = window.electronAPI;
  const subscribe = api?.onWindowState;
  if (!api || !subscribe) {
    return;
  }

  subscribe((state) => {
    if (!state) return;
    const patch: Partial<UiSceneState> = {};
    if (state.mode === 'ball' || state.mode === 'main') {
      patch.windowMode = state.mode;
    }
    if (state.layoutSize === 'normal' || state.layoutSize === 'studio') {
      patch.layoutSize = state.layoutSize;
    }
    if (Object.keys(patch).length > 0) {
      store.update(patch);
    }
  });
}

function attachCameraStateBridge(store: PageStore) {
  if (typeof window === 'undefined') {
    return;
  }
  const api = window.electronAPI;
  const subscribe = api?.onCameraState;
  if (!api || !subscribe) {
    return;
  }

  subscribe((snapshot) => {
    const mapped = mapCameraSnapshot(snapshot);
    if (mapped) {
      store.applyCameraState(mapped);
    }
  });
}

function mapCameraSnapshot(snapshot: any): CameraState | null {
  if (!snapshot) return null;
  const camera = snapshot.camera ?? snapshot;
  if (!camera) return null;

  const next: CameraState = {};

  if (camera.ptz) {
    next.ptz = {};
    const mapEntry = (entry: any) => {
      if (!entry) return undefined;
      const rawValue = typeof entry.value !== 'undefined' ? entry.value : entry;
      const numeric = Number(rawValue);
      if (!Number.isFinite(numeric)) return undefined;
      return {
        value: numeric,
        view: entry.view ?? String(numeric),
      };
    };
    const pan = mapEntry(camera.ptz.pan);
    if (pan) next.ptz.pan = pan;
    const tilt = mapEntry(camera.ptz.tilt);
    if (tilt) next.ptz.tilt = tilt;
    const zoom = mapEntry(camera.ptz.zoom);
    if (zoom) next.ptz.zoom = zoom;
    const focus = mapEntry(camera.ptz.focus);
    if (focus) next.ptz.focus = focus;
  }

  if (camera.image) {
    next.image = { ...(next.image ?? {}) };
    const assignImageValue = (field: 'brightness' | 'contrast' | 'saturation' | 'sharpness' | 'hue' | 'gamma') => {
      const entry = camera.image[field];
      if (!entry) return;
      const rawValue = typeof entry.value !== 'undefined' ? entry.value : entry;
      const numeric = Number(rawValue);
      if (Number.isFinite(numeric)) {
        next.image![field] = numeric;
      }
    };
    assignImageValue('brightness');
    assignImageValue('contrast');
    assignImageValue('saturation');
    assignImageValue('sharpness');
    assignImageValue('hue');
    assignImageValue('gamma');
  }

  return Object.keys(next).length > 0 ? next : null;
}

const rootEl = document.getElementById('root');

if (rootEl) {
  const root = ReactDOM.createRoot(rootEl);
  const useMockApi = shouldUseMockApi();
  const { store: pageStore, mockDevice } = createPageStore({ useMockApi });
  const uiSceneStore = createUiSceneStore();
  const containerStore = createContainerStore();
  attachUiStateReporter(uiSceneStore);
  if (useMockApi && mockDevice) {
    const stop = startMockCameraState(pageStore, mockDevice);
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => stop?.());
    }
  } else {
    attachCameraStateBridge(pageStore);
  }
  attachWindowStateBridge(uiSceneStore);
  installTestHarness({ store: pageStore });

  root.render(
    <React.StrictMode>
      <FocusManagerProvider>
        <ContainerStoreContext.Provider value={containerStore}>
          <UiSceneStoreContext.Provider value={uiSceneStore}>
            <PageStoreContext.Provider value={pageStore}>
              <RootScene />
            </PageStoreContext.Provider>
          </UiSceneStoreContext.Provider>
        </ContainerStoreContext.Provider>
      </FocusManagerProvider>
    </React.StrictMode>,
  );
}

