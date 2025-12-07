import React, { useEffect, useRef } from 'react';
import { BallClient } from './BallClient.js';
import './style.css';

export function BallPage() {
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
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        userSelect: 'none',
      }}
    >
      <div className="ball-box" onDoubleClick={() => window.electronAPI?.restoreFromBall?.()}>
        <img src="/logo.png" alt="ZCAM" draggable={false} />
      </div>
    </div>
  );
}
