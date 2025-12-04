// ToggleControl.tsx
// 通用 toggle 控件, 由 ToggleControlConfig 配置驱动

import React from 'react';
import type { ToggleControlConfig } from '../framework/ui/ControlConfig.js';
import { usePageStore, useViewState } from '../hooks/usePageStore.js';

interface ToggleControlProps {
  config: ToggleControlConfig;
}

export const ToggleControl: React.FC<ToggleControlProps> = ({ config }) => {
  const store = usePageStore();
  const view = useViewState();
  const { nodePath, kind, label, operationId, readValue } = config;

  const value = readValue(view);

  const handleToggle = async () => {
    const next = !value;
    await store.runOperation(nodePath, kind, operationId, { value: next });
  };

  return (
    <div className="zcam-field-row" data-path={nodePath}>
      <label>{label}</label>
      <div className="zcam-toggle-group">
        <button
          type="button"
          className={`zcam-toggle ${value ? 'zcam-toggle-on' : 'zcam-toggle-off'}`}
          onClick={handleToggle}
        >
          <span className="zcam-toggle-knob" />
        </button>
        <span className={value ? 'zcam-toggle-label-on' : 'zcam-toggle-label-off'}>
          {value ? 'ON' : 'OFF'}
        </span>
      </div>
    </div>
  );
};
