import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import http from 'node:http';
import { createRequire } from 'node:module';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';
import test from 'node:test';

const STATE_HOST = process.env.ZCAM_STATE_HOST || '127.0.0.1';
const STATE_PORT = Number(process.env.ZCAM_STATE_PORT || '6224');
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const projectRoot = process.cwd();
const require = createRequire(import.meta.url);
const electronBinary = require('electron');

let didBuildWeb = false;

const ZOOM_PATH = 'zcam.camera.pages.main.ptz.zoom';

test('zoom slider responds to keyboard hold via uiTest channel', async (t) => {
  await ensureWebAssets();
  const electron = startElectronProcess();
  t.after(() => stopElectron(electron));
  await waitForHarnessReady();
  const zoomBefore = await waitForCameraZoom();
  const focusData = await runUiTestCommand('focus', { path: ZOOM_PATH });
  assert.equal(focusData?.focusedPath, ZOOM_PATH, 'focus should move to zoom slider');
  const keyDownData = await runUiTestCommand('keyDown', { key: 'ArrowUp' });
  assert.equal(keyDownData?.focusedPath, ZOOM_PATH, 'keyDown should keep focus on zoom slider');
  await delay(600);
  await runUiTestCommand('keyUp', { key: 'ArrowUp' });
  const interactionLog = await runUiTestCommand('getInteractionLog');
  assertSliderCommit(interactionLog);
  const viewState = await runUiTestCommand('getViewState');
  assertViewStateUpdated(viewState, zoomBefore);
  const zoomAfter = await pollUntil(async () => waitForCameraZoom(), (value) => value > zoomBefore, 8000);
  assert.ok(
    zoomAfter > zoomBefore,
    `zoom value should increase after keyboard hold (before=${zoomBefore}, after=${zoomAfter})`,
  );
});

async function ensureWebAssets(): Promise<void> {
  if (didBuildWeb) {
    return;
  }
  await runCommand(npmCmd, ['run', 'build:web']);
  didBuildWeb = true;
}

function startElectronProcess(): ChildProcess {
  const child = spawn(electronBinary, ['electron.main.cjs'], {
    cwd: projectRoot,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      ZCAM_ELECTRON_SKIP_BUILD: '1',
    },
    stdio: 'ignore',
  });
  return child;
}

function stopElectron(child: ChildProcess | null | undefined): Promise<void> {
  if (!child) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const done = () => resolve();
    child.once('exit', done);
    if (!child.killed) {
      child.kill(process.platform === 'win32' ? undefined : 'SIGINT');
    } else {
      process.nextTick(done);
    }
  });
}

async function waitForHarnessReady(timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const state = await getState('uiTest');
      if (state?.ready) {
        return state;
      }
    } catch {
      // server not ready yet
    }
    await delay(250);
  }
  throw new Error('uiTest harness did not become ready');
}

async function waitForCameraZoom(timeoutMs = 10000): Promise<number> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const state = await getState('camera');
    const zoomValue =
      state?.ptz?.zoom?.value ??
      state?.camera?.ptz?.zoom?.value ??
      (typeof state?.zoom === 'number' ? state.zoom : null);
    if (typeof zoomValue === 'number') {
      return zoomValue;
    }
    await delay(200);
  }
  throw new Error('camera zoom value unavailable');
}

async function pollUntil<T>(fn: () => Promise<T>, predicate: (value: T) => boolean, timeoutMs: number): Promise<T> {
  const start = Date.now();
  let last: T | undefined;
  while (Date.now() - start < timeoutMs) {
    last = await fn();
    if (predicate(last)) {
      return last;
    }
    await delay(200);
  }
  throw new Error(`condition not met within ${timeoutMs}ms, last value: ${last}`);
}

async function runUiTestCommand(action: string, payload?: Record<string, unknown>) {
  const response = await requestJson('/command', 'POST', { channel: 'uiTest', action, payload });
  if (!response?.ok) {
    throw new Error(response?.error || `uiTest command failed: ${action}`);
  }
  const result = response.result;
  if (result?.ok === false) {
    throw new Error(result.error || `uiTest handler error: ${action}`);
  }
  return result?.data ?? result;
}

function assertSliderCommit(interactionLog: any): void {
  const entries = Array.isArray(interactionLog?.entries) ? interactionLog.entries : [];
  const zoomEntries = entries.filter(
    (entry: any) => entry?.path === ZOOM_PATH && entry?.source === 'slider' && entry?.action === 'commit',
  );
  if (zoomEntries.length === 0) {
    throw new Error('no slider commit log entries detected for zoom control');
  }
}

function assertViewStateUpdated(viewPayload: any, before: number): void {
  const zoomValue =
    viewPayload?.view?.camera?.ptz?.zoom?.value ?? viewPayload?.view?.camera?.ptz?.zoom ?? viewPayload?.cameraZoom;
  if (!(typeof zoomValue === 'number' && zoomValue > before)) {
    throw new Error(`view state zoom did not increase (before=${before}, view=${zoomValue})`);
  }
}

async function getState(channel: string) {
  const response = await requestJson(`/state?channel=${encodeURIComponent(channel)}`, 'GET');
  if (!response?.ok) {
    throw new Error(response?.error || 'state fetch failed');
  }
  return response.state;
}

function requestJson(pathname: string, method: 'GET' | 'POST', payload?: unknown): Promise<any> {
  return new Promise((resolve, reject) => {
    const body = payload ? JSON.stringify(payload) : null;
    const req = http.request(
      {
        hostname: STATE_HOST,
        port: STATE_PORT,
        path: pathname,
        method,
        headers: body
          ? {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(body),
            }
          : {},
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            resolve(data ? JSON.parse(data) : {});
          } catch (err) {
            reject(err);
          }
        });
      },
    );
    req.on('error', reject);
    if (body) {
      req.write(body);
    }
    req.end();
  });
}

function runCommand(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: projectRoot,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} exited with code ${code}`));
      }
    });
    child.on('error', reject);
  });
}
