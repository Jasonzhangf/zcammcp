import type { ContainerBounds, ContainerState, ContainerStore } from './ContainerStore.js';

interface StoredContainerState {
  bounds: ContainerBounds;
  visible?: boolean;
}

type ContainerStorage = Record<string, StoredContainerState>;

const STORAGE_KEY = 'zcam.container.bounds';

export function attachContainerPersistence(store: ContainerStore) {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  let cache: ContainerStorage = {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      cache = JSON.parse(raw) as ContainerStorage;
    }
  } catch {
    cache = {};
  }

  const seen = new Set<string>();

  const restoreIfNeeded = (state: ContainerState) => {
    if (seen.has(state.id)) {
      return false;
    }
    seen.add(state.id);
    const stored = cache[state.id];
    if (stored) {
      try {
        const safeBounds = sanitizeBounds(stored.bounds, state.bounds);
        store.update(state.id, {
          // 只恢复布局尺寸，不覆盖可见性，避免误把某些分组永久隐藏
          bounds: safeBounds,
        });
        return true;
      } catch {
        // ignore when update fails
      }
    }
    return false;
  };

  store.subscribeAll((state) => {
    const restored = restoreIfNeeded(state);
    if (restored) {
      return;
    }
    cache[state.id] = {
      bounds: sanitizeBounds(state.bounds, state.bounds),
      visible: state.visible,
    };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
    } catch {
      // storage might be full or unavailable
    }
  });
}

function sanitizeBounds(candidate: ContainerBounds, fallback: ContainerBounds): ContainerBounds {
  const clamp = (value: number | undefined, min: number, max: number, defaultValue: number) => {
    if (!Number.isFinite(value ?? NaN)) {
      return defaultValue;
    }
    return Math.max(min, Math.min(max, value as number));
  };

  const fallbackWidth = fallback?.width ?? 100;
  const fallbackHeight = fallback?.height ?? 100;

  return {
    x: clamp(candidate?.x, 0, 100, fallback?.x ?? 0),
    y: clamp(candidate?.y, 0, 100, fallback?.y ?? 0),
    width: clamp(candidate?.width, 10, 100, fallbackWidth),
    height: clamp(candidate?.height, 10, 100, fallbackHeight),
  };
}
