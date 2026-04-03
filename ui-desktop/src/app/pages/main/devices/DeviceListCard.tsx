import { useEffect, useRef, useState } from 'react';
import { useViewState, usePageStore } from '../../../hooks/usePageStore.js';

interface DeviceListCardProps {
  mode?: 'full' | 'ptzFloating';
}

const DEFAULT_PRESETS = Array.from({ length: 10 }, (_, index) => {
  const no = String(index + 1).padStart(3, '0');
  const stripe = index % 2 === 0 ? '#4a4a4a' : '#3d3d3d';
  const previewSvg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 160 90'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='#2f2f2f'/><stop offset='100%' stop-color='#141414'/></linearGradient></defs><rect width='160' height='90' fill='url(#g)'/><rect x='0' y='0' width='160' height='90' fill='${stripe}' fill-opacity='0.18'/><path d='M0 67 L30 49 L66 55 L96 35 L126 46 L160 29 L160 90 L0 90 Z' fill='#1b1b1b'/><circle cx='126' cy='20' r='9' fill='#5b5b5b'/></svg>`;
  return {
    id: `preset-${no}`,
    name: `Preset ${no}`,
    previewUrl: `data:image/svg+xml;utf8,${encodeURIComponent(previewSvg)}`,
    controls: { recall: true, store: true, menu: true },
  };
});

export function DeviceListCard({ mode = 'full' }: DeviceListCardProps) {
  const store = usePageStore();
  const view = useViewState();
  const devicesData = view.camera.devices;
  const devices = devicesData?.list || [];
  const activeDeviceId = devicesData?.activeDeviceId;
  const activeDevice = devices.find((device) => device.id === activeDeviceId) ?? null;
  const isFloatingMode = mode === 'ptzFloating';
  const [cameraPanelOpen, setCameraPanelOpen] = useState(false);
  const [presetPanelOpen, setPresetPanelOpen] = useState(false);
  const [activePresetId, setActivePresetId] = useState<string | null>(DEFAULT_PRESETS[0]?.id ?? null);
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
    if (!isFloatingMode || !electronAPI?.updatePresetPanel) return;
    void electronAPI.updatePresetPanel({
      presets: DEFAULT_PRESETS,
      activePresetId: activePresetId ?? null,
    });
  }, [activePresetId, electronAPI, isFloatingMode]);

  useEffect(() => {
    if (!isFloatingMode || !(cameraPanelOpen || presetPanelOpen) || electronAPI?.toggleDevicePanel) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (!floatingRef.current) return;
      const target = event.target as Node | null;
      if (target && !floatingRef.current.contains(target)) {
        setCameraPanelOpen(false);
        setPresetPanelOpen(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [cameraPanelOpen, electronAPI, isFloatingMode, presetPanelOpen]);

  const handleDeviceClick = (deviceId: string) => {
    if (!deviceId) return;
    store.runOperation('zcam.camera.pages.main.devices', 'device-interaction', 'device.switch', { value: deviceId });
    if (isFloatingMode) {
      setCameraPanelOpen(false);
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
      className={`zcam-device-float${cameraPanelOpen || presetPanelOpen ? ' zcam-device-float-open' : ''}`}
      data-path="zcam.camera.pages.main.devices"
      ref={floatingRef}
    >
      <div className="zcam-device-float-toggle-group">
        <button
          type="button"
          className={`zcam-device-float-toggle zcam-device-float-toggle-wide${cameraPanelOpen ? ' zcam-device-float-toggle-active' : ''}`}
          onClick={async () => {
            if (electronAPI?.toggleDevicePanel) {
              const result = await electronAPI.toggleDevicePanel();
              setCameraPanelOpen(Boolean(result?.open));
              return;
            }
            setCameraPanelOpen((prev) => !prev);
          }}
          title={cameraPanelOpen ? '收起设备列表' : '展开设备列表'}
          aria-label={cameraPanelOpen ? '收起设备列表' : '展开设备列表'}
        >
          <span className="zcam-device-float-toggle-text">{cameraPanelOpen ? '>> Cameras' : '<< Cameras'}</span>
        </button>
        <button
          type="button"
          className={`zcam-device-float-toggle zcam-device-float-toggle-wide${presetPanelOpen ? ' zcam-device-float-toggle-active' : ''}`}
          onClick={async () => {
            if (electronAPI?.togglePresetPanel) {
              const result = await electronAPI.togglePresetPanel();
              setPresetPanelOpen(Boolean(result?.open));
              return;
            }
            setPresetPanelOpen((prev) => !prev);
          }}
          title={presetPanelOpen ? '收起预置位列表' : '展开预置位列表'}
          aria-label={presetPanelOpen ? '收起预置位列表' : '展开预置位列表'}
        >
          <span className="zcam-device-float-toggle-text">{presetPanelOpen ? '>> Presets' : '<< Presets'}</span>
        </button>
      </div>
      {cameraPanelOpen && !electronAPI?.toggleDevicePanel && (
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
              onClick={() => setCameraPanelOpen(false)}
              title="关闭设备列表"
              aria-label="关闭设备列表"
            >
              ×
            </button>
          </div>
          <div className="zcam-device-float-panel-body">{listContent}</div>
        </div>
      )}
      {presetPanelOpen && !electronAPI?.togglePresetPanel && (
        <div className="zcam-device-float-panel zcam-device-float-panel-presets">
          <div className="zcam-device-float-panel-header">
            <span className="zcam-card-title">Presets</span>
            <span className={`zcam-device-status-indicator ${DEFAULT_PRESETS.length > 0
              ? 'zcam-device-status-connected'
              : 'zcam-device-status-disconnected'
              }`}
            />
            <button
              type="button"
              className="zcam-device-float-close"
              onClick={() => setPresetPanelOpen(false)}
              title="关闭预置位列表"
              aria-label="关闭预置位列表"
            >
              ×
            </button>
          </div>
          <div className="zcam-device-float-panel-body">
            <div className="zcam-device-list">
              {DEFAULT_PRESETS.map((preset) => {
                const isActive = preset.id === activePresetId;
                return (
                  <div
                    key={preset.id}
                    className={`zcam-device-item ${isActive ? 'zcam-device-item-active' : ''}`}
                    onClick={() => setActivePresetId(preset.id)}
                  >
                    <div className="zcam-device-info">
                      <div className="zcam-device-name">{preset.name}</div>
                    </div>
                    <div className={`zcam-device-status-indicator ${isActive
                      ? 'zcam-device-status-connected'
                      : 'zcam-device-status-disconnected'
                      }`}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
