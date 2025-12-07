#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const distDir = path.join(process.cwd(), 'dist');
function noopRename(file) {
  if (!fs.existsSync(file)) return;
  // 保留 .js 后缀，无需额外操作
}
noopRename(path.join(distDir, 'electron.main.js'));
noopRename(path.join(distDir, 'electron.preload.js'));
noopRename(path.join(distDir, 'electron.dev-socket.js'));
