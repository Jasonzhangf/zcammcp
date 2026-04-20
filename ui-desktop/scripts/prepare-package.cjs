const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const releaseDir = path.resolve(__dirname, '..', 'release');

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit', shell: false });
  return result.status === 0;
}

function stopReleaseProcesses() {
  if (process.platform !== 'win32') {
    return;
  }
  const normalized = releaseDir.replace(/\\/g, '\\\\');
  const script = `$dir='${normalized}'; Get-CimInstance Win32_Process | Where-Object { $_.ExecutablePath -and $_.ExecutablePath.StartsWith($dir) } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`;
  run('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script]);
}

function removeReleaseDir() {
  for (let i = 0; i < 5; i += 1) {
    try {
      fs.rmSync(releaseDir, { recursive: true, force: true });
      return;
    } catch {
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 300);
    }
  }
  fs.rmSync(releaseDir, { recursive: true, force: true });
}

stopReleaseProcesses();
removeReleaseDir();
