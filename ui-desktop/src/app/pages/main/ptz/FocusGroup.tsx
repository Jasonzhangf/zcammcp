import React, { useState } from 'react';

import type { ContainerNode } from '../../../framework/container/ContainerNode.js';
import { SliderControl } from '../../../components/SliderControl.js';
import type { SliderControlConfig } from '../../../framework/ui/ControlConfig.js';
import { PTZ_FOCUS_RANGE } from '../../../app/operations/ptzOperations.js';

export const focusGroupNode: ContainerNode = {
  path: 'zcam.camera.pages.main.ptz.focusGroup',
  role: 'group',
  kind: 'ptz.focusGroup',
  selectable: true,
  children: [],
};

const focusSliderConfig: SliderControlConfig = {
  nodePath: 'zcam.camera.pages.main.ptz.focus',
  kind: 'ptz.focus',
  label: 'Focus',
  operationId: 'ptz.setFocus',
  orientation: 'horizontal',
  size: 'medium',
  valueRange: { min: PTZ_FOCUS_RANGE.min, max: PTZ_FOCUS_RANGE.max, step: 5 },
  readValue: (view) => view.camera.ptz?.focus?.value ?? PTZ_FOCUS_RANGE.min,
  formatValue: (value) => String(value),
  enablePointerDrag: true,
  profileKey: 'gentle',
};

interface FocusGroupProps {
  disabled?: boolean;
}

export function FocusGroup({ disabled = false }: FocusGroupProps = {}) {
  const [afOn, setAfOn] = useState(true);
  const [editRange, setEditRange] = useState(false);
  const [editingPreset, setEditingPreset] = useState<'far' | 'near' | null>(null);

  const toggleAf = () => {
    if (disabled) return;
    setAfOn((prev) => !prev);
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
          <span className={afOn ? 'zcam-toggle-label-on' : 'zcam-toggle-label-off'}>
            {afOn ? 'AF' : 'MF'}
          </span>
        </div>
      </div>

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
