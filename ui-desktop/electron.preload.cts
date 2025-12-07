const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.invoke('window:minimize'),
  close: () => ipcRenderer.invoke('window:close'),
  setSizeSmall: () => ipcRenderer.invoke('window:setSize', 'S'),
  setSizeMedium: () => ipcRenderer.invoke('window:setSize', 'M'),
  setSizeLarge: () => ipcRenderer.invoke('window:setSize', 'L'),
  shrinkToBall: () => ipcRenderer.invoke('window:shrinkToBall'),
  restoreFromBall: () => ipcRenderer.invoke('window:restoreFromBall'),
  onWindowMode: (handler) => {
    const fn = (_event, mode) => handler(mode);
    ipcRenderer.on('window:mode', fn);
    return () => ipcRenderer.off('window:mode', fn);
  },
  devReport: (report) => {
    ipcRenderer.send('control:dev-report', report);
  },
  onDevCommand: (cb) => {
    const fn = (_event, cmd) => cb(cmd);
    ipcRenderer.on('control:dev-command', fn);
    return () => ipcRenderer.off('control:dev-command', fn);
  },
});
