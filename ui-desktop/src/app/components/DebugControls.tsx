import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { usePageStore } from '../hooks/usePageStore.js';
import { useContainerResizeFlag } from '../hooks/useContainerResizeFlag.js';
import { clearInteractionLogs } from '../framework/debug/InteractionLogger.js';
import { replayInteractions } from '../framework/debug/ReplayInteractions.js';

export function DebugControls() {
  const pageStore = usePageStore();
  const { enabled: layoutDebugEnabled, setEnabled: setLayoutDebugEnabled } = useContainerResizeFlag();

  const [isRecording, setIsRecording] = useState(false);
  const [recordStartTs, setRecordStartTs] = useState<number | null>(null);
  const [recordEndTs, setRecordEndTs] = useState<number | null>(null);
  const [lastReplayCount, setLastReplayCount] = useState<number | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const handleStartRecording = useCallback(() => {
    clearInteractionLogs();
    const now = Date.now();
    setIsRecording(true);
    setRecordStartTs(now);
    setRecordEndTs(null);
    setLastReplayCount(null);
    setLastError(null);
  }, []);

  const handleStopRecording = useCallback(() => {
    if (!isRecording) return;
    setIsRecording(false);
    setRecordEndTs(Date.now());
  }, [isRecording]);

  const handleReplay = useCallback(async () => {
    const startTs = recordStartTs;
    const endTs = recordEndTs ?? Date.now();
    if (!startTs) {
      setLastError('未找到录制起点，请先开始录制');
      return;
    }
    try {
      const result = await replayInteractions(pageStore, { startTs, endTs });
      setLastReplayCount(result.count);
      setLastError(null);
    } catch (err: any) {
      setLastError(err?.message ?? '回放失败');
    }
  }, [pageStore, recordEndTs, recordStartTs]);

  const rangeLabel = useMemo(() => {
    if (!recordStartTs) return '未录制';
    const start = new Date(recordStartTs);
    const end = recordEndTs ? new Date(recordEndTs) : null;
    const format = (d: Date) =>
      `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(
        2,
        '0',
      )}:${String(d.getSeconds()).padStart(2, '0')}`;
    if (!end) {
      return `录制中：自 ${format(start)}`;
    }
    return `录制区间：${format(start)} - ${format(end)}`;
  }, [recordEndTs, recordStartTs]);

  const layoutDebugLabelTop = '布局调试';
  const layoutDebugLabelBottom = layoutDebugEnabled ? '已开启' : '未开启';

  const recordLabelTop = '录制';
  const recordLabelBottom = isRecording ? '停止' : '开始';

  const clearLabelTop = '清空记录';
  const clearLabelBottom = '保留状态';

  const replayLabelTop = '回放';
  const replayLabelBottom = '本次录制';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div
      className="debug-menu"
      data-path="ui.window.debugMenu"
      ref={menuRef}
    >
      <button
        type="button"
        className={`control-btn debug-menu-toggle ${menuOpen ? 'debug-menu-open' : ''}`}
        title="调试菜单"
        aria-label="打开调试菜单"
        onClick={() => setMenuOpen(!menuOpen)}
      >
        Debug
      </button>
      {menuOpen ? (
        <div className="debug-controls debug-menu-panel" data-path="ui.window.debugControls">
          <div className="debug-grid">
            <button
              type="button"
              className="control-btn debug-grid-btn"
              title="开关布局调试（拖拽/缩放区域）"
              aria-label="开关布局调试"
              onClick={() => setLayoutDebugEnabled(!layoutDebugEnabled)}
            >
              <span className="debug-btn-line-main">{layoutDebugLabelTop}</span>
              <span className="debug-btn-line-sub">{layoutDebugLabelBottom}</span>
            </button>
            <button
              type="button"
              className={`control-btn debug-grid-btn ${isRecording ? 'debug-btn-active' : ''}`}
              title={isRecording ? '停止录制当前交互' : '开始录制交互（会清空旧日志）'}
              aria-label={isRecording ? '停止录制交互' : '开始录制交互'}
              onClick={isRecording ? handleStopRecording : handleStartRecording}
            >
              <span className="debug-btn-line-main">{recordLabelTop}</span>
              <span className="debug-btn-line-sub">{recordLabelBottom}</span>
            </button>
            <button
              type="button"
              className="control-btn debug-grid-btn"
              title="清空本次录制区间（不改变当前相机状态）"
              aria-label="清空录制区间"
              onClick={() => {
                clearInteractionLogs();
                setRecordStartTs(null);
                setRecordEndTs(null);
                setLastReplayCount(null);
                setLastError(null);
                setIsRecording(false);
              }}
            >
              <span className="debug-btn-line-main">{clearLabelTop}</span>
              <span className="debug-btn-line-sub">{clearLabelBottom}</span>
            </button>
            <button
              type="button"
              className="control-btn debug-grid-btn"
              title="回放当前录制时间段内的交互"
              aria-label="回放录制交互"
              onClick={handleReplay}
              disabled={!recordStartTs}
            >
              <span className="debug-btn-line-main">{replayLabelTop}</span>
              <span className="debug-btn-line-sub">{replayLabelBottom}</span>
            </button>
          </div>
          <div className="debug-status">
            <span className="debug-range">{rangeLabel}</span>
            {lastReplayCount !== null ? (
              <span className="debug-replay-count">已回放：{lastReplayCount}</span>
            ) : null}
            {lastError ? <span className="debug-error">{lastError}</span> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

