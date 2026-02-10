import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { OperationPayload } from '../framework/state/PageStore.js';
import type { SliderControlConfig } from '../framework/ui/ControlConfig.js';
import { usePageStore, useViewState } from '../hooks/usePageStore.js';
import { computeNormalizedStep, getProfileInterval, getSliderProfile } from '../framework/ui/SliderProfiles.js';
import {
  Direction,
  FOCUS_NAV_KEYS,
  deriveFocusGroupId,
  useFocusManager,
  useFocusableControl,
} from '../framework/ui/FocusManager.js';
import { useKeyboardBinding } from '../hooks/useKeyboardBinding.js';
import { logInteraction } from '../framework/debug/InteractionLogger.js';

export interface SliderControlProps {
  config: SliderControlConfig;
  disabled?: boolean;
}

interface SliderOperationMeta {
  normalizedSpeed?: number;
  speedMultiplier?: number;
  intervalMs?: number;
  direction?: 1 | -1;
  tick?: number;
  stop?: boolean;
  simulationOnly?: boolean;
}

export function SliderControl({ config, disabled = false }: SliderControlProps) {
  const store = usePageStore();
  const view = useViewState();
  const actualValue = config.readValue ? config.readValue(view) : config.valueRange.min;
  const [isFocused, setIsFocused] = useState(false);
  const profile = useMemo(() => {
    try {
      return getSliderProfile(config.profileKey);
    } catch (error) {
      console.warn('Error getting slider profile:', error);
      return getSliderProfile('default'); // 出错时使用默认profile
    }
  }, [config.profileKey]);
  const dynamicRange = config.readValueRange ? config.readValueRange(view) : undefined;
  const min = dynamicRange?.min ?? config.valueRange.min;
  const max = dynamicRange?.max ?? config.valueRange.max;
  const baseStep = dynamicRange?.step ?? config.valueRange.step ?? 1;
  const minHoldStep = config.minHoldStep ?? baseStep;
  const transform = useMemo(() => config.valueMapper ?? identityTransform(), [config.valueMapper]);
  const pointerInteractive = config.enablePointerDrag === true && !disabled;
  const rawValueRef = useRef(actualValue);
  const lastCommittedRef = useRef(actualValue);

  // Optimistic UI state: overrides actualValue when user has pending changes
  const [pendingValue, setPendingValue] = useState<number | null>(null);
  const pendingValueTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // NEW: Synchronous lock to prevent rawValueRef from being clobbered by actualValue 
  // during the gap between interaction start and React state update.
  const isLockedRef = useRef(false);
  // NEW: Throttle timer to prevent command storms
  const lastCmdTimeRef = useRef(0);

  const holdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdTickRef = useRef(0);
  const holdDirectionRef = useRef<1 | -1 | null>(null);
  const holdStepScaleRef = useRef(1);
  const keyboardHoldKeyRef = useRef<string | null>(null);

  // Track button press state for operation-based controls
  const incrementPressedRef = useRef(false);
  const decrementPressedRef = useRef(false);

  // Determine effective value for display
  const effectiveValue = pendingValue ?? actualValue;
  const trackValue = clamp(effectiveValue, min, max);
  const displaySource = effectiveValue; // 直接使用实际值，支持浮点
  const displayValueNumber = transform.toDisplay ? transform.toDisplay(displaySource) : displaySource;
  const displayValue = config.formatValue
    ? config.formatValue(displayValueNumber, { min, max, step: baseStep })
    : String(displayValueNumber);

  const displayMin = transform.toDisplay ? transform.toDisplay(min) : min;
  const displayMax = transform.toDisplay ? transform.toDisplay(max) : max;
  const orientation = config.orientation ?? 'horizontal';
  const sliderRootRef = useRef<HTMLDivElement | null>(null);
  const focusManager = useFocusManager();
  const sliderPercent = useMemo(() => {
    if (!Number.isFinite(trackValue) || max === min) {
      return 0;
    }
    const ratio = Math.max(0, Math.min(1, (trackValue - min) / (max - min)));
    return config.displayInverted ? 1 - ratio : ratio;
  }, [max, min, trackValue, config.displayInverted]);
  const sliderFillStyle = orientation === 'vertical'
    ? { height: `${sliderPercent * 100}%` }
    : { width: `${sliderPercent * 100}%` };
  const centerCovered = sliderPercent >= 0.5;
  const sliderLabelClass = centerCovered ? 'zcam-slider-track-label-filled' : 'zcam-slider-track-label-empty';

  // Sync refs and check for optimistic confirmation
  useEffect(() => {
    // If button operations disable optimistic UI and button is pressed,
    // immediately sync backend values
    if (config.buttonOperationsDisableOptimistic &&
      (incrementPressedRef.current || decrementPressedRef.current)) {
      rawValueRef.current = actualValue;
      lastCommittedRef.current = actualValue;
      return;
    }

    // Only sync refs to actualValue if we are not in a pending state.
    // This blocks backend updates from affecting the UI while a pending value exists (10s lock).
    // The isLockedRef check covers the gap before pendingValue state update commits.
    if (pendingValue === null && !isLockedRef.current) {
      rawValueRef.current = actualValue;
      lastCommittedRef.current = actualValue;
    }
  }, [actualValue, pendingValue, config.buttonOperationsDisableOptimistic]);

  useEffect(() => {
    if (disabled && isFocused) {
      setIsFocused(false);
    }
  }, [disabled, isFocused]);

  const clearPendingTimeout = useCallback(() => {
    if (pendingValueTimeoutRef.current) {
      clearTimeout(pendingValueTimeoutRef.current);
      pendingValueTimeoutRef.current = null;
    }
    // Lock immediately on interaction
    isLockedRef.current = true;
  }, []);

  const startPendingTimeout = useCallback(() => {
    clearPendingTimeout();
    // Keep locked (isLockedRef is already true from clearPendingTimeout or previous interaction)

    pendingValueTimeoutRef.current = setTimeout(() => {
      isLockedRef.current = false; // Unlock only after timeout
      setPendingValue(null);
      pendingValueTimeoutRef.current = null;
    }, 10000);
  }, [clearPendingTimeout]);

  const commitValue = useCallback(
    (next: number, meta?: SliderOperationMeta & { simulationOnly?: boolean }) => {
      if (disabled) return;

      if (config.onValueChange) {
        config.onValueChange(next, store, { simulationOnly: meta?.simulationOnly });
        return;
      }

      if (meta?.simulationOnly) return; // Skip operation if simulation only

      const payload: OperationPayload = { value: next };
      if (meta) {
        payload.params = {
          sliderMeta: meta,
        };
      }

      // Update command timestamp
      lastCmdTimeRef.current = Date.now();

      void store.runOperation(config.nodePath, config.kind, config.operationId, payload).catch(() => undefined);
    },
    [config, disabled, store],
  );

  const commitQuantizedValue = useCallback(
    (rawValue: number, meta?: SliderOperationMeta) => {
      // 直接使用实际值，支持浮点精度
      // 对齐到 step
      const steppedValue = min + Math.round((rawValue - min) / baseStep) * baseStep;
      const clampedValue = clamp(steppedValue, min, max);
      if (Math.abs(clampedValue - lastCommittedRef.current) < Number.EPSILON) return;
      lastCommittedRef.current = clampedValue;

      // Update optimistic state (UI Always Updates)
      setPendingValue(clampedValue);

      // We do NOT set timeout here anymore. 
      // Timer is managed by startHold/stopHold and Pointer events to ensure "Hold = Infinite Lock".

      logInteraction({
        source: 'slider',
        path: config.nodePath,
        action: 'commit',
        data: {
          value: clampedValue,
          meta,
          operationId: config.operationId ?? '',
          kind: config.kind,
        },
      });

      // THROTTLE: Only send to backend if 100ms passed
      const now = Date.now();
      if (now - lastCmdTimeRef.current > 100) {
        commitValue(clampedValue, meta);
      }
      // Else: skip backend send, but UI is already updated via setPendingValue
    },
    [commitValue, config.nodePath, max, min, baseStep, config.operationId, config.kind],
  );

  // 获取speed乘数的函数
  const getSpeedMultiplier = useCallback(() => {
    try {
      // 如果是zoom滑块，从view中获取speed值
      if (config.kind === 'ptz.zoom' && view.ui.fzSpeed !== undefined) {
        const speedValue = view.ui.fzSpeed;
        // speed范围0-100，映射为归一化乘数
        // speed满值(100) = 1.0 (满速)
        // speed 50 = 0.5 (半速)
        // speed 0 = 0.1 (最小速度)
        const multiplier = Math.max(0.1, speedValue / 100);
        return multiplier;
      }
    } catch (error) {
      console.warn('Error getting speed multiplier:', error);
    }
    return 1; // 非zoom滑块或出错时使用1倍速度
  }, [config.kind, view]);

  const applyStep = useCallback(
    (direction: 1 | -1, tick: number = 0, stepScale?: number, simulationOnly?: boolean) => {
      if (disabled) return;

      const scale = typeof stepScale === 'number' ? stepScale : holdStepScaleRef.current ?? 1;
      const speedMultiplier = getSpeedMultiplier();

      // 计算归一化速度
      if (!profile) {
        console.warn('Profile is undefined, using default speed');
        return;
      }
      const normalizedSpeed = computeNormalizedStep(profile, tick, speedMultiplier) * scale;

      // 计算当前归一化位置
      const currentNormalized = max === min ? 0 : (rawValueRef.current - min) / (max - min);

      // 归一化速度转换为百分比变化 (0-1范围)
      const normalizedChange = normalizedSpeed / 100;

      // 应用归一化速度
      const nextNormalized = clamp(currentNormalized + direction * normalizedChange, 0, 1);

      // 转换回实际值
      const nextRaw = nextNormalized * (max - min) + min;
      rawValueRef.current = nextRaw;
      // pendingTargetRef is removed, commitQuantizedValue handles state update

      commitQuantizedValue(nextRaw, {
        normalizedSpeed,
        speedMultiplier,
        intervalMs: getProfileInterval(profile),
        direction,
        tick,
        simulationOnly,
      });
    },
    [commitQuantizedValue, disabled, getSpeedMultiplier, max, min, profile],
  );

  const stopHold = useCallback((options?: { simulationOnly?: boolean }) => {
    const hadHold = Boolean(holdDirectionRef.current || holdTimerRef.current || keyboardHoldKeyRef.current);
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    holdDirectionRef.current = null;
    holdTickRef.current = 0;
    holdStepScaleRef.current = 1;
    keyboardHoldKeyRef.current = null;

    // Only execute the following if button was actually held
    if (!hadHold) return;

    // Always start timeout on stopHold (release), ensuring 10s wait
    startPendingTimeout();

    const targetSource =
      pendingValue ?? rawValueRef.current ?? lastCommittedRef.current ?? actualValue;
    // 使用与 commitQuantizedValue 相同的对齐逻辑
    const steppedValue = min + Math.round((targetSource - min) / baseStep) * baseStep;
    const currentValue = clamp(steppedValue, min, max);

    if (!Number.isFinite(currentValue)) return;
    rawValueRef.current = currentValue;

    setPendingValue(currentValue);

    lastCommittedRef.current = currentValue;

    logInteraction({
      source: 'slider',
      path: config.nodePath,
      action: 'stopHold',
      data: {
        value: currentValue,
      },
    });
    commitValue(currentValue, { stop: true, simulationOnly: options?.simulationOnly });
  }, [actualValue, baseStep, commitValue, config.nodePath, max, min, startPendingTimeout, pendingValue]);

  const startHold = useCallback(
    (direction: 1 | -1, stepScale = 1, options?: { key?: string; simulationOnly?: boolean }) => {
      if (disabled) return;

      // Clear legacy hold state
      if (holdTimerRef.current) clearInterval(holdTimerRef.current);

      // Clear timeout -> Infinite Lock while holding
      clearPendingTimeout();

      holdDirectionRef.current = direction;
      holdStepScaleRef.current = stepScale;
      holdTickRef.current = 0;
      logInteraction({
        source: 'slider',
        path: config.nodePath,
        action: 'startHold',
        data: {
          direction,
          stepScale,
          key: options?.key,
        },
      });
      applyStep(direction, 0, stepScale, options?.simulationOnly);
      if (options?.key) {
        keyboardHoldKeyRef.current = options.key;
      }
      holdTimerRef.current = setInterval(() => {
        holdTickRef.current += 1;
        applyStep(direction, holdTickRef.current, undefined, options?.simulationOnly);
      }, getProfileInterval(profile));
    },
    [applyStep, disabled, profile, clearPendingTimeout],
  );

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (holdTimerRef.current) clearInterval(holdTimerRef.current);
      if (pendingValueTimeoutRef.current) clearTimeout(pendingValueTimeoutRef.current);
    };
  }, []);

  const orientationClass =
    orientation === 'horizontal' ? 'zcam-slider-orientation-horizontal' : 'zcam-slider-orientation-vertical';
  const sizeClass = `zcam-slider-size-${config.size ?? 'medium'}`;
  const focusGroupId = config.focusGroupId ?? deriveFocusGroupId(config.nodePath);
  useFocusableControl(sliderRootRef, { nodeId: config.nodePath, groupId: focusGroupId, disabled });

  const ariaLabel = useMemo(() => config.label ?? config.kind, [config]);

  const moveFocus = useCallback(
    (direction: Direction) => {
      focusManager.moveToDirection(sliderRootRef.current, direction);
    },
    [focusManager],
  );

  const defaultKeyBindings = useMemo(() => {
    const axisKeys =
      orientation === 'vertical'
        ? ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown']
        : ['ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown'];
    return [...axisKeys, 'Home', 'End', 'w', 'a', 's', 'd'];
  }, [orientation]);

  const effectiveKeyBindings =
    Array.isArray(config.keyBindings) && config.keyBindings.length > 0 ? config.keyBindings : defaultKeyBindings;

  const handleKeyboardCommand = useCallback(
    (event: KeyboardEvent) => {
      if (disabled) return false;
      const key = event.key;
      const lowerKey = key.length === 1 ? key.toLowerCase() : key;
      const navDirection = (FOCUS_NAV_KEYS as Record<string, Direction | undefined>)[lowerKey];
      if (navDirection) {
        stopHold();
        moveFocus(navDirection);
        return true;
      }
      const positiveKeys = orientation === 'vertical' ? ['ArrowUp', 'PageUp'] : ['ArrowRight', 'PageUp'];
      const negativeKeys = orientation === 'vertical' ? ['ArrowDown', 'PageDown'] : ['ArrowLeft', 'PageDown'];
      const stopKeys = new Set(['Escape', 'Enter', 'Tab']);
      const modifierScale = resolveModifierScale({
        altKey: event.altKey,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        shiftKey: event.shiftKey,
      });
      if (positiveKeys.includes(key)) {
        if (event.repeat && keyboardHoldKeyRef.current === key) {
          return true;
        }
        startHold(1, modifierScale, { key });
        return true;
      }
      if (negativeKeys.includes(key)) {
        if (event.repeat && keyboardHoldKeyRef.current === key) {
          return true;
        }
        startHold(-1, modifierScale, { key });
        return true;
      }
      if (stopKeys.has(key)) {
        stopHold();
        return true;
      }
      if (key === 'Home') {
        clearPendingTimeout();
        rawValueRef.current = min;
        commitQuantizedValue(min);
        startPendingTimeout();
        return true;
      }
      if (key === 'End') {
        clearPendingTimeout();
        rawValueRef.current = max;
        commitQuantizedValue(max);
        startPendingTimeout();
        return true;
      }
      return false;
    },
    [commitQuantizedValue, disabled, max, min, moveFocus, orientation, startHold, stopHold, clearPendingTimeout, startPendingTimeout],
  );

  useKeyboardBinding({
    keys: effectiveKeyBindings,
    mode: config.keyInputMode ?? 'focus',
    acceptWhenBlurred: config.keyAcceptWhenBlurred ?? false,
    targetRef: sliderRootRef,
    enabled: !disabled,
    onKeyDown: handleKeyboardCommand,
    onKeyUp: () => stopHold(),
  });

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
      // Note: stopHold not called here to avoid killing drag state? 
      // Actually stopHold clears interval, but we are dragging.
      const actual = transform.toActual ? transform.toActual(rawValue) : rawValue;
      const next = clamp(actual, min, max);
      rawValueRef.current = next;
      commitQuantizedValue(next);
    },
    [commitQuantizedValue, max, min, pointerInteractive, transform],
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

  // Handlers for operation-based button control
  const handleIncrementPress = useCallback(() => {
    if (config.incrementOperation?.onPress) {
      incrementPressedRef.current = true;  // Mark as pressed

      // If button operations disable optimistic UI, clear pendingValue
      // to allow immediate sync with backend
      if (config.buttonOperationsDisableOptimistic) {
        setPendingValue(null);
        // Don't lock - let backend values update immediately
      } else {
        clearPendingTimeout(); // Lock during operation
      }

      void store.runOperation(
        config.nodePath,
        config.kind,
        config.incrementOperation.onPress,
        {}
      );

      if (config.simulateValueOnOperation) {
        startHold(1, 1, { simulationOnly: true });
      }
    }
  }, [config, store, clearPendingTimeout, startHold]);

  const handleIncrementRelease = useCallback(() => {
    // Only send release command if button was actually pressed
    if (config.incrementOperation?.onRelease && incrementPressedRef.current) {
      incrementPressedRef.current = false;  // Reset state

      void store.runOperation(
        config.nodePath,
        config.kind,
        config.incrementOperation.onRelease,
        {}
      );

      // If not using optimistic UI, don't start timeout
      // Let backend values continue to update
      if (!config.buttonOperationsDisableOptimistic) {
        startPendingTimeout(); // Unlock after release
      }

      if (config.simulateValueOnOperation) {
        stopHold({ simulationOnly: true });
      }
    }
  }, [config, store, startPendingTimeout, stopHold]);

  const handleDecrementPress = useCallback(() => {
    if (config.decrementOperation?.onPress) {
      decrementPressedRef.current = true;  // Mark as pressed

      // If button operations disable optimistic UI, clear pendingValue
      // to allow immediate sync with backend
      if (config.buttonOperationsDisableOptimistic) {
        setPendingValue(null);
        // Don't lock - let backend values update immediately
      } else {
        clearPendingTimeout(); // Lock during operation
      }

      void store.runOperation(
        config.nodePath,
        config.kind,
        config.decrementOperation.onPress,
        {}
      );

      if (config.simulateValueOnOperation) {
        startHold(-1, 1, { simulationOnly: true });
      }
    }
  }, [config, store, clearPendingTimeout, startHold]);

  const handleDecrementRelease = useCallback(() => {
    // Only send release command if button was actually pressed
    if (config.decrementOperation?.onRelease && decrementPressedRef.current) {
      decrementPressedRef.current = false;  // Reset state

      void store.runOperation(
        config.nodePath,
        config.kind,
        config.decrementOperation.onRelease,
        {}
      );

      // If not using optimistic UI, don't start timeout
      // Let backend values continue to update
      if (!config.buttonOperationsDisableOptimistic) {
        startPendingTimeout(); // Unlock after release
      }

      if (config.simulateValueOnOperation) {
        stopHold({ simulationOnly: true });
      }
    }
  }, [config, store, startPendingTimeout, stopHold]);

  const increaseButton = (
    <button
      type="button"
      className="zcam-slider-step-btn zcam-slider-step-increase"
      onPointerDown={(e) => {
        e.preventDefault();
        if (config.incrementOperation) {
          handleIncrementPress();
        } else {
          if (e.currentTarget.setPointerCapture) {
            try {
              e.currentTarget.setPointerCapture(e.pointerId);
            } catch {
              // ignore if capture fails
            }
          }
          startHold(1, resolveModifierScale(e));
        }
      }}
      onPointerUp={(e) => {
        e.preventDefault();
        if (config.incrementOperation) {
          handleIncrementRelease();
          if (config.simulateValueOnOperation) {
            // Also need to release pointer capture if we were holding
            if (e.currentTarget.releasePointerCapture) {
              try {
                e.currentTarget.releasePointerCapture(e.pointerId);
              } catch {
                // ignore release errors
              }
            }
          }
        } else {
          if (e.currentTarget.releasePointerCapture) {
            try {
              e.currentTarget.releasePointerCapture(e.pointerId);
            } catch {
              // ignore release errors
            }
          }
          stopHold();
        }
      }}
      onPointerLeave={() => {
        if (config.incrementOperation) {
          handleIncrementRelease();
          // handleIncrementRelease already calls stopHold if simulating
        } else {
          stopHold();
        }
      }}
      onPointerCancel={() => {
        if (config.incrementOperation) {
          handleIncrementRelease();
        } else {
          stopHold();
        }
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        if (config.incrementOperation) {
          handleIncrementRelease();
        } else {
          stopHold();
        }
      }}
      onTouchStart={(e) => {
        e.preventDefault();
        if (config.incrementOperation) {
          handleIncrementPress();
        } else {
          startHold(1);
        }
      }}
      onTouchEnd={(e) => {
        e.preventDefault();
        if (config.incrementOperation) {
          handleIncrementRelease();
        } else {
          stopHold();
        }
      }}
      onTouchCancel={(e) => {
        e.preventDefault();
        if (config.incrementOperation) {
          handleIncrementRelease();
        } else {
          stopHold();
        }
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
        if (config.decrementOperation) {
          handleDecrementPress();
        } else {
          if (e.currentTarget.setPointerCapture) {
            try {
              e.currentTarget.setPointerCapture(e.pointerId);
            } catch {
              // ignore
            }
          }
          startHold(-1, resolveModifierScale(e));
        }
      }}
      onPointerUp={(e) => {
        e.preventDefault();
        if (config.decrementOperation) {
          handleDecrementRelease();
          if (config.simulateValueOnOperation) {
            // Also need to release pointer capture if we were holding
            if (e.currentTarget.releasePointerCapture) {
              try {
                e.currentTarget.releasePointerCapture(e.pointerId);
              } catch {
                // ignore release errors
              }
            }
          }
        } else {
          if (e.currentTarget.releasePointerCapture) {
            try {
              e.currentTarget.releasePointerCapture(e.pointerId);
            } catch {
              // ignore release errors
            }
          }
          stopHold();
        }
      }}
      onPointerLeave={() => {
        if (config.decrementOperation) {
          handleDecrementRelease();
          // handleDecrementRelease already calls stopHold if simulating
        } else {
          stopHold();
        }
      }}
      onPointerCancel={() => {
        if (config.decrementOperation) {
          handleDecrementRelease();
        } else {
          stopHold();
        }
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        if (config.decrementOperation) {
          handleDecrementRelease();
        } else {
          stopHold();
        }
      }}
      onTouchStart={(e) => {
        e.preventDefault();
        if (config.decrementOperation) {
          handleDecrementPress();
        } else {
          startHold(-1);
        }
      }}
      onTouchEnd={(e) => {
        e.preventDefault();
        if (config.decrementOperation) {
          handleDecrementRelease();
        } else {
          stopHold();
        }
      }}
      onTouchCancel={(e) => {
        e.preventDefault();
        if (config.decrementOperation) {
          handleDecrementRelease();
        } else {
          stopHold();
        }
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
        {!config.hideHeaderValue ? <span className="zcam-slider-value">{displayValue}</span> : null}
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
        data-path={config.nodePath}
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
              e.preventDefault();  // 阻止默认的点击跳转行为，只允许拖动

              // Don't call stopHold() - it causes two problems:
              // 1. Sends unwanted commands on click
              // 2. Sets pendingValue to incorrect values (possibly 0)
              // Instead, only clear necessary state:

              // Clear any button hold timer
              if (holdTimerRef.current) {
                clearInterval(holdTimerRef.current);
                holdTimerRef.current = null;
              }

              // Clear pending timeout to lock during drag
              clearPendingTimeout(); // LOCK: Drag started
            }}
            onPointerUp={(e) => {
              // Drag ended
              startPendingTimeout(); // 10s Unlock
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

// 归一化速度常量
export const DEFAULT_NORMALIZED_SPEED = 0.01;  // 每次更新1%
