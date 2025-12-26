import React, { useRef, useState } from 'react';

import { usePageStore, useViewState } from '../../../hooks/usePageStore.js';
import type { IsoSelectConfig } from './config.js';
import { defaultIsoSelectConfig } from './config.js';
import { IsoModal } from '../../../pages/main/imageControl/IsoModal.js';

export interface IsoSelectProps {
  config?: IsoSelectConfig;
}

export function IsoSelect({ config = defaultIsoSelectConfig }: IsoSelectProps) {
  const store = usePageStore();
  const view = useViewState();
  const value = config.readValue(view) ?? config.options[0]?.value ?? 0;
  const label = config.formatValue?.(view, value) ?? getOptionLabel(config, value);
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement | null>(null);

  const handleChange = (next: number) => {
    void store.runOperation(config.nodePath, config.kind, config.operationId, { value: next });
  };

  return (
    <>
      <label className="zcam-select" data-path={config.nodePath}>
        <span className="zcam-select-label">ISO</span>
        <button
          type="button"
          className="zcam-select-trigger"
          ref={anchorRef}
          onClick={() => setOpen(true)}
        >
          <span className="zcam-select-value">{label}</span>
        </button>
      </label>
      <IsoModal
        open={open}
        current={value}
        anchorRef={anchorRef as React.RefObject<HTMLElement>}
        onClose={() => setOpen(false)}
        onSelect={(next) => {
          handleChange(next);
        }}
      />
    </>
  );
}

function getOptionLabel(config: IsoSelectConfig, value: number) {
  const match = config.options.find((option) => option.value === value);
  return match?.label ?? `${value}`;
}

