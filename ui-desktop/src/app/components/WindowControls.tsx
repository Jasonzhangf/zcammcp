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

  if (command === 'switchToPtz') {
    void window.electronAPI.sendWindowCommand?.('switchToPtz');
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

  const handleSwitchToPtz = () => {
    applyWindowCommand(store, 'switchToPtz');
    sendElectronCommand('switchToPtz');
    pushWindowPatch({ layoutSize: 'ptz' });
  };

  const handleSwitchToNormal = () => {
    if (scene.layoutSize === 'normal') return;
    applyWindowCommand(store, 'toggleSize');
    sendElectronCommand('toggleSize');
    pushWindowPatch({ layoutSize: 'normal' });
  };
  const isPtzLayout = scene.layoutSize === 'ptz';
  const layoutToggleTitle = isPtzLayout ? 'Switch to A Mode' : 'Switch to C Mode';
  const handleLayoutModeToggle = () => {
    if (isPtzLayout) {
      handleSwitchToNormal();
      return;
    }
    handleSwitchToPtz();
  };
  const toggleTitle = isBall ? 'Restore Main Window' : 'Minimize to Ball';

  return (
    <div className="window-controls" data-path="ui.window.controls">
      <button
        type="button"
        className="control-btn"
        title={layoutToggleTitle}
        aria-label={layoutToggleTitle}
        onClick={handleLayoutModeToggle}
      >
        {isPtzLayout ? 'C' : 'A'}
      </button>
      <button
        type="button"
        className="control-btn"
        title={toggleTitle}
        aria-label={toggleTitle}
        onClick={handleModeToggle}
      >
        {isBall ? '▢' : '⚪'}
      </button>
    </div>
  );
}
