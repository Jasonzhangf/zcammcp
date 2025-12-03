// PtzCard.tsx
// 映射路径: zcam.camera.pages.main.ptz

import React from 'react';
import type { ContainerNode } from '../../../framework/container/ContainerNode.js';
import { usePageStore, useViewState } from '../../../hooks/usePageStore.js';
import { SliderControl } from '../../../components/SliderControl.js';
import type { SliderControlConfig } from '../../../framework/ui/ControlConfig.js';
import { focusGroupNode, FocusGroup } from './FocusGroup.js';

export const ptzCardNode: ContainerNode = {
  path: 'zcam.camera.pages.main.ptz',
  role: 'container',
  kind: 'ptz.card',
  selectable: true,
  children: [focusGroupNode],
};

export function PtzCard() {
  const store = usePageStore();
  const view = useViewState();
  const zoomVal = view.camera.ptz?.zoom?.value ?? 50;
  const speedVal = view.camera.ptz?.speed?.value ?? 50;
  const focusVal = view.camera.ptz?.focus?.value ?? 40;

  const zoomPath = 'zcam.camera.pages.main.ptz.zoom';
  const speedPath = 'zcam.camera.pages.main.ptz.speed';
  const ui = view.ui;
  const zoomHighlight = ui.highlightMap[zoomPath] ?? 'none';
  const speedHighlight = ui.highlightMap[speedPath] ?? 'none';
  const zoomIsActive = ui.activeNodePath === zoomPath;
  const speedIsActive = ui.activeNodePath === speedPath;

  const handleZoomChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    await store.runOperation(
      'zcam.camera.pages.main.ptz.zoom',
      'ptz.zoom',
      'ptz.setZoom',
      { value: v },
    );
  };

  const handleSpeedChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    await store.runOperation(
      'zcam.camera.pages.main.ptz.speed',
      'ptz.speed',
      'ptz.setSpeed',
      { value: v },
    );
  };

  const handleZoomMouseDown = () => {
    store.setActiveNode(zoomPath);
    store.setHighlight(zoomPath, 'active');
    store.setHighlight(speedPath, 'none');
  };

  const handleSpeedMouseDown = () => {
    store.setActiveNode(speedPath);
    store.setHighlight(speedPath, 'active');
    store.setHighlight(zoomPath, 'none');
  };

  // 鼠标滚轮在 Zoom 区域时, 强制将焦点切到 Zoom 并只调整 Zoom
  const handleZoomWheel = async (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const step = e.deltaY > 0 ? -5 : 5; // 一次滚动调整 5 单位
    const next = Math.max(0, Math.min(100, zoomVal + step));
    store.setActiveNode(zoomPath);
    store.setHighlight(zoomPath, 'active');

    if (next !== zoomVal) {
      await store.runOperation(zoomPath, 'ptz.zoom', 'ptz.setZoom', { value: next });
    }
  };

  // 鼠标滚轮在 Speed 区域时, 只调整 Speed
  const handleSpeedWheel = async (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const step = e.deltaY > 0 ? -5 : 5;
    const next = Math.max(0, Math.min(100, speedVal + step));
    store.setActiveNode(speedPath);
    store.setHighlight(speedPath, 'active');

    if (next !== speedVal) {
      await store.runOperation(speedPath, 'ptz.speed', 'ptz.setSpeed', { value: next });
    }
  };

  // 使用配置描述 Zoom / Speed 控件
  const zoomSliderConfig: SliderControlConfig = {
    type: 'slider',
    nodePath: zoomPath,
    kind: 'ptz.zoom',
    label: 'Zoom',
    size: 'medium',
    valueRange: { min: 0, max: 100, step: 1 },
    readValue: (v) => v.camera.ptz?.zoom?.value ?? 50,
    formatValue: (v) => String(v),
    operationId: 'ptz.setZoom',
  };

  const speedSliderConfig: SliderControlConfig = {
    type: 'slider',
    nodePath: speedPath,
    kind: 'ptz.speed',
    label: 'Speed',
    size: 'medium',
    valueRange: { min: 0, max: 100, step: 1 },
    readValue: (v) => v.camera.ptz?.speed?.value ?? 50,
    formatValue: (v) => String(v),
    operationId: 'ptz.setSpeed',
  };

  return (
    <div
      className="zcam-card"
      data-path="zcam.camera.pages.main.ptz"
    >
      <div className="zcam-card-header">
        <span className="zcam-card-title">PTZ</span>
        <span className="zcam-card-header-right">
          <span
            className="zcam-control-select"
            data-path="zcam.camera.pages.main.ptz.shortcutSelect"
          />
        </span>
      </div>
      <div className="zcam-card-body">
        <div
          className="zcam-ptz-layout"
          data-path="zcam.camera.pages.main.ptz.layout"
        >
          <div
            className="zcam-ptz-grid"
            data-path="zcam.camera.pages.main.ptz.dpad"
          >
            <button className="zcam-ptz-btn" data-path="zcam.camera.pages.main.ptz.moveUp">
              ↑
            </button>
            <button className="zcam-ptz-btn" data-path="zcam.camera.pages.main.ptz.moveUpCenter">
              ↟
            </button>
            <button className="zcam-ptz-btn" data-path="zcam.camera.pages.main.ptz.moveUpRight">
              ↗
            </button>
            <button className="zcam-ptz-btn" data-path="zcam.camera.pages.main.ptz.moveLeft">
              ←
            </button>
            <button
              className="zcam-ptz-btn zcam-ptz-btn-main"
              data-path="zcam.camera.pages.main.ptz.stop"
            >
              ■
            </button>
            <button className="zcam-ptz-btn" data-path="zcam.camera.pages.main.ptz.moveRight">
              →
            </button>
            <button className="zcam-ptz-btn" data-path="zcam.camera.pages.main.ptz.moveDownLeft">
              ↙
            </button>
            <button className="zcam-ptz-btn" data-path="zcam.camera.pages.main.ptz.moveDown">
              ↓
            </button>
            <button className="zcam-ptz-btn" data-path="zcam.camera.pages.main.ptz.moveDownRight">
              ↘
            </button>
          </div>

          <div
            className="zcam-ptz-sliders"
            data-path="zcam.camera.pages.main.ptz.sliders"
          >
            <SliderControl config={zoomSliderConfig} />
            <SliderControl config={speedSliderConfig} />
          </div>
        </div>

        <FocusGroup />

        <div className="zcam-ptz-status-row">
          <div
            className="zcam-ptz-status-chip"
            data-path="zcam.camera.pages.main.ptz.status"
          >
            PTZ Pan 123 · Tilt -45 · Zoom {zoomVal} · Focus {focusVal}
          </div>
        </div>
      </div>
    </div>
  );
}
