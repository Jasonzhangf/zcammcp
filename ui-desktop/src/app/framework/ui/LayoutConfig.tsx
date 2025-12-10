import React from 'react';

export type WindowMode = 'main' | 'ball';
export type LayoutSize = 'normal' | 'compact' | 'large';

export interface ControlSlotConfig {
  id: string;
  component: React.ComponentType<Record<string, unknown>>;
  props?: Record<string, unknown>;
}

export interface SceneConfig {
  id: WindowMode;
  layoutSize: LayoutSize;
  slots: ControlSlotConfig[];
}

export function StatusCard() {
  return (
    <div className="zcam-card">
      <div className="zcam-card-header">
        <span className="zcam-card-title">状态</span>
      </div>
      <div className="zcam-card-body">
        <div style={{ fontSize: 11, color: '#ccc' }}>Camera Ready</div>
      </div>
    </div>
  );
}

export function ShortcutsCard() {
  return (
    <div className="zcam-card">
      <div className="zcam-card-header">
        <span className="zcam-card-title">快捷操作</span>
      </div>
      <div className="zcam-card-body">
        <div style={{ fontSize: 11, color: '#ccc' }}>No shortcuts</div>
      </div>
    </div>
  );
}

export const MainSceneConfig = {
  id: 'main' as const,
  layoutSize: 'normal' as const,
  slots: [
    { id: 'status', component: StatusCard },
    { id: 'shortcuts', component: ShortcutsCard },
  ],
};

export const BallSceneConfig = {
  id: 'ball' as const,
  layoutSize: 'compact' as const,
  slots: [{ id: 'status', component: StatusCard }],
};
