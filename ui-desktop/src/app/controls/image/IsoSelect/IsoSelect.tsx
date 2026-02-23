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
  const isoState = view.camera.exposure?.iso;
  // Optimistic UI state with 10s suppression
  const [pendingValue, setPendingValue] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const value = isoState?.value ?? config.options[0]?.value ?? 'Auto';
  const effectiveValue = pendingValue ?? value;
  // Use view from state if available, otherwise formatted value
  // If pending, we don't have a "view" label from backend, so use raw value
  const label = pendingValue ? String(pendingValue) : (isoState?.view ?? String(value));

  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement | null>(null);

  const handleChange = (next: string) => {
    // 1. Optimistic update
    setPendingValue(next);

    // 2. Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // 3. Set 10s suppression timeout
    timeoutRef.current = setTimeout(() => {
      setPendingValue(null);
      timeoutRef.current = null;
    }, 10000);

    // 4. Send command
    void store.runOperation(config.nodePath, config.kind, config.operationId, { value: next });
  };

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

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
        options={isoState?.options}
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

