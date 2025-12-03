// FocusGroup.tsx
// 路径: zcam.camera.pages.main.ptz.focusGroup
// 负责 Focus 滑块 + AF/MF 开关 + 远/近限位 UI

import React, { useState } from 'react';
import type { ContainerNode } from '../../../framework/container/ContainerNode.js';
import { usePageStore, useViewState } from '../../../hooks/usePageStore.js';
import { SliderControl } from '../../../components/SliderControl.js';
import type { SliderControlConfig } from '../../../framework/ui/ControlConfig.js';

export const focusGroupNode: ContainerNode = {
  path: 'zcam.camera.pages.main.ptz.focusGroup',
  role: 'group',
  kind: 'ptz.focusGroup',
  selectable: true,
  children: [],
};

export function FocusGroup() {
  const store = usePageStore();
  const view = useViewState();
  const [afOn, setAfOn] = useState(true);
  const [editRange, setEditRange] = useState(false);
  const [editingPreset, setEditingPreset] = useState<'far' | 'near' | null>(null);

  const focusPath = 'zcam.camera.pages.main.ptz.focus';
  const focusSliderConfig: SliderControlConfig = {
    type: 'slider',
    nodePath: focusPath,
    kind: 'ptz.focus',
    label: 'Focus',
    orientation: 'horizontal',
    size: 'medium',
    valueRange: { min: 0, max: 100, step: 1 },
    readValue: (v) => v.camera.ptz?.focus?.value ?? 40,
    formatValue: (v) => String(v),
    operationId: 'ptz.setFocus',
  };

  const toggleAf = () => {
    setAfOn((prev) => !prev);
    // 预留: 后续接 ptz.setFocusMode
  };

  const gotoFar = () => {
    // 预留: 实际可调用 ptz.gotoFocusFar
    if (editRange) {
      setEditingPreset('far');
    }
  };

  const gotoNear = () => {
    // 预留: 实际可调用 ptz.gotoFocusNear
    if (editRange) {
      setEditingPreset('near');
    }
  };

  return (
    <div
      className="zcam-ptz-focus-wrap"
      data-path="zcam.camera.pages.main.ptz.focusGroup"
    >
      <div className="zcam-slider-row">
        <SliderControl
          config={focusSliderConfig}
          disabled={afOn && !editRange}
        />
        <div
          className="zcam-toggle-group"
          data-path="zcam.camera.pages.main.ptz.focusMode"
        >
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

      <div
        className="zcam-ptz-focus-limit-row"
        data-path="zcam.camera.pages.main.ptz.focusLimit"
      >
        <span className="zcam-ptz-focus-limit-label">Focus 限位</span>
        <div className="zcam-ptz-focus-limit-buttons">
          <button
            type="button"
            className="zcam-ptz-focus-limit-btn"
            style={{
              background: editingPreset === 'far' ? '#ff6b35' : 'transparent',
              color: editingPreset === 'far' ? 'white' : '#ccc'
            }}
            onClick={gotoFar}
          >
            远
          </button>
          <button
            type="button"
            className="zcam-ptz-focus-limit-btn"
            style={{
              background: editingPreset === 'near' ? '#ff6b35' : 'transparent',
              color: editingPreset === 'near' ? 'white' : '#ccc'
            }}
            onClick={gotoNear}
          >
            近
          </button>
          <button
            type="button"
            className="zcam-ptz-focus-limit-btn"
            onClick={() => {
              setEditRange((v) => !v);
              if (editRange) {
                setEditingPreset(null);
              }
            }}
          >
            {editRange ? '编辑完成' : '编辑'}
          </button>
        </div>
      </div>
    </div>
  );
}
