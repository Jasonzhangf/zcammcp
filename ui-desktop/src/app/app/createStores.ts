import { OperationRegistry } from '../framework/operations/OperationRegistry.js';
import { MockCliChannel } from '../framework/transport/CliChannel.js';
import { RealCliChannel } from '../framework/transport/RealCliChannel.js';
import { HttpCliChannel } from '../framework/transport/HttpCliChannel.js';
import { PageStore, type CameraState } from '../framework/state/PageStore.js';
import { UiSceneStore, type UiSceneState } from '../framework/state/UiSceneStore.js';
import { ContainerStore } from '../framework/state/ContainerStore.js';
import { attachContainerPersistence } from '../framework/state/ContainerPersistence.js';
import { ptzOperations, PTZ_FOCUS_RANGE, PTZ_ZOOM_RANGE } from '../app/operations/ptzOperations.js';
import { exposureOperations } from '../app/operations/exposureOperations.js';
import { whiteBalanceOperations } from '../app/operations/whiteBalanceOperations.js';
import { imageOperations } from '../app/operations/imageOperations.js';

export function createPageStore(): PageStore {
  const ops = new OperationRegistry();

  for (const def of [...ptzOperations, ...exposureOperations, ...whiteBalanceOperations, ...imageOperations]) {
    ops.register(def);
  }

  const initialCameraState: CameraState = {
    ptz: {
      pan: { value: 0, view: '0' },
      tilt: { value: 0, view: '0' },
      zoom: { value: PTZ_ZOOM_RANGE.min, view: String(PTZ_ZOOM_RANGE.min) },
      speed: { value: 50, view: '50' },
      focus: { value: PTZ_FOCUS_RANGE.min, view: String(PTZ_FOCUS_RANGE.min) },
    },
    exposure: {
      aeEnabled: true,
      shutter: { value: 60, view: '1/60' },
      iso: { value: 800, view: '800' },
    },
    whiteBalance: {
      awbEnabled: true,
      temperature: { value: 5600, view: '5600K' },
    },
    image: {
      brightness: 50,
      contrast: 50,
      saturation: 50,
    },
  };

  const cli = createCliChannel(shouldUseMockApi());

  return new PageStore({
    path: 'zcam.camera.pages.main',
    operations: ops,
    cli,
    initialCameraState,
  });
}

export function createUiSceneStore(): UiSceneStore {
  const initial: UiSceneState = {
    windowMode: 'main',
    layoutSize: 'normal',
  };

  return new UiSceneStore(initial);
}

export function createContainerStore(): ContainerStore {
  const store = new ContainerStore();
  store.register({
    id: 'page.root',
    kind: 'page',
    bounds: { x: 0, y: 0, width: 100, height: 100 },
    visible: true,
    ui: {},
    data: {},
    errors: [],
    updatedAt: Date.now(),
  });
  attachContainerPersistence(store);
  return store;
}

function createCliChannel(useMock: boolean) {
  if (useMock) {
    return new MockCliChannel();
  }
  if (typeof window !== 'undefined') {
    if (window.electronAPI?.runCliCommand) {
      return new RealCliChannel();
    }
    return new HttpCliChannel();
  }
  return new MockCliChannel();
}

export function shouldUseMockApi(): boolean {
  if (typeof window !== 'undefined' && typeof window.__ZCAM_USE_MOCK_API__ !== 'undefined') {
    return Boolean(window.__ZCAM_USE_MOCK_API__);
  }
  try {
    const env = (import.meta as unknown as { env?: Record<string, unknown> })?.env;
    if (env && typeof env.VITE_ZCAM_USE_MOCK_API === 'string') {
      return env.VITE_ZCAM_USE_MOCK_API.toLowerCase() === 'true';
    }
  } catch {
    // ignore when import.meta not available
  }
  return true;
}
