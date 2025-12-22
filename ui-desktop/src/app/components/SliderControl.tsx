import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { SliderControlConfig } from '../framework/ui/ControlConfig.js';
import { usePageStore, useViewState } from '../hooks/usePageStore.js';
import { computeSliderStep, getProfileInterval, getSliderProfile } from '../framework/ui/SliderProfiles.js';
import { Direction, FOCUS_NAV_KEYS, deriveFocusGroupId, moveFocusToDirection } from '../framework/ui/FocusNavigator.js';

export interface SliderControlProps {
  config: SliderControlConfig;
  disabled?: boolean;
}

export function SliderControl({ config, disabled = false }: SliderControlProps) {
  const store = usePageStore();
  const view = useViewState();
  const actualValue = config.readValue(view);
  const [localValue, setLocalValue] = useState<number | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const profile = useMemo(() => getSliderProfile(config.profileKey), [config.profileKey]);
  const min = config.valueRange.min;
  const max = config.valueRange.max;
  const baseStep = config.valueRange.step ?? 1;
  const minHoldStep = config.minHoldStep ?? baseStep;
  const transform = useMemo(() => config.valueMapper ?? identityTransform(), [config.valueMapper]);
  const pointerInteractive = config.enablePointerDrag === true && !disabled;
  const rawValueRef = useRef(actualValue);
  const lastCommittedRef = useRef(snapToStep(actualValue, baseStep, min));
  const holdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdTickRef = useRef(0);
  const holdDirectionRef = useRef<1 | -1 | null>(null);
  const holdStepScaleRef = useRef(1);
  const trackValue = clamp(localValue ?? actualValue, min, max);
  const displaySource = localValue ?? snapToStep(actualValue, baseStep, min);
  const displayValueNumber = transform.toDisplay ? transform.toDisplay(displaySource) : displaySource;
  const displayValue = config.formatValue
    ? config.formatValue(displayValueNumber)
    : String(displayValueNumber);
  const displayMin = transform.toDisplay ? transform.toDisplay(min) : min;
  const displayMax = transform.toDisplay ? transform.toDisplay(max) : max;
  const orientation = config.orientation ?? 'horizontal';
  const sliderRootRef = useRef<HTMLDivElement | null>(null);
  const sliderPercent = useMemo(() => {
    if (!Number.isFinite(trackValue) || max === min) {
      return 0;
    }
    return Math.max(0, Math.min(1, (trackValue - min) / (max - min)));
  }, [max, min, trackValue]);
  const sliderFillStyle = orientation === 'vertical'
    ? { height: `${sliderPercent * 100}%` }
    : { width: `${sliderPercent * 100}%` };
  const centerCovered = sliderPercent >= 0.5;
  const sliderLabelClass = centerCovered ? 'zcam-slider-track-label-filled' : 'zcam-slider-track-label-empty';
  useEffect(() => {
    rawValueRef.current = actualValue;
    const snappedActual = snapToStep(actualValue, baseStep, min);
    lastCommittedRef.current = snappedActual;
    if (localValue !== null && snappedActual === localValue) {
      setLocalValue(null);
    }
  }, [actualValue, baseStep, localValue, min]);

  useEffect(() => {
    if (disabled && isFocused) {
      setIsFocused(false);
    }
  }, [disabled, isFocused]);

  const commitValue = useCallback(
    (next: number) => {
      if (disabled) return;
      void store.runOperation(config.nodePath, config.kind, config.operationId, { value: next }).catch(() => undefined);
    },
    [config, disabled, store],
  );

  const commitQuantizedValue = useCallback(
    (rawValue: number) => {
      const snapped = clamp(snapToStep(rawValue, baseStep, min), min, max);
      if (snapped === lastCommittedRef.current) return;
      lastCommittedRef.current = snapped;
      setLocalValue(snapped);
      commitValue(snapped);
    },
    [baseStep, commitValue, max, min],
  );

  const applyStep = useCallback(
    (direction: 1 | -1, tick: number, stepScale?: number) => {
      if (disabled) return;
      const scale = typeof stepScale === 'number' ? stepScale : holdStepScaleRef.current ?? 1;
      const stepMagnitude = Math.abs(computeSliderStep(profile, tick, baseStep) * scale);
      const effectiveStep = Math.max(minHoldStep, stepMagnitude);
      const current = rawValueRef.current ?? actualValue;
      const nextRaw = clamp(current + direction * effectiveStep, min, max);
      rawValueRef.current = nextRaw;
      commitQuantizedValue(nextRaw);
    },
    [actualValue, baseStep, commitQuantizedValue, disabled, max, min, minHoldStep, profile],
  );

  const stopHold = useCallback(() => {
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    holdDirectionRef.current = null;
    holdTickRef.current = 0;
    holdStepScaleRef.current = 1;
  }, []);

  const startHold = useCallback(
    (direction: 1 | -1, stepScale = 1) => {
      if (disabled) return;
      stopHold();
      holdDirectionRef.current = direction;
      holdStepScaleRef.current = stepScale;
      holdTickRef.current = 0;
      applyStep(direction, 0, stepScale);
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
  const focusGroupId = config.focusGroupId ?? deriveFocusGroupId(config.nodePath);

  const ariaLabel = useMemo(() => config.label ?? config.kind, [config]);

  const moveFocus = useCallback(
    (direction: Direction) => {
      moveFocusToDirection(sliderRootRef.current, direction);
    },
    [],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (disabled) return;
      const key = event.key;
      const lowerKey = key.length === 1 ? key.toLowerCase() : key;
      const navDirection = (FOCUS_NAV_KEYS as Record<string, Direction | undefined>)[lowerKey];
      if (navDirection) {
        event.preventDefault();
        stopHold();
        moveFocus(navDirection);
        return;
      }
      const positiveKeys = orientation === 'vertical' ? ['ArrowUp', 'PageUp'] : ['ArrowRight', 'PageUp'];
      const negativeKeys = orientation === 'vertical' ? ['ArrowDown', 'PageDown'] : ['ArrowLeft', 'PageDown'];
      const stopKeys = new Set(['Escape', 'Enter', 'Tab']);
      const modifierScale = resolveModifierScale(event);
      if (positiveKeys.includes(key)) {
        event.preventDefault();
        startHold(1, modifierScale);
      } else if (negativeKeys.includes(key)) {
        event.preventDefault();
        startHold(-1, modifierScale);
      } else if (stopKeys.has(key)) {
        stopHold();
      } else if (key === 'Home') {
        event.preventDefault();
        rawValueRef.current = min;
        commitQuantizedValue(min);
      } else if (key === 'End') {
        event.preventDefault();
        rawValueRef.current = max;
        commitQuantizedValue(max);
      }
    },
    [commitQuantizedValue, disabled, max, min, moveFocus, orientation, startHold, stopHold],
  );

  const handleKeyUp = useCallback(() => {
    stopHold();
  }, [stopHold]);

  const handleFocus = useCallback(() => {
    if (disabled) return;
    setIsFocused(true);
  }, [disabled]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    stopHold();
  }, [stopHold]);

  const handlePointerInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!pointerInteractive) return;
      const rawValue = Number(event.currentTarget.value);
      if (!Number.isFinite(rawValue)) return;
      stopHold();
      const actual = transform.toActual ? transform.toActual(rawValue) : rawValue;
      const next = clamp(actual, min, max);
      rawValueRef.current = next;
      commitQuantizedValue(next);
    },
    [commitQuantizedValue, max, min, pointerInteractive, stopHold, transform],
  );

  const rangeProps = pointerInteractive
    ? {
        readOnly: false,
        disabled: false,
      }
    : {
        readOnly: true,
        disabled: true,
      };

  const increaseButton = (
    <button
      type="button"
      className="zcam-slider-step-btn zcam-slider-step-increase"
      onPointerDown={(e) => {
        e.preventDefault();
        startHold(1, resolveModifierScale(e));
      }}
      onPointerUp={(e) => {
        e.preventDefault();
        stopHold();
      }}
      onPointerLeave={stopHold}
      onPointerCancel={stopHold}
      onContextMenu={(e) => {
        e.preventDefault();
        stopHold();
      }}
      onTouchStart={(e) => {
        e.preventDefault();
        startHold(1);
      }}
      onTouchEnd={(e) => {
        e.preventDefault();
        stopHold();
      }}
      onTouchCancel={(e) => {
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
        startHold(-1, resolveModifierScale(e));
      }}
      onPointerUp={(e) => {
        e.preventDefault();
        stopHold();
      }}
      onPointerLeave={stopHold}
      onPointerCancel={stopHold}
      onContextMenu={(e) => {
        e.preventDefault();
        stopHold();
      }}
      onTouchStart={(e) => {
        e.preventDefault();
        startHold(-1);
      }}
      onTouchEnd={(e) => {
        e.preventDefault();
        stopHold();
      }}
      onTouchCancel={(e) => {
        e.preventDefault();
        stopHold();
      }}
      disabled={disabled}
    >
      -
    </button>
  );

  return (
    <div
      className={`zcam-slider-wrap ${sizeClass} ${orientationClass} ${isFocused ? 'zcam-slider-focused' : ''}`}
      data-path={config.nodePath}
    >
      <div className="zcam-slider-header">
        {config.label ? <span className="zcam-slider-label">{config.label}</span> : null}
        <span className="zcam-slider-value">{displayValue}</span>
      </div>
      <div
        className="zcam-slider-track-wrapper zcam-focusable-control"
        tabIndex={disabled ? -1 : 0}
        aria-label={ariaLabel}
        role="slider"
        aria-valuemin={displayMin}
        aria-valuemax={displayMax}
        aria-valuenow={displayValueNumber}
        data-focus-group={focusGroupId}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onFocus={handleFocus}
        onBlur={handleBlur}
        ref={sliderRootRef}
      >
        {orientation === 'vertical' ? increaseButton : decreaseButton}
        <div className="zcam-slider-track">
          <div className="zcam-slider-track-visual">
            <div className="zcam-slider-track-rail" />
            <div className="zcam-slider-track-fill" style={sliderFillStyle} />
            <div className="zcam-slider-track-label">
              <span className={`zcam-slider-track-label-value ${sliderLabelClass}`}>{displayValue}</span>
            </div>
          </div>
          <input
            className="zcam-slider-input"
            type="range"
            min={min}
            max={max}
            step={baseStep}
            value={trackValue}
            {...rangeProps}
            tabIndex={-1}
            aria-hidden={!pointerInteractive}
            onInput={handlePointerInputChange}
            onChange={handlePointerInputChange}
            onPointerDown={(e) => {
              if (!pointerInteractive) return;
              e.stopPropagation();
              stopHold();
            }}
            style={{ pointerEvents: pointerInteractive ? 'auto' : 'none', cursor: pointerInteractive ? 'pointer' : 'default' }}
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

function snapToStep(value: number, step: number, origin: number): number {
  if (!Number.isFinite(step) || step <= 0) return value;
  if (!Number.isFinite(value)) return origin;
  const offset = value - origin;
  const steps = Math.round(offset / step);
  return origin + steps * step;
}

function identityTransform() {
  return {
    toDisplay: (value: number) => value,
    toActual: (value: number) => value,
  };
}

function resolveModifierScale(event: Pick<React.KeyboardEvent | React.PointerEvent, 'shiftKey' | 'altKey' | 'ctrlKey'> & {
  metaKey?: boolean;
}): number {
  if (event.shiftKey) return 0.25;
  if (event.altKey) return 0.5;
  if (event.ctrlKey || event.metaKey) return 2;
  return 1;
}
