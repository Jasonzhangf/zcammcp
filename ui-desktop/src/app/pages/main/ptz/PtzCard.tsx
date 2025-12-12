import React from 'react';

import type { ContainerNode } from '../../../framework/container/ContainerNode.js';
import { SliderControl } from '../../../components/SliderControl.js';
import type { SliderControlConfig } from '../../../framework/ui/ControlConfig.js';
import { useViewState } from '../../../hooks/usePageStore.js';
import { focusGroupNode, FocusGroup } from './FocusGroup.js';

export const ptzCardNode: ContainerNode = {
  path: 'zcam.camera.pages.main.ptz',
  role: 'container',
  kind: 'ptz.card',
  selectable: true,
  children: [focusGroupNode],
};

const zoomSliderConfig: SliderControlConfig = {
  nodePath: 'zcam.camera.pages.main.ptz.zoom',
  kind: 'ptz.zoom',
  label: 'Zoom',
  size: 'large',
  orientation: 'vertical',
  valueRange: { min: 0, max: 100, step: 1 },
  readValue: (view) => view.camera.ptz?.zoom?.value ?? 50,
  formatValue: (value) => String(value),
  operationId: 'ptz.setZoom',
};

const speedSliderConfig: SliderControlConfig = {
  nodePath: 'zcam.camera.pages.main.ptz.speed',
  kind: 'ptz.speed',
  label: 'Speed',
  size: 'large',
  orientation: 'vertical',
  valueRange: { min: 0, max: 100, step: 1 },
  readValue: (view) => view.camera.ptz?.speed?.value ?? 50,
  formatValue: (value) => String(value),
  operationId: 'ptz.setSpeed',
};

const arrow = {
  upLeft: '\u2196',
  up: '\u2191',
  upRight: '\u2197',
  left: '\u2190',
  stop: '\u25a0',
  right: '\u2192',
  downLeft: '\u2199',
  down: '\u2193',
  downRight: '\u2198',
};

export function PtzCard() {
  const view = useViewState();
  const zoomVal = view.camera.ptz?.zoom?.value ?? 50;
  const focusVal = view.camera.ptz?.focus?.value ?? 40;

  return (
    <div className="zcam-card" data-path="zcam.camera.pages.main.ptz">
      <div className="zcam-card-header">
        <span className="zcam-card-title">PTZ</span>
        <span className="zcam-card-header-right">
          <span className="zcam-control-select" data-path="zcam.camera.pages.main.ptz.shortcutSelect" />
        </span>
      </div>
      <div className="zcam-card-body">
        <div className="zcam-ptz-layout" data-path="zcam.camera.pages.main.ptz.layout">
          <div className="zcam-ptz-grid" data-path="zcam.camera.pages.main.ptz.dpad">
            <button className="zcam-ptz-btn" data-path="zcam.camera.pages.main.ptz.moveUpLeft">
              {arrow.upLeft}
            </button>
            <button className="zcam-ptz-btn" data-path="zcam.camera.pages.main.ptz.moveUp">
              {arrow.up}
            </button>
            <button className="zcam-ptz-btn" data-path="zcam.camera.pages.main.ptz.moveUpRight">
              {arrow.upRight}
            </button>
            <button className="zcam-ptz-btn" data-path="zcam.camera.pages.main.ptz.moveLeft">
              {arrow.left}
            </button>
            <button className="zcam-ptz-btn zcam-ptz-btn-main" data-path="zcam.camera.pages.main.ptz.stop">
              {arrow.stop}
            </button>
            <button className="zcam-ptz-btn" data-path="zcam.camera.pages.main.ptz.moveRight">
              {arrow.right}
            </button>
            <button className="zcam-ptz-btn" data-path="zcam.camera.pages.main.ptz.moveDownLeft">
              {arrow.downLeft}
            </button>
            <button className="zcam-ptz-btn" data-path="zcam.camera.pages.main.ptz.moveDown">
              {arrow.down}
            </button>
            <button className="zcam-ptz-btn" data-path="zcam.camera.pages.main.ptz.moveDownRight">
              {arrow.downRight}
            </button>
          </div>

          <div className="zcam-ptz-sliders" data-path="zcam.camera.pages.main.ptz.sliders">
            <div className="zcam-ptz-slider-column">
              <SliderControl config={zoomSliderConfig} />
            </div>
            <div className="zcam-ptz-slider-column">
              <SliderControl config={speedSliderConfig} />
            </div>
          </div>
        </div>

        <FocusGroup />

        <div className="zcam-ptz-status-row">
          <div className="zcam-ptz-status-chip" data-path="zcam.camera.pages.main.ptz.status">
            PTZ Pan 123 {'\u00b7'} Tilt -45 {'\u00b7'} Zoom {zoomVal} {'\u00b7'} Focus {focusVal}
          </div>
        </div>
      </div>
    </div>
  );
}
