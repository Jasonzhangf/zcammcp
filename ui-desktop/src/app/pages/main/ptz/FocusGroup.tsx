// FocusGroup.tsx
// 路径: zcam.camera.pages.main.ptz.focusGroup
// 负责 Focus 滑块 + AF/MF 开关 + 远/近限位 UI

import React, { useState } from 'react';
import type { ContainerNode } from '../../../framework/container/ContainerNode.js';
import { usePageStore, useViewState } from '../../../hooks/usePageStore.js';
import { useContainerFocus } from '../../../hooks/useContainerFocus.js';

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
  const focusVal = view.camera.ptz?.focus?.value ?? 40;

  const [afOn, setAfOn] = useState(true);

  const focusPath = 'zcam.camera.pages.main.ptz.focus';
  const focusFocus = useContainerFocus(focusPath);

  const handleFocusChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    await store.runOperation(
      'zcam.camera.pages.main.ptz.focus',
      'ptz.focus',
      'ptz.setFocus',
      { value: v },
    );
  };

  const toggleAf = () => {
    setAfOn((prev) => !prev);
    // 预留: 后续接 ptz.setFocusMode
  };

  const gotoFar = () => {
    // 预留: 实际可调用 ptz.gotoFocusFar
  };

  const gotoNear = () => {
    // 预留: 实际可调用 ptz.gotoFocusNear
  };

  return (
    <div
      className="zcam-ptz-focus-wrap zcam-debug-container-primary"
      data-path="zcam.camera.pages.main.ptz.focusGroup"
    >
      <div
        className={
          'zcam-slider-row ' +
          (focusFocus.highlight === 'hover' ? 'zcam-control-hover ' : '') +
          (focusFocus.isActive ? 'zcam-control-active' : '')
        }
        data-path="zcam.camera.pages.main.ptz.focus"
        {...focusFocus.eventHandlers}
      >
        {focusFocus.highlight === 'hover' && (
          <span className="zcam-debug-hover-marker" />
        )}
        <label>Focus</label>
        <input
          type="range"
          min={0}
          max={100}
          value={focusVal}
          onChange={handleFocusChange}
        />
        <div className="zcam-slider-meta">
          <span className="zcam-slider-value">{focusVal}</span>
          <span className="zcam-slider-range">0 - 100</span>
        </div>
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
            onClick={gotoFar}
          >
            远
          </button>
          <button
            type="button"
            className="zcam-ptz-focus-limit-btn"
            onClick={gotoNear}
          >
            近
          </button>
        </div>
      </div>
    </div>
  );
}
