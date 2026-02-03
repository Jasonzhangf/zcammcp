// PageStore.ts
// 页面数据中心骨架: 维护 cameraState / uiState, 对外提供只读视图和写操作入口

export interface CameraState {
  // PTZ 区: 后续可扩展 pan/tilt 等字段
  ptz?: {
    pan?: { value: number; view: string };
    tilt?: { value: number; view: string };
    zoom?: { value: number; view: string };
    speed?: { value: number; view: string };
    focus?: { value: number; view: string };
  };

  // 曝光设置
  exposure?: {
    aeEnabled?: boolean;
    shutter?: { value: string | number; view: string; options?: string[] };
    iso?: { value: string; view: string; options?: string[] };
  };

  // 白平衡设置
  whiteBalance?: {
    awbEnabled?: boolean;
    temperature?: { value: number; view: string; min?: number; max?: number; step?: number };
  };

  // 图像调节
  image?: {
    brightness?: number; // 0-100
    contrast?: number;   // 0-100
    saturation?: number; // 0-100
    sharpness?: number;
    hue?: number;
    gamma?: number;
  };
  // 设备列表
  devices?: {
    activeDeviceId: string | null;
    list: Array<{
      id: string;
      name: string;
      serialPort: string;
      active: boolean;
    }>;
  };
}


function mergeCameraStates(current: CameraState, next: CameraState): CameraState {
  const merged: CameraState = { ...current };
  if (next.ptz) {
    merged.ptz = { ...(current.ptz ?? {}), ...next.ptz };
  }
  if (next.exposure) {
    merged.exposure = { ...(current.exposure ?? {}), ...next.exposure };
  }
  if (next.whiteBalance) {
    merged.whiteBalance = { ...merged.whiteBalance };
    if (next.whiteBalance.awbEnabled !== undefined) {
      merged.whiteBalance.awbEnabled = next.whiteBalance.awbEnabled;
    }
    if (next.whiteBalance.temperature) {
      merged.whiteBalance.temperature = {
        ...(merged.whiteBalance.temperature ?? {}),
        ...next.whiteBalance.temperature,
      };
    }
  }
  if (next.image) {
    merged.image = { ...(current.image ?? {}), ...next.image };
  }
  if (next.devices) {
    merged.devices = next.devices;
  }
  return merged;
}

export type LayoutMode = 'full' | 'medium' | 'compact' | 'ball';

export interface UiState {
  selectedNodes: string[];
  debugMode: 'normal' | 'debug';
  highlightMap: Record<string, 'none' | 'hover' | 'active' | 'error' | 'replay'>;
  activeNodePath?: string;
  layoutMode: LayoutMode; // 窗口 / 页面布局模式: 模式1~4
  fzSpeed?: number; // Focus/Zoom 速度控制 (0-100), 默认 50, 用于本地 UI 控制步进大小
  ptSpeed?: number; // Pan/Tilt 速度控制 (0-100), 默认 50, 用于本地 UI 控制步进大小
  ptzBusy?: boolean; // PTZ 操作是否正在进行中 (防止命令风暴)
}

export interface ViewState {
  camera: CameraState;
  ui: UiState;
}

export interface OperationContext {
  pagePath: string;
  nodePath: string;
  kind: string;
  timestamp: number;
  cameraState: CameraState;
  uiState: UiState;
}

export interface OperationPayload {
  value?: unknown;
  params?: Record<string, unknown>;
}

export interface CliRequest {
  id: string;
  command: string;
  params?: Record<string, unknown>;
  args?: string[];
  timeoutMs?: number;
  expectJson?: boolean;
}

export interface CliResponse {
  id: string;
  ok: boolean;
  data?: unknown;
  error?: string;
}

export interface OperationResult {
  newStatePartial?: Partial<CameraState>;
  cliRequest?: CliRequest;
  cliRequests?: CliRequest[];
}

export type OperationHandler = (
  ctx: OperationContext,
  payload: OperationPayload
) => Promise<OperationResult>;

export interface OperationDefinition {
  id: string;
  cliCommand: string;
  handler: OperationHandler;
}

export interface OperationRegistry {
  run(id: string, ctx: OperationContext, payload: OperationPayload): Promise<OperationResult>;
}

export interface CliChannel {
  send(request: CliRequest): Promise<CliResponse>;
}

/**
 * PageStore: 页面级数据中心
 * - 管理 cameraState / uiState
 * - 负责调用 OperationRegistry 和 CliChannel
 */
export class PageStore {
  readonly path: string;
  cameraState: CameraState;
  uiState: UiState;
  private viewSnapshot: ViewState;
  private readonly operations: OperationRegistry;
  private readonly cli: CliChannel;
  private readonly listeners: Set<() => void> = new Set();
  private ptzBusyTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(opts: {
    path: string;
    initialCameraState?: CameraState;
    initialUiState?: UiState;
    operations: OperationRegistry;
    cli: CliChannel;
  }) {
    this.path = opts.path;
    this.cameraState = opts.initialCameraState ?? {};
    this.uiState =
      opts.initialUiState ?? ({
        selectedNodes: [],
        debugMode: 'normal',
        highlightMap: {},
        layoutMode: 'full',
        ptzBusy: false,
        fzSpeed: 50,
        ptSpeed: 50,
      } as UiState);
    this.viewSnapshot = {
      camera: this.cameraState,
      ui: this.uiState,
    };
    this.operations = opts.operations;
    this.cli = opts.cli;
  }

  /** 返回只读视图状态 */
  getViewState(): ViewState {
    return this.viewSnapshot;
  }

  /** 清除当前 active node 与高亮状态 */
  clearActiveNode(): void {
    const nextHighlight = { ...this.uiState.highlightMap };
    if (this.uiState.activeNodePath && nextHighlight[this.uiState.activeNodePath] === 'active') {
      delete nextHighlight[this.uiState.activeNodePath];
    }
    this.uiState = {
      ...this.uiState,
      activeNodePath: undefined,
      highlightMap: nextHighlight,
    };
    this.updateViewSnapshot();
    this.notify();
  }

  /** 将某个容器设为当前焦点 / 选中节点 */
  setActiveNode(path: string): void {
    this.uiState = {
      ...this.uiState,
      activeNodePath: path,
      selectedNodes: [path],
    };
    this.updateViewSnapshot();
    this.notify();
  }

  /** 设置某个容器的高亮状态（hover/active 等） */
  setHighlight(path: string, state: 'none' | 'hover' | 'active' | 'error' | 'replay'): void {
    const next = { ...this.uiState.highlightMap };
    if (state === 'none') {
      delete next[path];
    } else {
      next[path] = state;
    }
    this.uiState = {
      ...this.uiState,
      highlightMap: next,
    };
    this.updateViewSnapshot();
    this.notify();
  }

  /** 切换布局模式: full / medium / compact / ball */
  setLayoutMode(mode: LayoutMode): void {
    if (this.uiState.layoutMode === mode) return;
    this.uiState = {
      ...this.uiState,
      layoutMode: mode,
    };
    this.updateViewSnapshot();
    this.notify();
  }

  /**
   * 订阅状态变化, 返回取消订阅函数
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch {
        // 订阅方错误不影响其他 listener
      }
    }
  }

  applyCameraState(partial: CameraState): void {
    this.cameraState = mergeCameraStates(this.cameraState, partial);

    // 如果收到了 PTZ 更新, 则清除忙碌状态
    if (partial.ptz && this.uiState.ptzBusy) {
      if (this.ptzBusyTimeout) {
        clearTimeout(this.ptzBusyTimeout);
        this.ptzBusyTimeout = null;
      }
      this.uiState = { ...this.uiState, ptzBusy: false };
    }

    this.updateViewSnapshot();
    this.notify();
  }

  /**
   * 更新 UI 状态 (Generic)
   */
  updateUiState(partial: Partial<UiState>): void {
    this.uiState = {
      ...this.uiState,
      ...partial,
    };
    this.updateViewSnapshot();
    this.notify();
  }

  /**
   * 运行一个写操作: 调用 OperationRegistry -> 可选 CLI -> 更新 cameraState
   */
  async runOperation(nodePath: string, kind: string, operationId: string | undefined, payload: OperationPayload): Promise<void> {
    if (!operationId) return;

    const ctx: OperationContext = {
      pagePath: this.path,
      nodePath,
      kind,
      timestamp: Date.now(),
      cameraState: this.cameraState,
      uiState: this.uiState,
    };

    const result = await this.operations.run(operationId, ctx, payload);

    // 更新本地状态
    if (result.newStatePartial) {
      this.cameraState = {
        ...this.cameraState,
        ...result.newStatePartial,
      };
      this.updateViewSnapshot();
    }

    // 调用 CLI（如果有）
    const cliRequests: CliRequest[] = [];
    if (result.cliRequest) {
      cliRequests.push(result.cliRequest);
    }
    if (Array.isArray(result.cliRequests)) {
      for (const req of result.cliRequests) {
        if (req) cliRequests.push(req);
      }
    }
    // 处理 PTZ 忙碌状态
    if (operationId.startsWith('ptz.')) {
      if (this.ptzBusyTimeout) {
        clearTimeout(this.ptzBusyTimeout);
      }
      this.uiState = { ...this.uiState, ptzBusy: true };
      this.updateViewSnapshot();
      this.notify();

      this.ptzBusyTimeout = setTimeout(() => {
        if (this.uiState.ptzBusy) {
          this.uiState = { ...this.uiState, ptzBusy: false };
          this.updateViewSnapshot();
          this.notify();
        }
        this.ptzBusyTimeout = null;
      }, 2000); // 2秒安全超时间
    }

    for (const request of cliRequests) {
      await this.cli.send(request);
    }

    // 通知订阅者有新状态
    this.notify();
  }

  private updateViewSnapshot(): void {
    this.viewSnapshot = {
      camera: this.cameraState,
      ui: this.uiState,
    };
  }
}
