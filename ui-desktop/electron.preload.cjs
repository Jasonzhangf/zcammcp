const { contextBridge, ipcRenderer } = require('electron');

// 仅暴露 Electron 操作接口，不再暴露 dev 相关接口
contextBridge.exposeInMainWorld('electronAPI', {
  // Window 控制
  minimize: () => ipcRenderer.invoke('window:minimize'),
  close: () => ipcRenderer.invoke('window:close'),
  shrinkToBall: () => ipcRenderer.invoke('window:shrinkToBall'),
  restoreFromBall: () => ipcRenderer.invoke('window:restoreFromBall'),

  // 新增：尺寸切换命令（多尺寸支持）
  toggleSize: () => ipcRenderer.invoke('window:toggleSize'),

  // 发送窗口命令的通用接口
  sendWindowCommand: (cmd) => ipcRenderer.invoke('window:sendCommand', cmd),
});
