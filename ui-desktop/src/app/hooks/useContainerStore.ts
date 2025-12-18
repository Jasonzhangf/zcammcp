import { useContext, useEffect, useSyncExternalStore } from 'react';

import { ContainerStoreContext } from '../app/contexts.js';
import type { ContainerState } from '../framework/state/ContainerStore.js';

export function useContainerStore() {
  const store = useContext(ContainerStoreContext);
  if (!store) {
    throw new Error('ContainerStoreContext is not available');
  }
  return store;
}

export function useContainerState(containerId: string): ContainerState | null {
  const store = useContainerStore();
  return useSyncExternalStore(
    (listener) => store.subscribe(containerId, () => listener()),
    () => store.get(containerId),
    () => store.get(containerId),
  );
}

export function useContainerData(containerId: string, data?: Record<string, unknown> | null) {
  const store = useContainerStore();
  const state = useContainerState(containerId);
  const isReady = Boolean(state);
  useEffect(() => {
    if (!data || !isReady) return;
    store.update(containerId, { data });
  }, [containerId, data, isReady, store]);
}
