const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const http = require('http');
const windowStateKeeper = require('electron-window-state');
const { StateHost } = require('./state-host/state-host.cjs');

const INITIAL_WIDTH = 1200;
const INITIAL_HEIGHT = 960;
const PTZ_ONLY_WIDTH = 410;
const PTZ_ONLY_HEIGHT = 660;
const LAYOUT_VARIANTS = ['normal', 'studio'];

const CLI_ROOT = process.env.ZCAM_CLI_ROOT || path.resolve(__dirname, '..', 'cli');
const CLI_NODE_BIN = process.env.ZCAM_NODE_BIN || process.execPath;
const CLI_DEFAULT_TIMEOUT = parseInt(process.env.ZCAM_CLI_TIMEOUT || '10000', 10);
const CLI_SERVICE_HOST = process.env.ZCAM_CLI_SERVICE_HOST || '127.0.0.1';
const CLI_SERVICE_PORT = parseInt(process.env.ZCAM_CLI_SERVICE_PORT || '6291', 10);
const CLI_SERVICE_SCRIPT =
  process.env.ZCAM_CLI_SERVICE_SCRIPT || path.resolve(__dirname, '..', 'service', 'cli-daemon', 'cli-service.cjs');
const CAMERA_STATE_HOST = process.env.ZCAM_CAMERA_STATE_HOST || '127.0.0.1';
const CAMERA_STATE_PORT = parseInt(process.env.ZCAM_CAMERA_STATE_PORT || '6292', 10);
const CAMERA_STATE_POLL_INTERVAL = parseInt(process.env.ZCAM_CAMERA_STATE_INTERVAL || '1500', 10);
const CAMERA_STATE_SCRIPT =
  process.env.ZCAM_CAMERA_STATE_SCRIPT || path.resolve(__dirname, '..', 'service', 'camera-state', 'camera-state.cjs');
const UVC_SERVICE_HOST = process.env.ZCAM_UVC_HOST || '127.0.0.1';
const UVC_SERVICE_PORT = parseInt(process.env.ZCAM_UVC_PORT || '17988', 10);


const TEST_COMMAND_TIMEOUT_MS = parseInt(process.env.ZCAM_TEST_COMMAND_TIMEOUT || '8000', 10);

let mainWindow = null;
let ballWindow = null;
let lastNormalBounds = null;
let lastMainBoundsBeforePtz = null;
let cliServiceProcess = null;
let cameraStateProcess = null;
let cameraPollTimer = null;
let cameraStateSnapshot = null;
const pendingTestCommands = new Map();

const stateHost = new StateHost();
const uiHeartbeats = {};

const windowState = {
  mode: 'main',
  layoutSize: 'normal',
  ballVisible: false,
  lastBounds: null,
};

if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}

app.on('second-instance', () => {
  if (ballWindow) {
    restoreFromBall();
    return;
  }
  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.show();
    mainWindow.focus();
  }
});

function pushWindowState(patch) {
  const next = { ...windowState, ...patch, updatedAt: Date.now() };
  Object.assign(windowState, next);
  try {
    stateHost.push('window', windowState);
  } catch (err) {
    console.error('[StateHost] push window failed', err);
  }
  notifyWindowRenderers(windowState);
  return windowState;
}

function notifyWindowRenderers(state) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    try {
      mainWindow.webContents.send('window:state', state);
    } catch (err) {
      console.error('[Window] notify renderer failed', err);
    }
  }
}

function pushCameraState(snapshot) {
  if (!snapshot) return;
  cameraStateSnapshot = snapshot;
  try {
    stateHost.push('camera', snapshot);
  } catch (err) {
    console.error('[StateHost] push camera failed', err);
  }
  notifyCameraRenderers(snapshot);
}

function notifyCameraRenderers(state) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    try {
      mainWindow.webContents.send('camera:state', state);
    } catch (err) {
      console.error('[Camera] notify renderer failed', err);
    }
  }
}

function createMainWindow() {
  const mainWindowState = windowStateKeeper({
    defaultWidth: INITIAL_WIDTH,
    defaultHeight: INITIAL_HEIGHT,
  });

  mainWindow = new BrowserWindow({
    x: mainWindowState.x,
    y: mainWindowState.y,
    // width: mainWindowState.width,
    // height: mainWindowState.height,
    width: INITIAL_WIDTH,
    height: INITIAL_HEIGHT,
    show: false,
    frame: false,
    skipTaskbar: false,
    transparent: false,
    resizable: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'electron.preload.cjs'),
    },
  });

  // mainWindowState.manage(mainWindow);

  const env = process.env.NODE_ENV || 'production';
  if (env === 'development') {
    const devPort = process.env.VITE_PORT || 5174;
    mainWindow.loadURL(`http://localhost:${devPort}`);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist-web', 'index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    if (!mainWindow) return;
    mainWindow.show();
    mainWindow.focus();
    // 强制打开调试工具方便查看日志
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createBallWindow(bounds) {
  const ballSize = 72;
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;
  const display = screen.getDisplayMatching(bounds);
  const { workArea } = display;

  let ballX = Math.round(centerX - ballSize / 2);
  let ballY = Math.round(centerY - ballSize / 2);
  ballX = Math.max(workArea.x, Math.min(workArea.x + workArea.width - ballSize, ballX));
  ballY = Math.max(workArea.y, Math.min(workArea.y + workArea.height - ballSize, ballY));

  ballWindow = new BrowserWindow({
    x: ballX,
    y: ballY,
    width: ballSize,
    height: ballSize,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: false,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'electron.preload.cjs'),
    },
  });

  const ballHtmlPath = path.join(__dirname, 'assets', 'ball', 'ball.html');
  console.log('[BallWindow] load file', ballHtmlPath);
  ballWindow
    .loadFile(ballHtmlPath)
    .catch((err) => {
      console.error('[BallWindow] failed to load ball html', err);
      if (ballWindow) {
        ballWindow.close();
        ballWindow = null;
      }
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      }
    });

  ballWindow.once('ready-to-show', () => {
    if (!ballWindow) return;
    ballWindow.show();
  });

  ballWindow.on('closed', () => {
    ballWindow = null;
    pushWindowState({ ballVisible: false });
  });
}

function shrinkToBall() {
  if (!mainWindow) {
    return { ok: false, error: 'main window not ready' };
  }
  if (ballWindow) {
    return { ok: false, error: 'ball window already exists' };
  }
  lastNormalBounds = mainWindow.getBounds();
  console.log('[Window] shrinkToBall -> storing bounds', lastNormalBounds);
  createBallWindow(lastNormalBounds);
  mainWindow.hide();
  const state = pushWindowState({ mode: 'ball', ballVisible: true, lastBounds: lastNormalBounds });
  return { ok: true, state };
}

function restoreFromBall() {
  if (!mainWindow) {
    return { ok: false, error: 'main window not ready' };
  }
  if (ballWindow) {
    ballWindow.close();
    ballWindow = null;
  }
  if (lastNormalBounds) mainWindow.setBounds(lastNormalBounds);
  mainWindow.setAlwaysOnTop(false);
  mainWindow.setResizable(true);
  mainWindow.show();
  mainWindow.focus();
  const state = pushWindowState({ mode: 'main', ballVisible: false });
  return { ok: true, state };
}

function moveBall(payload) {
  if (!ballWindow) return;
  const { x, y } = payload;
  const [currentX, currentY] = ballWindow.getPosition();
  ballWindow.setPosition(currentX + x, currentY + y);
}

function toggleWindowSize() {
  if (!mainWindow) {
    return { ok: false, error: 'main window not ready' };
  }
  const current = windowState.layoutSize || 'normal';
  // AB Mode: Toggle between normal and studio
  // If current is PTZ, switch back to normal
  const nextLayout = current === 'normal' ? 'studio' : 'normal';

  if (current === 'ptz' && lastMainBoundsBeforePtz) {
    mainWindow.setBounds(lastMainBoundsBeforePtz);
  }
  
  const state = pushWindowState({ layoutSize: nextLayout, lastBounds: mainWindow.getBounds() });
  return { ok: true, state };
}

function switchToPtz() {
  if (!mainWindow) {
    return { ok: false, error: 'main window not ready' };
  }
  const current = windowState.layoutSize || 'normal';
  if (current === 'ptz') return { ok: true, state: windowState };

  lastMainBoundsBeforePtz = mainWindow.getBounds();
  const prev = lastMainBoundsBeforePtz;
  const display = screen.getDisplayMatching(prev);
  const { workArea } = display;

  const width = Math.min(workArea.width, PTZ_ONLY_WIDTH);
  const height = Math.min(workArea.height, PTZ_ONLY_HEIGHT);
  let x = Math.round(prev.x + (prev.width - width) / 2);
  let y = Math.round(prev.y + (prev.height - height) / 2);
  x = Math.max(workArea.x, Math.min(workArea.x + workArea.width - width, x));
  y = Math.max(workArea.y, Math.min(workArea.y + workArea.height - height, y));
  mainWindow.setBounds({ x, y, width, height });

  const state = pushWindowState({ layoutSize: 'ptz', lastBounds: mainWindow.getBounds() });
  return { ok: true, state };
}

function setWindowBounds(bounds) {
  if (!mainWindow) {
    return { ok: false, error: 'main window not ready' };
  }
  const prevBounds = mainWindow.getBounds();
  const nextBounds = {
    x: typeof bounds?.x === 'number' ? bounds.x : prevBounds.x,
    y: typeof bounds?.y === 'number' ? bounds.y : prevBounds.y,
    width: typeof bounds?.width === 'number' ? bounds.width : prevBounds.width,
    height: typeof bounds?.height === 'number' ? bounds.height : prevBounds.height,
  };
  mainWindow.setBounds(nextBounds);
  const state = pushWindowState({ lastBounds: nextBounds });
  return { ok: true, state };
}

async function ensureCliService() {
  try {
    await requestCliService('/health', 'GET');
    return;
  } catch {
    startCliService();
  }

  const start = Date.now();
  while (Date.now() - start < CLI_DEFAULT_TIMEOUT) {
    try {
      await requestCliService('/health', 'GET');
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
  throw new Error('CLI service failed to start');
}

function startCliService() {
  if (cliServiceProcess) {
    return cliServiceProcess;
  }
  if (!fs.existsSync(CLI_SERVICE_SCRIPT)) {
    throw new Error(`CLI service script not found at ${CLI_SERVICE_SCRIPT}`);
  }

  console.log('[Electron] Starting CLI Service process...');
  console.log('[Electron] CLI_NODE_BIN:', CLI_NODE_BIN);
  console.log('[Electron] CLI_SERVICE_SCRIPT:', CLI_SERVICE_SCRIPT);

  cliServiceProcess = spawn(CLI_NODE_BIN, [CLI_SERVICE_SCRIPT], {
    cwd: path.dirname(CLI_SERVICE_SCRIPT),
    windowsHide: true,
    stdio: 'inherit',  // ✅ 改为 'inherit' 让日志输出到父进程
  });

  console.log('[Electron] CLI Service process spawned, PID:', cliServiceProcess.pid);

  cliServiceProcess.on('exit', (code, signal) => {
    console.log('[Electron] CLI Service process exited, code:', code, 'signal:', signal);
    cliServiceProcess = null;
  });

  cliServiceProcess.on('error', (err) => {
    console.error('[Electron] CLI Service process error:', err);
  });

  return cliServiceProcess;
}

function requestCliService(pathname, method = 'GET', payload) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: CLI_SERVICE_HOST,
      port: CLI_SERVICE_PORT,
      path: pathname,
      method,
      headers: {},
    };

    let body = null;
    if (payload) {
      body = JSON.stringify(payload);
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(body);
    }

    const req = http.request(options, (res) => {
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
    });

    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function runCliBridge(payload = {}) {
  console.log('[Electron] runCliBridge called with args:', payload.args);
  await ensureCliService();

  console.log('[Electron] Sending POST to http://127.0.0.1:6291/run');
  console.log('[Electron] Payload:', JSON.stringify(payload, null, 2));

  const response = await requestCliService('/run', 'POST', {
    ...payload,
    timeoutMs: payload.timeoutMs ?? CLI_DEFAULT_TIMEOUT,
  });

  console.log('[Electron] Received response from CLI Service:', response.ok ? 'OK' : 'FAILED');

  if (!response.ok) {
    throw new Error(response.error || 'CLI service error');
  }
  return response.result || { ok: true };
}

/**
 * Send direct HTTP request to UsbCameraService (17988)
 * Bypasses CLI Service for better performance
 */
async function sendUvcRequest(uvcRequest) {
  const { url, method = 'GET', body } = uvcRequest;

  console.log('[UVC] Sending', method, 'to', `http://${UVC_SERVICE_HOST}:${UVC_SERVICE_PORT}${url}`);

  return new Promise((resolve, reject) => {
    const options = {
      hostname: UVC_SERVICE_HOST,
      port: UVC_SERVICE_PORT,
      path: url,
      method,
      headers: {},
    };

    let requestBody = null;
    if (body) {
      requestBody = JSON.stringify(body);
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(requestBody);
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const result = data ? JSON.parse(data) : {};
          console.log('[UVC] Response:', result);
          resolve(result);
        } catch (err) {
          console.error('[UVC] Failed to parse response:', err);
          resolve({ ok: false, error: 'Invalid JSON response' });
        }
      });
    });

    req.on('error', (err) => {
      console.error('[UVC] Request error:', err);
      reject(err);
    });

    if (requestBody) req.write(requestBody);
    req.end();
  });
}


async function ensureCameraStateService() {
  if (!CAMERA_STATE_SCRIPT) return;
  try {
    await requestCameraService('/health', 'GET');
    return;
  } catch {
    startCameraStateService();
  }

  const start = Date.now();
  while (Date.now() - start < CLI_DEFAULT_TIMEOUT) {
    try {
      await requestCameraService('/health', 'GET');
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
  throw new Error('Camera state service failed to start');
}

function startCameraStateService() {
  if (cameraStateProcess || !CAMERA_STATE_SCRIPT) {
    return cameraStateProcess;
  }

  if (!fs.existsSync(CAMERA_STATE_SCRIPT)) {
    throw new Error(`Camera state script not found at ${CAMERA_STATE_SCRIPT}`);
  }

  console.log('[Electron] Starting Camera State Service...');
  console.log('[Electron] CAMERA_STATE_SCRIPT:', CAMERA_STATE_SCRIPT);

  cameraStateProcess = spawn(CLI_NODE_BIN, [CAMERA_STATE_SCRIPT], {
    cwd: path.dirname(CAMERA_STATE_SCRIPT),
    windowsHide: true,
    stdio: 'inherit',  // ✅ 改为 'inherit' 让日志输出到父进程
  });

  console.log('[Electron] Camera State Service spawned, PID:', cameraStateProcess.pid);

  cameraStateProcess.on('exit', (code, signal) => {
    console.log('[Electron] Camera State Service exited, code:', code, 'signal:', signal);
    cameraStateProcess = null;
  });

  cameraStateProcess.on('error', (err) => {
    console.error('[Electron] Camera State Service error:', err);
  });

  return cameraStateProcess;
}

function requestCameraService(pathname, method = 'GET', payload) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: CAMERA_STATE_HOST,
      port: CAMERA_STATE_PORT,
      path: pathname,
      method,
      headers: {},
    };

    let body = null;
    if (payload) {
      body = JSON.stringify(payload);
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(body);
    }

    const req = http.request(options, (res) => {
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
    });

    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function startCameraStateSync() {
  if (cameraPollTimer || !CAMERA_STATE_PORT) return;
  const poll = async () => {
    try {
      const payload = await requestCameraService('/state');
      if (payload?.state) {
        pushCameraState(payload.state);
      }
    } catch (err) {
      console.warn('[Camera] state fetch failed', err.message || err);
    }
  };
  void poll();
  cameraPollTimer = setInterval(poll, CAMERA_STATE_POLL_INTERVAL);
}

function stopCameraStateSync() {
  if (cameraPollTimer) {
    clearInterval(cameraPollTimer);
    cameraPollTimer = null;
  }
  if (cameraStateProcess) {
    try {
      cameraStateProcess.kill();
    } catch {
      // ignore
    }
    cameraStateProcess = null;
  }
}

// IPC handlers
ipcMain.handle('ui:heartbeat', async (_event, payload) => {
  const { controlId, ts } = payload;
  uiHeartbeats[controlId] = { updated: true, ts };
  stateHost.push('ui', { heartbeats: uiHeartbeats });
  return { ok: true };
});

ipcMain.handle('window:minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('window:close', () => app.quit());

ipcMain.handle('window:shrinkToBall', () => shrinkToBall());

ipcMain.handle('window:restoreFromBall', () => restoreFromBall());
ipcMain.handle('window:moveBall', (_, payload) => moveBall(payload));

ipcMain.handle('window:toggleSize', () => toggleWindowSize());
ipcMain.handle('window:switchToPtz', () => switchToPtz());

ipcMain.handle('window:setBounds', (_, bounds) => setWindowBounds(bounds));

ipcMain.handle('window:sendCommand', (_, cmd, payload) => {
  switch (cmd) {
    case 'shrinkToBall':
      return shrinkToBall();
    case 'restoreFromBall':
      return restoreFromBall();
    case 'toggleSize':
      return toggleWindowSize();
    case 'switchToPtz':
      return switchToPtz();
    case 'setBounds':
      return setWindowBounds(payload);
    default:
      console.log('[Window] unknown command', cmd);
      return { ok: false, error: 'unknown command' };
  }
});

ipcMain.handle('state:push', (_, { channel, payload }) => {
  try {
    stateHost.push(channel, payload || {});
    return { ok: true };
  } catch (err) {
    console.error('[StateHost] push failed', err);
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('cli:run', async (_, payload) => {
  try {
    return await runCliBridge(payload || {});
  } catch (err) {
    console.error('[CLI] run failed', err);
    return { ok: false, error: err.message || String(err) };
  }
});

// Direct UVC request handler - bypasses CLI Service for better performance
ipcMain.handle('uvc:request', async (_, uvcRequest) => {
  try {
    console.log('[UVC] Direct request:', uvcRequest);
    return await sendUvcRequest(uvcRequest);
  } catch (err) {
    console.error('[UVC] request failed', err);
    return { ok: false, error: err.message || String(err) };
  }
});


ipcMain.on('test:response', (_event, message = {}) => {
  const { requestId } = message;
  if (!requestId) {
    return;
  }
  const pending = pendingTestCommands.get(requestId);
  if (!pending) {
    return;
  }
  pendingTestCommands.delete(requestId);
  clearTimeout(pending.timer);
  if (message.ok === false) {
    pending.reject(new Error(message.error || 'test command failed'));
  } else {
    pending.resolve(message.result ?? message.data ?? null);
  }
});

stateHost
  .start()
  .then(() => {
    stateHost.registerHandler('window', async (action, payload) => {
      switch (action) {
        case 'shrinkToBall':
          return shrinkToBall();
        case 'restoreFromBall':
          return restoreFromBall();
        case 'toggleSize':
          return toggleWindowSize();
        case 'setBounds':
          return setWindowBounds(payload);
        default:
          throw new Error(`unknown window action: ${action}`);
      }
    });
    stateHost.registerHandler('cli', async (action, payload = {}) => {
      switch (action) {
        case 'run':
          return runCliBridge(payload);
        case 'uvc.set': {
          const key = typeof payload.key === 'string' ? payload.key : null;
          if (!key) {
            throw new Error('uvc.set requires key');
          }
          const args = ['uvc', 'set', key];
          if (typeof payload.value !== 'undefined') {
            args.push('--value', String(payload.value));
          }
          if (typeof payload.auto !== 'undefined') {
            args.push('--auto', String(payload.auto));
          }
          return runCliBridge({
            args,
            timeoutMs: payload.timeoutMs,
            expectJson: payload.expectJson !== false,
          });
        }
        case 'uvc.get': {
          const key = typeof payload.key === 'string' ? payload.key : null;
          if (!key) {
            throw new Error('uvc.get requires key');
          }
          const args = ['uvc', 'get', key];
          return runCliBridge({
            args,
            timeoutMs: payload.timeoutMs,
            expectJson: payload.expectJson !== false,
          });
        }
        default:
          throw new Error(`unknown cli action: ${action}`);
      }
    });
    stateHost.registerHandler('uiTest', async (action, payload = {}) => {
      switch (action) {
        case 'focus':
        case 'blur':
        case 'keyDown':
        case 'keyUp':
        case 'keySequence':
        case 'ping':
        case 'queryFocus':
        case 'getViewState':
        case 'getInteractionLog':
        case 'clearInteractionLog':
        case 'setInputTrace':
        case 'replayInteractions':
          return runRendererTestCommand(action, payload);
        default:
          throw new Error(`unknown uiTest action: ${action}`);
      }
    });
    // 统一命令处理入口 - CLI 通过此接口执行 UI 命令
    stateHost.registerHandler('ui', async (action, payload = {}) => {
      if (action === 'heartbeat') {
        const { controlId, ts = Date.now() } = payload;
        uiHeartbeats[controlId] = { updated: true, ts };
        return { ok: true };
      }
      if (action === 'getHeartbeats') {
        return { ok: true, heartbeats: uiHeartbeats };
      }
      throw new Error(`unknown ui action: ${action}`);
    });

    stateHost.registerHandler('command', async (action, payload = {}) => {
      console.log('[CommandHandler] action=%s payload=%j', action, payload);
      switch (action) {
        case 'execute': {
          const { command, params = {} } = payload;
          if (command === 'ui.window.shrinkToBall') {
            const result = await shrinkToBall();
            return { ok: true, data: result };
          }
          if (command === 'ui.window.restoreFromBall') {
            const result = await restoreFromBall();
            return { ok: true, data: result };
          }
          throw new Error(`unknown command: ${command}`);
        }
        case 'list': {
          return {
            ok: true,
            commands: [
              { id: 'ui.window.shrinkToBall', category: 'window', description: 'Shrink main window to ball' },
              { id: 'ui.window.restoreFromBall', category: 'window', description: 'Restore window from ball' },
            ],
          };
        }
        default:
          throw new Error(`unknown command action: ${action}`);
      }
    });

    ensureCameraStateService()
      .then(() => startCameraStateSync())
      .catch((err) => {
        console.error('[Camera] failed to start state service', err);
      });
  })
  .catch((err) => {
    console.error('[StateHost] failed to start', err);
  });

app.whenReady().then(() => {
  createMainWindow();
  pushWindowState({});
});

app.on('before-quit', () => {
  stopCameraStateSync();
  if (cliServiceProcess) {
    try {
      cliServiceProcess.kill();
    } catch {
      // ignore
    }
    cliServiceProcess = null;
  }

  // Shutdown UVC Service
  if (UVC_SERVICE_PORT) {
    console.log('[App] Requesting UVC Service shutdown...');
    // Use the comprehensive request helper
    sendUvcRequest({ url: '/usbvideoctrl?action=shutdown', method: 'GET' })
      .then(() => console.log('[App] UVC Service shutdown signal sent'))
      .catch(err => console.log('[App] UVC shutdown warning (expected if down):', err.message));
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
});

function runRendererTestCommand(action, payload) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    throw new Error('main window unavailable');
  }
  if (!mainWindow.webContents) {
    throw new Error('renderer not ready');
  }
  const requestId = `ui-test:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pendingTestCommands.delete(requestId);
      reject(new Error(`test command timeout (${action})`));
    }, TEST_COMMAND_TIMEOUT_MS);
    pendingTestCommands.set(requestId, { resolve, reject, timer });
    try {
      mainWindow.webContents.send('test:command', { requestId, action, payload });
    } catch (err) {
      clearTimeout(timer);
      pendingTestCommands.delete(requestId);
      reject(err);
    }
  });
}
