import React from 'react';

import { usePageStore, useViewState } from '../../../hooks/usePageStore.js';
import type { IsoSelectConfig } from './config.js';
import { defaultIsoSelectConfig } from './config.js';

export interface IsoSelectProps {
  config?: IsoSelectConfig;
}

export function IsoSelect({ config = defaultIsoSelectConfig }: IsoSelectProps) {
  const store = usePageStore();
  const view = useViewState();
  const value = config.readValue(view) ?? config.options[0]?.value ?? 0;
  const label = config.formatValue?.(view, value) ?? getOptionLabel(config, value);

  const handleChange = (next: number) => {
    void store.runOperation(config.nodePath, config.kind, config.operationId, { value: next });
  };

  return (
    <label className="zcam-select" data-path={config.nodePath}>
      <span className="zcam-select-label">ISO</span>
      <select value={value} onChange={(e) => handleChange(Number(e.target.value))}>
        {config.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span className="zcam-select-value">{label}</span>
    </label>
  );
}

function getOptionLabel(config: IsoSelectConfig, value: number) {
  const match = config.options.find((option) => option.value === value);
  return match?.label ?? `${value}`;
}
