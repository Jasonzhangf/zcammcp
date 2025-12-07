// Main page entry - 极简版本: 只用于测试窗口操作 (最小化 / 关闭)

import React, { useEffect } from 'react';

import { PageShell } from '../../components/PageShell.js';
import type { PageShellConfig } from '../../framework/ui/PageShellConfig.js';

import '../../../styles/main.css';
import { DevChannelImpl } from '../../framework/ui/DevChannelImpl.js';

const mainPageShellConfig: PageShellConfig = {
  pagePath: 'zcam.window.test',
};

export function MainPage() {
  // 监听 Dev 命令中的窗口级测试消息
  useEffect(() => {
    const dev = new DevChannelImpl();
    const unsubscribe = dev.onCommand((cmd) => {
      switch (cmd.cmd) {
        case 'ui.window.shrinkToBall':
          (window as any).electronAPI?.shrinkToBall?.();
          break;
        case 'ui.window.restoreFromBall':
          (window as any).electronAPI?.restoreFromBall?.();
          break;
        default:
          break;
      }
    });
    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <PageShell config={mainPageShellConfig}>
      <div className="zcam-header" data-path="zcam.window.test.header">
        <div className="zcam-header-left">
          <div className="zcam-badge">Z</div>
          <div className="zcam-title">ZCAM Window Test</div>
        </div>
        <div className="zcam-header-right">
          {/* 缩小为悬浮球 */}
          <button
            type="button"
            className="zcam-header-btn"
            title="缩小成球"
            onClick={() => {
              (window as any).electronAPI?.shrinkToBall?.();
            }}
          >
            ⚪
          </button>
          <button
            type="button"
            className="zcam-header-btn"
            title="最小化到任务栏"
            onClick={() => {
              (window as any).electronAPI?.minimize?.();
            }}
          >
            ▽
          </button>
          <button
            type="button"
            className="zcam-header-btn"
            title="关闭"
            onClick={() => {
              (window as any).electronAPI?.close?.();
            }}
          >
            ×
          </button>
        </div>
      </div>

      <div className="zcam-main" data-path="zcam.window.test.body">
        <div style={{ padding: 16, color: '#ccc', fontSize: 12 }}>
          <p>这是一个专门用于测试窗口行为的空白页面。</p>
          <p>请测试:</p>
          <ol>
            <li>点击 ⚪，缩小成悬浮球；</li>
            <li>在悬浮球窗口中双击任意位置，恢复为原来的窗口大小和位置；</li>
            <li>点击 ▽，窗口最小化到 Dock；</li>
            <li>点击 Dock 图标，窗口恢复到当前大小位置；</li>
            <li>点击 ×，窗口完全退出。</li>
          </ol>
        </div>
      </div>
    </PageShell>
  );
}
