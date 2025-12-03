// ImageControlCard.tsx
// 路径: zcam.camera.pages.main.imageControl

import React, { useState } from 'react';
import type { ContainerNode } from '../../../framework/container/ContainerNode.js';
import { usePageStore, useViewState } from '../../../hooks/usePageStore.js';

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
  const img = view.camera.image ?? {};

  const [showShutterGrid, setShowShutterGrid] = useState(true); // 预览阶段默认展开
  const [showIsoGrid, setShowIsoGrid] = useState(true);

  const handleAeToggle = async () => {
    const next = !exposure.aeEnabled;
    await store.runOperation(
      'zcam.camera.pages.main.exposure.aeMode',
      'exposure.ae',
      'exposure.setAeEnabled',
      { value: next },
    );
  };

  const handleShutterSelect = async (value: number) => {
    await store.runOperation(
      'zcam.camera.pages.main.exposure.shutter',
      'exposure.shutter',
      'exposure.setShutter',
      { value },
    );
    setShowShutterGrid(false);
  };

  const handleIsoSelect = async (value: number) => {
    await store.runOperation(
      'zcam.camera.pages.main.exposure.iso',
      'exposure.iso',
      'exposure.setIso',
      { value },
    );
    setShowIsoGrid(false);
  };

  const handleAwbToggle = async () => {
    const next = !wb.awbEnabled;
    await store.runOperation(
      'zcam.camera.pages.main.whiteBalance.awbMode',
      'whiteBalance.awb',
      'whiteBalance.setAwbEnabled',
      { value: next },
    );
  };

  const handleTempChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    await store.runOperation(
      'zcam.camera.pages.main.whiteBalance.temperature',
      'whiteBalance.temperature',
      'whiteBalance.setTemperature',
      { value: v },
    );
  };

  const handleImgSlider = async (kind: 'brightness' | 'contrast' | 'saturation', v: number) => {
    const opId =
      kind === 'brightness'
        ? 'image.setBrightness'
        : kind === 'contrast'
        ? 'image.setContrast'
        : 'image.setSaturation';

    await store.runOperation(
      `zcam.camera.pages.main.image.${kind}`,
      `image.${kind}`,
      opId,
      { value: v },
    );
  };

  const aeOn = !!exposure.aeEnabled;
  const awbOn = !!wb.awbEnabled;

  const shutterView = exposure.shutter?.view ?? '1/60';
  const isoView = exposure.iso?.view ?? '800';
  const tempVal = wb.temperature?.value ?? 5600;
  const tempView = wb.temperature?.view ?? `${tempVal}K`;

  const brightness = img.brightness ?? 50;
  const contrast = img.contrast ?? 50;
  const saturation = img.saturation ?? 50;

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
          <div
            className="zcam-field-row"
            data-path="zcam.camera.pages.main.exposure.aeMode"
          >
            <label>AE</label>
            <div className="zcam-toggle-group">
              <button
                type="button"
                className={`zcam-toggle ${aeOn ? 'zcam-toggle-on' : 'zcam-toggle-off'}`}
                data-path="zcam.camera.pages.main.exposure.aeToggle"
                onClick={handleAeToggle}
              >
                <span className="zcam-toggle-knob" />
              </button>
              <span className={aeOn ? 'zcam-toggle-label-on' : 'zcam-toggle-label-off'}>
                {aeOn ? 'ON' : 'OFF'}
              </span>
            </div>
          </div>
          <div
            className="zcam-field-row"
            data-path="zcam.camera.pages.main.exposure.shutter"
          >
            <label>快门</label>
            <button
              type="button"
              className="zcam-grid-trigger"
              onClick={() => setShowShutterGrid(true)}
            >
              {shutterView}
            </button>
            <span className="zcam-field-range">1/30 - 1/500</span>
          </div>
          {showShutterGrid && (
            <div className="zcam-option-grid">
              {[30, 40, 50, 60, 80, 100, 120, 160, 200, 250, 320, 500].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => handleShutterSelect(v)}
                >
                  1/{v}
                </button>
              ))}
            </div>
          )}

          <div
            className="zcam-field-row"
            data-path="zcam.camera.pages.main.exposure.iso"
          >
            <label>ISO</label>
            <button
              type="button"
              className="zcam-grid-trigger"
              onClick={() => setShowIsoGrid(true)}
            >
              {isoView}
            </button>
            <span className="zcam-field-range">100 - 3200</span>
          </div>
          {showIsoGrid && (
            <div className="zcam-option-grid">
              {[100, 200, 400, 800, 1600, 3200, 6400, 12800].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => handleIsoSelect(v)}
                >
                  {v}
                </button>
              ))}
            </div>
          )}
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
          <div
            className="zcam-field-row"
            data-path="zcam.camera.pages.main.whiteBalance.awbMode"
          >
            <label>AWB</label>
            <div className="zcam-toggle-group">
              <button
                type="button"
                className={`zcam-toggle ${awbOn ? 'zcam-toggle-on' : 'zcam-toggle-off'}`}
                data-path="zcam.camera.pages.main.whiteBalance.awbToggle"
                onClick={handleAwbToggle}
              >
                <span className="zcam-toggle-knob" />
              </button>
              <span className={awbOn ? 'zcam-toggle-label-on' : 'zcam-toggle-label-off'}>
                {awbOn ? 'ON' : 'OFF'}
              </span>
            </div>
          </div>
          <div
            className="zcam-slider-row"
            data-path="zcam.camera.pages.main.whiteBalance.temperature"
          >
            <label>色温</label>
            <input
              type="range"
              min={3200}
              max={6500}
              value={tempVal}
              onChange={handleTempChange}
            />
            <div className="zcam-slider-meta">
              <span className="zcam-slider-value">{tempView}</span>
              <span className="zcam-slider-range">3200K - 6500K</span>
            </div>
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
            <label>亮度</label>
            <input
              type="range"
              min={0}
              max={100}
              value={brightness}
              onChange={(e) => handleImgSlider('brightness', Number(e.target.value))}
            />
            <div className="zcam-slider-meta">
              <span className="zcam-slider-value">{brightness}</span>
              <span className="zcam-slider-range">0 - 100</span>
            </div>
          </div>
          <div
            className="zcam-slider-row"
            data-path="zcam.camera.pages.main.image.contrast"
          >
            <label>对比度</label>
            <input
              type="range"
              min={0}
              max={100}
              value={contrast}
              onChange={(e) => handleImgSlider('contrast', Number(e.target.value))}
            />
            <div className="zcam-slider-meta">
              <span className="zcam-slider-value">{contrast}</span>
              <span className="zcam-slider-range">0 - 100</span>
            </div>
          </div>
          <div
            className="zcam-slider-row"
            data-path="zcam.camera.pages.main.image.saturation"
          >
            <label>饱和度</label>
            <input
              type="range"
              min={0}
              max={100}
              value={saturation}
              onChange={(e) => handleImgSlider('saturation', Number(e.target.value))}
            />
            <div className="zcam-slider-meta">
              <span className="zcam-slider-value">{saturation}</span>
              <span className="zcam-slider-range">0 - 100</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

