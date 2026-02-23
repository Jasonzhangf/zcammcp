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
  const shutterState = view.camera.exposure?.shutter;

  // Optimistic UI state with 10s suppression
  const [pendingValue, setPendingValue] = useState<string | number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const value = shutterState?.value ?? config.options[0]?.value ?? 'Auto';
  const effectiveValue = pendingValue ?? value;

  // Use view from state if available, or format effective value fallback
  const label = pendingValue
    ? String(pendingValue)
    : (shutterState?.view ?? String(value));

  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement | null>(null);

  const handleChange = (next: string | number) => {
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

  // Cleanup timeout
  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Merge dynamic options from state with static config if needed
  // If state has options, use them. Else use config options.
  // Note: config options are typically { label, value } objects.
  // State options might be just string[]. Need to map if so.
  const options = shutterState?.options
    ? shutterState.options.map(v => ({ label: String(v), value: v }))
    : config.options;

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
        current={effectiveValue}
        options={options}
        anchorRef={anchorRef as React.RefObject<HTMLElement>}
        onClose={() => setOpen(false)}
        onSelect={(next) => {
          handleChange(next);
        }}
      />
    </>
  );
}

function getOptionLabel(config: ShutterSelectConfig, value: string | number) {
  const match = config.options.find((option) => option.value === value);
  return match?.label ?? `${value}`;
}

