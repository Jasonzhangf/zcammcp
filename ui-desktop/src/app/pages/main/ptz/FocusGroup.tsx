import React, { useState, useEffect, useMemo } from 'react';

import type { ContainerNode } from '../../../framework/container/ContainerNode.js';
import { SliderControl } from '../../../components/SliderControl.js';
import type { SliderControlConfig } from '../../../framework/ui/ControlConfig.js';
import { PTZ_FOCUS_RANGE } from '../../../app/operations/ptzOperations.js';
import { usePageStore, useViewState } from '../../../hooks/usePageStore.js';

export const focusGroupNode: ContainerNode = {
  path: 'zcam.camera.pages.main.ptz.focusGroup',
  role: 'group',
  kind: 'ptz.focusGroup',
  selectable: true,
  children: [],
};

export const focusSliderConfig: SliderControlConfig = {
  nodePath: 'zcam.camera.pages.main.ptz.focus',
  kind: 'ptz.focus',
  label: 'Focus',
  operationId: 'ptz.setFocus', // For slider drag
  orientation: 'horizontal',
  size: 'small',
  valueRange: { min: PTZ_FOCUS_RANGE.min, max: PTZ_FOCUS_RANGE.max, step: 1 },

  // Read dynamic range from camera state
  readValueRange: (view) => {
    const focus = view.camera.ptz?.focus;
    if (focus && typeof focus.min === 'number' && typeof focus.max === 'number') {
      return { min: focus.min, max: focus.max, step: focus.step ?? 1 };
    }
    return { min: PTZ_FOCUS_RANGE.min, max: PTZ_FOCUS_RANGE.max, step: 1 };
  },

  readValue: (view) => {
    const val = view.camera.ptz?.focus?.value;
    return typeof val === 'number' ? val : PTZ_FOCUS_RANGE.min;
  },
  onValueChange: (value, store) => {
    store.runOperation('zcam.camera.pages.main.ptz.focus', 'ptz.focus', 'ptz.setFocus', { value });
  },
  formatValue: (value) => String(Math.round(value)),
  enablePointerDrag: true,
  profileKey: 'gentle',
  hideHeaderValue: true,
  focusGroupId: 'zcam.camera.pages.main.ptz',
  keyAcceptWhenBlurred: true,

  // New: +/- button operations for continuous control
  incrementOperation: {
    onPress: 'ptz.focusFar',
    onRelease: 'ptz.focusStop',
  },
  decrementOperation: {
    onPress: 'ptz.focusNear',
    onRelease: 'ptz.focusStop',
  },
  buttonOperationsDisableOptimistic: true,
};

interface FocusGroupProps {
  disabled?: boolean;
}

export function FocusGroup({ disabled = false }: FocusGroupProps = {}) {
  const store = usePageStore();
  const { camera } = useViewState();
  
  // State for Focus Mode Toggle
  const [overrideMode, setOverrideMode] = useState<'AF' | 'MF' | null>(null);
  const [syncPaused, setSyncPaused] = useState(false);
  const [lastInteract, setLastInteract] = useState(0);
  const [frozenValue, setFrozenValue] = useState<number>(PTZ_FOCUS_RANGE.min);

  // 1. Determine effective AF state
  const backendMode = camera.ptz?.focusMode?.value;
  
  // Clear override when backend catches up
  useEffect(() => {
    if (overrideMode && backendMode === overrideMode) {
      setOverrideMode(null);
    }
  }, [backendMode, overrideMode]);

  const displayMode = overrideMode ?? backendMode ?? 'AF';
  const afOn = displayMode === 'AF';

  // 2. Handle Sync Pause
  useEffect(() => {
    if (syncPaused) {
      const timer = setTimeout(() => setSyncPaused(false), 10000);
      return () => clearTimeout(timer);
    }
  }, [syncPaused, lastInteract]);

  const [editRange, setEditRange] = useState(false);
  const [editingPreset, setEditingPreset] = useState<'far' | 'near' | null>(null);

  const toggleAf = () => {
    if (disabled) return;
    const newMode = afOn ? 'MF' : 'AF';
    
    // Optimistic update
    setOverrideMode(newMode);

    // Pause sync for 10s
    const currentVal = camera.ptz?.focus?.value ?? PTZ_FOCUS_RANGE.min;
    setFrozenValue(currentVal);
    setSyncPaused(true);

    store.runOperation('zcam.camera.pages.main.ptz.focus', 'ptz.focus', 'ptz.setFocusMode', { value: newMode });
  };

  const toggleEdit = () => {
    if (disabled) return;
    setEditRange((prev) => !prev);
    if (editRange) {
      setEditingPreset(null);
    }
  };

  const handlePresetClick = (target: 'far' | 'near') => {
    if (disabled || !editRange) {
      return;
    }
    setEditingPreset(target);
  };

  // Dynamic config to handle sync pause and interaction
  const activeSliderConfig = useMemo(() => {
    const baseConfig = {
      ...focusSliderConfig,
      readValue: (view: any) => {
        // If sync is paused, return frozen value to stop UI from updating with backend
        if (syncPaused) {
          return frozenValue;
        }
        return focusSliderConfig.readValue ? focusSliderConfig.readValue(view) : PTZ_FOCUS_RANGE.min;
      },
      onValueChange: (value: number, store: any, context?: { simulationOnly?: boolean }) => {
        // Guard: if we are in AF mode, do NOT allow sending commands
        if (afOn && !editRange) return;

        // If user interacts, pause sync to allow local simulation without interference
        setSyncPaused(true);
        setFrozenValue(value);
        setLastInteract(Date.now()); // Reset 10s timer

        // Only send SetFocus command if NOT a simulation update
        if (!context?.simulationOnly && focusSliderConfig.onValueChange) {
          focusSliderConfig.onValueChange(value, store);
        }
      }
    };

    // Use custom profile for Manual Focus to simulate slow lens movement (15s full range)
    // Enable simulation on operation to update UI locally while holding +/- buttons
    if (!afOn) {
      baseConfig.profileKey = 'focus_manual';
      baseConfig.simulateValueOnOperation = true;
    }

    // Remove operations in AF mode (disabled)
    if (afOn && !editRange) {
      delete baseConfig.incrementOperation;
      delete baseConfig.decrementOperation;
    }

    return baseConfig;
  }, [syncPaused, frozenValue, afOn, editRange]);

  return (
    <div className="zcam-ptz-focus-wrap" data-path="zcam.camera.pages.main.ptz.focusGroup">
      <div className="zcam-slider-row" data-path="zcam.camera.pages.main.ptz.focusRow">
        <SliderControl config={activeSliderConfig} disabled={disabled || (afOn && !editRange)} />
        <div className="zcam-toggle-group" data-path="zcam.camera.pages.main.ptz.focusMode">
          <button
            type="button"
            className={`zcam-toggle ${afOn ? 'zcam-toggle-on' : 'zcam-toggle-off'}`}
            onClick={toggleAf}
            disabled={disabled}
          >
            <span className="zcam-toggle-knob" />
          </button>
          <span className={afOn ? 'zcam-toggle-label-on' : 'zcam-toggle-label-off'} style={{ minWidth: '40px', textAlign: 'right' }}>
            {afOn ? 'AUTO' : 'MANUAL'}
          </span>
        </div>
      </div>

      {/* Optional: Focus Limit Row can be conditionally rendered or kept if desired. 
          The user only asked for Focus Control and Focus Switch. 
          Keeping it as it provides extra functionality which is good. */}
      {/* <div className="zcam-ptz-focus-limit-row" data-path="zcam.camera.pages.main.ptz.focusLimit">
        <span className="zcam-ptz-focus-limit-label">Focus Limit</span>
        <div className="zcam-ptz-focus-limit-buttons">
          <button
            type="button"
            className="zcam-ptz-focus-limit-btn"
            style={{
              background: editingPreset === 'far' ? '#ff6b35' : 'transparent',
              color: editingPreset === 'far' ? '#fff' : '#ccc',
            }}
            onClick={() => handlePresetClick('far')}
            disabled={disabled}
          >
            Far
          </button>
          <button
            type="button"
            className="zcam-ptz-focus-limit-btn"
            style={{
              background: editingPreset === 'near' ? '#ff6b35' : 'transparent',
              color: editingPreset === 'near' ? '#fff' : '#ccc',
            }}
            onClick={() => handlePresetClick('near')}
            disabled={disabled}
          >
            Near
          </button>
          <button type="button" className="zcam-ptz-focus-limit-btn" onClick={toggleEdit} disabled={disabled}>
            {editRange ? 'Finish Edit' : 'Edit'}
          </button>
        </div>
      </div> */}
    </div>
  );
}
