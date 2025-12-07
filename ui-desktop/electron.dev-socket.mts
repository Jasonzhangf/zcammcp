// electron.dev-socket.ts
// UI Dev Socket: 将渲染进程上报的 DevReport 通过 TCP 转发给 CLI

import * as net from 'net';
import type { DevReportPayload, DevCommand } from './src/app/framework/ui/BaseControl.js';

const UI_DEV_PORT = Number(process.env.ZCAM_UI_DEV_PORT || 6223);

let server: net.Server | null = null;
const clients = new Set<net.Socket>();

export function startUiDevSocket() {
  if (server) return;
  server = net.createServer((socket) => {
    clients.add(socket);
    socket.on('data', (buf) => {
      // 接收 CLI 发来的 command
      try {
        const msg = JSON.parse(buf.toString());
        if (msg && msg.type === 'command' && msg.payload) {
          const cmd = msg.payload as {
            target: 'broadcast' | 'control';
            controlId?: string;
            cmd: DevCommand['cmd'];
          };
          broadcastDevCommand(cmd);
        }
      } catch {
        // ignore invalid
      }
    });
    socket.on('error', () => {
      clients.delete(socket);
    });
    socket.on('end', () => {
      clients.delete(socket);
    });
  });

  server.listen(UI_DEV_PORT, () => {
    console.log('[UI-DEV] listening on', UI_DEV_PORT);
  });
}

export function stopUiDevSocket() {
  if (!server) return;
  server.close();
  server = null;
  for (const c of clients) {
    c.destroy();
  }
  clients.clear();
}

export function emitDevReport(report: DevReportPayload) {
  const msg = JSON.stringify(report) + '\n';
  for (const c of clients) {
    c.write(msg);
  }
}

export function broadcastDevCommand(cmd: { target: 'broadcast' | 'control'; controlId?: string; cmd: DevCommand['cmd'] }) {
  // 这里直接透传给渲染进程，通过 IPC
  const { BrowserWindow } = require('electron');
  const all = BrowserWindow.getAllWindows();
  for (const win of all) {
    win.webContents.send('control:dev-command', {
      controlId: cmd.target === 'control' ? cmd.controlId : undefined,
      cmd: cmd.cmd,
    });
  }
}
