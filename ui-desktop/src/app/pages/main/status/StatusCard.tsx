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
    ? `ISO ${cam.exposure.iso?.view ?? '-' } · ${cam.exposure.shutter?.view ?? '-'}`
    : 'ISO - · -';

  const wbText = cam.whiteBalance?.temperature?.view ?? '---';
  const awbMode = cam.whiteBalance?.awbEnabled ? 'AWB' : 'MANUAL';
  const zoomVal = cam.ptz?.zoom?.view ?? '-';
  const panView = cam.ptz?.pan?.view ?? '--';
  const tiltView = cam.ptz?.tilt?.view ?? '--';
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
    }),
    [awbMode, cam.ptz?.pan?.value, cam.ptz?.tilt?.value, cam.ptz?.zoom?.value, exposureText, wbText],
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
              <span className="zcam-chip zcam-chip-active">REC ● 00:12:34</span>
              <span className="zcam-chip">剩余 2h 15m</span>
            </div>
            <div
              className="zcam-status-chip-group zcam-status-chip-group-right"
              data-path="zcam.camera.pages.main.status.streaming"
            >
              <span className="zcam-chip zcam-chip-active">STREAM ● RTMP</span>
              <span className="zcam-chip">1080p60 / 8Mbps</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

