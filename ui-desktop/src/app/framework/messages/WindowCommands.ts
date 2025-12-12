import type { UiSceneStore, WindowMode, LayoutSize } from '../state/UiSceneStore.js';

export type WindowCommand = 'shrinkToBall' | 'restoreFromBall' | 'toggleSize';

// Simple pure helper for mapping layout size transitions. This will
// be expanded later if we need more sophisticated rules.
export function nextLayoutSize(current: LayoutSize): LayoutSize {
  return current === 'normal' ? 'studio' : 'normal';
}

// Core command handler. For now this only mutates UiSceneStore.state
// and does not talk to Electron. That separation makes this logic
// trivial to test in isolation.
export function applyWindowCommand(store: UiSceneStore, command: WindowCommand): void {
  if (command === 'shrinkToBall') {
    store.setState({ ...store.state, windowMode: 'ball' satisfies WindowMode });
    return;
  }

  if (command === 'restoreFromBall') {
    store.setState({ ...store.state, windowMode: 'main' satisfies WindowMode });
    return;
  }

  if (command === 'toggleSize') {
    store.setState({ ...store.state, layoutSize: nextLayoutSize(store.state.layoutSize) });
  }
}
