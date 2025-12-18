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
        store.update(state.id, {
          bounds: stored.bounds,
          visible: typeof stored.visible === 'boolean' ? stored.visible : state.visible,
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
      bounds: state.bounds,
      visible: state.visible,
    };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
    } catch {
      // storage might be full or unavailable
    }
  });
}
