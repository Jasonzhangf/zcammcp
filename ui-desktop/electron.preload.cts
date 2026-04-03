const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.invoke('window:minimize'),
  close: () => ipcRenderer.invoke('window:close'),
  setSizeSmall: () => ipcRenderer.invoke('window:setSize', 'S'),
  setSizeMedium: () => ipcRenderer.invoke('window:setSize', 'M'),
  setSizeLarge: () => ipcRenderer.invoke('window:setSize', 'L'),
  shrinkToBall: () => ipcRenderer.invoke('window:shrinkToBall'),
  restoreFromBall: () => ipcRenderer.invoke('window:restoreFromBall'),
  onWindowMode: (handler: (arg0: any) => any) => {
    const fn = (_event: any, mode: any) => handler(mode);
    ipcRenderer.on('window:mode', fn);
    return () => ipcRenderer.off('window:mode', fn);
  },
  devReport: (report: any) => {
    ipcRenderer.send('control:dev-report', report);
  },
  onDevCommand: (cb: (arg0: any) => any) => {
    const fn = (_event: any, cmd: any) => cb(cmd);
    ipcRenderer.on('control:dev-command', fn);
    return () => ipcRenderer.off('control:dev-command', fn);
  },
});
