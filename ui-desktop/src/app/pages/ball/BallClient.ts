/**
 * BallClient: 最小化球页面轻量 Dev 客户端
 * - 仅监听自身点击、尺寸、滚动条
 * - 上报到主进程，保持与主窗口一致的 Dev 通道
 */

import { DevChannelImpl } from '../../framework/ui/DevChannelImpl.js';

export class BallClient {
  private dev = new DevChannelImpl();
  private root: HTMLElement | null = null;
  private unsub?: () => void;

  mount(root: HTMLElement) {
    this.root = root;
    this.report('mounted');
    root.addEventListener('click', () => this.report('interaction', { event: 'click' }));
    // 监听主进程命令
    this.unsub = this.dev.onCommand((cmd) => {
      if (cmd.cmd === 'ping') this.report('interaction', { event: 'pong' });
      if (cmd.cmd === 'measure') this.reportMeasure();
      if (cmd.cmd === 'highlight') this.highlight();
    });
  }

  unmount() {
    this.report('unmounted');
    this.unsub?.();
    this.root = null;
  }

  private reportMeasure() {
    if (!this.root) return;
    const rect = this.root.getBoundingClientRect();
    const scrollInfo = {
      hasHorizontalScrollbar: this.root.scrollWidth > this.root.clientWidth,
      hasVerticalScrollbar: this.root.scrollHeight > this.root.clientHeight,
      scrollWidth: this.root.scrollWidth,
      scrollHeight: this.root.scrollHeight,
      clientWidth: this.root.clientWidth,
      clientHeight: this.root.clientHeight,
    };
    this.dev.report({
      type: 'updated',
      controlId: 'ball',
      ts: Date.now(),
      rect,
      scrollInfo,
    });
  }

  private highlight() {
    if (!this.root) return;
    this.root.style.outline = '2px dashed red';
    setTimeout(() => {
      if (this.root) this.root.style.outline = '';
    }, 2000);
  }

  private report(type: 'mounted' | 'unmounted' | 'interaction' | 'updated', extra?: any) {
    if (!this.root) return;
    const payload: any = {
      type,
      controlId: 'ball',
      ts: Date.now(),
      ...extra,
    };
    if (type === 'mounted' || type === 'updated') {
      payload.rect = this.root.getBoundingClientRect();
      payload.scrollInfo = {
        hasHorizontalScrollbar: this.root.scrollWidth > this.root.clientWidth,
        hasVerticalScrollbar: this.root.scrollHeight > this.root.clientHeight,
        scrollWidth: this.root.scrollWidth,
        scrollHeight: this.root.scrollHeight,
        clientWidth: this.root.clientWidth,
        clientHeight: this.root.clientHeight,
      };
    }
    this.dev.report(payload);
  }
}
