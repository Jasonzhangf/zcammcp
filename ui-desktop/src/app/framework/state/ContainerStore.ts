export type ContainerKind = 'page' | 'group' | 'control';

export interface ContainerBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ContainerUiState {
  debugMode?: 'off' | 'outline' | 'verbose';
  background?: string;
  textColor?: string;
  opacity?: number;
  zIndex?: number;
}

export interface ContainerError {
  code: string;
  message: string;
  severity?: 'info' | 'warning' | 'error';
  timestamp: number;
}

export interface ContainerState {
  id: string;
  parentId?: string;
  kind: ContainerKind;
  bounds: ContainerBounds;
  visible: boolean;
  ui: ContainerUiState;
  data: Record<string, unknown>;
  errors: ContainerError[];
  updatedAt: number;
}

export interface ContainerPatch {
  bounds?: Partial<ContainerBounds>;
  visible?: boolean;
  ui?: ContainerUiState;
  data?: Record<string, unknown>;
  errors?: ContainerError[];
}

export type ContainerListener = (state: ContainerState) => void;

export class ContainerStore {
  private containers = new Map<string, ContainerState>();
  private listeners = new Map<string, Set<ContainerListener>>();
  private globalListeners = new Set<ContainerListener>();

  register(container: ContainerState): ContainerState {
    const normalized = this.normalize(container);
    this.containers.set(normalized.id, normalized);
    this.emit(normalized.id);
    return normalized;
  }

  get(id: string): ContainerState | null {
    return this.containers.get(id) ?? null;
  }

  getAll(): ContainerState[] {
    return Array.from(this.containers.values());
  }

  update(id: string, patch: ContainerPatch): ContainerState {
    const current = this.containers.get(id);
    if (!current) {
      throw new Error(`Container ${id} not found`);
    }
    const next: ContainerState = {
      ...current,
      bounds: patch.bounds ? { ...current.bounds, ...patch.bounds } : current.bounds,
      visible: typeof patch.visible === 'boolean' ? patch.visible : current.visible,
      ui: patch.ui ? { ...current.ui, ...patch.ui } : current.ui,
      data: patch.data ? { ...current.data, ...patch.data } : current.data,
      errors: patch.errors ? [...patch.errors] : current.errors,
      updatedAt: Date.now(),
    };
    this.containers.set(id, next);
    this.emit(id);
    return next;
  }

  subscribe(id: string, listener: ContainerListener): () => void {
    const set = this.listeners.get(id) ?? new Set<ContainerListener>();
    set.add(listener);
    this.listeners.set(id, set);
    const current = this.containers.get(id);
    if (current) {
      listener(current);
    }
    return () => {
      const bucket = this.listeners.get(id);
      bucket?.delete(listener);
      if (bucket && bucket.size === 0) {
        this.listeners.delete(id);
      }
    };
  }

  subscribeAll(listener: ContainerListener): () => void {
    this.globalListeners.add(listener);
    for (const state of this.containers.values()) {
      listener(state);
    }
    return () => {
      this.globalListeners.delete(listener);
    };
  }

  private emit(id: string): void {
    const state = this.containers.get(id);
    if (!state) return;
    const specific = this.listeners.get(id);
    if (specific) {
      for (const listener of specific) {
        listener(state);
      }
    }
    for (const listener of this.globalListeners) {
      listener(state);
    }
  }

  private normalize(container: ContainerState): ContainerState {
    const bounds = container.bounds ?? { x: 0, y: 0, width: 100, height: 100 };
    return {
      id: container.id,
      parentId: container.parentId,
      kind: container.kind,
      bounds: {
        x: bounds.x ?? 0,
        y: bounds.y ?? 0,
        width: bounds.width ?? 100,
        height: bounds.height ?? 100,
      },
      visible: typeof container.visible === 'boolean' ? container.visible : true,
      ui: container.ui ?? {},
      data: container.data ?? {},
      errors: container.errors ?? [],
      updatedAt: container.updatedAt ?? Date.now(),
    };
  }
}
