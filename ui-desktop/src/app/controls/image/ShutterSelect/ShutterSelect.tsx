// ShutterSelect.tsx
// 独立快门选择控件模块: 使用 CoreModal + PageStore, 不依赖其他控件

import React, { useRef, useState } from 'react';
import { usePageStore, useViewState } from '../../../hooks/usePageStore.js';
import { CoreModal } from '../../../framework/ui/CoreModal.js';
import { defaultShutterSelectConfig, type ShutterSelectConfig } from './config.js';

export interface ShutterSelectProps {
  config?: ShutterSelectConfig;
}

export const ShutterSelect: React.FC<ShutterSelectProps> = ({ config }) => {
  const cfg = config ?? defaultShutterSelectConfig;
  const store = usePageStore();
  const view = useViewState();

  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  const currentValue = cfg.readValue(view);
  const display = cfg.formatValue?.(view, currentValue) ?? '';

  const handleSelect = async (value: number) => {
    await store.runOperation(cfg.nodePath, cfg.kind, cfg.operationId, { value });
    setOpen(false);
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="zcam-grid-trigger"
        data-path={cfg.nodePath}
        onClick={() => setOpen(true)}
      >
        {display}
      </button>

      <CoreModal
        open={open}
        title={cfg.title}
        anchorRef={btnRef as React.RefObject<HTMLElement>}
        onClose={() => setOpen(false)}
      >
        <div className="zcam-option-grid">
          {cfg.options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={opt.value === currentValue ? 'zcam-chip-active' : ''}
              onClick={() => handleSelect(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </CoreModal>
    </>
  );
};
