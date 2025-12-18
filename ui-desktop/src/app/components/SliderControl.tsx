import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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
  const [pendingValue, setPendingValue] = useState<number | null>(null);
  const pendingRef = useRef<number | null>(null);
  const commitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const effectiveValue = pendingValue ?? value;
  const displayValue = config.formatValue ? config.formatValue(effectiveValue) : String(effectiveValue);
  const orientation = config.orientation ?? 'horizontal';

  const commitValue = useCallback(
    (next: number) => {
      if (disabled) return;
      void store.runOperation(config.nodePath, config.kind, config.operationId, { value: next });
    },
    [config, disabled, store],
  );

  const clearCommitTimer = useCallback(() => {
    if (commitTimerRef.current) {
      clearTimeout(commitTimerRef.current);
      commitTimerRef.current = null;
    }
  }, []);

  const flushPending = useCallback(() => {
    if (disabled) return;
    const target = pendingRef.current;
    if (target === null || typeof target === 'undefined') {
      return;
    }
    pendingRef.current = null;
    setPendingValue(null);
    commitValue(target);
  }, [commitValue, disabled]);

  const scheduleCommit = useCallback(() => {
    if (disabled) return;
    clearCommitTimer();
    commitTimerRef.current = setTimeout(() => {
      commitTimerRef.current = null;
      flushPending();
    }, SLIDER_COMMIT_DELAY);
  }, [clearCommitTimer, disabled, flushPending]);

  const handlePendingChange = useCallback(
    (next: number) => {
      if (disabled) return;
      pendingRef.current = next;
      setPendingValue(next);
      scheduleCommit();
    },
    [disabled, scheduleCommit],
  );

  const handleCommit = useCallback(() => {
    flushPending();
  }, [flushPending]);

  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      if (disabled) return;
      e.preventDefault();
      e.stopPropagation();
      const step = config.valueRange.step ?? 1;
      const current = pendingValue ?? value;
      const delta = e.deltaY > 0 ? -step : step;
      const next = clamp(current + delta, config.valueRange.min, config.valueRange.max);
      if (next !== current) {
        commitValue(next);
        setPendingValue(null);
        pendingRef.current = null;
        clearCommitTimer();
      }
    },
    [clearCommitTimer, commitValue, config, disabled, pendingValue, value],
  );

  useEffect(() => {
    pendingRef.current = pendingValue;
  }, [pendingValue]);

  useEffect(() => {
    return () => {
      clearCommitTimer();
    };
  }, [clearCommitTimer]);

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
        value={effectiveValue}
        onChange={(e) => handlePendingChange(Number(e.target.value))}
        onPointerUp={handleCommit}
        onMouseUp={handleCommit}
        onTouchEnd={handleCommit}
        onBlur={handleCommit}
        onKeyUp={(e) => {
          if (COMMIT_KEYS.has(e.key)) {
            handleCommit();
          }
        }}
        disabled={disabled}
      />
      <span className="zcam-ptz-slider-value">{displayValue}</span>
    </div>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

const COMMIT_KEYS = new Set([
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Home',
  'End',
  'PageUp',
  'PageDown',
  'Enter',
]);

const SLIDER_COMMIT_DELAY = 150;
