import React from 'react';

import { WindowControls } from './WindowControls.js';
import type { SceneConfig } from '../framework/ui/LayoutConfig.js';

export function PageShell({ scene }: { scene: SceneConfig }) {
  return (
    <div className="zcam-root-scale page-shell" data-path="ui.window.shell">
      {/* Header with WindowControls */}
      <div className="zcam-header" data-path="ui.window.header">
        <div className="zcam-header-left">
          <div className="zcam-badge">Z</div>
          <div className="zcam-title">ZCAM 相机控制</div>
        </div>
        <div className="zcam-header-right">
          <WindowControls />
        </div>
      </div>

      {/* Controls rendered in order defined by scene configuration */}
      <div className="zcam-main" data-path="ui.window.body">
        {scene.slots.map((slot) => {
          const { id, component: Component, props = {} } = slot;
          return (
            <div key={id} className="control-slot" data-path={`ui.controls.${id}`}>
              <Component {...props} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
