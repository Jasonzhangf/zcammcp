type Listener = () => void;

const listeners = new Set<Listener>();
let currentEnabled = resolveInitial();

export function getContainerResizeEnabled(): boolean {
  return currentEnabled;
}

export function setContainerResizeEnabled(next: boolean): void {
  const value = Boolean(next);
  if (currentEnabled === value) {
    return;
  }
  currentEnabled = value;
  try {
    if (typeof window !== 'undefined') {
      window.__ZCAM_ENABLE_CONTAINER_RESIZE__ = value;
    }
  } catch {
    // ignore
  }
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeContainerResizeEnabled(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function resolveInitial(): boolean {
  if (typeof window !== 'undefined' && typeof window.__ZCAM_ENABLE_CONTAINER_RESIZE__ !== 'undefined') {
    return Boolean(window.__ZCAM_ENABLE_CONTAINER_RESIZE__);
  }
  if (typeof process !== 'undefined' && process.env && typeof process.env.ZCAM_ENABLE_CONTAINER_RESIZE !== 'undefined') {
    return process.env.ZCAM_ENABLE_CONTAINER_RESIZE !== '0';
  }
  return false;
}
