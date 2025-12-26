import React, { useRef, useState } from 'react';
import { usePageStore, useViewState } from '../../../hooks/usePageStore.js';
import type { ShutterSelectConfig } from './config.js';
import { defaultShutterSelectConfig } from './config.js';
import { ShutterModal } from '../../../pages/main/imageControl/ShutterModal.js';

export interface ShutterSelectProps {
  config?: ShutterSelectConfig;
}

export function ShutterSelect({ config = defaultShutterSelectConfig }: ShutterSelectProps) {
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
        <span className="zcam-select-label">Shutter</span>
        <button
          type="button"
          className="zcam-select-trigger"
          ref={anchorRef}
          onClick={() => setOpen(true)}
        >
          <span className="zcam-select-value">{label}</span>
        </button>
      </label>
      <ShutterModal
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

function getOptionLabel(config: ShutterSelectConfig, value: number) {
  const match = config.options.find((option) => option.value === value);
  return match?.label ?? `${value}`;
}

