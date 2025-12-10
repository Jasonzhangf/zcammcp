import { useContext, useSyncExternalStore } from 'react';

import { PageStoreContext } from '../app/contexts.js';
import type { PageStore, ViewState } from '../framework/state/PageStore.js';

export function usePageStore(): PageStore {
  const store = useContext(PageStoreContext);

  if (!store) {
    throw new Error('PageStoreContext not provided');
  }

  return store;
}

// useViewState exposes the read-only view state from PageStore
// and subscribes to store updates via PageStore.subscribe.
// This keeps existing components working while we refactor
// layout and scene logic around the store.
export function useViewState(): ViewState {
  const store = usePageStore();

  const subscribe = (onStoreChange: () => void) => store.subscribe(onStoreChange);
  const getSnapshot = () => store.getViewState();

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
