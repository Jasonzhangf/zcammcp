import { useSyncExternalStore } from 'react';

import {
  getContainerResizeEnabled,
  setContainerResizeEnabled,
  subscribeContainerResizeEnabled,
} from '../framework/state/ContainerResizeFlag.js';

export function useContainerResizeFlag() {
  const enabled = useSyncExternalStore(
    (listener) => subscribeContainerResizeEnabled(listener),
    () => getContainerResizeEnabled(),
    () => getContainerResizeEnabled(),
  );
  return {
    enabled,
    setEnabled: setContainerResizeEnabled,
  };
}
