import type { PageStore, CameraState } from '../../framework/state/PageStore.js';
import type { MockCameraDevice } from './MockCameraDevice.js';
import { saveMockCameraState } from './MockCameraPersistence.js';

export function startMockCameraState(store: PageStore, device: MockCameraDevice) {
  const pushSnapshot = (snapshot: CameraState) => {
    store.applyCameraState(snapshot);
    if (typeof window !== 'undefined' && window.electronAPI?.pushState) {
      void window.electronAPI.pushState('camera', snapshot);
    }
    saveMockCameraState(snapshot);
  };

  const unsubscribe = device.subscribe((snapshot: CameraState) => {
    pushSnapshot(snapshot);
  });

  // 初始同步一次 mock 设备状态到 UI（包括本地持久化）
  pushSnapshot(device.getState());

  return () => {
    unsubscribe();
    device.dispose();
  };
}

