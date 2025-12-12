import React, { useCallback } from 'react';

import type { ToggleControlConfig } from '../framework/ui/ControlConfig.js';
import { usePageStore, useViewState } from '../hooks/usePageStore.js';

export interface ToggleControlProps {
  config: ToggleControlConfig;
  disabled?: boolean;
}

export function ToggleControl({ config, disabled = false }: ToggleControlProps) {
  const store = usePageStore();
  const view = useViewState();
  const value = config.readValue(view);

  const handleToggle = useCallback(() => {
    if (disabled) return;
    void store.runOperation(config.nodePath, config.kind, config.operationId, { value: !value });
  }, [config, disabled, store, value]);

  return (
    <div className="zcam-toggle-group" data-path={config.nodePath}>
      <button
        type="button"
        className={`zcam-toggle ${value ? 'zcam-toggle-on' : 'zcam-toggle-off'}`}
        onClick={handleToggle}
        disabled={disabled}
        aria-pressed={value}
      >
        <span className="zcam-toggle-knob" />
      </button>
      {config.trueLabel || config.falseLabel ? (
        <span className={value ? 'zcam-toggle-label-on' : 'zcam-toggle-label-off'}>
          {value ? config.trueLabel ?? 'ON' : config.falseLabel ?? 'OFF'}
        </span>
      ) : null}
    </div>
  );
}
