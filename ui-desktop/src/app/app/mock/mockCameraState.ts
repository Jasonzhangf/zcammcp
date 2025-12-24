import type { PageStore, CameraState } from '../../framework/state/PageStore.js';
import type { MockCameraDevice } from './MockCameraDevice.js';

export function startMockCameraState(store: PageStore, device: MockCameraDevice) {
  const pushSnapshot = (snapshot: CameraState) => {
    store.applyCameraState(snapshot);
    if (typeof window !== 'undefined' && window.electronAPI?.pushState) {
      void window.electronAPI.pushState('camera', snapshot);
    }
  };
  const unsubscribe = device.subscribe((snapshot: CameraState) => {
    pushSnapshot(snapshot);
  });
  // æŽ¨é€ä¸€æ¬¡åˆå§‹çŠ¶æ€ï¼Œç¡®ä¿ UI ä¸?mock è®¾å¤‡åŒæ­¥
  pushSnapshot(device.getState());
  return () => {
    unsubscribe();
    device.dispose();
  };
}
