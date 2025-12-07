export interface ElectronAPI {
  shrinkToBall: () => Promise<void>;
  restoreFromBall: () => Promise<void>;
  restoreSize: () => Promise<void>;
  dockToEdge: () => Promise<void>;
  devReport: (report: any) => void;
  onDevCommand: (cb: (cmd: any) => void) => () => void;
}

// Dev channel: 可观测/调试接口
export interface ElectronAPI {
  shrinkToBall: () => Promise<void>;
  restoreFromBall: () => Promise<void>;
  restoreSize: () => Promise<void>;
  dockToEdge: () => Promise<void>;
  devReport: (report: any) => void;
  onDevCommand: (cb: (cmd: any) => void) => () => void;
}

// ---------------------------------------------------------
// Dev channel: 可观测/调试接口
// ---------------------------------------------------------
export interface ElectronAPI {
  shrinkToBall: () => Promise<void>;
  restoreFromBall: () => Promise<void>;
  restoreSize: () => Promise<void>;
  dockToEdge: () => Promise<void>;
  // Dev channel - 渲染进程上报到主进程
  devReport: (report: any) => void;
  // 订阅主进程下发的 dev 命令
  onDevCommand: (cb: (cmd: any) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
