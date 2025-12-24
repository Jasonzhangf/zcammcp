#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import process from 'node:process';

const isWin = process.platform === 'win32';
const npmCmd = isWin ? 'npm.cmd' : 'npm';
const useShell = isWin;

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', shell: useShell, ...options });
    child.on('exit', (code, signal) => {
      if (typeof signal === 'string') {
        reject(new Error(`${command} exited with signal ${signal}`));
        return;
      }
      if (code !== 0) {
        reject(new Error(`${command} exited with code ${code}`));
        return;
      }
      resolve(undefined);
    });
    child.on('error', reject);
  });
}

const shouldSkipBuild = process.env.ZCAM_ELECTRON_SKIP_BUILD === '1';

async function run() {
  if (!shouldSkipBuild) {
    await runCommand(npmCmd, ['run', 'build:web']);
  }
  await startElectron();
}

async function startElectron() {
  const require = createRequire(import.meta.url);
  const electronPath = require('electron');
  await new Promise((resolve, reject) => {
    const child = spawn(electronPath, ['electron.main.cjs'], {
      stdio: 'inherit',
      shell: useShell,
    });
    const sigintHandler = () => {
      if (!child.killed) {
        child.kill('SIGINT');
      }
    };
    const sigtermHandler = () => {
      if (!child.killed) {
        child.kill('SIGTERM');
      }
    };
    process.once('SIGINT', sigintHandler);
    process.once('SIGTERM', sigtermHandler);
    child.on('exit', (code, signal) => {
      process.removeListener('SIGINT', sigintHandler);
      process.removeListener('SIGTERM', sigtermHandler);
      if (signal === 'SIGINT' || signal === 'SIGTERM') {
        resolve(undefined);
        return;
      }
      if (code && code !== 0) {
        reject(new Error(`electron exited with code ${code}`));
      } else {
        resolve(undefined);
      }
    });
    child.on('error', reject);
  });
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err?.message ?? err);
  process.exit(1);
});
