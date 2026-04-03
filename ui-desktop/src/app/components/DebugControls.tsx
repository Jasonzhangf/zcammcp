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
      setLastError('Recording start not found. Please start recording first.');
      return;
    }
    try {
      const result = await replayInteractions(pageStore, { startTs, endTs });
      setLastReplayCount(result.count);
      setLastError(null);
    } catch (err: any) {
      setLastError(err?.message ?? 'Replay failed');
    }
  }, [pageStore, recordEndTs, recordStartTs]);

  const rangeLabel = useMemo(() => {
    if (!recordStartTs) return 'Not Recorded';
    const start = new Date(recordStartTs);
    const end = recordEndTs ? new Date(recordEndTs) : null;
    const format = (d: Date) =>
      `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(
        2,
        '0',
      )}:${String(d.getSeconds()).padStart(2, '0')}`;
    if (!end) {
      return `Recording: since ${format(start)}`;
    }
    return `Recorded Range: ${format(start)} - ${format(end)}`;
  }, [recordEndTs, recordStartTs]);

  const layoutDebugLabelTop = 'Layout Debug';
  const layoutDebugLabelBottom = layoutDebugEnabled ? 'On' : 'Off';

  const recordLabelTop = 'Record';
  const recordLabelBottom = isRecording ? 'Stop' : 'Start';

  const clearLabelTop = 'Clear Logs';
  const clearLabelBottom = 'Keep State';

  const replayLabelTop = 'Replay';
  const replayLabelBottom = 'Current Record';

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
        title="Debug Menu"
        aria-label="Open Debug Menu"
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
              title="Toggle layout debug (drag/resize containers)"
              aria-label="Toggle layout debug"
              onClick={() => setLayoutDebugEnabled(!layoutDebugEnabled)}
            >
              <span className="debug-btn-line-main">{layoutDebugLabelTop}</span>
              <span className="debug-btn-line-sub">{layoutDebugLabelBottom}</span>
            </button>
            <button
              type="button"
              className={`control-btn debug-grid-btn ${isRecording ? 'debug-btn-active' : ''}`}
              title={isRecording ? 'Stop recording current interactions' : 'Start recording interactions (clears old logs)'}
              aria-label={isRecording ? 'Stop recording interactions' : 'Start recording interactions'}
              onClick={isRecording ? handleStopRecording : handleStartRecording}
            >
              <span className="debug-btn-line-main">{recordLabelTop}</span>
              <span className="debug-btn-line-sub">{recordLabelBottom}</span>
            </button>
            <button
              type="button"
              className="control-btn debug-grid-btn"
              title="Clear current recorded range (without changing camera state)"
              aria-label="Clear recorded range"
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
              title="Replay interactions in current recorded range"
              aria-label="Replay recorded interactions"
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
              <span className="debug-replay-count">Replayed: {lastReplayCount}</span>
            ) : null}
            {lastError ? <span className="debug-error">{lastError}</span> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

