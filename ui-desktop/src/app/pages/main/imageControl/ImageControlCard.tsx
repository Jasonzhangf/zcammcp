import React, { useMemo } from 'react';

import type { ContainerNode } from '../../../framework/container/ContainerNode.js';
import { SliderControl } from '../../../components/SliderControl.js';
import { ToggleControl } from '../../../components/ToggleControl.js';
import type { SliderControlConfig, ToggleControlConfig } from '../../../framework/ui/ControlConfig.js';
import { ShutterSelect } from '../../../controls/image/ShutterSelect/ShutterSelect.js';
import { IsoSelect } from '../../../controls/image/IsoSelect/IsoSelect.js';
import { useViewState } from '../../../hooks/usePageStore.js';
import { useContainerData, useContainerState } from '../../../hooks/useContainerStore.js';

const TEMPERATURE_MIN_DEFAULT = 3200;
const TEMPERATURE_MAX_DEFAULT = 6500;
const TEMPERATURE_STEP_DEFAULT = 100;

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function formatPercent(value: number): string {
  return `${Math.round(clamp(value, 0, 100))}%`;
}

function formatTemperature(
  value: number,
  range?: { min: number; max: number; step: number },
): string {
  const min = range?.min ?? TEMPERATURE_MIN_DEFAULT;
  const max = range?.max ?? TEMPERATURE_MAX_DEFAULT;
  const step = range?.step ?? TEMPERATURE_STEP_DEFAULT;

  const limited = clamp(value, min, max);
  const snapped = min + Math.round((limited - min) / step) * step;
  return `${clamp(snapped, min, max)}K`;
}

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
  label: 'Temp',
  operationId: 'whiteBalance.setTemperature',
  orientation: 'horizontal',
  size: 'medium',
  valueRange: { min: 2000, max: 10000, step: 100 },
  readValue: (view) => view.camera.whiteBalance?.temperature?.value ?? 5600,
  readValueRange: (view) => {
    const t = view.camera.whiteBalance?.temperature;
    return {
      min: t?.min ?? TEMPERATURE_MIN_DEFAULT,
      max: t?.max ?? TEMPERATURE_MAX_DEFAULT,
      step: t?.step ?? TEMPERATURE_STEP_DEFAULT,
    };
  },
  formatValue: (value, range) => formatTemperature(value, range),
  enablePointerDrag: true,
  minHoldStep: 100,
  profileKey: 'gentle',
};

const brightnessSliderConfig: SliderControlConfig = {
  nodePath: 'zcam.camera.pages.main.image.brightness',
  kind: 'image.brightness',
  label: 'Brightness',
  operationId: 'image.setBrightness',
  orientation: 'horizontal',
  size: 'medium',
  valueRange: { min: 0, max: 100, step: 1 },
  readValue: (view) => view.camera.image?.brightness ?? 50,
  formatValue: (value) => formatPercent(value),
  enablePointerDrag: true,
  minHoldStep: 1,
  profileKey: 'gentle',
};

const contrastSliderConfig: SliderControlConfig = {
  nodePath: 'zcam.camera.pages.main.image.contrast',
  kind: 'image.contrast',
  label: 'Contrast',
  operationId: 'image.setContrast',
  orientation: 'horizontal',
  size: 'medium',
  valueRange: { min: 0, max: 100, step: 1 },
  readValue: (view) => view.camera.image?.contrast ?? 50,
  formatValue: (value) => String(Math.round(clamp(value, 0, 100))),
  enablePointerDrag: true,
  minHoldStep: 1,
  profileKey: 'gentle',
};

const saturationSliderConfig: SliderControlConfig = {
  nodePath: 'zcam.camera.pages.main.image.saturation',
  kind: 'image.saturation',
  label: 'Saturation',
  operationId: 'image.setSaturation',
  orientation: 'horizontal',
  size: 'medium',
  valueRange: { min: 0, max: 100, step: 1 },
  readValue: (view) => view.camera.image?.saturation ?? 50,
  formatValue: (value) => String(Math.round(clamp(value, 0, 100))),
  enablePointerDrag: true,
  minHoldStep: 1,
  profileKey: 'gentle',
};

export function ImageControlCard() {
  const view = useViewState();
  const containerState = useContainerState('group.image');
  const hideExposure = containerState?.data?.['hideExposure'] === true;
  const hideWhiteBalance = containerState?.data?.['hideWhiteBalance'] === true;
  const hideImageSection = containerState?.data?.['hideImageSection'] === true;

  const containerData = useMemo(
    () => ({
      exposure: {
        aeEnabled: view.camera.exposure?.aeEnabled ?? null,
        shutter: view.camera.exposure?.shutter?.value ?? null,
        iso: view.camera.exposure?.iso?.value ?? null,
      },
      whiteBalance: {
        awbEnabled: view.camera.whiteBalance?.awbEnabled ?? null,
        temperature: view.camera.whiteBalance?.temperature?.value ?? null,
        temperatureMin: view.camera.whiteBalance?.temperature?.min ?? null,
        temperatureMax: view.camera.whiteBalance?.temperature?.max ?? null,
        temperatureStep: view.camera.whiteBalance?.temperature?.step ?? null,
      },
      image: {
        brightness: view.camera.image?.brightness ?? null,
        contrast: view.camera.image?.contrast ?? null,
        saturation: view.camera.image?.saturation ?? null,
      },
    }),
    [
      view.camera.exposure?.aeEnabled,
      view.camera.exposure?.iso?.value,
      view.camera.exposure?.shutter?.value,
      view.camera.image?.brightness,
      view.camera.image?.contrast,
      view.camera.image?.saturation,
      view.camera.whiteBalance?.awbEnabled,
      view.camera.whiteBalance?.temperature?.value,
      view.camera.whiteBalance?.temperature?.min,
      view.camera.whiteBalance?.temperature?.max,
      view.camera.whiteBalance?.temperature?.step,
    ],
  );

  useContainerData('group.image', containerData);

  return (
    <div className="zcam-card" data-path="zcam.camera.pages.main.imageControl">
      <div className="zcam-card-header">
        <span className="zcam-card-title">Image Controls</span>
        <span className="zcam-card-header-right">
          <span className="zcam-control-select" data-path="zcam.camera.pages.main.imageControl.shortcutSelect" />
        </span>
      </div>
      <div className="zcam-card-body">
        {!hideExposure && (
          <div className="zcam-subsection" data-path="zcam.camera.pages.main.exposure">
            <div className="zcam-subsection-header">
              <div className="zcam-subsection-title">Exposure</div>
              <span className="zcam-control-select" data-path="zcam.camera.pages.main.exposure.shortcutSelect" />
            </div>
            <ToggleControl config={aeToggleConfig} />

            <div className="zcam-field-row zcam-field-row-dual" data-path="zcam.camera.pages.main.exposure.shutterIso">
              <label>Shutter / ISO</label>
              <div className="zcam-field-dual-buttons">
                <ShutterSelect />
                <IsoSelect />
              </div>
            </div>
          </div>
        )}

        {!hideWhiteBalance && (
          <div className="zcam-subsection" data-path="zcam.camera.pages.main.whiteBalance">
            <div className="zcam-subsection-header">
              <div className="zcam-subsection-title">White Balance</div>
              <span className="zcam-control-select" data-path="zcam.camera.pages.main.whiteBalance.shortcutSelect" />
            </div>
            <ToggleControl config={awbToggleConfig} />
            <div className="zcam-slider-row" data-path="zcam.camera.pages.main.whiteBalance.temperature">
              <SliderControl config={temperatureSliderConfig} />
            </div>
          </div>
        )}

        {!hideImageSection && (
          <div className="zcam-subsection" data-path="zcam.camera.pages.main.image">
            <div className="zcam-subsection-header">
              <div className="zcam-subsection-title">Image</div>
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
        )}
      </div>
    </div>
  );
}
