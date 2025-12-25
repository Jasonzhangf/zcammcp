import type { CameraState } from '../../framework/state/PageStore.js';

const STORAGE_KEY = 'zcam.mockCameraState.v1';

export function loadMockCameraState(defaultState: CameraState): CameraState {
  if (typeof window === 'undefined' || !('localStorage' in window)) {
    return defaultState;
  }
  try {
    const storage = window.localStorage;
    if (!storage) return defaultState;
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw) as { cameraState?: CameraState } | CameraState;
    const persisted: CameraState | undefined =
      parsed && 'cameraState' in parsed
        ? (parsed.cameraState as CameraState | undefined)
        : (parsed as CameraState | undefined);
    if (!persisted || typeof persisted !== 'object') {
      return defaultState;
    }
    return mergeCameraState(defaultState, persisted);
  } catch {
    return defaultState;
  }
}

export function saveMockCameraState(state: CameraState): void {
  if (typeof window === 'undefined' || !('localStorage' in window)) {
    return;
  }
  try {
    const payload = JSON.stringify({ cameraState: state });
    window.localStorage.setItem(STORAGE_KEY, payload);
  } catch {
    // ignore persistence errors in mock environment
  }
}

function mergeCameraState(base: CameraState, persisted: CameraState): CameraState {
  const next: CameraState = { ...base };
  if (persisted.ptz) {
    next.ptz = { ...(base.ptz ?? {}), ...persisted.ptz };
  }
  if (persisted.exposure) {
    next.exposure = { ...(base.exposure ?? {}), ...persisted.exposure };
  }
  if (persisted.whiteBalance) {
    next.whiteBalance = { ...(base.whiteBalance ?? {}), ...persisted.whiteBalance };
  }
  if (persisted.image) {
    next.image = { ...(base.image ?? {}), ...persisted.image };
  }
  return next;
}

