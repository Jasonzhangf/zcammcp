// PageShellConfig.ts
// 页面级容器配置: 描述浮窗/贴边隐藏/最小化球等行为, 由 PageShell 统一实现

export type DockSide = 'left' | 'right';

export interface DockConfig {
  enabled: boolean;
  side: DockSide;
  peek: number;        // 贴边隐藏时预留可见宽度(px)
  transitionMs: number;
}

export interface BallConfig {
  enabled: boolean;
  radius: number;      // 球半径(px)
  side: DockSide;
  offset: number;      // 距屏幕边缘偏移(px)
}

export interface PageShellConfig {
  pagePath: string;     // zcam.camera.pages.main
  dock?: DockConfig;    // 可选: 是否启用贴边隐藏
  ball?: BallConfig;    // 可选: 是否启用最小化球
}
