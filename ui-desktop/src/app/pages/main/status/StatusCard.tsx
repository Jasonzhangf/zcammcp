// StatusCard.tsx
// 映射路径: zcam.camera.pages.main.status

import React, { useMemo } from 'react';
import type { ContainerNode } from '../../../framework/container/ContainerNode.js';
import { useViewState } from '../../../hooks/usePageStore.js';
import { useContainerData, useContainerState } from '../../../hooks/useContainerStore.js';

// 容器元数据
export const statusCardNode: ContainerNode = {
  path: 'zcam.camera.pages.main.status',
  role: 'container',
  kind: 'status.card',
  selectable: true,
  children: [],
};

export function StatusCard() {
  const view = useViewState();
  const cam = view.camera;
  const containerState = useContainerState('group.status');
  const cameraName = (containerState?.data?.['cameraName'] as string) ?? 'ZCAM PTZ-01';
  const cameraIp = (containerState?.data?.['cameraIp'] as string) ?? '192.168.0.10';

  const exposureText = cam.exposure
    ? `ISO ${cam.exposure.iso?.view ?? '-'} · ${cam.exposure.shutter?.view ?? '-'}`
    : 'ISO - · -';

  const wbText = cam.whiteBalance?.temperature?.view ?? '---';
  const awbMode = cam.whiteBalance?.awbEnabled ? 'AWB' : 'MANUAL';
  const zoomVal = cam.ptz?.zoom?.view ?? '-';
  const panView = cam.ptz?.pan?.view ?? '--';
  const tiltView = cam.ptz?.tilt?.view ?? '--';
  /* 
    Recording Status Logic
    remain.raw is expected to be { code: number, desc: string, msg: string }
    desc: recording duration (s). If "0", not recording.
    msg: remaining time (s).
  */
  const recordingState = useMemo(() => {
    const remainRaw = cam.recording?.remain?.raw;
    const streamStatus = cam.recording?.streamStatus?.value;

    // Use pre-parsed values from PageStore/main.tsx
    const durationSec = cam.recording?.remain?.duration;
    const remainingSec = cam.recording?.remain?.remaining;

    let isRecording = false;
    let durationText = '--:--:--';
    let remainingText = '--:--:--';

    // 1. Check Duration from `remain` property (Primary: pre-parsed)
    if (typeof durationSec === 'number' && durationSec > 0) {
      isRecording = true;
      durationText = formatDuration(durationSec);
    }
    // Fallback to raw parsing if pre-parsed missing (safety net)
    else if (remainRaw?.desc && Number(remainRaw.desc) > 0) {
      isRecording = true;
      durationText = formatDuration(Number(remainRaw.desc));
    }

    // 2. Format Remaining Time (Primary: pre-parsed)
    if (typeof remainingSec === 'number') {
      remainingText = formatDuration(remainingSec);
    }
    // Fallback to raw parsing
    else if (remainRaw?.msg && Number(remainRaw.msg) > 0) {
      remainingText = formatDuration(Number(remainRaw.msg));
    }

    // 3. Fallback / Additional Check: If `streamStatus` says streaming, we are recording/streaming
    if (streamStatus === 'streaming') {
      isRecording = true;
    }

    return { isRecording, durationText, remainingText };
  }, [cam.recording?.remain?.raw, cam.recording?.streamStatus?.value, cam.recording?.remain?.duration, cam.recording?.remain?.remaining]);

  const containerData = useMemo(
    () => ({
      exposureText,
      whiteBalance: {
        temperature: wbText,
        mode: awbMode,
      },
      ptz: {
        pan: cam.ptz?.pan?.value ?? null,
        tilt: cam.ptz?.tilt?.value ?? null,
        zoom: cam.ptz?.zoom?.value ?? null,
      },
      recording: {
        isRecording: recordingState.isRecording,
        duration: recordingState.durationText,
        remaining: recordingState.remainingText
      }
    }),
    [awbMode, cam.ptz?.pan?.value, cam.ptz?.tilt?.value, cam.ptz?.zoom?.value, exposureText, wbText, recordingState],
  );
  useContainerData('group.status', containerData);

  return (
    <div
      className="zcam-card"
      data-path="zcam.camera.pages.main.status.card"
    >
      <div className="zcam-card-header">
        <span className="zcam-card-title">状态</span>
        <span style={{ fontSize: 10, color: '#777' }}>实时相机参数</span>
      </div>
      <div className="zcam-card-body">
        <div className="zcam-status-grid" data-path="zcam.camera.pages.main.status.summary">
          {/* row 1: PTZ 状态 */}
          <div className="zcam-status-grid-row">
            <div
              className="zcam-status-item"
              data-path="zcam.camera.pages.main.status.ptz"
            >
              <div className="zcam-status-item-label">PTZ</div>
              <div className="zcam-status-item-value">
                Pan {panView} · Tilt {tiltView}
              </div>
              <div className="zcam-status-item-sub">Zoom {zoomVal}</div>
            </div>
          </div>

          {/* row 2: 图像状态（白平衡 / 曝光） */}
          <div className="zcam-status-grid-row">
            <div
              className="zcam-status-item"
              data-path="zcam.camera.pages.main.status.whiteBalance"
            >
              <div className="zcam-status-item-label">White Balance</div>
              <div className="zcam-status-item-value">{wbText}</div>
              <div className="zcam-status-item-sub">{awbMode}</div>
            </div>
            <div
              className="zcam-status-item"
              data-path="zcam.camera.pages.main.status.exposure"
            >
              <div className="zcam-status-item-label">Exposure</div>
              <div className="zcam-status-item-value">{exposureText}</div>
              <div className="zcam-status-item-sub">AE {cam.exposure?.aeEnabled ? 'ON' : 'OFF'}</div>
            </div>
          </div>

          {/* row 3: 图像状态（亮度 / 对比度 / 饱和度） */}
          <div className="zcam-status-grid-row">
            <div
              className="zcam-status-item"
              data-path="zcam.camera.pages.main.status.image.brightness"
            >
              <div className="zcam-status-item-label">Brightness</div>
              <div className="zcam-status-item-value">
                {typeof cam.image?.brightness === 'number'
                  ? `${cam.image.brightness}%`
                  : '--'}
              </div>
            </div>
            <div
              className="zcam-status-item"
              data-path="zcam.camera.pages.main.status.image.contrast"
            >
              <div className="zcam-status-item-label">Contrast</div>
              <div className="zcam-status-item-value">
                {typeof cam.image?.contrast === 'number'
                  ? `${cam.image.contrast}%`
                  : '--'}
              </div>
            </div>
            <div
              className="zcam-status-item"
              data-path="zcam.camera.pages.main.status.image.saturation"
            >
              <div className="zcam-status-item-label">Saturation</div>
              <div className="zcam-status-item-value">
                {typeof cam.image?.saturation === 'number'
                  ? `${cam.image.saturation}%`
                  : '--'}
              </div>
            </div>
          </div>

          {/* row 4: 文件 / 推流 / 录制 状态 */}
          <div className="zcam-status-grid-row zcam-status-grid-row-wide">
            <div
              className="zcam-status-chip-group"
              data-path="zcam.camera.pages.main.status.recording"
            >
              <span className={`zcam-chip ${recordingState.isRecording ? 'zcam-chip-active' : ''}`}>
                <span className={recordingState.isRecording ? 'zcam-chip-label-active' : ''}>REC ●</span>
                {' '}
                {recordingState.isRecording ? recordingState.durationText : '--:--:--'}
              </span>
              <span className="zcam-chip" style={{ opacity: 1 }}>剩余 {recordingState.remainingText}</span>
            </div>
            <div
              className="zcam-status-chip-group zcam-status-chip-group-right"
              data-path="zcam.camera.pages.main.status.streaming"
            >
              <span className="zcam-chip zcam-chip-active">
                <span className="zcam-chip-label-active">STREAM ●</span> RTMP
              </span>
              <span className="zcam-chip">1080p60 / 8Mbps</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

