/**
 * BaseControl: UI 控件基类
 * - 提供统一的生命周期钩子（mount/update/unmount）
 * - 内置 dev 接口，支持与主进程双向通信，上报渲染/交互/状态信息
 * - 子控件只需要按约定定义 getId()、getView()、mount() 等即可自动获得可观测能力
 */

export type DevReportPayload =
  | { type: 'mounted'; controlId: string; ts: number; rect: DOMRect; scrollInfo?: ScrollInfo }
  | { type: 'updated'; controlId: string; ts: number; rect: DOMRect; scrollInfo?: ScrollInfo }
  | { type: 'unmounted'; controlId: string; ts: number }
  | { type: 'interaction'; controlId: string; ts: number; event: string; responseMs?: number }
  | { type: 'error'; controlId: string; ts: number; error: string };

export interface ScrollInfo {
  hasHorizontalScrollbar: boolean;
  hasVerticalScrollbar: boolean;
  scrollWidth: number;
  scrollHeight: number;
  clientWidth: number;
  clientHeight: number;
}

export interface DevCommand {
  controlId?: string; // undefined 表示广播
  cmd:
    | 'ping'
    | 'dumpState'
    | 'measure'
    | 'highlight'
    // UI 窗口级测试命令
    | 'ui.window.shrinkToBall'
    | 'ui.window.restoreFromBall'
    | 'ui.ball.doubleClick';
  payload?: any;
}

/**
 * DevChannel 抽象：渲染进程 ↔ 主进程通信
 * 实际实现在 preload/electronAPI 里，这里只做类型定义
 */
export interface DevChannel {
  /** 渲染进程上报到主进程 */
  report(report: DevReportPayload): void;
  /** 订阅主进程下发的命令 */
  onCommand(cb: (cmd: DevCommand) => void): () => void; // 返回取消订阅函数
}

/**
 * BaseControl 抽象基类
 * 子类需要实现：getId、getView、mount、update、unmount
 * 基类负责：生命周期管理、DOM 测量、滚动条检测、事件响应计时、dev 上报
 */
export abstract class BaseControl {
  protected root: HTMLElement | null = null;
  protected dev?: DevChannel;
  private lastInteractionStart = 0;

  constructor(dev?: DevChannel) {
    this.dev = dev;
    // 订阅主进程命令，若命令 targeting 本控件则处理
    if (dev) {
      const unsub = dev.onCommand((cmd) => {
        if (!cmd.controlId || cmd.controlId === this.getId()) {
          this.handleDevCommand(cmd);
        }
      });
      // 可选：将 unsub 存在实例，方便清理
      this._devUnsubscribe = unsub;
    }
  }

  private _devUnsubscribe?: () => void;

  abstract getId(): string;
  /** 子类返回内部可测量区域的 HTMLElement（一般是外层容器） */
  abstract getView(): HTMLElement;
  /** mount 时应把 DOM 插入到指定父容器，并自行保存 root 引用 */
  abstract mount(parent: HTMLElement): void;
  /** 更新视图（可选） */
  update?(): void;
  /** 清理 DOM 与事件 */
  abstract unmount(): void;

  // -----------------------------------------------------------------------
  // Dev helpers
  // -----------------------------------------------------------------------
  private measureScrollInfo(container: HTMLElement): ScrollInfo {
    const { scrollWidth, scrollHeight, clientWidth, clientHeight } = container;
    const hasHorizontalScrollbar = scrollWidth > clientWidth;
    const hasVerticalScrollbar = scrollHeight > clientHeight;
    return { hasHorizontalScrollbar, hasVerticalScrollbar, scrollWidth, scrollHeight, clientWidth, clientHeight };
  }

  private report(type: DevReportPayload['type'], extra?: Partial<DevReportPayload>) {
    if (!this.dev) return;
    const payload: DevReportPayload = {
      type,
      controlId: this.getId(),
      ts: Date.now(),
      ...extra,
    } as DevReportPayload;
    this.dev.report(payload);
  }

  private handleDevCommand(cmd: DevCommand) {
    if (!this.root) return;
    switch (cmd.cmd) {
      case 'ping':
        this.report('interaction', { event: 'pong' });
        break;
      case 'measure': {
        const rect = this.root.getBoundingClientRect();
        const scrollInfo = this.measureScrollInfo(this.root);
        this.report('updated', { rect, scrollInfo });
        break;
      }
      case 'dumpState': {
        // 可被子类重写返回自定义状态，这里只上报 DOM 尺寸
        const rect = this.root.getBoundingClientRect();
        const scrollInfo = this.measureScrollInfo(this.root);
        this.report('updated', { rect, scrollInfo });
        break;
      }
      case 'highlight':
        // 视觉高亮（实现可选）
        this.root.style.outline = '2px dashed red';
        setTimeout(() => {
          if (this.root) this.root.style.outline = '';
        }, 2000);
        break;
    }
  }

  // -----------------------------------------------------------------------
  // 生命周期钩子（子类不要覆盖，基类会自动调用）
  // -----------------------------------------------------------------------
  protected onMounted() {
    if (!this.root) return;
    const rect = this.root.getBoundingClientRect();
    const scrollInfo = this.measureScrollInfo(this.root);
    this.report('mounted', { rect, scrollInfo });
  }

  protected onUpdated() {
    if (!this.root) return;
    const rect = this.root.getBoundingClientRect();
    const scrollInfo = this.measureScrollInfo(this.root);
    this.report('updated', { rect, scrollInfo });
  }

  protected onUnmounted() {
    this.report('unmounted', {});
  }

  // -----------------------------------------------------------------------
  // 事件包装：提供自动计时
  // -----------------------------------------------------------------------
  protected wrapInteraction<T>(eventName: string, fn: () => T): T {
    const t0 = performance.now();
    try {
      const res = fn();
      // 同步函数立刻计算
      const ms = performance.now() - t0;
      this.report('interaction', { event: eventName, responseMs: ms });
      return res;
    } catch (e) {
      this.report('error', { error: String(e) });
      throw e;
    }
  }

  protected wrapInteractionAsync<T>(eventName: string, fn: () => Promise<T>): Promise<T> {
    const t0 = performance.now();
    return fn()
      .then((res) => {
        const ms = performance.now() - t0;
        this.report('interaction', { event: eventName, responseMs: ms });
        return res;
      })
      .catch((e) => {
        this.report('error', { error: String(e) });
        throw e;
      });
  }

  // -----------------------------------------------------------------------
  // 统一调用子类生命周期，确保上报
  // -----------------------------------------------------------------------
  public mountTo(parent: HTMLElement): void {
    this.mount(parent);
    this.onMounted();
  }

  public callUpdate(): void {
    this.update?.();
    this.onUpdated();
  }

  public destroy(): void {
    this.onUnmounted();
    this.unmount();
    this._devUnsubscribe?.();
    this.root = null;
  }
}
