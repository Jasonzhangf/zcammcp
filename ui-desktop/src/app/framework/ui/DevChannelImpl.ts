/**
 * DevChannelImpl: 渲染进程侧 DevChannel 具体实现
 * 使用 window.electronAPI.devReport / onDevCommand 与主进程通信
 */

import type { DevChannel, DevReportPayload, DevCommand } from './BaseControl.js';

export class DevChannelImpl implements DevChannel {
  private listeners = new Set<(cmd: DevCommand) => void>();
  private unsub?: () => void;

  constructor() {
    // 订阅主进程下发的命令
    this.unsub = window.electronAPI.onDevCommand((cmd: DevCommand) => {
      this.listeners.forEach((cb) => cb(cmd));
    });
  }

  report(report: DevReportPayload): void {
    window.electronAPI.devReport(report);
  }

  onCommand(cb: (cmd: DevCommand) => void): () => void {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
      if (this.listeners.size === 0) {
        // 可选：当没有监听者时，解除 IPC 监听
        this.unsub?.();
        this.unsub = undefined;
      }
    };
  }
}
