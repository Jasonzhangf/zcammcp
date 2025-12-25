import React from 'react';

import type { LayoutSize, WindowMode } from '../state/UiSceneStore.js';
import { ContainerHost } from '../../components/ContainerHost.js';
import { StatusCard } from '../../pages/main/status/StatusCard.js';
import { PtzCard } from '../../pages/main/ptz/PtzCard.js';
import { ImageControlCard } from '../../pages/main/imageControl/ImageControlCard.js';
import { ShortcutsCard } from '../../pages/main/shortcuts/ShortcutsCard.js';
import type { ContainerBounds } from '../state/ContainerStore.js';

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

type ContainerBoundsMap = Record<'status' | 'ptz' | 'image' | 'shortcuts', ContainerBounds>;

const NORMAL_BOUNDS: ContainerBoundsMap = {
  status: { x: 0, y: 0, width: 100, height: 18 },
  ptz: { x: 0, y: 18, width: 60, height: 57 },
  image: { x: 60, y: 18, width: 40, height: 57 },
  shortcuts: { x: 0, y: 75, width: 100, height: 25 },
};

const STUDIO_BOUNDS: ContainerBoundsMap = {
  status: { x: 0, y: 0, width: 100, height: 18 },
  image: { x: 0, y: 18, width: 100, height: 40 },
  ptz: { x: 0, y: 58, width: 100, height: 27 },
  shortcuts: { x: 0, y: 85, width: 100, height: 15 },
};

function MainNormalLayout() {
  return (
    <div className="zcam-main-grid" data-path="zcam.layout.normal">
      <ContainerHost
        id="group.status"
        parentId="page.root"
        kind="group"
        layoutMode="flow"
        className="zcam-main-grid-status"
        data-path="zcam.layout.normal.status"
        defaultBounds={NORMAL_BOUNDS.status}
        resizable
      >
        <StatusCard />
      </ContainerHost>
      <div className="zcam-main-control-row" data-path="zcam.layout.normal.controls">
        <ContainerHost
          id="group.ptz"
          parentId="page.root"
          kind="group"
          layoutMode="flow"
          className="zcam-main-control zcam-main-control-ptz"
          data-path="zcam.layout.normal.ptz"
          defaultBounds={NORMAL_BOUNDS.ptz}
          resizable
        >
          <PtzCard />
        </ContainerHost>
        <ContainerHost
          id="group.image"
          parentId="page.root"
          kind="group"
          layoutMode="flow"
          className="zcam-main-control zcam-main-control-image"
          data-path="zcam.layout.normal.image"
          defaultBounds={NORMAL_BOUNDS.image}
          resizable
        >
          <ImageControlCard />
        </ContainerHost>
      </div>
      <ContainerHost
        id="group.shortcuts"
        parentId="page.root"
        kind="group"
        layoutMode="flow"
        className="zcam-main-grid-shortcuts"
        data-path="zcam.layout.normal.shortcuts"
        defaultBounds={NORMAL_BOUNDS.shortcuts}
        resizable
      >
        <ShortcutsCard />
      </ContainerHost>
    </div>
  );
}

function MainStudioLayout() {
  return (
    <div className="zcam-main-grid" data-path="zcam.layout.studio">
      <ContainerHost
        id="group.status"
        parentId="page.root"
        kind="group"
        layoutMode="flow"
        className="zcam-main-grid-status"
        data-path="zcam.layout.studio.status"
        defaultBounds={STUDIO_BOUNDS.status}
        resizable
      >
        <StatusCard />
      </ContainerHost>
      <div className="zcam-studio-stack" data-path="zcam.layout.studio.stack">
        <ContainerHost
          id="group.image"
          parentId="page.root"
          kind="group"
          layoutMode="flow"
          className="zcam-studio-block"
          data-path="zcam.layout.studio.image"
          defaultBounds={STUDIO_BOUNDS.image}
          resizable
        >
          <ImageControlCard />
        </ContainerHost>
        <ContainerHost
          id="group.ptz"
          parentId="page.root"
          kind="group"
          layoutMode="flow"
          className="zcam-studio-block"
          data-path="zcam.layout.studio.ptz"
          defaultBounds={STUDIO_BOUNDS.ptz}
          resizable
        >
          <PtzCard />
        </ContainerHost>
      </div>
      <ContainerHost
        id="group.shortcuts"
        parentId="page.root"
        kind="group"
        layoutMode="flow"
        className="zcam-main-grid-shortcuts"
        data-path="zcam.layout.studio.shortcuts"
        defaultBounds={STUDIO_BOUNDS.shortcuts}
        resizable
      >
        <ShortcutsCard />
      </ContainerHost>
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
