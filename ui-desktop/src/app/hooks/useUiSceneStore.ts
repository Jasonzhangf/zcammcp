import { useContext, useSyncExternalStore } from 'react';

import { UiSceneStoreContext } from '../app/contexts.js';
import type { UiSceneState, UiSceneStore } from '../framework/state/UiSceneStore.js';

export function useUiSceneStore(): UiSceneStore {
  const store = useContext(UiSceneStoreContext);
  if (!store) {
    throw new Error('UiSceneStoreContext not provided');
  }
  return store;
}

export function useUiSceneState(): UiSceneState {
  const store = useUiSceneStore();
  return useSyncExternalStore(
    (onStoreChange) => store.subscribe(() => onStoreChange()),
    () => store.state,
    () => store.state,
  );
}
