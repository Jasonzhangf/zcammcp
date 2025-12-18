import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { SliderControlConfig } from '../framework/ui/ControlConfig.js';
import { usePageStore, useViewState } from '../hooks/usePageStore.js';
import { computeSliderStep, getProfileInterval, getSliderProfile } from '../framework/ui/SliderProfiles.js';

export interface SliderControlProps {
  config: SliderControlConfig;
  disabled?: boolean;
}

export function SliderControl({ config, disabled = false }: SliderControlProps) {
  const store = usePageStore();
  const view = useViewState();
  const actualValue = config.readValue(view);
  const [localValue, setLocalValue] = useState<number | null>(null);
  const profile = useMemo(() => getSliderProfile(config.profileKey), [config.profileKey]);
  const min = config.valueRange.min;
  const max = config.valueRange.max;
  const baseStep = config.valueRange.step ?? 1;
  const targetValueRef = useRef(actualValue);
  const holdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdTickRef = useRef(0);
  const holdDirectionRef = useRef<1 | -1 | null>(null);
  const transform = config.valueMapper ?? identityTransform();
  const displayValueNumber = transform.toDisplay ? transform.toDisplay(localValue ?? actualValue) : localValue ?? actualValue;
  const effectiveValue = clamp(localValue ?? actualValue, min, max);
  const displayValue = config.formatValue
    ? config.formatValue(displayValueNumber)
    : String(displayValueNumber);
  const displayMin = transform.toDisplay ? transform.toDisplay(min) : min;
  const displayMax = transform.toDisplay ? transform.toDisplay(max) : max;
  const orientation = config.orientation ?? 'horizontal';
  const sliderRootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    targetValueRef.current = actualValue;
    if (localValue !== null) {
      const diff = Math.abs(actualValue - localValue);
      if (diff <= (config.valueRange.step ?? 1)) {
        setLocalValue(null);
      }
    }
  }, [actualValue, config.valueRange.step, localValue]);

  const commitValue = useCallback(
    (next: number) => {
      if (disabled) return;
      void store.runOperation(config.nodePath, config.kind, config.operationId, { value: next }).catch(() => undefined);
    },
    [config, disabled, store],
  );

  const applyStep = useCallback(
    (direction: 1 | -1, tick: number) => {
      if (disabled) return;
      const step = computeSliderStep(profile, tick, baseStep);
      const current = targetValueRef.current ?? actualValue;
      const next = clamp(current + direction * step, min, max);
      if (next === current) return;
      targetValueRef.current = next;
      setLocalValue(next);
      commitValue(next);
    },
    [actualValue, baseStep, commitValue, disabled, max, min, profile],
  );

  const stopHold = useCallback(() => {
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    holdDirectionRef.current = null;
    holdTickRef.current = 0;
  }, []);

  const startHold = useCallback(
    (direction: 1 | -1) => {
      if (disabled) return;
      stopHold();
      holdDirectionRef.current = direction;
      holdTickRef.current = 0;
      applyStep(direction, 0);
      holdTimerRef.current = setInterval(() => {
        holdTickRef.current += 1;
        applyStep(direction, holdTickRef.current);
      }, getProfileInterval(profile));
    },
    [applyStep, disabled, profile, stopHold],
  );

  useEffect(() => {
    return () => {
      stopHold();
    };
  }, [stopHold]);

  const orientationClass =
    orientation === 'horizontal' ? 'zcam-slider-orientation-horizontal' : 'zcam-slider-orientation-vertical';
  const sizeClass = `zcam-slider-size-${config.size ?? 'medium'}`;

  const ariaLabel = useMemo(() => config.label ?? config.kind, [config]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (disabled) return;
      const key = event.key;
      const positiveKeys = orientation === 'vertical' ? ['ArrowUp', 'PageUp'] : ['ArrowRight', 'PageUp'];
      const negativeKeys = orientation === 'vertical' ? ['ArrowDown', 'PageDown'] : ['ArrowLeft', 'PageDown'];
      const stopKeys = new Set(['Escape', 'Enter', 'Tab']);
      if (positiveKeys.includes(key)) {
        event.preventDefault();
        startHold(1);
      } else if (negativeKeys.includes(key)) {
        event.preventDefault();
        startHold(-1);
      } else if (stopKeys.has(key)) {
        stopHold();
      } else if (key === 'Home') {
        event.preventDefault();
        targetValueRef.current = min;
        setLocalValue(min);
        commitValue(min);
      } else if (key === 'End') {
        event.preventDefault();
        targetValueRef.current = max;
        setLocalValue(max);
        commitValue(max);
      }
    },
    [commitValue, disabled, max, min, orientation, startHold, stopHold],
  );

  const handleKeyUp = useCallback(() => {
    stopHold();
  }, [stopHold]);

  const stopHoldAndBlur = useCallback(() => {
    stopHold();
  }, [stopHold]);

  const increaseButton = (
    <button
      type="button"
      className="zcam-slider-step-btn zcam-slider-step-increase"
      onPointerDown={(e) => {
        e.preventDefault();
        startHold(1);
      }}
      onPointerUp={(e) => {
        e.preventDefault();
        stopHold();
      }}
      onPointerLeave={stopHold}
      onTouchStart={(e) => {
        e.preventDefault();
        startHold(1);
      }}
      onTouchEnd={(e) => {
        e.preventDefault();
        stopHold();
      }}
      disabled={disabled}
    >
      +
    </button>
  );

  const decreaseButton = (
    <button
      type="button"
      className="zcam-slider-step-btn zcam-slider-step-decrease"
      onPointerDown={(e) => {
        e.preventDefault();
        startHold(-1);
      }}
      onPointerUp={(e) => {
        e.preventDefault();
        stopHold();
      }}
      onPointerLeave={stopHold}
      onTouchStart={(e) => {
        e.preventDefault();
        startHold(-1);
      }}
      onTouchEnd={(e) => {
        e.preventDefault();
        stopHold();
      }}
      disabled={disabled}
    >
      -
    </button>
  );

  return (
    <div className={`zcam-slider-wrap ${sizeClass} ${orientationClass}`} data-path={config.nodePath}>
      <div className="zcam-slider-header">
        {config.label ? <span className="zcam-slider-label">{config.label}</span> : null}
        <span className="zcam-slider-value">{displayValue}</span>
      </div>
      <div
        className="zcam-slider-track-wrapper"
        tabIndex={disabled ? -1 : 0}
        aria-label={ariaLabel}
        role="slider"
        aria-valuemin={displayMin}
        aria-valuemax={displayMax}
        aria-valuenow={displayValueNumber}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onBlur={stopHoldAndBlur}
        ref={sliderRootRef}
      >
        {orientation === 'vertical' ? increaseButton : decreaseButton}
        <div className="zcam-slider-track">
          <input
            type="range"
            min={min}
            max={max}
            step={baseStep}
            value={effectiveValue}
            readOnly
            tabIndex={-1}
            disabled
            aria-hidden="true"
          />
        </div>
        {orientation === 'vertical' ? decreaseButton : increaseButton}
      </div>
      <div className="zcam-slider-thresholds">
        <span>{orientation === 'vertical' ? displayMax : displayMin}</span>
        <span>{orientation === 'vertical' ? displayMin : displayMax}</span>
      </div>
    </div>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function identityTransform() {
  return {
    toDisplay: (value: number) => value,
    toActual: (value: number) => value,
  };
}
