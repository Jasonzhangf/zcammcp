import type { CameraState, PageStore } from '../../framework/state/PageStore.js';

const MOCK_STATES: CameraState[] = [
  {
    ptz: {
      pan: { value: -30, view: '-30' },
      tilt: { value: 10, view: '10' },
      zoom: { value: 2500, view: '2500' },
      focus: { value: 200, view: '200' },
      speed: { value: 40, view: '40' },
    },
    exposure: {
      aeEnabled: true,
      shutter: { value: 60, view: '1/60' },
      iso: { value: 400, view: '400' },
    },
    whiteBalance: {
      awbEnabled: true,
      temperature: { value: 5200, view: '5200K' },
    },
    image: {
      brightness: 55,
      contrast: 55,
      saturation: 60,
    },
  },
  {
    ptz: {
      pan: { value: 15, view: '15' },
      tilt: { value: -5, view: '-5' },
      zoom: { value: 8000, view: '8000' },
      focus: { value: 600, view: '600' },
      speed: { value: 60, view: '60' },
    },
    exposure: {
      aeEnabled: false,
      shutter: { value: 120, view: '1/120' },
      iso: { value: 200, view: '200' },
    },
    whiteBalance: {
      awbEnabled: false,
      temperature: { value: 4500, view: '4500K' },
    },
    image: {
      brightness: 45,
      contrast: 65,
      saturation: 55,
    },
  },
];

export function startMockCameraState(
  store: PageStore,
  options?: { autoCycle?: boolean; intervalMs?: number },
) {
  const opts = {
    autoCycle: options?.autoCycle ?? false,
    intervalMs: options?.intervalMs ?? 3000,
  };
  let index = 0;
  let timer: ReturnType<typeof setInterval> | null = null;

  const pushNext = () => {
    const snapshot = MOCK_STATES[index % MOCK_STATES.length];
    const clone = JSON.parse(JSON.stringify(snapshot)) as CameraState;
    store.applyCameraState(clone);
    index += 1;
  };

  pushNext();
  if (!opts.autoCycle) {
    return () => undefined;
  }

  timer = setInterval(pushNext, opts.intervalMs);

  return () => {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}
