import React from 'react';

import { applyWindowCommand, type WindowCommand } from '../framework/messages/WindowCommands.js';
import { useUiSceneState, useUiSceneStore } from '../hooks/useUiSceneStore.js';

function sendElectronCommand(command: WindowCommand): void {
  if (typeof window === 'undefined' || !window.electronAPI) {
    return;
  }

  if (command === 'shrinkToBall') {
    void window.electronAPI.shrinkToBall?.();
    return;
  }

  if (command === 'restoreFromBall') {
    void window.electronAPI.restoreFromBall?.();
    return;
  }

  if (command === 'toggleSize') {
    if (window.electronAPI.toggleSize) {
      void window.electronAPI.toggleSize();
    } else {
      void window.electronAPI.sendWindowCommand?.('toggleSize');
    }
  }
}

function pushWindowPatch(patch: Record<string, unknown>): void {
  if (typeof window === 'undefined' || !window.electronAPI?.pushState) return;
  void window.electronAPI.pushState('window', patch);
}

export function WindowControls() {
  const store = useUiSceneStore();
  const scene = useUiSceneState();
  const isBall = scene.windowMode === 'ball';

  const handleModeToggle = () => {
    const command: WindowCommand = isBall ? 'restoreFromBall' : 'shrinkToBall';
    applyWindowCommand(store, command);
    sendElectronCommand(command);
    pushWindowPatch({ mode: isBall ? 'main' : 'ball' });
  };

  const handleLayoutToggle = () => {
    applyWindowCommand(store, 'toggleSize');
    sendElectronCommand('toggleSize');
    pushWindowPatch({ layoutSize: store.state.layoutSize });
  };

  const layoutLabel = scene.layoutSize === 'normal' ? 'A' : 'B';
  const layoutTitle = scene.layoutSize === 'normal' ? '布局方案 A' : '布局方案 B';

  return (
    <div className="window-controls" data-path="ui.window.controls">
      <button
        type="button"
        className="control-btn"
        title={isBall ? '恢复主窗口' : '缩小成球'}
        onClick={handleModeToggle}
      >
        {isBall ? '⬜' : '⚪'}
      </button>
      <button
        type="button"
        className="control-btn"
        title={layoutTitle}
        onClick={handleLayoutToggle}
        disabled={isBall}
      >
        {layoutLabel}
      </button>
    </div>
  );
}
