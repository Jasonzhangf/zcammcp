import React from 'react';

import type { ContainerNode } from '../../../framework/container/ContainerNode.js';
import { SliderControl } from '../../../components/SliderControl.js';
import { ToggleControl } from '../../../components/ToggleControl.js';
import type { SliderControlConfig, ToggleControlConfig } from '../../../framework/ui/ControlConfig.js';
import { ShutterSelect } from '../../../controls/image/ShutterSelect/ShutterSelect.js';
import { IsoSelect } from '../../../controls/image/IsoSelect/IsoSelect.js';

export const imageControlCardNode: ContainerNode = {
  path: 'zcam.camera.pages.main.imageControl',
  role: 'container',
  kind: 'imageControl.card',
  selectable: true,
  children: [],
};

const aeToggleConfig: ToggleControlConfig = {
  nodePath: 'zcam.camera.pages.main.exposure.aeMode',
  kind: 'exposure.ae',
  label: 'AE',
  operationId: 'exposure.setAeEnabled',
  readValue: (view) => Boolean(view.camera.exposure?.aeEnabled),
  trueLabel: 'ON',
  falseLabel: 'OFF',
};

const awbToggleConfig: ToggleControlConfig = {
  nodePath: 'zcam.camera.pages.main.whiteBalance.awbMode',
  kind: 'whiteBalance.awb',
  label: 'AWB',
  operationId: 'whiteBalance.setAwbEnabled',
  readValue: (view) => Boolean(view.camera.whiteBalance?.awbEnabled),
  trueLabel: 'ON',
  falseLabel: 'OFF',
};

const temperatureSliderConfig: SliderControlConfig = {
  nodePath: 'zcam.camera.pages.main.whiteBalance.temperature',
  kind: 'whiteBalance.temperature',
  label: '色温',
  operationId: 'whiteBalance.setTemperature',
  orientation: 'horizontal',
  size: 'medium',
  valueRange: { min: 3200, max: 6500, step: 50 },
  readValue: (view) => view.camera.whiteBalance?.temperature?.value ?? 5600,
  formatValue: (value) => `${value}K`,
};

const brightnessSliderConfig: SliderControlConfig = {
  nodePath: 'zcam.camera.pages.main.image.brightness',
  kind: 'image.brightness',
  label: '亮度',
  operationId: 'image.setBrightness',
  orientation: 'horizontal',
  size: 'medium',
  valueRange: { min: 0, max: 100, step: 1 },
  readValue: (view) => view.camera.image?.brightness ?? 50,
  formatValue: (value) => String(value),
};

const contrastSliderConfig: SliderControlConfig = {
  nodePath: 'zcam.camera.pages.main.image.contrast',
  kind: 'image.contrast',
  label: '对比度',
  operationId: 'image.setContrast',
  orientation: 'horizontal',
  size: 'medium',
  valueRange: { min: 0, max: 100, step: 1 },
  readValue: (view) => view.camera.image?.contrast ?? 50,
  formatValue: (value) => String(value),
};

const saturationSliderConfig: SliderControlConfig = {
  nodePath: 'zcam.camera.pages.main.image.saturation',
  kind: 'image.saturation',
  label: '饱和度',
  operationId: 'image.setSaturation',
  orientation: 'horizontal',
  size: 'medium',
  valueRange: { min: 0, max: 100, step: 1 },
  readValue: (view) => view.camera.image?.saturation ?? 50,
  formatValue: (value) => String(value),
};

export function ImageControlCard() {
  return (
    <div className="zcam-card" data-path="zcam.camera.pages.main.imageControl">
      <div className="zcam-card-header">
        <span className="zcam-card-title">图像控制</span>
        <span className="zcam-card-header-right">
          <span className="zcam-control-select" data-path="zcam.camera.pages.main.imageControl.shortcutSelect" />
        </span>
      </div>
      <div className="zcam-card-body">
        <div className="zcam-subsection" data-path="zcam.camera.pages.main.exposure">
          <div className="zcam-subsection-header">
            <div className="zcam-subsection-title">曝光</div>
            <span className="zcam-control-select" data-path="zcam.camera.pages.main.exposure.shortcutSelect" />
          </div>
          <ToggleControl config={aeToggleConfig} />

          <div className="zcam-field-row zcam-field-row-dual" data-path="zcam.camera.pages.main.exposure.shutterIso">
            <label>快门 / ISO</label>
            <div className="zcam-field-dual-buttons">
              <ShutterSelect />
              <IsoSelect />
            </div>
          </div>
        </div>

        <div className="zcam-subsection" data-path="zcam.camera.pages.main.whiteBalance">
          <div className="zcam-subsection-header">
            <div className="zcam-subsection-title">白平衡</div>
            <span className="zcam-control-select" data-path="zcam.camera.pages.main.whiteBalance.shortcutSelect" />
          </div>
          <ToggleControl config={awbToggleConfig} />
          <div className="zcam-slider-row" data-path="zcam.camera.pages.main.whiteBalance.temperature">
            <SliderControl config={temperatureSliderConfig} />
          </div>
        </div>

        <div className="zcam-subsection" data-path="zcam.camera.pages.main.image">
          <div className="zcam-subsection-header">
            <div className="zcam-subsection-title">图像</div>
            <span className="zcam-control-select" data-path="zcam.camera.pages.main.image.shortcutSelect" />
          </div>
          <div className="zcam-slider-row" data-path="zcam.camera.pages.main.image.brightness">
            <SliderControl config={brightnessSliderConfig} />
          </div>
          <div className="zcam-slider-row" data-path="zcam.camera.pages.main.image.contrast">
            <SliderControl config={contrastSliderConfig} />
          </div>
          <div className="zcam-slider-row" data-path="zcam.camera.pages.main.image.saturation">
            <SliderControl config={saturationSliderConfig} />
          </div>
        </div>
      </div>
    </div>
  );
}
