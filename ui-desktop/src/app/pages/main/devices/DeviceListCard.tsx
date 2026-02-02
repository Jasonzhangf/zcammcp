import React from 'react';

export function DeviceListCard() {
    // Mock device data for now - will be connected to actual device state later
    const devices = [
        { id: '1', name: 'Z CAM E2', status: 'connected' },
        { id: '2', name: 'Z CAM E2-M4', status: 'disconnected' },
    ];

    const [selectedDeviceId, setSelectedDeviceId] = React.useState<string>('1');

    return (
        <div className="zcam-card" data-path="zcam.camera.pages.main.devices">
            <div className="zcam-card-header">
                <span className="zcam-card-title">Devices</span>
            </div>
            <div className="zcam-card-body">
                <div className="zcam-device-list">
                    {devices.map((device) => (
                        <div
                            key={device.id}
                            className={`zcam-device-item ${selectedDeviceId === device.id ? 'zcam-device-item-active' : ''
                                }`}
                            onClick={() => setSelectedDeviceId(device.id)}
                        >
                            <div className="zcam-device-info">
                                <div className="zcam-device-name">{device.name}</div>
                                <div className="zcam-device-status">
                                    {device.status === 'connected' ? 'Connected' : 'Disconnected'}
                                </div>
                            </div>
                            <div
                                className={`zcam-device-status-indicator ${device.status === 'connected'
                                        ? 'zcam-device-status-connected'
                                        : 'zcam-device-status-disconnected'
                                    }`}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
