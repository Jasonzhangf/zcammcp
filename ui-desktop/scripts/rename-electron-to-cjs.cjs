#!/usr/bin/env node
// Simple helper to rename Electron main/preload outputs to .cjs so they run under type: "module" apps.

const fs = require('fs');
const path = require('path');

const distDir = path.join(process.cwd(), 'dist');

function safeRename(from, to) {
  if (fs.existsSync(from)) {
    fs.renameSync(from, to);
  }
}

safeRename(path.join(distDir, 'electron.main.js'), path.join(distDir, 'electron.main.cjs'));
safeRename(path.join(distDir, 'electron.preload.js'), path.join(distDir, 'electron.preload.cjs'));
