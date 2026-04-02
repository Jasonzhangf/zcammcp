const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const http = require('http');
const windowStateKeeper = require('electron-window-state');
const { StateHost } = require('./state-host/state-host.cjs');

const INITIAL_WIDTH = 1200;
const INITIAL_HEIGHT = 960;
const PTZ_ONLY_WIDTH = 408;
const PTZ_ONLY_HEIGHT = 660;
const LAYOUT_VARIANTS = ['normal', 'studio'];

const CLI_ROOT = process.env.ZCAM_CLI_ROOT || path.resolve(__dirname, '..', 'cli');
const CLI_NODE_BIN = process.env.ZCAM_NODE_BIN || process.execPath;
const CLI_DEFAULT_TIMEOUT = parseInt(process.env.ZCAM_CLI_TIMEOUT || '10000', 10);
const CLI_SERVICE_HOST = process.env.ZCAM_CLI_SERVICE_HOST || '127.0.0.1';
const CLI_SERVICE_PORT = parseInt(process.env.ZCAM_CLI_SERVICE_PORT || '6291', 10);
function resolveBundledServicePath(relativePath) {
  const packagedPath = path.join(process.resourcesPath, relativePath);
  const devPath = path.resolve(__dirname, '..', relativePath);
  if (app.isPackaged && fs.existsSync(packagedPath)) {
    return packagedPath;
  }
  return devPath;
}

const CLI_SERVICE_SCRIPT = process.env.ZCAM_CLI_SERVICE_SCRIPT || resolveBundledServicePath(path.join('service', 'cli-daemon', 'cli-service.cjs'));
const CAMERA_STATE_HOST = process.env.ZCAM_CAMERA_STATE_HOST || '127.0.0.1';
const CAMERA_STATE_PORT = parseInt(process.env.ZCAM_CAMERA_STATE_PORT || '6292', 10);
const CAMERA_STATE_POLL_INTERVAL = parseInt(process.env.ZCAM_CAMERA_STATE_INTERVAL || '1500', 10);
const CAMERA_STATE_SCRIPT = process.env.ZCAM_CAMERA_STATE_SCRIPT || resolveBundledServicePath(path.join('service', 'camera-state', 'camera-state.cjs'));
const UVC_SERVICE_HOST = process.env.ZCAM_UVC_HOST || '127.0.0.1';
const UVC_SERVICE_PORT = parseInt(process.env.ZCAM_UVC_PORT || '17988', 10);
const IMVT_CAMERA_SERVICE_NAME = 'ImvtCameraService.exe';
const DEVICE_PANEL_WIDTH = parseInt(process.env.ZCAM_DEVICE_PANEL_WIDTH || '130', 10);
const DEVICE_PANEL_MIN_HEIGHT = parseInt(process.env.ZCAM_DEVICE_PANEL_MIN_HEIGHT || '220', 10);
const DEVICE_PANEL_MAX_HEIGHT = parseInt(process.env.ZCAM_DEVICE_PANEL_MAX_HEIGHT || '420', 10);


const TEST_COMMAND_TIMEOUT_MS = parseInt(process.env.ZCAM_TEST_COMMAND_TIMEOUT || '8000', 10);

let mainWindow = null;
let ballWindow = null;
let lastNormalBounds = null;
let lastMainBoundsBeforePtz = null;
let cliServiceProcess = null;
let cameraStateProcess = null;
let cameraPollTimer = null;
let cameraStateSnapshot = null;
let imvtCameraServiceProcess = null;
let devicePanelWindow = null;
let devicePanelData = { devices: [], activeDeviceId: null };
const pendingTestCommands = new Map();

const stateHost = new StateHost();
const windowState = {
  mode: 'main',
  layoutSize: 'ptz',
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

function resolveImvtCameraServiceExePath() {
  const envPath = process.env.ZCAM_IMVT_SERVICE_EXE;
  if (envPath && fs.existsSync(envPath)) {
    return envPath;
  }
  const packagedPath = path.join(process.resourcesPath, 'service', 'uvcservices', IMVT_CAMERA_SERVICE_NAME);
  const devPath = path.resolve(__dirname, '..', 'service', 'uvcservices', IMVT_CAMERA_SERVICE_NAME);
  if (app.isPackaged && fs.existsSync(packagedPath)) {
    return packagedPath;
  }
  if (fs.existsSync(devPath)) {
    return devPath;
  }
  return app.isPackaged ? packagedPath : devPath;
}

function startImvtCameraService() {
  if (process.platform !== 'win32') {
    return null;
  }
  if (imvtCameraServiceProcess) {
    return imvtCameraServiceProcess;
  }
  const exePath = resolveImvtCameraServiceExePath();
  if (!fs.existsSync(exePath)) {
    console.error('[IMVT] service exe not found:', exePath);
    return null;
  }
  try {
    console.log('[IMVT] starting service:', exePath);
    imvtCameraServiceProcess = spawn(exePath, [], {
      cwd: path.dirname(exePath),
      windowsHide: true,
      stdio: 'ignore',
    });
    imvtCameraServiceProcess.on('exit', (code, signal) => {
      console.log('[IMVT] service exited, code:', code, 'signal:', signal);
      imvtCameraServiceProcess = null;
    });
    imvtCameraServiceProcess.on('error', (err) => {
      console.error('[IMVT] service error:', err);
      imvtCameraServiceProcess = null;
    });
    return imvtCameraServiceProcess;
  } catch (err) {
    console.error('[IMVT] failed to start service:', err);
    imvtCameraServiceProcess = null;
    return null;
  }
}

function stopImvtCameraService() {
  if (!imvtCameraServiceProcess) return;
  try {
    imvtCameraServiceProcess.kill();
  } catch {
    // ignore
  }
  imvtCameraServiceProcess = null;
}

function getDevicePanelBounds() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return null;
  }
  const mainBounds = mainWindow.getBounds();
  const display = screen.getDisplayMatching(mainBounds);
  const workArea = display?.workArea || { x: 0, y: 0, width: 1920, height: 1080 };
  const x = Math.max(workArea.x, Math.round(mainBounds.x - DEVICE_PANEL_WIDTH));
  const y = Math.max(workArea.y, Math.round(mainBounds.y + 38));
  const mainBottom = Math.round(mainBounds.y + mainBounds.height);
  const workAreaBottom = workArea.y + workArea.height;
  const maxHeight = Math.max(0, workAreaBottom - y);
  const desiredHeight = Math.max(0, mainBottom - y);
  const height = Math.min(desiredHeight, maxHeight);
  return { x, y, width: DEVICE_PANEL_WIDTH, height };
}

function buildDevicePanelHtml() {
  return `<!doctype html><html><head><meta charset="UTF-8"><style>
    html,body{margin:0;padding:0;background:rgba(18,18,18,.98);color:#f5f5f5;font:12px Arial}
    .wrap{height:100vh;display:flex;flex-direction:column;border:1px solid #2f2f2f;border-radius:8px;overflow:hidden}
    .head{display:flex;align-items:center;gap:8px;padding:8px 10px;border-bottom:1px solid #2a2a2a}
    .title{font-weight:600}
    .dot{width:8px;height:8px;border-radius:50%;background:#666}
    .dot.on{background:#52c41a;box-shadow:0 0 4px rgba(82,196,26,.5)}
    .close{margin-left:auto;width:18px;height:18px;border:1px solid #3a3a3a;border-radius:4px;background:#1f1f1f;color:#cfcfcf;cursor:pointer}
    .list{padding:8px;overflow:auto;display:flex;flex-direction:column;gap:6px;scrollbar-width:none;-ms-overflow-style:none}
    .list::-webkit-scrollbar{display:none;width:0;height:0}
    *::-webkit-scrollbar{display:none;width:0;height:0}
    .item{display:flex;align-items:center;justify-content:space-between;padding:8px 10px;border-radius:6px;background:#1a1a1a;border:1px solid #2a2a2a;cursor:pointer}
    .item.active{background:#262626;border-color:#ff7a45;box-shadow:0 0 0 1px rgba(255,122,69,.3)}
    .name{font-size:12px;font-weight:600}
    .sub{font-size:10px;color:#888}
  </style></head><body><div class="wrap"><div class="head"><span class="title">Devices</span><span id="statusDot" class="dot"></span><button id="closeBtn" class="close">×</button></div><div id="list" class="list"></div></div>
  <script>
    const { ipcRenderer } = require('electron');
    let state = { devices: [], activeDeviceId: null };
    const listEl = document.getElementById('list');
    const dot = document.getElementById('statusDot');
    document.getElementById('closeBtn').addEventListener('click', () => ipcRenderer.invoke('devicePanel:hide'));
    function render(){
      listEl.innerHTML = '';
      const devices = Array.isArray(state.devices) ? state.devices : [];
      const active = state.activeDeviceId;
      const activeDevice = devices.find(d => d && d.id === active);
      dot.className = activeDevice ? 'dot on' : 'dot';
      if (devices.length === 0) {
        const empty = document.createElement('div');
        empty.textContent = 'No devices found';
        empty.style.padding='20px'; empty.style.color='#666'; empty.style.textAlign='center';
        listEl.appendChild(empty);
        return;
      }
      devices.forEach((device) => {
        if (!device || !device.id) return;
        const item = document.createElement('div');
        item.className = 'item' + (device.id === active ? ' active' : '');
        const info = document.createElement('div');
        const name = document.createElement('div');
        name.className = 'name';
        name.textContent = device.name || device.id;
        const sub = document.createElement('div');
        sub.className = 'sub';
        sub.textContent = device.serialPort || '';
        info.appendChild(name); info.appendChild(sub);
        const dotEl = document.createElement('span');
        dotEl.className = 'dot' + (device.id === active ? ' on' : '');
        item.appendChild(info); item.appendChild(dotEl);
        item.addEventListener('click', async () => {
          await ipcRenderer.invoke('devicePanel:switchDevice', device.id);
        });
        listEl.appendChild(item);
      });
    }
    ipcRenderer.on('devicePanel:data', (_e, payload) => { state = payload || { devices: [], activeDeviceId: null }; render(); });
    ipcRenderer.invoke('devicePanel:getData').then((payload) => { state = payload || state; render(); });
  </script></body></html>`;
}

function pushDevicePanelData(payload = {}) {
  const devices = Array.isArray(payload.devices) ? payload.devices : devicePanelData.devices;
  const activeDeviceId = typeof payload.activeDeviceId === 'string' || payload.activeDeviceId === null
    ? payload.activeDeviceId
    : devicePanelData.activeDeviceId;
  devicePanelData = { devices, activeDeviceId };
  if (devicePanelWindow && !devicePanelWindow.isDestroyed()) {
    devicePanelWindow.webContents.send('devicePanel:data', devicePanelData);
  }
  return devicePanelData;
}

function closeDevicePanel() {
  if (!devicePanelWindow || devicePanelWindow.isDestroyed()) return;
  devicePanelWindow.close();
  devicePanelWindow = null;
}

function canShowDevicePanel() {
  if (!mainWindow || mainWindow.isDestroyed()) return false;
  if (windowState.mode !== 'main') return false;
  if (windowState.layoutSize !== 'ptz') return false;
  if (mainWindow.isMinimized()) return false;
  if (!mainWindow.isVisible()) return false;
  return true;
}

function syncDevicePanelBounds() {
  if (!devicePanelWindow || devicePanelWindow.isDestroyed()) return;
  const bounds = getDevicePanelBounds();
  if (!bounds) return;
  devicePanelWindow.setBounds(bounds);
}

function openDevicePanel() {
  if (!canShowDevicePanel()) {
    closeDevicePanel();
    return { ok: false, open: false };
  }
  if (devicePanelWindow && !devicePanelWindow.isDestroyed()) {
    syncDevicePanelBounds();
    devicePanelWindow.show();
    devicePanelWindow.focus();
    pushDevicePanelData(devicePanelData);
    return { ok: true, open: true };
  }
  const bounds = getDevicePanelBounds();
  if (!bounds) {
    return { ok: false, open: false };
  }
  devicePanelWindow = new BrowserWindow({
    parent: mainWindow,
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    show: false,
    skipTaskbar: true,
    alwaysOnTop: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  devicePanelWindow.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(buildDevicePanelHtml())}`);
  devicePanelWindow.once('ready-to-show', () => {
    if (!devicePanelWindow || devicePanelWindow.isDestroyed()) return;
    devicePanelWindow.show();
    pushDevicePanelData(devicePanelData);
  });
  devicePanelWindow.on('closed', () => {
    devicePanelWindow = null;
  });
  return { ok: true, open: true };
}

function toggleDevicePanel() {
  if (!canShowDevicePanel()) {
    closeDevicePanel();
    return { ok: false, open: false };
  }
  if (devicePanelWindow && !devicePanelWindow.isDestroyed() && devicePanelWindow.isVisible()) {
    closeDevicePanel();
    return { ok: true, open: false };
  }
  return openDevicePanel();
}

function createMainWindow() {
  const mainWindowState = windowStateKeeper({
    defaultWidth: windowState.layoutSize === 'ptz' ? PTZ_ONLY_WIDTH : INITIAL_WIDTH,
    defaultHeight: windowState.layoutSize === 'ptz' ? PTZ_ONLY_HEIGHT : INITIAL_HEIGHT,
  });

  mainWindow = new BrowserWindow({
    x: mainWindowState.x,
    y: mainWindowState.y,
    // width: mainWindowState.width,
    // height: mainWindowState.height,
    width: windowState.layoutSize === 'ptz' ? PTZ_ONLY_WIDTH : INITIAL_WIDTH,
    height: windowState.layoutSize === 'ptz' ? PTZ_ONLY_HEIGHT : INITIAL_HEIGHT,
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
    // mainWindow.webContents.openDevTools({ mode: 'detach' });
  });

  mainWindow.on('closed', () => {
    closeDevicePanel();
    mainWindow = null;
  });

  mainWindow.on('hide', () => {
    closeDevicePanel();
  });

  mainWindow.on('minimize', () => {
    closeDevicePanel();
  });

  mainWindow.on('move', () => {
    syncDevicePanelBounds();
  });

  mainWindow.on('resize', () => {
    syncDevicePanelBounds();
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
  closeDevicePanel();
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
  closeDevicePanel();
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
  const nextLayout = current === 'normal' ? 'studio' : 'normal';
  if (current === 'ptz' || nextLayout !== 'ptz') {
    closeDevicePanel();
  }

  if (current === 'ptz') {
    if (lastMainBoundsBeforePtz) {
      mainWindow.setBounds(lastMainBoundsBeforePtz);
    } else {
      const currentBounds = mainWindow.getBounds();
      const display = screen.getDisplayMatching(currentBounds);
      const { workArea } = display;
      const width = Math.min(workArea.width, INITIAL_WIDTH);
      const height = Math.min(workArea.height, INITIAL_HEIGHT);
      let x = Math.round(workArea.x + (workArea.width - width) / 2);
      let y = Math.round(workArea.y + (workArea.height - height) / 2);
      x = Math.max(workArea.x, Math.min(workArea.x + workArea.width - width, x));
      y = Math.max(workArea.y, Math.min(workArea.y + workArea.height - height, y));
      mainWindow.setBounds({ x, y, width, height });
    }
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

  closeDevicePanel();
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
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
    },
    stdio: 'inherit',
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
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      ZCAM_CAMERA_STATE_HOST: CAMERA_STATE_HOST,
      ZCAM_CAMERA_STATE_PORT: String(CAMERA_STATE_PORT),
      ZCAM_CAMERA_STATE_INTERVAL: String(CAMERA_STATE_POLL_INTERVAL),
      ZCAM_UVC_BASE: process.env.ZCAM_UVC_BASE || `http://${UVC_SERVICE_HOST}:${UVC_SERVICE_PORT}`,
      ZCAM_UVC_WS: process.env.ZCAM_UVC_WS || `ws://${UVC_SERVICE_HOST}:${UVC_SERVICE_PORT}/ws`,
    },
    stdio: 'inherit',
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
ipcMain.handle('window:minimize', () => {
  closeDevicePanel();
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

ipcMain.handle('devicePanel:toggle', () => toggleDevicePanel());

ipcMain.handle('devicePanel:hide', () => {
  closeDevicePanel();
  return { ok: true, open: false };
});

ipcMain.handle('devicePanel:update', (_, payload) => {
  const data = pushDevicePanelData(payload || {});
  return { ok: true, data };
});

ipcMain.handle('devicePanel:getData', () => devicePanelData);

ipcMain.handle('devicePanel:switchDevice', async (_, deviceId) => {
  const id = typeof deviceId === 'string' ? deviceId : '';
  if (!id || !mainWindow || mainWindow.isDestroyed()) {
    return { ok: false };
  }
  mainWindow.webContents.send('device:switchRequest', { id });
  closeDevicePanel();
  return { ok: true };
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
  startImvtCameraService();
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
  stopImvtCameraService();
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
