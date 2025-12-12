import React, { useCallback, useMemo } from 'react';

import type { SliderControlConfig } from '../framework/ui/ControlConfig.js';
import { usePageStore, useViewState } from '../hooks/usePageStore.js';

export interface SliderControlProps {
  config: SliderControlConfig;
  disabled?: boolean;
}

export function SliderControl({ config, disabled = false }: SliderControlProps) {
  const store = usePageStore();
  const view = useViewState();
  const value = config.readValue(view);
  const displayValue = config.formatValue ? config.formatValue(value) : String(value);
  const orientation = config.orientation ?? 'horizontal';

  const handleChange = useCallback(
    (next: number) => {
      if (disabled) return;
      void store.runOperation(config.nodePath, config.kind, config.operationId, { value: next });
    },
    [config, disabled, store],
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      if (disabled) return;
      e.preventDefault();
      e.stopPropagation();
      const step = config.valueRange.step ?? 1;
      const delta = e.deltaY > 0 ? -step : step;
      const next = clamp(value + delta, config.valueRange.min, config.valueRange.max);
      if (next !== value) {
        handleChange(next);
      }
    },
    [config, disabled, handleChange, value],
  );

  const orientationClass =
    orientation === 'horizontal' ? 'zcam-slider-orientation-horizontal' : 'zcam-slider-orientation-vertical';
  const sizeClass = `zcam-slider-size-${config.size ?? 'medium'}`;

  const min = config.valueRange.min;
  const max = config.valueRange.max;
  const step = config.valueRange.step ?? 1;

  const ariaLabel = useMemo(() => config.label ?? config.kind, [config]);

  return (
    <div
      className={`zcam-ptz-slider-wrap ${sizeClass} ${orientationClass}`}
      data-path={config.nodePath}
      onWheel={handleWheel}
    >
      {config.label ? <span className="zcam-ptz-slider-label">{config.label}</span> : null}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => handleChange(Number(e.target.value))}
        disabled={disabled}
      />
      <span className="zcam-ptz-slider-value">{displayValue}</span>
    </div>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
