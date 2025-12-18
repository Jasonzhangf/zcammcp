import React from 'react';

import { useContainerResizeFlag } from '../hooks/useContainerResizeFlag.js';

export function LayoutDebugToggle() {
  const { enabled, setEnabled } = useContainerResizeFlag();
  const label = enabled ? '布局调试: ON' : '布局调试: OFF';
  return (
    <button
      type="button"
      className={`control-btn layout-debug-toggle ${enabled ? 'layout-debug-toggle-active' : ''}`}
      title="开启/关闭布局调试：允许拖拽卡片尺寸"
      onClick={() => setEnabled(!enabled)}
    >
      {label}
    </button>
  );
}
