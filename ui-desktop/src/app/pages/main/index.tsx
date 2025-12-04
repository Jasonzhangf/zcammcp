// Main page entry - 负责组合 main 页各个区域 (Status/PTZ/ImageControl/Shortcuts)

import React from 'react';
import { StatusCard } from './status/StatusCard.js';
import { PtzCard } from './ptz/PtzCard.js';
import { ImageControlCard } from './imageControl/ImageControlCard.js';
import { ShortcutsCard } from './shortcuts/ShortcutsCard.js';
import { PageShell } from '../../components/PageShell.js';
import type { PageShellConfig } from '../../framework/ui/PageShellConfig.js';
import { CardHost } from '../../components/CardHost.js';
import type { CardConfig } from '../../framework/ui/CardConfig.js';

import '../../../styles/main.css';

const mainPageShellConfig: PageShellConfig = {
  pagePath: 'zcam.camera.root',
  dock: {
    enabled: true,
    side: 'right',
    peek: 32,
    transitionMs: 160,
  },
};

const ptzCardConfig: CardConfig = {
  id: 'ptz.main',
  aspectRatio: 4 / 3,
  baseWidth: 320,
};

const imageCardConfig: CardConfig = {
  id: 'image.control.main',
  aspectRatio: 4 / 3,
  baseWidth: 320,
};

export function MainPage() {
  return (
    <PageShell config={mainPageShellConfig}>
      {/* Header 先用静态结构，后续接 PageStore */}
      <div
        className="zcam-header"
        data-path="zcam.camera.header"
      >
        <div className="zcam-header-left">
          <div
            className="zcam-badge"
            data-path="zcam.camera.header.badge"
          >
            Z
          </div>
          <div
            className="zcam-title"
            data-path="zcam.camera.header.title"
          >
            ZCAM Camera
          </div>
        </div>
        <div className="zcam-header-right">
          <div
            className="zcam-status"
            data-path="zcam.camera.header.status"
          >
            <span className="zcam-status-dot" />
          </div>
          <select
            className="zcam-camera-select"
            data-path="zcam.camera.header.cameraSelector"
          >
            <option>Camera 1 (192.168.0.10)</option>
            <option>Camera 2 (Mock)</option>
          </select>
          <button
            className="zcam-header-btn"
            data-path="zcam.camera.header.toBall"
            title="最小化为悬浮球"
          >
            ●
          </button>
        </div>
      </div>

      {/* Main 内容区: 状态 + 控制 + 快捷 */}
      <div
        className="zcam-main"
        data-path="zcam.camera.pages.main"
      >
        <section
          className="zcam-section zcam-section-status"
          data-path="zcam.camera.pages.main.status"
        >
          <StatusCard />
        </section>

        <section
          className="zcam-section zcam-section-controls"
          data-path="zcam.camera.pages.main.controls"
        >
          <div className="zcam-controls-grid">
            <CardHost config={ptzCardConfig} size="L">
              <PtzCard />
            </CardHost>
            <CardHost config={imageCardConfig} size="L">
              <ImageControlCard />
            </CardHost>
          </div>
        </section>

        <section
          className="zcam-section zcam-section-shortcuts"
          data-path="zcam.camera.pages.main.shortcuts"
        >
          <ShortcutsCard />
        </section>
      </div>
    </PageShell>
  );
}
