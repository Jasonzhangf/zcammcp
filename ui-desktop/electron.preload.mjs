import { contextBridge, ipcRenderer } from 'electron';

// 仅提供基础窗口控制 API, 不在 preload 中耦合业务逻辑
contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.invoke('window:minimize'),
  close: () => ipcRenderer.invoke('window:close'),
  setSizeSmall: () => ipcRenderer.invoke('window:setSize', 'S'),
  setSizeMedium: () => ipcRenderer.invoke('window:setSize', 'M'),
  setSizeLarge: () => ipcRenderer.invoke('window:setSize', 'L'),
  // 缩小为悬浮球
  shrinkToBall: () => ipcRenderer.invoke('window:shrinkToBall'),
  // 从悬浮球恢复为正常窗口
  restoreFromBall: () => ipcRenderer.invoke('window:restoreFromBall'),
  // 监听窗口模式变化（主进程 -> 渲染）
  onWindowMode: (handler) => {
    const fn = (_event, mode) => handler(mode);
    ipcRenderer.on('window:mode', fn);
    return () => ipcRenderer.off('window:mode', fn);
  },

  // Dev channel - 渲染进程 ↔ 主进程双向通信
  devReport: (report) => {
    ipcRenderer.send('control:dev-report', report);
  },
  onDevCommand: (cb) => {
    const fn = (_event, cmd) => cb(cmd);
    ipcRenderer.on('control:dev-command', fn);
    return () => ipcRenderer.off('control:dev-command', fn);
  },
});
