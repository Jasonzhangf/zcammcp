import React from 'react';
import { useViewState } from '../../../hooks/usePageStore.js';

export function DeviceListCard() {
    const view = useViewState();
    const devicesData = view.camera.devices;
    const devices = devicesData?.list || [];
    const activeDeviceId = devicesData?.activeDeviceId;

    return (
        <div className="zcam-card" data-path="zcam.camera.pages.main.devices">
            <div className="zcam-card-header">
                <span className="zcam-card-title">Devices</span>
            </div>
            <div className="zcam-card-body">
                <div className="zcam-device-list">
                    {devices.map((device) => {
                        const isActive = activeDeviceId === device.id;
                        return (
                            <div
                                key={device.id}
                                className={`zcam-device-item ${isActive ? 'zcam-device-item-active' : ''}`}
                            >
                                <div className="zcam-device-info">
                                    <div className="zcam-device-name">{device.name}</div>
                                    <div className="zcam-device-status">
                                        {device.serialPort}
                                    </div>
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
            </div>
        </div>
    );
}
