import React, { useEffect, useRef } from 'react';
import { BallClient } from './BallClient.js';

// 球布局: 显示公司 Logo 作为悬浮球图标
export function BallPage() {
  console.log('[BallPage] rendering');
  const rootRef = useRef<HTMLDivElement>(null);
  const clientRef = useRef<BallClient | null>(null);
  useEffect(() => {
    if (!rootRef.current) return;
    const client = new BallClient();
    clientRef.current = client;
    client.mount(rootRef.current);
    return () => {
      client.unmount();
      clientRef.current = null;
    };
  }, []);
  return (
    <div
      ref={rootRef}
      style={{
        width: '100vw',
        height: '100vh',
        background: '#151515',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore - electron 特有 CSS
        WebkitAppRegion: 'drag',
        boxSizing: 'border-box',
      }}
    >
      {/* 公司 Logo 作为悬浮球图标，背景可见 */}
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #202020, #262626)',
          border: '1px solid #555',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.6)',
        }}
      >
        <img
          src="/logo.png"
          alt="ZCAM"
          draggable={false}
          style={{
            width: 64,
            height: 64,
          }}
        />
      </div>
    </div>
  );
}
