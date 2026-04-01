import { useEffect, useRef, useState } from 'react';
import { useViewState, usePageStore } from '../../../hooks/usePageStore.js';

interface DeviceListCardProps {
  mode?: 'full' | 'ptzFloating';
}

export function DeviceListCard({ mode = 'full' }: DeviceListCardProps) {
  const store = usePageStore();
  const view = useViewState();
  const devicesData = view.camera.devices;
  const devices = devicesData?.list || [];
  const activeDeviceId = devicesData?.activeDeviceId;
  const activeDevice = devices.find((device) => device.id === activeDeviceId) ?? null;
  const isFloatingMode = mode === 'ptzFloating';
  const [panelOpen, setPanelOpen] = useState(false);
  const floatingRef = useRef<HTMLDivElement | null>(null);
  const electronAPI = typeof window !== 'undefined' ? window.electronAPI : undefined;

  useEffect(() => {
    if (!isFloatingMode || !electronAPI?.updateDevicePanel) return;
    void electronAPI.updateDevicePanel({
      devices: devices.map((device) => ({
        id: device.id,
        name: device.name,
        serialPort: device.serialPort,
      })),
      activeDeviceId: activeDeviceId ?? null,
    });
  }, [activeDeviceId, devices, electronAPI, isFloatingMode]);

  useEffect(() => {
    if (!isFloatingMode || !panelOpen || electronAPI?.toggleDevicePanel) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (!floatingRef.current) return;
      const target = event.target as Node | null;
      if (target && !floatingRef.current.contains(target)) {
        setPanelOpen(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [electronAPI, isFloatingMode, panelOpen]);

  const handleDeviceClick = (deviceId: string) => {
    if (!deviceId) return;
    store.runOperation('zcam.camera.pages.main.devices', 'device-interaction', 'device.switch', { value: deviceId });
    if (isFloatingMode) {
      setPanelOpen(false);
    }
  };

  const listContent = (
    <div className="zcam-device-list">
      {devices.map((device) => {
        const isActive = activeDeviceId === device.id;
        return (
          <div
            key={device.id}
            className={`zcam-device-item ${isActive ? 'zcam-device-item-active' : ''}`}
            onClick={() => handleDeviceClick(device.id)}
          >
            <div className="zcam-device-info">
              <div className="zcam-device-name">{device.name}</div>
              <div className="zcam-device-status">{device.serialPort}</div>
            </div>
            <div
              className={`zcam-device-status-indicator ${isActive
                ? 'zcam-device-status-connected'
                : 'zcam-device-status-disconnected'
                }`}
            />
          </div>
        );
      })}
      {devices.length === 0 && (
        <div style={{ padding: '20px', textAlign: 'center', color: '#666', fontSize: '13px' }}>
          No devices found
        </div>
      )}
    </div>
  );

  if (!isFloatingMode) {
    return (
      <div className="zcam-card zcam-device-card" data-path="zcam.camera.pages.main.devices">
        <div className="zcam-card-header">
          <span className="zcam-card-title">Devices</span>
        </div>
        <div className="zcam-card-body">{listContent}</div>
      </div>
    );
  }

  return (
    <div
      className={`zcam-device-float${panelOpen ? ' zcam-device-float-open' : ''}`}
      data-path="zcam.camera.pages.main.devices"
      ref={floatingRef}
    >
      <button
        type="button"
        className="zcam-device-float-toggle"
        onClick={async () => {
          if (electronAPI?.toggleDevicePanel) {
            const result = await electronAPI.toggleDevicePanel();
            setPanelOpen(Boolean(result?.open));
            return;
          }
          setPanelOpen((prev) => !prev);
        }}
        title={panelOpen ? '收起设备列表' : '展开设备列表'}
        aria-label={panelOpen ? '收起设备列表' : '展开设备列表'}
      >
        <span className="zcam-device-float-toggle-text">{panelOpen ? '>>' : '<<'}</span>
      </button>
      {panelOpen && !electronAPI?.toggleDevicePanel && (
        <div className="zcam-device-float-panel">
          <div className="zcam-device-float-panel-header">
            <span className="zcam-card-title">Devices</span>
            <span
              className={`zcam-device-status-indicator ${activeDevice
                ? 'zcam-device-status-connected'
                : 'zcam-device-status-disconnected'
                }`}
            />
            <button
              type="button"
              className="zcam-device-float-close"
              onClick={() => setPanelOpen(false)}
              title="关闭设备列表"
              aria-label="关闭设备列表"
            >
              ×
            </button>
          </div>
          <div className="zcam-device-float-panel-body">{listContent}</div>
        </div>
      )}
    </div>
  );
}
