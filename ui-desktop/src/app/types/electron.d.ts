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
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
