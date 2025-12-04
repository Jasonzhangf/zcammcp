// CardHost.tsx
// 通用卡片壳组件: 根据 CardConfig 和 size 渲染固定比例的卡片容器

import React from 'react';
import type { CardConfig, CardSizePreset } from '../framework/ui/CardConfig.js';

interface CardHostProps {
  config: CardConfig;
  size: CardSizePreset;
  children: React.ReactNode;
}

const sizeScale: Record<CardSizePreset, number> = {
  L: 1,
  M: 0.8,
  S: 0.6,
  ball: 0.5,
};

export const CardHost: React.FC<CardHostProps> = ({ config, size, children }) => {
  const scale = sizeScale[size] ?? 1;
  const width = config.baseWidth * scale;
  const height = width / config.aspectRatio;

  return (
    <div
      className="zcam-card-host"
      style={{
        width,
        height,
        boxSizing: 'border-box',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        className="zcam-card-host-inner"
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {children}
      </div>
    </div>
  );
};
