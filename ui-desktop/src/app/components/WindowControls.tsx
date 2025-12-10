import React from 'react';

import { useUiSceneStore } from '../hooks/useUiSceneStore.js';
import { applyWindowCommand } from '../framework/messages/WindowCommands.js';

export function WindowControls() {
  const store = useUiSceneStore();

  const handleCommand = (cmd: 'shrinkToBall' | 'restoreFromBall' | 'toggleSize') => {
    applyWindowCommand(store, cmd);
    if (typeof window !== 'undefined' && (window as any).electronAPI?.sendWindowCommand) {
      (window as any).electronAPI.sendWindowCommand(cmd);
    }
  };

  const isBall = store.state.windowMode === 'ball';

  return (
    <div className="window-controls" data-path="ui.window.controls">
      <button
        type="button"
        className="zcam-header-btn"
        title={isBall ? '恢复主窗口' : '缩小成球'}
        onClick={() => handleCommand(isBall ? 'restoreFromBall' : 'shrinkToBall')}
      >
        {isBall ? '◉' : '⚪'}
      </button>
      <button
        type="button"
        className="zcam-header-btn"
        title="切换尺寸"
        onClick={() => handleCommand('toggleSize')}
      >
        ⤢
      </button>
    </div>
  );
}
