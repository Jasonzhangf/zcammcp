import type { UiSceneStore, WindowMode, LayoutSize } from '../state/UiSceneStore.js';

export type WindowCommand = 'shrinkToBall' | 'restoreFromBall' | 'toggleSize';

// Simple pure helper for mapping layout size transitions. This will
// be expanded later if we need more sophisticated rules.
export function nextLayoutSize(current: LayoutSize): LayoutSize {
  if (current === 'normal') return 'compact';
  if (current === 'compact') return 'large';
  return 'normal';
}

// Core command handler. For now this only mutates UiSceneStore.state
// and does not talk to Electron. That separation makes this logic
// trivial to test in isolation.
export function applyWindowCommand(store: UiSceneStore, command: WindowCommand): void {
  if (command === 'shrinkToBall') {
    store.state = { ...store.state, windowMode: 'ball' satisfies WindowMode };
    return;
  }

  if (command === 'restoreFromBall') {
    store.state = { ...store.state, windowMode: 'main' satisfies WindowMode };
    return;
  }

  if (command === 'toggleSize') {
    store.state = { ...store.state, layoutSize: nextLayoutSize(store.state.layoutSize) };
  }
}
