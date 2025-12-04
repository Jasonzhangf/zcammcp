// ImageControlCard.tsx
// 路径: zcam.camera.pages.main.imageControl

import React from 'react';
import type { ContainerNode } from '../../../framework/container/ContainerNode.js';
import { usePageStore, useViewState } from '../../../hooks/usePageStore.js';
import { ShutterSelect } from '../../../controls/image/ShutterSelect/ShutterSelect.js';
import { IsoSelect } from '../../../controls/image/IsoSelect/IsoSelect.js';
import { SliderControl } from '../../../components/SliderControl.js';
import { ToggleControl } from '../../../components/ToggleControl.js';
import type { SliderControlConfig, ToggleControlConfig } from '../../../framework/ui/ControlConfig.js';

export const imageControlCardNode: ContainerNode = {
  path: 'zcam.camera.pages.main.imageControl',
  role: 'container',
  kind: 'imageControl.card',
  selectable: true,
  children: [],
};

export function ImageControlCard() {
  const store = usePageStore();
  const view = useViewState();

  const exposure = view.camera.exposure ?? {};
  const wb = view.camera.whiteBalance ?? {};

  const tempVal = wb.temperature?.value ?? 5600;
  const tempView = wb.temperature?.view ?? `${tempVal}K`;

  // AE / AWB toggle 配置
  const aeToggleConfig: ToggleControlConfig = {
    type: 'toggle',
    nodePath: 'zcam.camera.pages.main.exposure.aeMode',
    kind: 'exposure.ae',
    label: 'AE',
    operationId: 'exposure.setAeEnabled',
    readValue: (v) => !!v.camera.exposure?.aeEnabled,
  };

  const awbToggleConfig: ToggleControlConfig = {
    type: 'toggle',
    nodePath: 'zcam.camera.pages.main.whiteBalance.awbMode',
    kind: 'whiteBalance.awb',
    label: 'AWB',
    operationId: 'whiteBalance.setAwbEnabled',
    readValue: (v) => !!v.camera.whiteBalance?.awbEnabled,
  };

  // 色温 slider 配置
  const temperatureConfig: SliderControlConfig = {
    type: 'slider',
    nodePath: 'zcam.camera.pages.main.whiteBalance.temperature',
    kind: 'whiteBalance.temperature',
    label: '色温',
    operationId: 'whiteBalance.setTemperature',
    orientation: 'horizontal',
    size: 'medium',
    valueRange: { min: 3200, max: 6500, step: 50 },
    readValue: (v) => v.camera.whiteBalance?.temperature?.value ?? 5600,
    formatValue: () => tempView,
  };

  // 图像 slider 配置
  const brightnessConfig: SliderControlConfig = {
    type: 'slider',
    nodePath: 'zcam.camera.pages.main.image.brightness',
    kind: 'image.brightness',
    label: '亮度',
    operationId: 'image.setBrightness',
    orientation: 'horizontal',
    size: 'medium',
    valueRange: { min: 0, max: 100, step: 1 },
    readValue: (v) => v.camera.image?.brightness ?? 50,
    formatValue: (x) => String(x),
  };

  const contrastConfig: SliderControlConfig = {
    type: 'slider',
    nodePath: 'zcam.camera.pages.main.image.contrast',
    kind: 'image.contrast',
    label: '对比度',
    operationId: 'image.setContrast',
    orientation: 'horizontal',
    size: 'medium',
    valueRange: { min: 0, max: 100, step: 1 },
    readValue: (v) => v.camera.image?.contrast ?? 50,
    formatValue: (x) => String(x),
  };

  const saturationConfig: SliderControlConfig = {
    type: 'slider',
    nodePath: 'zcam.camera.pages.main.image.saturation',
    kind: 'image.saturation',
    label: '饱和度',
    operationId: 'image.setSaturation',
    orientation: 'horizontal',
    size: 'medium',
    valueRange: { min: 0, max: 100, step: 1 },
    readValue: (v) => v.camera.image?.saturation ?? 50,
    formatValue: (x) => String(x),
  };

  return (
    <div
      className="zcam-card"
      data-path="zcam.camera.pages.main.imageControl"
    >
      <div className="zcam-card-header">
        <span className="zcam-card-title">图像控制</span>
        <span className="zcam-card-header-right">
          <span
            className="zcam-control-select"
            data-path="zcam.camera.pages.main.imageControl.shortcutSelect"
          />
        </span>
      </div>
      <div className="zcam-card-body">
        {/* 曝光子区 */}
        <div
          className="zcam-subsection"
          data-path="zcam.camera.pages.main.exposure"
        >
          <div className="zcam-subsection-header">
            <div className="zcam-subsection-title">曝光</div>
            <span
              className="zcam-control-select"
              data-path="zcam.camera.pages.main.exposure.shortcutSelect"
            />
          </div>
          {/* AE Toggle 控件 */}
          <ToggleControl config={aeToggleConfig} />

          {/* 快门 + ISO 同行控件 */}
          <div
            className="zcam-field-row zcam-field-row-dual"
            data-path="zcam.camera.pages.main.exposure.shutterIso"
          >
            <label>快门 / ISO</label>
            <div className="zcam-field-dual-buttons">
              <ShutterSelect />
              <IsoSelect />
            </div>
          </div>
        </div>

        {/* 白平衡子区 */}
        <div
          className="zcam-subsection"
          data-path="zcam.camera.pages.main.whiteBalance"
        >
          <div className="zcam-subsection-header">
            <div className="zcam-subsection-title">白平衡</div>
            <span
              className="zcam-control-select"
              data-path="zcam.camera.pages.main.whiteBalance.shortcutSelect"
            />
          </div>
          {/* AWB toggle 控件 */}
          <ToggleControl config={awbToggleConfig} />
          {/* 色温 slider 使用 SliderControl */}
          <div
            className="zcam-slider-row"
            data-path="zcam.camera.pages.main.whiteBalance.temperature"
          >
            <SliderControl config={temperatureConfig} />
          </div>
        </div>

        {/* 图像参数子区 */}
        <div
          className="zcam-subsection"
          data-path="zcam.camera.pages.main.image"
        >
          <div className="zcam-subsection-header">
            <div className="zcam-subsection-title">图像</div>
            <span
              className="zcam-control-select"
              data-path="zcam.camera.pages.main.image.shortcutSelect"
            />
          </div>
          <div
            className="zcam-slider-row"
            data-path="zcam.camera.pages.main.image.brightness"
          >
            <SliderControl config={brightnessConfig} />
          </div>
          <div
            className="zcam-slider-row"
            data-path="zcam.camera.pages.main.image.contrast"
          >
            <SliderControl config={contrastConfig} />
          </div>
          <div
            className="zcam-slider-row"
            data-path="zcam.camera.pages.main.image.saturation"
          >
            <SliderControl config={saturationConfig} />
          </div>
        </div>
      </div>
    </div>
  );
}
