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
    if (state.layoutSize === 'normal' || state.layoutSize === 'studio' || state.layoutSize === 'ptz') {
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

      const result: any = {
        value: numeric,
        view: entry.view ?? String(numeric),
      };

      const extract = (key: string) => {
        // Priority: entry[key] -> entry.raw[key] -> entry.w[key]
        if (typeof entry[key] === 'number') return entry[key];
        if (entry.raw && typeof entry.raw[key] === 'number') return entry.raw[key];
        if (entry.w && typeof entry.w[key] === 'number') return entry.w[key];
        return undefined;
      };

      const min = extract('min');
      const max = extract('max');
      const step = extract('step');

      if (min !== undefined) result.min = min;
      if (max !== undefined) result.max = max;
      if (step !== undefined) result.step = step;

      return result;
    };
    const pan = mapEntry(camera.ptz.pan);
    if (pan) next.ptz.pan = pan;
    const tilt = mapEntry(camera.ptz.tilt);
    if (tilt) next.ptz.tilt = tilt;
    const zoom = mapEntry(camera.ptz.zoom);
    if (zoom) next.ptz.zoom = zoom;

    // Check both standard ptz.focus and raw lens_focus_pos
    const rawFocus = camera.ptz.focus ?? camera['lens_focus_pos'];
    const focus = mapEntry(rawFocus);
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

  if (camera.exposure) {
    next.exposure = { ...(next.exposure ?? {}) };
    if (typeof camera.exposure.aeEnabled !== 'undefined') {
      next.exposure.aeEnabled = Boolean(camera.exposure.aeEnabled);
    }
    const mapShutter = (entry: any) => {
      const value = entry?.value ?? entry;
      const view = entry?.view ?? String(value);
      const options = Array.isArray(entry?.w?.opts ?? entry?.opts) ? (entry?.w?.opts ?? entry?.opts).map(String) : undefined;

      const isValid = (typeof value === 'number' && Number.isFinite(value)) || (typeof value === 'string' && value.length > 0);
      return isValid ? { value, view, options } : undefined;
    };
    if (camera.exposure.shutter) {
      const shutter = mapShutter(camera.exposure.shutter);
      if (shutter) next.exposure.shutter = shutter;
    }
    const mapIso = (entry: any) => {
      // ISO can be string (e.g. "Auto", "Native") or number
      if (!entry) return undefined;
      const value = String(entry.value ?? entry);
      const view = entry.view ?? value;
      const options = Array.isArray(entry.opts) ? entry.opts.map(String) : undefined;
      return { value, view, options };
    };
    if (camera.exposure.iso) {
      const iso = mapIso(camera.exposure.iso);
      if (iso) next.exposure.iso = iso;
    }
  }

  if (camera.whiteBalance) {
    next.whiteBalance = {};

    // Map AWB enabled state
    if (typeof camera.whiteBalance.awbEnabled !== 'undefined') {
      next.whiteBalance.awbEnabled = Boolean(camera.whiteBalance.awbEnabled);
    }

    // Map temperature from camera.whiteBalance.temperature
    const tempEntry = camera.whiteBalance.temperature;
    if (tempEntry) {
      const value = typeof tempEntry.value !== 'undefined' ? tempEntry.value : tempEntry;
      const numeric = Number(value);

      console.log('[WB Mapping] tempEntry:', tempEntry);
      console.log('[WB Mapping] tempEntry.min:', tempEntry.min);
      console.log('[WB Mapping] tempEntry.max:', tempEntry.max);
      console.log('[WB Mapping] tempEntry.w:', tempEntry.w);

      if (Number.isFinite(numeric)) {
        // Extract min/max/step from tempEntry or tempEntry.w or tempEntry.raw
        const extractNumber = (key: string) => {
          if (typeof tempEntry[key] === 'number') return tempEntry[key];
          if (tempEntry.w && typeof tempEntry.w[key] === 'number') return tempEntry.w[key];
          if (tempEntry.raw && typeof tempEntry.raw[key] === 'number') return tempEntry.raw[key];
          return undefined;
        };

        const min = extractNumber('min');
        const max = extractNumber('max');
        const step = extractNumber('step');

        console.log('[WB Mapping] Extracted min/max/step:', min, max, step);

        next.whiteBalance.temperature = {
          value: numeric,
          view: tempEntry.view ?? `${numeric}K`,
          min,
          max,
          step,
        };
      }
    }
  }

  if (snapshot.devices) {
    next.devices = snapshot.devices;
  }

  if (camera.recording) {
    next.recording = {};
    if (camera.recording.remain) {
      const entry = camera.recording.remain;
      const rawValue = typeof entry.value !== 'undefined' ? entry.value : entry;
      // rawValue is expected to be a JSON string like {"code":0,"desc":"77","msg":"3717"}
      try {
        const parsed = typeof rawValue === 'string' && rawValue.startsWith('{') ? JSON.parse(rawValue) : rawValue;

        // Pass the raw parsed object to the view state
        next.recording.remain = {
          value: rawValue,
          view: rawValue,
          raw: parsed,
          duration: entry.duration,
          remaining: entry.remaining
        };
      } catch (e) {
        console.warn('Failed to parse recording remain value:', rawValue);
        next.recording.remain = {
          value: rawValue,
          view: rawValue
        };
      }
    }

    if (camera.recording.stream_status) {
      const entry = camera.recording.stream_status;
      const rawValue = typeof entry.value !== 'undefined' ? entry.value : entry;
      next.recording.streamStatus = {
        value: rawValue,
        view: String(rawValue),
        raw: entry.w
      };
    }
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
