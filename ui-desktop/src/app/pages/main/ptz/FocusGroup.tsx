import React, { useState } from 'react';

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
  readValueRange: () => ({ min: PTZ_FOCUS_RANGE.min, max: PTZ_FOCUS_RANGE.max, step: 1 }),

  readValue: (view) => {
    return view.camera.ptz?.focus?.value ?? PTZ_FOCUS_RANGE.min;
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
  const afOn = (camera.ptz?.focusMode?.value ?? 'AF') === 'AF';
  const [editRange, setEditRange] = useState(false);
  const [editingPreset, setEditingPreset] = useState<'far' | 'near' | null>(null);

  const toggleAf = () => {
    if (disabled) return;
    const newMode = !afOn;
    store.runOperation('zcam.camera.pages.main.ptz.focus', 'ptz.focus', 'ptz.setFocusMode', { value: newMode ? 'AF' : 'MF' });
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

  return (
    <div className="zcam-ptz-focus-wrap" data-path="zcam.camera.pages.main.ptz.focusGroup">
      <div className="zcam-slider-row" data-path="zcam.camera.pages.main.ptz.focusRow">
        <SliderControl config={focusSliderConfig} disabled={disabled || (afOn && !editRange)} />
        <div className="zcam-toggle-group" data-path="zcam.camera.pages.main.ptz.focusMode">
          <button
            type="button"
            className={`zcam-toggle ${afOn ? 'zcam-toggle-on' : 'zcam-toggle-off'}`}
            onClick={toggleAf}
            disabled={disabled}
          >
            <span className="zcam-toggle-knob" />
          </button>
          <span className={afOn ? 'zcam-toggle-label-on' : 'zcam-toggle-label-off'} style={{ minWidth: '80px', textAlign: 'right' }}>
            {afOn ? 'FOCUS AUTO' : 'MANUAL'}
          </span>
        </div>
      </div>

      {/* Optional: Focus Limit Row can be conditionally rendered or kept if desired. 
          The user only asked for Focus Control and Focus Switch. 
          Keeping it as it provides extra functionality which is good. */}
      <div className="zcam-ptz-focus-limit-row" data-path="zcam.camera.pages.main.ptz.focusLimit">
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
      </div>
    </div>
  );
}
