const { spawnSync } = require('child_process');
const path = require('path');

function pad(v) {
  return String(v).padStart(2, '0');
}

const now = new Date();
const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
const outputDir = `release/package-${stamp}`;
const builderCli = path.resolve(__dirname, '..', 'node_modules', 'electron-builder', 'cli.js');
const args = [builderCli, `--config.directories.output=${outputDir}`];

const result = spawnSync(process.execPath, args, { stdio: 'inherit' });
if (result.error) {
  process.stderr.write(`${result.error.message}\n`);
  process.exit(1);
}
if (result.status !== 0) {
  process.exit(result.status || 1);
}

process.stdout.write(`\nPackage output: ${outputDir}\n`);
