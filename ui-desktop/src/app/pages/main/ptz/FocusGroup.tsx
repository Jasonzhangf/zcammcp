import React, { useState } from 'react';

import type { ContainerNode } from '../../../framework/container/ContainerNode.js';
import { SliderControl } from '../../../components/SliderControl.js';
import type { SliderControlConfig } from '../../../framework/ui/ControlConfig.js';

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
  valueRange: { min: 0, max: 100, step: 1 },
  readValue: (view) => view.camera.ptz?.focus?.value ?? 40,
  formatValue: (value) => String(value),
};

export function FocusGroup() {
  const [afOn, setAfOn] = useState(true);
  const [editRange, setEditRange] = useState(false);
  const [editingPreset, setEditingPreset] = useState<'far' | 'near' | null>(null);

  const toggleAf = () => {
    setAfOn((prev) => !prev);
    // TODO: wire to ptz.setFocusMode once backend operation exists.
  };

  const toggleEdit = () => {
    setEditRange((prev) => !prev);
    if (editRange) {
      setEditingPreset(null);
    }
  };

  const handlePresetClick = (target: 'far' | 'near') => {
    if (!editRange) {
      return;
    }
    setEditingPreset(target);
    // TODO: add ptz.focusLimit handler once CLI plumbing is ready.
  };

  return (
    <div className="zcam-ptz-focus-wrap" data-path="zcam.camera.pages.main.ptz.focusGroup">
      <div className="zcam-slider-row" data-path="zcam.camera.pages.main.ptz.focusRow">
        <SliderControl config={focusSliderConfig} disabled={afOn && !editRange} />
        <div className="zcam-toggle-group" data-path="zcam.camera.pages.main.ptz.focusMode">
          <button
            type="button"
            className={`zcam-toggle ${afOn ? 'zcam-toggle-on' : 'zcam-toggle-off'}`}
            onClick={toggleAf}
          >
            <span className="zcam-toggle-knob" />
          </button>
          <span className={afOn ? 'zcam-toggle-label-on' : 'zcam-toggle-label-off'}>
            {afOn ? 'AF' : 'MF'}
          </span>
        </div>
      </div>

      <div className="zcam-ptz-focus-limit-row" data-path="zcam.camera.pages.main.ptz.focusLimit">
        <span className="zcam-ptz-focus-limit-label">Focus 限位</span>
        <div className="zcam-ptz-focus-limit-buttons">
          <button
            type="button"
            className="zcam-ptz-focus-limit-btn"
            style={{
              background: editingPreset === 'far' ? '#ff6b35' : 'transparent',
              color: editingPreset === 'far' ? '#fff' : '#ccc',
            }}
            onClick={() => handlePresetClick('far')}
          >
            远
          </button>
          <button
            type="button"
            className="zcam-ptz-focus-limit-btn"
            style={{
              background: editingPreset === 'near' ? '#ff6b35' : 'transparent',
              color: editingPreset === 'near' ? '#fff' : '#ccc',
            }}
            onClick={() => handlePresetClick('near')}
          >
            近
          </button>
          <button type="button" className="zcam-ptz-focus-limit-btn" onClick={toggleEdit}>
            {editRange ? '编辑完成' : '编辑'}
          </button>
        </div>
      </div>
    </div>
  );
}
