const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.invoke('window:minimize'),
  close: () => ipcRenderer.invoke('window:close'),
  shrinkToBall: () => ipcRenderer.invoke('window:shrinkToBall'),
  restoreFromBall: () => ipcRenderer.invoke('window:restoreFromBall'),
  toggleSize: () => ipcRenderer.invoke('window:toggleSize'),
  sendWindowCommand: (cmd) => ipcRenderer.invoke('window:sendCommand', cmd),
  pushState: (channel, payload) => ipcRenderer.invoke('state:push', { channel, payload }),
  runCliCommand: (payload) => ipcRenderer.invoke('cli:run', payload),
  onWindowState: (callback) => {
    if (typeof callback !== 'function') {
      return () => {};
    }
    const handler = (_event, state) => callback(state);
    ipcRenderer.on('window:state', handler);
    return () => ipcRenderer.removeListener('window:state', handler);
  },
  onCameraState: (callback) => {
    if (typeof callback !== 'function') {
      return () => {};
    }
    const handler = (_event, state) => callback(state);
    ipcRenderer.on('camera:state', handler);
    return () => ipcRenderer.removeListener('camera:state', handler);
  },
  registerTestHandler: (handler) => {
    if (typeof handler !== 'function') {
      return () => {};
    }
    const listener = async (_event, message) => {
      const requestId = message?.requestId;
      if (!requestId) {
        return;
      }
      try {
        const result = await handler(message);
        ipcRenderer.send('test:response', { requestId, ok: result?.ok !== false, result });
      } catch (err) {
        ipcRenderer.send('test:response', {
          requestId,
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    };
    ipcRenderer.on('test:command', listener);
    return () => {
      ipcRenderer.removeListener('test:command', listener);
    };
  },
});
