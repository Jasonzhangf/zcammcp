export type WindowMode = 'main' | 'ball';

export type LayoutSize = 'normal' | 'compact' | 'large';

export interface UiSceneState {
  windowMode: WindowMode;
  layoutSize: LayoutSize;
}

// Minimal placeholder implementation. The state machine and
// helpers will be implemented in a later step so this module
// stays independently testable.
export class UiSceneStore {
  public state: UiSceneState;

  constructor(initial: UiSceneState) {
    this.state = initial;
  }
}
