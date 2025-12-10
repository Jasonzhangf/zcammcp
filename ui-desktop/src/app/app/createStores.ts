import { OperationRegistry } from '../framework/operations/OperationRegistry.js';
import { MockCliChannel } from '../framework/transport/CliChannel.js';
import { PageStore, type CameraState } from '../framework/state/PageStore.js';
import { UiSceneStore, type UiSceneState } from '../framework/state/UiSceneStore.js';
import { ptzOperations } from '../app/operations/ptzOperations.js';
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
      zoom: { value: 50, view: '50' },
      speed: { value: 50, view: '50' },
      focus: { value: 40, view: '40' },
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

  const cli = new MockCliChannel();

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
