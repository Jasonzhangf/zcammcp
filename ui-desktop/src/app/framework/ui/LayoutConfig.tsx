import React from 'react';

import type { LayoutSize, WindowMode } from '../state/UiSceneStore.js';
import { ContainerHost } from '../../components/ContainerHost.js';
import { StatusCard } from '../../pages/main/status/StatusCard.js';
import { PtzCard } from '../../pages/main/ptz/PtzCard.js';
import { ImageControlCard } from '../../pages/main/imageControl/ImageControlCard.js';
import { ShortcutsCard } from '../../pages/main/shortcuts/ShortcutsCard.js';
import { DeviceListCard } from '../../pages/main/devices/DeviceListCard.js';
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

type ContainerBoundsMap = Record<'deviceList' | 'status' | 'ptz' | 'image' | 'shortcuts', ContainerBounds>;

const NORMAL_BOUNDS: ContainerBoundsMap = {
  deviceList: { x: 0, y: 0, width: 20, height: 100 },
  status: { x: 20, y: 0, width: 80, height: 22 },
  ptz: { x: 20, y: 22, width: 60, height: 60 },
  image: { x: 60, y: 22, width: 40, height: 60 },
  shortcuts: { x: 20, y: 82, width: 80, height: 18 },
};

const STUDIO_BOUNDS: ContainerBoundsMap = {
  deviceList: { x: 0, y: 0, width: 20, height: 100 },
  status: { x: 20, y: 0, width: 80, height: 20 },
  image: { x: 20, y: 20, width: 80, height: 40 },
  ptz: { x: 20, y: 60, width: 80, height: 25 },
  shortcuts: { x: 20, y: 85, width: 80, height: 15 },
};

function MainPtzOnlyLayout() {
  return (
    <div className="zcam-main-layout-wrapper" data-path="zcam.layout.ptz">
      <div className="zcam-main-grid" data-path="zcam.layout.ptz.main">
        <div className="zcam-main-control-row" data-path="zcam.layout.ptz.controls">
          <ContainerHost
            id="group.ptz"
            parentId="page.root"
            kind="group"
            layoutMode="flow"
            className="zcam-main-control zcam-main-control-ptz"
            data-path="zcam.layout.ptz.ptz"
            defaultBounds={{ x: 0, y: 0, width: 100, height: 100 }}
            resizable
          >
            <PtzCard />
          </ContainerHost>
        </div>
      </div>
    </div>
  );
}

function MainNormalLayout() {
  return (
    <div className="zcam-main-layout-wrapper" data-path="zcam.layout.normal">
      <ContainerHost
        id="group.deviceList"
        parentId="page.root"
        kind="group"
        layoutMode="flow"
        className="zcam-device-list-sidebar"
        data-path="zcam.layout.normal.deviceList"
        defaultBounds={NORMAL_BOUNDS.deviceList}
        resizable
      >
        <DeviceListCard />
      </ContainerHost>
      <div className="zcam-main-grid" data-path="zcam.layout.normal.main">
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
    </div>
  );
}

function MainStudioLayout() {
  return (
    <div className="zcam-main-layout-wrapper" data-path="zcam.layout.studio">
      <ContainerHost
        id="group.deviceList"
        parentId="page.root"
        kind="group"
        layoutMode="flow"
        className="zcam-device-list-sidebar"
        data-path="zcam.layout.studio.deviceList"
        defaultBounds={STUDIO_BOUNDS.deviceList}
        resizable
      >
        <DeviceListCard />
      </ContainerHost>
      <div className="zcam-main-grid" data-path="zcam.layout.studio.main">
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
  ptz: {
    id: 'main',
    layoutSize: 'ptz',
    slots: [{ id: 'ptz-only-grid', component: MainPtzOnlyLayout }],
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
  ptz: {
    id: 'ball',
    layoutSize: 'ptz',
    slots: [{ id: 'status', component: StatusCard }],
  },
};

export function getSceneConfig(windowMode: WindowMode, layoutSize: LayoutSize): SceneConfig {
  const variants = windowMode === 'ball' ? ballVariants : mainVariants;
  return variants[layoutSize] ?? variants.normal;
}
