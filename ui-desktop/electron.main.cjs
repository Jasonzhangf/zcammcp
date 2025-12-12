const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const http = require('http');
const windowStateKeeper = require('electron-window-state');
const { StateHost } = require('./state-host/state-host.cjs');

const INITIAL_WIDTH = 1200;
const INITIAL_HEIGHT = 720;
const LAYOUT_VARIANTS = ['normal', 'studio'];

const CLI_ROOT = process.env.ZCAM_CLI_ROOT || path.resolve(__dirname, '..', 'cli');
const CLI_NODE_BIN = process.env.ZCAM_NODE_BIN || process.execPath;
const CLI_DEFAULT_TIMEOUT = parseInt(process.env.ZCAM_CLI_TIMEOUT || '10000', 10);
const CLI_SERVICE_HOST = process.env.ZCAM_CLI_SERVICE_HOST || '127.0.0.1';
const CLI_SERVICE_PORT = parseInt(process.env.ZCAM_CLI_SERVICE_PORT || '6291', 10);
const CLI_SERVICE_SCRIPT =
  process.env.ZCAM_CLI_SERVICE_SCRIPT || path.resolve(__dirname, '..', 'service', 'cli-daemon', 'cli-service.js');

let mainWindow = null;
let ballWindow = null;
let lastNormalBounds = null;
let cliServiceProcess = null;

const stateHost = new StateHost();
const windowState = {
  mode: 'main',
  layoutSize: 'normal',
  ballVisible: false,
  lastBounds: null,
};

function pushWindowState(patch) {
  const next = { ...windowState, ...patch, updatedAt: Date.now() };
  Object.assign(windowState, next);
  try {
    stateHost.push('window', windowState);
  } catch (err) {
    console.error('[StateHost] push window failed', err);
  }
  return windowState;
}

function createMainWindow() {
  const mainWindowState = windowStateKeeper({
    defaultWidth: INITIAL_WIDTH,
    defaultHeight: INITIAL_HEIGHT,
  });

  mainWindow = new BrowserWindow({
    x: mainWindowState.x,
    y: mainWindowState.y,
    width: mainWindowState.width,
    height: mainWindowState.height,
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

  mainWindowState.manage(mainWindow);

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

function toggleWindowSize() {
  const current = windowState.layoutSize || 'normal';
  const nextLayout = current === 'normal' ? 'studio' : 'normal';
  const state = pushWindowState({ layoutSize: nextLayout });
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

  cliServiceProcess = spawn(CLI_NODE_BIN, [CLI_SERVICE_SCRIPT], {
    cwd: path.dirname(CLI_SERVICE_SCRIPT),
    windowsHide: true,
    stdio: 'ignore',
  });

  cliServiceProcess.on('exit', () => {
    cliServiceProcess = null;
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
  await ensureCliService();
  const response = await requestCliService('/run', 'POST', {
    ...payload,
    timeoutMs: payload.timeoutMs ?? CLI_DEFAULT_TIMEOUT,
  });
  if (!response.ok) {
    throw new Error(response.error || 'CLI service error');
  }
  return response.result || { ok: true };
}

// IPC handlers
ipcMain.handle('window:minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('window:close', () => app.quit());

ipcMain.handle('window:shrinkToBall', () => shrinkToBall());

ipcMain.handle('window:restoreFromBall', () => restoreFromBall());

ipcMain.handle('window:toggleSize', () => toggleWindowSize());

ipcMain.handle('window:setBounds', (_, bounds) => setWindowBounds(bounds));

ipcMain.handle('window:sendCommand', (_, cmd, payload) => {
  switch (cmd) {
    case 'shrinkToBall':
      return shrinkToBall();
    case 'restoreFromBall':
      return restoreFromBall();
    case 'toggleSize':
      return toggleWindowSize();
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
  })
  .catch((err) => {
    console.error('[StateHost] failed to start', err);
  });

app.whenReady().then(() => {
  createMainWindow();
  pushWindowState({});
});

app.on('before-quit', () => {
  if (cliServiceProcess) {
    try {
      cliServiceProcess.kill();
    } catch {
      // ignore
    }
    cliServiceProcess = null;
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
});
