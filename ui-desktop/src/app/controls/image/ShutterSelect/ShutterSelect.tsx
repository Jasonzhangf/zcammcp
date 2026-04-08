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
  const shutterModeState = view.camera.exposure?.shutterOperation;
  const electronAPI = typeof window !== 'undefined' ? window.electronAPI : undefined;

  const [pendingValue, setPendingValue] = useState<string | number | null>(null);
  const [pendingMode, setPendingMode] = useState<'Speed' | 'Angle' | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const modeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const value = shutterState?.value ?? config.options[0]?.value ?? 'Auto';
  const effectiveValue = pendingValue ?? value;
  const label = pendingValue
    ? String(pendingValue)
    : (shutterState?.view ?? String(value));
  const modeValue = ((pendingMode ?? shutterModeState?.value ?? 'Speed') === 'Angle' ? 'Angle' : 'Speed') as 'Speed' | 'Angle';
  const modeSelectValue = modeValue === 'Angle' ? 'angle' : 'speed';

  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement | null>(null);

  const handleChange = (next: string | number) => {
    setPendingValue(next);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setPendingValue(null);
      timeoutRef.current = null;
    }, 10000);
    void store.runOperation(config.nodePath, config.kind, config.operationId, {
      value: next,
      params: { mode: modeValue },
    });
  };

  const handleModeChange = (next: 'Speed' | 'Angle') => {
    setPendingMode(next);
    if (modeTimeoutRef.current) {
      clearTimeout(modeTimeoutRef.current);
    }
    modeTimeoutRef.current = setTimeout(() => {
      setPendingMode(null);
      modeTimeoutRef.current = null;
    }, 6000);
    void store.runOperation(config.nodePath, 'exposure.shutterOperation', 'exposure.setShutterOperation', { value: next });
    if (electronAPI?.refreshCameraState) {
      void electronAPI.refreshCameraState({ keys: ['sht_operation', 'shutter_time', 'shutter_angle'] });
    }
  };

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (modeTimeoutRef.current) clearTimeout(modeTimeoutRef.current);
    };
  }, []);

  React.useEffect(() => {
    if (!shutterModeState?.value) return;
    const normalized = String(shutterModeState.value).toLowerCase() === 'angle' ? 'Angle' : 'Speed';
    if (pendingMode && pendingMode !== normalized) return;
    if (!pendingMode) return;
    setPendingMode(null);
  }, [pendingMode, shutterModeState?.value]);

  React.useEffect(() => {
    if (!electronAPI?.refreshCameraState) return;
    if (!shutterModeState?.value || !shutterState?.options || shutterState.options.length === 0) {
      void electronAPI.refreshCameraState({ keys: ['sht_operation', 'shutter_time', 'shutter_angle'] });
    }
  }, [electronAPI, shutterModeState?.value, shutterState?.options]);

  const options = shutterState?.options
    ? shutterState.options.map(v => ({ label: String(v), value: v }))
    : config.options;

  return (
    <>
      <div className="zcam-shutter-inline">
        <label className="zcam-select zcam-select-compact" data-path="zcam.camera.pages.main.exposure.shutterOperation">
          <span className="zcam-select-label">Shutter Operation</span>
          <select
            className="zcam-select-native"
            value={modeSelectValue}
            onChange={(event) => {
              const mode = event.target.value === 'angle' ? 'Angle' : 'Speed';
              handleModeChange(mode);
            }}
          >
            <option value="speed">speed</option>
            <option value="angle">angle</option>
          </select>
        </label>
        <label className="zcam-select zcam-select-compact" data-path={config.nodePath}>
          <span className="zcam-select-label">{modeValue === 'Angle' ? 'Shutter Angle' : 'Shutter Speed'}</span>
          <button
            type="button"
            className="zcam-select-trigger"
            ref={anchorRef}
            onClick={() => setOpen(true)}
          >
            <span className="zcam-select-value">{label}</span>
          </button>
        </label>
      </div>
      <ShutterModal
        open={open}
        title={modeValue === 'Angle' ? 'Shutter Angle' : 'Shutter Speed'}
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
