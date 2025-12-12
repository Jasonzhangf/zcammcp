import React from 'react';

import type { LayoutSize, WindowMode } from '../state/UiSceneStore.js';
import { StatusCard } from '../../pages/main/status/StatusCard.js';
import { PtzCard } from '../../pages/main/ptz/PtzCard.js';
import { ImageControlCard } from '../../pages/main/imageControl/ImageControlCard.js';
import { ShortcutsCard } from '../../pages/main/shortcuts/ShortcutsCard.js';

export interface ControlSlotConfig {
  id: string;
  component: React.ComponentType<any>;
  props?: Record<string, unknown>;
}

export interface SceneConfig {
  id: WindowMode;
  layoutSize: LayoutSize;
  slots: ControlSlotConfig[];
}

function MainNormalLayout() {
  return (
    <div className="zcam-main-grid" data-path="zcam.layout.normal">
      <div className="zcam-main-grid-status" data-path="zcam.layout.normal.status">
        <StatusCard />
      </div>
      <div className="zcam-main-control-row" data-path="zcam.layout.normal.controls">
        <div className="zcam-main-control zcam-main-control-ptz" data-path="zcam.layout.normal.ptz">
          <PtzCard />
        </div>
        <div className="zcam-main-control zcam-main-control-image" data-path="zcam.layout.normal.image">
          <ImageControlCard />
        </div>
      </div>
      <div className="zcam-main-grid-shortcuts" data-path="zcam.layout.normal.shortcuts">
        <ShortcutsCard />
      </div>
    </div>
  );
}

function MainStudioLayout() {
  return (
    <div className="zcam-main-grid" data-path="zcam.layout.studio">
      <div className="zcam-main-grid-status" data-path="zcam.layout.studio.status">
        <StatusCard />
      </div>
      <div className="zcam-studio-stack" data-path="zcam.layout.studio.stack">
        <div className="zcam-studio-block" data-path="zcam.layout.studio.image">
          <ImageControlCard />
        </div>
        <div className="zcam-studio-block" data-path="zcam.layout.studio.ptz">
          <PtzCard />
        </div>
      </div>
      <div className="zcam-main-grid-shortcuts" data-path="zcam.layout.studio.shortcuts">
        <ShortcutsCard />
      </div>
    </div>
  );
}

type SceneVariants = Record<LayoutSize, SceneConfig>;

const mainVariants: SceneVariants = {
  normal: {
    id: 'main',
    layoutSize: 'normal',
    slots: [{ id: 'main-grid', component: MainNormalLayout }],
  },
  studio: {
    id: 'main',
    layoutSize: 'studio',
    slots: [{ id: 'studio-grid', component: MainStudioLayout }],
  },
};

const ballVariants: SceneVariants = {
  normal: {
    id: 'ball',
    layoutSize: 'normal',
    slots: [{ id: 'status', component: StatusCard }],
  },
  studio: {
    id: 'ball',
    layoutSize: 'studio',
    slots: [{ id: 'status', component: StatusCard }],
  },
};

export function getSceneConfig(windowMode: WindowMode, layoutSize: LayoutSize): SceneConfig {
  const variants = windowMode === 'ball' ? ballVariants : mainVariants;
  return variants[layoutSize] ?? variants.normal;
}
