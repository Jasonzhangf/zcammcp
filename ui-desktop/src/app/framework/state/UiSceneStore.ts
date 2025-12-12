export type WindowMode = 'main' | 'ball';

export type LayoutSize = 'normal' | 'studio';

export interface UiSceneState {
  windowMode: WindowMode;
  layoutSize: LayoutSize;
}

export type UiSceneStoreListener = (state: UiSceneState, prev: UiSceneState) => void;

// UiSceneStore keeps a minimal observable state machine for window mode + layout
// size. Components subscribe via useSyncExternalStore so that UI reactions stay
// synchronous with state mutations.
export class UiSceneStore {
  public state: UiSceneState;
  private listeners = new Set<UiSceneStoreListener>();

  constructor(initial: UiSceneState) {
    this.state = initial;
  }

  subscribe(listener: UiSceneStoreListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  setState(next: UiSceneState): void {
    if (this.state === next) {
      return;
    }
    const prev = this.state;
    this.state = next;
    for (const listener of this.listeners) {
      listener(this.state, prev);
    }
  }

  update(partial: Partial<UiSceneState>): void {
    this.setState({ ...this.state, ...partial });
  }
}
