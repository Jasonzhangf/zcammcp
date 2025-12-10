import { useContext } from 'react';

import { UiSceneStoreContext } from '../app/contexts.js';
import type { UiSceneStore } from '../framework/state/UiSceneStore.js';

export function useUiSceneStore(): UiSceneStore {
  const store = useContext(UiSceneStoreContext);
  if (!store) {
    throw new Error('UiSceneStoreContext not provided');
  }
  return store;
}
