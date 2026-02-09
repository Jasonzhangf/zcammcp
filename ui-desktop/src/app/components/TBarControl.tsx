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

export interface TBarControlProps {
    config: SliderControlConfig;
    disabled?: boolean;
    styleVariant?: 'skeuomorphic' | 'flat';
    onSimulation?: (value: number | null) => void;
}

interface SliderOperationMeta {
    normalizedSpeed?: number;
    speedMultiplier?: number;
    intervalMs?: number;
    direction?: 1 | -1;
    tick?: number;
    stop?: boolean;
}

/**
 * T-Bar Fader Control
 * A specialized vertical slider designed to mimic video switcher T-Bars.
 * Reuses the robust Debounce/Throttle logic from SliderControl to prevent Jitter.
 */
export function TBarControl({ config, disabled = false, styleVariant = 'skeuomorphic', onSimulation }: TBarControlProps) {
    const store = usePageStore();
    const view = useViewState();
    // Ensure we read a valid default
    const actualValue = config.readValue ? config.readValue(view) : config.valueRange.min;

    const [isFocused, setIsFocused] = useState(false);
    const profile = useMemo(() => {
        try {
            return getSliderProfile(config.profileKey);
        } catch {
            return getSliderProfile('default');
        }
    }, [config.profileKey]);

    const dynamicRange = config.readValueRange ? config.readValueRange(view) : undefined;
    const min = dynamicRange?.min ?? config.valueRange.min;
    const max = dynamicRange?.max ?? config.valueRange.max;
    const baseStep = dynamicRange?.step ?? config.valueRange.step ?? 1;

    // Optimistic UI state
    const [pendingValue, setPendingValue] = useState<number | null>(null);
    const pendingValueTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastSentValueRef = useRef<number>(actualValue);

    // Calculate effective values early for use in callbacks
    const effectiveValue = pendingValue ?? actualValue;
    const trackValue = clamp(effectiveValue, min, max);

    // LOGIC: Synchronous Lock & Throttle (Same as SliderControl)
    const isLockedRef = useRef(false);
    const lastCmdTimeRef = useRef(0);

    // Refs for tracking value without re-renders
    const rawValueRef = useRef(actualValue);
    const lastCommittedRef = useRef(actualValue);

    // Hold / Drag Logic
    const holdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const holdTickRef = useRef(0);
    const isDraggingRef = useRef(false);
    const trackRef = useRef<HTMLDivElement | null>(null);

    // Zoom Simulation Logic (Replaces Polling)
    const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const fzSpeed = (view.ui as any)?.fzSpeed ?? 50;
    // Use ref to avoid re-creating loop callback on speed change
    const fzSpeedRef = useRef(fzSpeed);
    fzSpeedRef.current = fzSpeed;

    const stopSimulatingZoom = useCallback(() => {
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
        }
    }, []);

    const startSimulatingZoom = useCallback((direction: 1 | -1) => {
        if (config.kind !== 'ptz.zoom') return;
        stopSimulatingZoom();

        // 1. Initial Start Sync (Best effort)
        let currentVal = effectiveValue;

        // 2. Simulation Loop
        pollIntervalRef.current = setInterval(() => {
            // Speed logic: Range 4528. Speed 100 => 2750ms. Step ≈ 1.6465 * speed.
            const stepSize = 1.6465 * fzSpeedRef.current;
            currentVal += direction * stepSize;
            currentVal = Math.max(min, Math.min(max, currentVal));

            setPendingValue(Math.round(currentVal));

            // Re-adding (Req 1+3): Push simulated value to Store so other controls update continuously
            // This is critical for keeping "Bottom Zoom Control" in sync during drag/hold.
            store.applyCameraState({
                ptz: {
                    zoom: { value: Math.round(currentVal), view: 'manual' }
                }
            });
            onSimulation?.(Math.round(currentVal));

            rawValueRef.current = currentVal;
            lastCommittedRef.current = currentVal;
        }, 100);

    }, [config.kind, stopSimulatingZoom, effectiveValue, min, max, store]);

    // Track button press state for operation-based controls
    const incrementPressedRef = useRef(false);
    const decrementPressedRef = useRef(false);

    // Sync Logic: Only update if not locked and not pending
    useEffect(() => {
        // If button operations disable optimistic UI and button is pressed,
        // immediately sync backend values
        if (config.buttonOperationsDisableOptimistic &&
            (incrementPressedRef.current || decrementPressedRef.current)) {
            rawValueRef.current = actualValue;
            lastCommittedRef.current = actualValue;
            return;
        }

        if (pendingValue === null && !isLockedRef.current) {
            rawValueRef.current = actualValue;
            lastCommittedRef.current = actualValue;
        }
    }, [actualValue, pendingValue, config.buttonOperationsDisableOptimistic]);

    // Lock Helpers
    const clearPendingTimeout = useCallback(() => {
        if (pendingValueTimeoutRef.current) {
            clearTimeout(pendingValueTimeoutRef.current);
            pendingValueTimeoutRef.current = null;
        }
        // Also clear any pending sync interval
        if (pendingSyncIntervalRef.current) {
            clearInterval(pendingSyncIntervalRef.current);
            pendingSyncIntervalRef.current = null;
        }
        isLockedRef.current = true;
    }, []);

    const pendingSyncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const startPendingTimeout = useCallback(() => {
        clearPendingTimeout();

        // Start a keeper loop to ensure the store is updated with the pending value
        // This is crucial for other controls (like the bottom zoom control) to reflect the T-Bar's state
        const enforceStore = () => {
            const val = pendingValue ?? actualValue;
            if (config.kind === 'ptz.zoom') { // Only for Zoom as requested
                store.applyCameraState({
                    ptz: { zoom: { value: val, view: 'manual' } }
                });
                onSimulation?.(val);
            }
        };
        enforceStore(); // Initial sync
        pendingSyncIntervalRef.current = setInterval(enforceStore, 100);

        pendingValueTimeoutRef.current = setTimeout(() => {
            if (pendingSyncIntervalRef.current) {
                clearInterval(pendingSyncIntervalRef.current);
                pendingSyncIntervalRef.current = null;
            }
            isLockedRef.current = false;
            setPendingValue(null);
            onSimulation?.(null);
            pendingValueTimeoutRef.current = null;
        }, 10000);
    }, [clearPendingTimeout, config.kind, store, onSimulation, pendingValue, actualValue]);

    // Backend Commit Logic
    const commitValue = useCallback(
        (next: number, meta?: SliderOperationMeta) => {
            if (disabled && !isDraggingRef.current && !meta?.stop) return;
            if (config.onValueChange) {
                config.onValueChange(next, store);
                return;
            }

            console.log('[TBarControl] commitValue:', { nodePath: config.nodePath, next, operationId: config.operationId, meta });

            const payload: OperationPayload = { value: next };
            if (meta) payload.params = { sliderMeta: meta };

            lastCmdTimeRef.current = Date.now();
            lastSentValueRef.current = next;

            // Special handling for Zoom: Send Stop before Set
            // This ensures that any continuous movement is halted before applying a new absolute position,
            // which can help with command stability on some cameras.
            if (config.kind === 'ptz.zoom') {
                void store.runOperation(config.nodePath, config.kind, 'lens.zoomStop', {}).catch(e => {
                    console.error('[TBarControl] zoomStop failed:', e);
                });
            }

            void store.runOperation(config.nodePath, config.kind, config.operationId, payload).catch((e) => {
                console.error('[TBarControl] runOperation failed:', e);
            });
        },
        [config, disabled, store],
    );

    const commitQuantizedValue = useCallback(
        (nextRaw: number, meta?: SliderOperationMeta) => {
            const steppedValue = min + Math.round((nextRaw - min) / baseStep) * baseStep;
            const clampedValue = clamp(steppedValue, min, max);

            if (Math.abs(clampedValue - lastCommittedRef.current) < Number.EPSILON) return;
            lastCommittedRef.current = clampedValue;
            setPendingValue(clampedValue);
            onSimulation?.(clampedValue);

            // Throttle: Max 1Hz (Every 1000ms) for Zoom, 10Hz (100ms) for others
            const throttleMs = config.kind === 'ptz.zoom' ? 1000 : 100;
            const now = Date.now();

            // Optimization (Req): Trigger if Delta >= 50 (Zoom) OR Time > Interval
            const lastSent = lastSentValueRef.current;
            const delta = Math.abs(clampedValue - lastSent);
            const deltaThreshold = config.kind === 'ptz.zoom' ? 50 : Infinity;

            if ((now - lastCmdTimeRef.current > throttleMs)) {
                commitValue(clampedValue, meta);
            }
        },
        [baseStep, commitValue, max, min, config.kind],
    );

    // ----------- T-Bar Interaction Logic -----------

    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        if (disabled) return;
        e.preventDefault();
        isDraggingRef.current = true;
        if (trackRef.current) {
            trackRef.current.setPointerCapture(e.pointerId);
        }

        // Sync last sent value to current position to ensures Delta is relative to Drag Start
        lastSentValueRef.current = lastCommittedRef.current;

        clearPendingTimeout(); // LOCK

        // Calculate initial jump if clicked on track
        updateValueFromPointer(e);
    }, [clearPendingTimeout, disabled]); // Add updateValueFromPointer dependency below via refs if needed or defined early

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        if (!isDraggingRef.current) return;
        e.preventDefault();
        updateValueFromPointer(e);
    }, []);

    const handlePointerUp = useCallback((e: React.PointerEvent) => {
        if (!isDraggingRef.current) return;
        e.preventDefault();
        isDraggingRef.current = false;

        // Simplified Logic: Directly use the last committed value
        const finalVal = lastCommittedRef.current;
        console.log('[TBarControl] handlePointerUp releasing:', { finalVal, disabled });

        // 1. Send command immediately
        commitValue(finalVal, { stop: true });

        // 2. Start 10s cooldown for UI sync
        startPendingTimeout();

        if (trackRef.current) {
            try {
                trackRef.current.releasePointerCapture(e.pointerId);
            } catch (err) {
                // Ignore capture release errors
            }
        }
    }, [commitValue, startPendingTimeout, disabled]);

    // Calculate value based on Y position in track
    const updateValueFromPointer = (e: React.PointerEvent) => {
        if (!trackRef.current) return;
        const rect = trackRef.current.getBoundingClientRect();
        // Vertical: Top is Max? Standard CSS sliders: Top is Min?
        // User wants "Fader". Typically Audio/Video faders: Bottom=0, Top=100.
        // Let's assume Bottom=Min, Top=Max.
        // ClientY increases downwards.
        // 0% at Bottom (Max Y), 100% at Top (Min Y).

        const relativeY = e.clientY - rect.top;
        const height = rect.height;
        // ratio 0(top) -> 1(bottom).
        // so value = max - ratio * (max-min)
        // inverted: 1 at top, 0 at bottom.
        // Wait, typical UI sliders: Top=Max (100%), Bottom=Min (0%).
        // Let's map:
        // val = min + (1 - (y / height)) * (range)

        const ratio = clamp(1 - (relativeY / height), 0, 1);
        const nextRaw = min + ratio * (max - min);
        rawValueRef.current = nextRaw;
        commitQuantizedValue(nextRaw);
    };

    // ----------- Buttons Logic (+ / -) -----------
    const stopHold = useCallback(() => {
        if (holdTimerRef.current) {
            clearInterval(holdTimerRef.current);
            holdTimerRef.current = null;
        }
        isDraggingRef.current = false; // reuse drag flag? Or just separate.
        startPendingTimeout();
        const val = lastCommittedRef.current;
        commitValue(val, { stop: true });
    }, [commitValue, startPendingTimeout]);

    const applyStep = useCallback((direction: 1 | -1) => {
        const current = rawValueRef.current;
        const nextRaw = current + direction * baseStep; // Simple step
        // For smoother hold, maybe use smaller increments? 
        // User said "Fine tune". Step is defined in config (e.g. 10 or 1).
        // Let's stick to config step for now.

        const next = clamp(nextRaw, min, max);
        rawValueRef.current = next;
        commitQuantizedValue(next);
    }, [baseStep, commitQuantizedValue, max, min]);

    const startHold = useCallback((direction: 1 | -1) => {
        if (disabled) return;
        clearPendingTimeout();
        applyStep(direction);

        // Repeat
        holdTimerRef.current = setInterval(() => {
            applyStep(direction);
        }, 100); // 10Hz repeat
    }, [applyStep, clearPendingTimeout, disabled]);

    // Handlers for increment/decrement operations (e.g., zoom/focus buttons)
    const handleIncrementPress = useCallback(() => {
        if (config.incrementOperation?.onPress) {
            incrementPressedRef.current = true;

            if (config.buttonOperationsDisableOptimistic) {
                setPendingValue(null);
            } else {
                clearPendingTimeout();
            }

            void store.runOperation(
                config.nodePath,
                config.kind,
                config.incrementOperation.onPress,
                {}
            );

            // Start simulation if this is a Zoom control
            startSimulatingZoom(1);
        }
    }, [config, store, clearPendingTimeout, startSimulatingZoom]);

    const handleIncrementRelease = useCallback(() => {
        if (config.incrementOperation?.onRelease && incrementPressedRef.current) {
            incrementPressedRef.current = false;

            void store.runOperation(
                config.nodePath,
                config.kind,
                config.incrementOperation.onRelease,
                {}
            );

            stopSimulatingZoom();

            // Force timeout lock for Zoom to prevent jump (Req 2),
            // OR use standard optimistic behavior
            if (!config.buttonOperationsDisableOptimistic || config.kind === 'ptz.zoom') {
                startPendingTimeout();
            } else {
                setPendingValue(null);
            }
        }
    }, [config, store, startPendingTimeout, stopSimulatingZoom]);

    const handleDecrementPress = useCallback(() => {
        if (config.decrementOperation?.onPress) {
            decrementPressedRef.current = true;

            if (config.buttonOperationsDisableOptimistic) {
                setPendingValue(null);
            } else {
                clearPendingTimeout();
            }

            void store.runOperation(
                config.nodePath,
                config.kind,
                config.decrementOperation.onPress,
                {}
            );

            // Start simulation if this is a Zoom control
            startSimulatingZoom(-1);
        }
    }, [config, store, clearPendingTimeout, startSimulatingZoom]);

    const handleDecrementRelease = useCallback(() => {
        if (config.decrementOperation?.onRelease && decrementPressedRef.current) {
            decrementPressedRef.current = false;

            void store.runOperation(
                config.nodePath,
                config.kind,
                config.decrementOperation.onRelease,
                {}
            );

            stopSimulatingZoom();

            // Force timeout lock for Zoom to prevent jump (Req 2),
            // OR use standard optimistic behavior
            if (!config.buttonOperationsDisableOptimistic || config.kind === 'ptz.zoom') {
                startPendingTimeout();
            } else {
                setPendingValue(null);
            }
        }
    }, [config, store, startPendingTimeout, stopSimulatingZoom]);

    // Calculate percentage for display
    const percentage = useMemo(() => {
        if (max === min) return 0;
        const ratio = (trackValue - min) / (max - min);
        return config.displayInverted ? 1 - ratio : ratio;
    }, [max, min, trackValue, config.displayInverted]);
    // percentage 0 = bottom, 1 = top.
    // We need to position handle via CSS 'top' or 'bottom'.
    // Using 'bottom' % is easier if 0 is bottom.

    // Marks generation
    const marks = useMemo(() => {
        const arr = [];
        const steps = 10;
        for (let i = 0; i <= steps; i++) {
            const val = i * 10;
            // Filter out 0 and 100 to avoid lines at the very top/bottom edges
            if (val !== 0 && val !== 100) {
                arr.push(val);
            }
        }
        return arr;
    }, []);

    return (
        <div className={`zcam-tbar-wrap zcam-tbar-${styleVariant}`}>
            {/* Header for Label - visual consistency with SliderControl */}
            {(config.label || !config.hideHeaderValue) && (
                <div className="zcam-slider-header" style={{ width: '100%' }}>
                    {config.label && <span className="zcam-slider-label">{config.label}</span>}
                    {!config.hideHeaderValue && <span className="zcam-slider-value">{Math.round(trackValue)}</span>}
                </div>
            )}

            <div className="zcam-tbar-content-body">
                <div className="zcam-tbar-buttons">
                    <button
                        className="zcam-tbar-btn"
                        onPointerDown={() => {
                            if (config.incrementOperation) {
                                handleIncrementPress();
                            } else {
                                startHold(1);
                            }
                        }}
                        onPointerUp={() => {
                            if (config.incrementOperation) {
                                handleIncrementRelease();
                            } else {
                                stopHold();
                            }
                        }}
                        onPointerLeave={() => {
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
                </div>

                <div className="zcam-tbar-inner">
                    <div
                        className="zcam-tbar-track-area"
                        ref={trackRef}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerCancel={handlePointerUp}
                        style={{ touchAction: 'none' }} // Critical for pointer events
                    >
                        {/* Background Rail */}
                        <div className="zcam-tbar-rail" />

                        {/* Marks */}
                        {marks.map(m => (
                            <div
                                key={m}
                                className={`zcam-tbar-mark ${m % 50 === 0 ? 'major' : ''}`}
                                style={{ bottom: `${m}%` }}
                            />
                        ))}

                        {/* Value Display (Centered in Track) using standard slider styles */}
                        <div style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            pointerEvents: 'none',
                            zIndex: 1
                        }}>
                            <span className="zcam-slider-track-label-value zcam-slider-track-label-empty">
                                {Math.round(trackValue)}
                            </span>
                        </div>

                        {/* Handle Pivot Container positioned by percentage */}
                        <div
                            className="zcam-tbar-handle-container"
                            style={{ bottom: `${percentage * 100}%` }}
                        >
                            <div className="zcam-tbar-handle" />
                        </div>
                    </div>
                </div>

                <div className="zcam-tbar-buttons">
                    <button
                        className="zcam-tbar-btn"
                        onPointerDown={() => {
                            if (config.decrementOperation) {
                                handleDecrementPress();
                            } else {
                                startHold(-1);
                            }
                        }}
                        onPointerUp={() => {
                            if (config.decrementOperation) {
                                handleDecrementRelease();
                            } else {
                                stopHold();
                            }
                        }}
                        onPointerLeave={() => {
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
                </div>
            </div>

            <div className="zcam-slider-thresholds">
                <span>{max}</span>
                <span>{min}</span>
            </div>

        </div>
    );
}

function clamp(val: number, min: number, max: number) {
    return Math.max(min, Math.min(max, val));
}
