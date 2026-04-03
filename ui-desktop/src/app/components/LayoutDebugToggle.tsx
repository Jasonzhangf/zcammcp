import React from 'react';

import { useContainerResizeFlag } from '../hooks/useContainerResizeFlag.js';

export function LayoutDebugToggle() {
  const { enabled, setEnabled } = useContainerResizeFlag();
  const label = enabled ? 'Layout Debug: ON' : 'Layout Debug: OFF';
  return (
    <button
      type="button"
      className={`control-btn layout-debug-toggle ${enabled ? 'layout-debug-toggle-active' : ''}`}
      title="Enable/disable layout debug: allow container resize dragging"
      onClick={() => setEnabled(!enabled)}
    >
      {label}
    </button>
  );
}
