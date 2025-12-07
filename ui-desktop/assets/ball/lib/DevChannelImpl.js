/**
 * DevChannelImpl: 渲染进程侧 DevChannel 具体实现
 * 使用 window.electronAPI.devReport / onDevCommand 与主进程通信
 */
window.DevChannelImpl = class DevChannelImpl {
    constructor() {
        this.listeners = new Set();
        // 订阅主进程下发的命令
        this.unsub = window.electronAPI.onDevCommand((cmd) => {
            this.listeners.forEach((cb) => cb(cmd));
        });
    }
    report(report) {
        window.electronAPI.devReport(report);
    }
    onCommand(cb) {
        this.listeners.add(cb);
        return () => {
            this.listeners.delete(cb);
            if (this.listeners.size === 0) {
                // 可选：当没有监听者时，解除 IPC 监听
                this.unsub?.();
                this.unsub = undefined;
            }
        };
    }
}
