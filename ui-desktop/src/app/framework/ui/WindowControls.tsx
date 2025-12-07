import React, { useState, useEffect } from 'react';

interface WindowControlsProps {
  className?: string;
}

export const WindowControls: React.FC<WindowControlsProps> = ({ className = '' }) => {
  const [isMinimized, setIsMinimized] = useState(false);

  const handleShrinkToBall = () => {
    if (window.electronAPI) {
      window.electronAPI.shrinkToBall();
      setIsMinimized(true);
    }
  };

  const handleRestoreSize = () => {
    if (window.electronAPI) {
      window.electronAPI.restoreSize();
      setIsMinimized(false);
    }
  };

  const handleDockToEdge = () => {
    if (window.electronAPI) {
      window.electronAPI.dockToEdge();
      setIsMinimized(false);
    }
  };

  return (
    <div className={`window-controls ${className}`}>
      <button
        onClick={isMinimized ? handleRestoreSize : handleShrinkToBall}
        title={isMinimized ? '恢复大小' : '缩小成球'}
        className="control-btn"
      >
        {isMinimized ? '📱' : '⚪'}
      </button>
      
      <button
        onClick={handleDockToEdge}
        title="贴边隐藏"
        className="control-btn"
      >
        📎
      </button>
    </div>
  );
};
