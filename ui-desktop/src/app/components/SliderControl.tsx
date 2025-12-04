// SliderControl.tsx
// 通用 slider 控件, 完全由配置驱动: nodePath + readValue + operationId

import React from 'react';
import type { SliderControlConfig } from '../framework/ui/ControlConfig.js';
import { usePageStore, useViewState } from '../hooks/usePageStore.js';

interface SliderControlProps {
  config: SliderControlConfig;
  disabled?: boolean;
  onValueChange?: (value: number) => void;
}

export const SliderControl: React.FC<SliderControlProps> = ({ config, disabled = false, onValueChange }) => {
  const store = usePageStore();
  const view = useViewState();
  const {
    nodePath,
    kind,
    label,
    orientation = 'vertical',
    size = 'medium',
    valueRange,
    readValue,
    formatValue,
    operationId,
  } = config;

  const value = readValue(view);
  const display = formatValue ? formatValue(value) : String(value);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const v = Number(e.target.value);
    await store.runOperation(nodePath, kind, operationId, { value: v });
    onValueChange?.(v);
  };

  const handleActivate = () => {
    if (disabled) return;
    store.setActiveNode(nodePath);
    store.setHighlight(nodePath, 'active');
  };

  const handleWheel = async (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    const step = valueRange.step ?? 1;
    const delta = e.deltaY > 0 ? -step : step;
    const next = Math.max(valueRange.min, Math.min(valueRange.max, value + delta));
    if (next !== value) {
      await store.runOperation(nodePath, kind, operationId, { value: next });
      onValueChange?.(next);
    }
  };

  const sizeClass =
    size === 'small'
      ? 'zcam-slider-size-small'
      : size === 'large'
      ? 'zcam-slider-size-large'
      : 'zcam-slider-size-medium';

  const orientationClass =
    orientation === 'horizontal'
      ? 'zcam-slider-orientation-horizontal'
      : 'zcam-slider-orientation-vertical';

  const ui = view.ui;
  const highlight = ui.highlightMap[nodePath] ?? 'none';
  const isActive = ui.activeNodePath === nodePath;
  const disabledClass = disabled ? 'zcam-control-disabled ' : '';

  return (
    <div
      className={
        `zcam-ptz-slider-wrap ${sizeClass} ${orientationClass} ${disabledClass}` +
        (highlight === 'hover' ? ' zcam-control-hover' : '') +
        (isActive ? ' zcam-control-active' : '')
      }
      data-path={nodePath}
      onMouseDown={(e) => {
        // 点击 slider 控件区域任意位置, 视为获得焦点
        handleActivate();
        // 阻止冒泡到 PageShell, 避免被当作点击空白而清除 active
        e.stopPropagation();
      }}
      onMouseEnter={() => {
        if (disabled) return;
        store.setHighlight(nodePath, 'hover');
      }}
      onMouseLeave={() => {
        if (disabled) return;
        if (store.uiState.activeNodePath !== nodePath) {
          store.setHighlight(nodePath, 'none');
        }
      }}
      onWheel={handleWheel}
    >
      {highlight === 'hover' && <span className="zcam-debug-hover-marker" />}
      <span className="zcam-ptz-slider-label">{label}</span>
      <input
        type="range"
        min={valueRange.min}
        max={valueRange.max}
        step={valueRange.step ?? 1}
        value={value}
        onChange={handleChange}
        onMouseDown={(e) => {
          // 保持现有行为: 在轨道上点击也会设为 active
          handleActivate();
          e.stopPropagation();
        }}
        disabled={disabled}
      />
      <span className="zcam-ptz-slider-value">{display}</span>
    </div>
  );
};
