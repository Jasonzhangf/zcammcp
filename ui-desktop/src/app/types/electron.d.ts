export interface CliBridgeRequest {
  args: string[];
  params?: Record<string, unknown>;
  timeoutMs?: number;
  expectJson?: boolean;
  env?: Record<string, string>;
}

export interface CliBridgeResult {
  ok: boolean;
  stdout?: string;
  stderr?: string;
  code?: number;
  error?: string;
}

export interface WindowStatePayload {
  mode?: 'main' | 'ball';
  layoutSize?: 'normal' | 'studio';
  ballVisible?: boolean;
  lastBounds?: { x: number; y: number; width: number; height: number };
  updatedAt?: number;
}

export interface CameraValueEntry {
  value?: number | string;
  view?: string;
  updatedAt?: number;
  raw?: unknown;
  error?: string;
}

export interface CameraStateSnapshot {
  updatedAt?: number;
  values?: Record<string, CameraValueEntry>;
  camera?: {
    ptz?: {
      pan?: CameraValueEntry;
      tilt?: CameraValueEntry;
      zoom?: CameraValueEntry;
      focus?: CameraValueEntry;
    };
    image?: Record<string, CameraValueEntry | undefined>;
    exposure?: Record<string, CameraValueEntry | undefined>;
    whiteBalance?: CameraValueEntry | Record<string, CameraValueEntry | undefined>;
  };
}

export interface ElectronAPI {
  minimize?: () => Promise<void>;
  close?: () => Promise<void>;
  shrinkToBall?: () => Promise<void>;
  restoreFromBall?: () => Promise<void>;
  restoreSize?: () => Promise<void>;
  dockToEdge?: () => Promise<void>;
  toggleSize?: () => Promise<void>;
  setBounds?: (bounds: { x: number; y: number; width: number; height: number }) => Promise<void>;
  sendWindowCommand?: (cmd: string) => Promise<void>;
  pushState?: (channel: string, payload: unknown) => Promise<void>;
  runCliCommand?: (payload: CliBridgeRequest) => Promise<CliBridgeResult>;
  devReport?: (report: unknown) => void;
  onWindowState?: (callback: (state: WindowStatePayload) => void) => () => void;
  onCameraState?: (callback: (snapshot: CameraStateSnapshot) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
    __ZCAM_CLI_SERVICE_BASE__?: string;
    __ZCAM_USE_MOCK_API__?: boolean;
    __ZCAM_ENABLE_CONTAINER_RESIZE__?: boolean;
    __ZCAM_MOCK_AUTO_CYCLE__?: boolean;
  }
}

export {};
