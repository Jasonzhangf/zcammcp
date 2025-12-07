// PageShell.tsx
// 页面级外壳: 处理浮窗 / 贴边隐藏 / hover 展开等行为

import React from 'react';
import type { PageShellConfig } from '../framework/ui/PageShellConfig.js';

interface PageShellProps {
  config: PageShellConfig;
  children: React.ReactNode;
}

export const PageShell: React.FC<PageShellProps> = ({ config, children }) => {
  const { dock } = config;
  const [isDocked, setIsDocked] = React.useState<boolean>(!!dock?.enabled);

  const side = dock?.side ?? 'right';
  const peek = dock?.peek ?? 32;
  const transitionMs = dock?.transitionMs ?? 160;

  const handleDockToggle = () => {
    if (!dock?.enabled) return;
    setIsDocked((prev) => !prev);
  };


  const dockedStyle: React.CSSProperties = {};
  if (dock?.enabled && isDocked) {
    // 贴边隐藏: 通过 transform 将面板移出屏幕, 留出 peek 宽度
    const baseWidth = 640; // 与 main.css 中 #zcam-camera-root 默认宽度一致
    const offset = peek - baseWidth;
    dockedStyle.transform = side === 'right'
      ? `translateX(${offset}px)`
      : `translateX(${baseWidth - peek}px)`;
  }

  // hover 展开: 悬停时取消 transform
  const finalStyle: React.CSSProperties = {
    transition: `transform ${transitionMs}ms ease-out`,
    ...(dock?.enabled && isDocked ? dockedStyle : {}),
  };

  return (
    <div
      id="zcam-camera-root"
      data-path={config.pagePath}
      className="zcam-panel"
      style={finalStyle}
    >
      {children}

      {dock?.enabled && (
        <button
          type="button"
          className="zcam-header-btn"
          style={{ position: 'absolute', top: 4, [side === 'right' ? 'left' : 'right']: 4 } as React.CSSProperties}
          title={isDocked ? '取消贴边' : '贴边隐藏'}
          onClick={handleDockToggle}
        >
          ⇔
        </button>
      )}
    </div>
  );
};
