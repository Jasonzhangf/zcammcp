import React from 'react';
import { WindowControls } from './WindowControls.js';
import { DebugControls } from './DebugControls.js';
import type { SceneConfig } from '../framework/ui/LayoutConfig.js';
import { useRootScale } from '../hooks/useRootScale.js';

export function PageShell({ scene }: { scene: SceneConfig }) {
  const scale = useRootScale();
  const rootStyle = scale < 1 ? { transform: `scale(${scale})` } : undefined;
  return (
    <div
      className="zcam-root-scale page-shell"
      data-path="ui.window.shell"
      data-layout={scene.layoutSize}
      style={rootStyle}
    >
      <div className="zcam-header" data-path="ui.window.header">
        <div className="zcam-header-left">
          <div className="zcam-badge">Z</div>
          <div className="zcam-title">ZCAM 閻╁憡婧€閹貉冨煑</div>
        </div>
        <div className="zcam-header-right">
          <DebugControls />
          <WindowControls />
        </div>
      </div>

      <div className="zcam-main" data-path="ui.window.body">
        {scene.slots.map((slot) => {
          const { id, component: Component, props = {} } = slot;
          return (
            <div
              key={id}
              className="control-slot"
              data-path={`ui.controls.${id}`}
            >
              <Component {...props} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

