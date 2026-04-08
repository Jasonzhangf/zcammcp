const { app, BrowserWindow, Menu, ipcMain, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const http = require('http');
const windowStateKeeper = require('electron-window-state');
const { StateHost } = require('./state-host/state-host.cjs');
const { buildPresetPanelHtml: buildPresetPanelHtmlTemplate } = require('./electron.preset-panel.cjs');

const INITIAL_WIDTH = 1200;
const INITIAL_HEIGHT = 800;
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
const PRESET_SLOT_COUNT = parseInt(process.env.ZCAM_PRESET_SLOT_COUNT || '10', 10);
const PRESET_TOTAL_COUNT = parseInt(process.env.ZCAM_PRESET_TOTAL_COUNT || '100', 10);
const PRESET_REFRESH_MIN_INTERVAL_MS = parseInt(process.env.ZCAM_PRESET_REFRESH_MIN_INTERVAL_MS || '3000', 10);
const PRESET_FETCH_GAP_MS = parseInt(process.env.ZCAM_PRESET_FETCH_GAP_MS || '120', 10);
const PRESET_THUMB_BASE = String(process.env.ZCAM_PRESET_THUMB_BASE || '').trim();
const IMVT_CAMERA_SERVICE_NAME = 'ImvtCameraService.exe';
const DEVICE_PANEL_WIDTH = parseInt(process.env.ZCAM_DEVICE_PANEL_WIDTH || '130', 10);
const DEVICE_PANEL_MIN_HEIGHT = parseInt(process.env.ZCAM_DEVICE_PANEL_MIN_HEIGHT || '220', 10);
const DEVICE_PANEL_MAX_HEIGHT = parseInt(process.env.ZCAM_DEVICE_PANEL_MAX_HEIGHT || '420', 10);
const PRESET_PANEL_WIDTH = parseInt(process.env.ZCAM_PRESET_PANEL_WIDTH || '130', 10);


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
let presetPanelWindow = null;
let presetMenuWindow = null;
let presetPanelData = { presets: [], activePresetId: null, totalCount: PRESET_TOTAL_COUNT };
let presetRefreshInFlight = null;
let presetRefreshLastAt = 0;
let presetPanelInitialized = false;
const presetLoadedPages = new Set();
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

async function forceKillImvtCameraService() {
  stopImvtCameraService();
  if (process.platform !== 'win32') {
    return;
  }
  await new Promise((resolve) => {
    try {
      const killer = spawn('taskkill', ['/IM', IMVT_CAMERA_SERVICE_NAME, '/F', '/T'], {
        windowsHide: true,
        stdio: 'ignore',
      });
      killer.on('close', () => resolve());
      killer.on('error', () => resolve());
    } catch {
      resolve();
    }
  });
  await new Promise((resolve) => setTimeout(resolve, 220));
}

async function restartImvtCameraService() {
  await forceKillImvtCameraService();
  const process = startImvtCameraService();
  if (process) {
    await new Promise((resolve) => setTimeout(resolve, 320));
  }
  return { ok: Boolean(process), running: Boolean(process) };
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

function getPresetPanelBounds() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return null;
  }
  const mainBounds = mainWindow.getBounds();
  const display = screen.getDisplayMatching(mainBounds);
  const workArea = display?.workArea || { x: 0, y: 0, width: 1920, height: 1080 };
  const deviceVisible = Boolean(devicePanelWindow && !devicePanelWindow.isDestroyed() && devicePanelWindow.isVisible());
  const offset = deviceVisible ? DEVICE_PANEL_WIDTH + PRESET_PANEL_WIDTH : PRESET_PANEL_WIDTH;
  const x = Math.max(workArea.x, Math.round(mainBounds.x - offset));
  const y = Math.max(workArea.y, Math.round(mainBounds.y + 38));
  const mainBottom = Math.round(mainBounds.y + mainBounds.height);
  const workAreaBottom = workArea.y + workArea.height;
  const maxHeight = Math.max(0, workAreaBottom - y);
  const desiredHeight = Math.max(0, mainBottom - y);
  const height = Math.min(desiredHeight, maxHeight);
  return { x, y, width: PRESET_PANEL_WIDTH, height };
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

function buildPresetPanelHtml() {
  return buildPresetPanelHtmlTemplate();
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

function pushPresetPanelData(payload = {}) {
  const presets = Array.isArray(payload.presets) ? payload.presets : presetPanelData.presets;
  const activePresetId = typeof payload.activePresetId === 'string' || payload.activePresetId === null
    ? payload.activePresetId
    : presetPanelData.activePresetId;
  const totalCount = Number.isFinite(Number(payload.totalCount)) && Number(payload.totalCount) > 0
    ? Number(payload.totalCount)
    : presetPanelData.totalCount;
  presetPanelData = { presets, activePresetId, totalCount };
  if (presetPanelWindow && !presetPanelWindow.isDestroyed()) {
    presetPanelWindow.webContents.send('presetPanel:data', presetPanelData);
  }
  return presetPanelData;
}

function emitPanelState() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  try {
    mainWindow.webContents.send('devicePanel:state', {
      open: Boolean(devicePanelWindow && !devicePanelWindow.isDestroyed() && devicePanelWindow.isVisible()),
    });
    mainWindow.webContents.send('presetPanel:state', {
      open: Boolean(presetPanelWindow && !presetPanelWindow.isDestroyed() && presetPanelWindow.isVisible()),
    });
  } catch {
    // ignore bridge failures
  }
}

function parsePresetIndexFromId(id) {
  const parsedIndex = Number.parseInt(String(id || '').replace(/[^\d]/g, ''), 10);
  if (!Number.isFinite(parsedIndex) || parsedIndex <= 0) return 0;
  return parsedIndex - 1;
}

function presetIdFromIndex(index) {
  const no = String(index + 1).padStart(3, '0');
  return `preset-${no}`;
}

function presetPageFromId(id) {
  const index = parsePresetIndexFromId(id);
  if (index < 0) return 1;
  return Math.floor(index / 10) + 1;
}

function buildPresetPlaceholder(index) {
  const no = String(index + 1).padStart(3, '0');
  return {
    id: presetIdFromIndex(index),
    name: `Preset ${no}`,
    previewUrl: '',
    previewUrls: [],
    exists: false,
    unit: -1,
    speed: -1,
    time: -1,
    status: 0,
  };
}

function ensurePresetPanelSeedData() {
  const safeCount = Number.isFinite(PRESET_TOTAL_COUNT) && PRESET_TOTAL_COUNT > 0 ? PRESET_TOTAL_COUNT : 100;
  const current = Array.isArray(presetPanelData.presets) ? presetPanelData.presets.slice() : [];
  if (current.length >= safeCount) {
    return current;
  }
  const byId = new Map(current.map((item) => [item?.id, item]));
  const merged = [];
  for (let index = 0; index < safeCount; index += 1) {
    const id = presetIdFromIndex(index);
    const exists = byId.get(id);
    merged.push(exists ? exists : buildPresetPlaceholder(index));
  }
  pushPresetPanelData({ presets: merged, totalCount: safeCount });
  return merged;
}

function presetThumbnailUrl(index, cacheBuster) {
  const no = String(index).padStart(3, '0');
  const bust = Number.isFinite(Number(cacheBuster)) ? `&t=${Number(cacheBuster)}` : '';
  return `http://${UVC_SERVICE_HOST}:${UVC_SERVICE_PORT}/app_data/preset/thm_${no}.jpg?act=thm${bust}`;
}

function presetThumbnailUrls(index, cacheBuster) {
  const no = String(index).padStart(3, '0');
  const bust = Number.isFinite(Number(cacheBuster)) ? `&t=${Number(cacheBuster)}` : '';
  const list = [];
  if (PRESET_THUMB_BASE.length > 0) {
    const base = PRESET_THUMB_BASE.endsWith('/') ? PRESET_THUMB_BASE.slice(0, -1) : PRESET_THUMB_BASE;
    list.push(`${base}/app_data/preset/thm_${no}.jpg?act=thm${bust}`);
  }
  list.push(presetThumbnailUrl(index, cacheBuster));
  return Array.from(new Set(list));
}

function normalizePresetInfo(raw) {
  if (!raw || typeof raw !== 'object') {
    return { name: '', unit: -1, speed: -1, time: -1, status: 0 };
  }
  const info = raw;
  return {
    name: typeof info.name === 'string' ? info.name : '',
    unit: Number.isFinite(Number(info.unit)) ? Number(info.unit) : -1,
    speed: Number.isFinite(Number(info.speed)) ? Number(info.speed) : -1,
    time: Number.isFinite(Number(info.time)) ? Number(info.time) : -1,
    status: Number.isFinite(Number(info.status)) ? Number(info.status) : 0,
  };
}

function isPresetInfoExisting(info) {
  return info.unit >= 0 || info.speed >= 0 || info.time >= 0 || (typeof info.name === 'string' && info.name.trim().length > 0);
}

async function fetchPresetInfo(index) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const data = await sendUvcRequest({ method: 'GET', url: `/ctrl/preset?action=get_info&index=${index}` });
      const isTimeoutPayload = data && typeof data === 'object' && (
        data.error === true
        || Number(data.code) === 500
        || String(data.message || '').toLowerCase().includes('timeout')
        || String(data.error || '').toLowerCase().includes('timeout')
      );
      if (isTimeoutPayload) {
        throw new Error('preset get_info timeout');
      }
      return normalizePresetInfo(data);
    } catch {
      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 240));
      }
    }
  }
  return normalizePresetInfo(null);
}

async function refreshPresetPanelData(activePresetId, options = {}) {
  const force = options.force === true;
  const now = Date.now();
  if (presetRefreshInFlight) {
    return presetRefreshInFlight;
  }
  if (!force && now - presetRefreshLastAt < PRESET_REFRESH_MIN_INTERVAL_MS && presetPanelData.presets.length > 0) {
    return presetPanelData;
  }
  presetRefreshInFlight = (async () => {
  const safeCount = Number.isFinite(PRESET_SLOT_COUNT) && PRESET_SLOT_COUNT > 0 ? PRESET_SLOT_COUNT : 10;
  const list = [];
  for (let index = 0; index < safeCount; index += 1) {
    const info = await fetchPresetInfo(index);
    const exists = isPresetInfoExisting(info);
    list.push({
      id: presetIdFromIndex(index),
      name: exists ? (info.name || `Preset ${String(index + 1).padStart(3, '0')}`) : `Preset ${String(index + 1).padStart(3, '0')}`,
      previewUrl: exists ? presetThumbnailUrl(index) : '',
      previewUrls: exists ? presetThumbnailUrls(index) : [],
      exists,
      unit: info.unit,
      speed: info.speed,
      time: info.time,
      status: info.status,
    });
    if (PRESET_FETCH_GAP_MS > 0 && index < safeCount - 1) {
      await new Promise((resolve) => setTimeout(resolve, PRESET_FETCH_GAP_MS));
    }
  }
  const nextActive = typeof activePresetId === 'string' && activePresetId.length > 0 ? activePresetId : (list[0]?.id || null);
    presetRefreshLastAt = Date.now();
    return pushPresetPanelData({ presets: list, activePresetId: nextActive });
  })();
  try {
    return await presetRefreshInFlight;
  } finally {
    presetRefreshInFlight = null;
  }
}

async function refreshPresetPanelPage(page, options = {}) {
  const safeCount = Number.isFinite(PRESET_TOTAL_COUNT) && PRESET_TOTAL_COUNT > 0 ? PRESET_TOTAL_COUNT : 100;
  const safePage = Math.max(1, Number.parseInt(String(page || 1), 10) || 1);
  const force = options.force === true;
  if (!force && presetLoadedPages.has(safePage)) {
    return presetPanelData;
  }
  if (presetRefreshInFlight) {
    return presetRefreshInFlight;
  }
  const startIndex = (safePage - 1) * 10;
  const endExclusive = Math.min(startIndex + 10, safeCount);
  presetRefreshInFlight = (async () => {
    const current = ensurePresetPanelSeedData().slice();
    for (let index = startIndex; index < endExclusive; index += 1) {
      const info = await fetchPresetInfo(index);
      const exists = isPresetInfoExisting(info);
      current[index] = {
        id: presetIdFromIndex(index),
        name: exists ? (info.name || `Preset ${String(index + 1).padStart(3, '0')}`) : `Preset ${String(index + 1).padStart(3, '0')}`,
        previewUrl: exists ? presetThumbnailUrl(index) : '',
        previewUrls: exists ? presetThumbnailUrls(index) : [],
        exists,
        unit: info.unit,
        speed: info.speed,
        time: info.time,
        status: info.status,
      };
      if (PRESET_FETCH_GAP_MS > 0 && index < endExclusive - 1) {
        await new Promise((resolve) => setTimeout(resolve, PRESET_FETCH_GAP_MS));
      }
    }
    presetLoadedPages.add(safePage);
    const nextActive = typeof options.activePresetId === 'string'
      ? options.activePresetId
      : (typeof presetPanelData.activePresetId === 'string' ? presetPanelData.activePresetId : null);
    presetRefreshLastAt = Date.now();
    return pushPresetPanelData({ presets: current, activePresetId: nextActive, totalCount: safeCount });
  })();
  try {
    return await presetRefreshInFlight;
  } finally {
    presetRefreshInFlight = null;
  }
}

async function refreshSinglePreset(index, activePresetId, options = {}) {
  const cacheBuster = Number.isFinite(Number(options.cacheBuster)) ? Number(options.cacheBuster) : undefined;
  const safeIndex = Number.isFinite(Number(index)) && Number(index) >= 0 ? Number(index) : 0;
  const preserveExistingOnMissing = options.preserveExistingOnMissing === true;
  const current = Array.isArray(presetPanelData.presets) ? presetPanelData.presets.slice() : [];
  const targetId = presetIdFromIndex(safeIndex);
  const foundAt = current.findIndex((item) => item && item.id === targetId);
  const prevItem = foundAt >= 0 ? current[foundAt] : null;
  const info = await fetchPresetInfo(safeIndex);
  const exists = isPresetInfoExisting(info);
  if (!exists && preserveExistingOnMissing && prevItem && prevItem.exists === true) {
    const nextActive = typeof activePresetId === 'string' && activePresetId.length > 0
      ? activePresetId
      : (presetPanelData.activePresetId || prevItem.id);
    return pushPresetPanelData({ presets: current, activePresetId: nextActive });
  }
  const nextItem = {
    id: targetId,
    name: exists ? (info.name || `Preset ${String(safeIndex + 1).padStart(3, '0')}`) : `Preset ${String(safeIndex + 1).padStart(3, '0')}`,
    previewUrl: exists ? presetThumbnailUrl(safeIndex, cacheBuster) : '',
    previewUrls: exists ? presetThumbnailUrls(safeIndex, cacheBuster) : [],
    exists,
    unit: info.unit,
    speed: info.speed,
    time: info.time,
    status: info.status,
  };
  if (foundAt >= 0) {
    current[foundAt] = { ...(current[foundAt] || {}), ...nextItem };
  } else {
    current.push(nextItem);
  }
  const nextActive = typeof activePresetId === 'string' && activePresetId.length > 0
    ? activePresetId
    : (presetPanelData.activePresetId || nextItem.id);
  return pushPresetPanelData({ presets: current, activePresetId: nextActive });
}

function closeDevicePanel() {
  if (!devicePanelWindow || devicePanelWindow.isDestroyed()) return;
  devicePanelWindow.close();
  devicePanelWindow = null;
  syncPresetPanelBounds();
  emitPanelState();
}

function closePresetPanel() {
  closePresetMenu();
  if (!presetPanelWindow || presetPanelWindow.isDestroyed()) return;
  presetPanelWindow.close();
  presetPanelWindow = null;
  emitPanelState();
}

function closePresetMenu() {
  if (!presetMenuWindow || presetMenuWindow.isDestroyed()) return;
  presetMenuWindow.close();
  presetMenuWindow = null;
}

function buildPresetMenuHtml(presetId = '', presetExists = true) {
  const safeId = String(presetId).replace(/'/g, '&#39;');
  const hasPreset = presetExists === true;
  const addButton = hasPreset ? '' : '<button class="btn" id="addBtn">Add</button>';
  return `<!doctype html><html><head><meta charset="UTF-8"><style>
    html,body{margin:0;padding:0;background:transparent;overflow:hidden}
    .menu{width:60px;border:1px solid #3a3a3a;border-radius:6px;background:#171717;box-shadow:0 10px 24px rgba(0,0,0,.55);overflow:hidden}
    .btn{width:100%;height:30px;border:0;border-bottom:1px solid #2a2a2a;background:transparent;color:#d3d3d3;font-size:9px;text-align:center;padding:0;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:clip}
    .btn:last-child{border-bottom:0}
    .btn:hover{background:#242424;color:#fff}
    .btn:disabled{color:#6d6d6d;cursor:default}
  </style></head><body><div class="menu">
    ${addButton}
    <button class="btn" id="loadBtn">Load</button>
    <button class="btn" id="replaceBtn">Replace</button>
    <button class="btn" id="renameBtn">Rename</button>
    <button class="btn" id="deleteBtn">Delete</button>
  </div><script>
    const { ipcRenderer } = require('electron');
    const presetId = '${safeId}';
    const presetExists = ${hasPreset ? 'true' : 'false'};
    let modalLock = false;
    async function run(action, payload){
      await ipcRenderer.invoke('presetPanel:selectPreset', presetId, action, payload);
      window.close();
    }
    if (!presetExists) {
      document.getElementById('loadBtn').disabled = true;
      document.getElementById('replaceBtn').disabled = true;
      document.getElementById('renameBtn').disabled = true;
      document.getElementById('deleteBtn').disabled = true;
      const addBtn = document.getElementById('addBtn');
      if (addBtn) {
        addBtn.addEventListener('click', () => run('add'));
      }
    }
    document.getElementById('loadBtn').addEventListener('click', () => run('load'));
    document.getElementById('replaceBtn').addEventListener('click', async () => {
      modalLock = true;
      const ok = await ipcRenderer.invoke('presetPanel:confirmReplace');
      modalLock = false;
      if (!ok) return;
      run('replace');
    });
    document.getElementById('renameBtn').addEventListener('click', async () => {
      modalLock = true;
      const nextName = await ipcRenderer.invoke('presetPanel:promptRename');
      modalLock = false;
      if (!nextName || !nextName.trim()) return;
      run('rename', { name: nextName.trim() });
    });
    document.getElementById('deleteBtn').addEventListener('click', () => run('delete'));
    window.addEventListener('blur', () => {
      if (modalLock) return;
      window.close();
    });
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape') window.close(); });
  </script></body></html>`;
}

function openPresetMenu(payload = {}) {
  const presetId = typeof payload.presetId === 'string' ? payload.presetId : '';
  if (!presetId) return { ok: false };
  if (!presetPanelWindow || presetPanelWindow.isDestroyed()) return { ok: false };
  const presets = Array.isArray(presetPanelData.presets) ? presetPanelData.presets : [];
  const preset = presets.find((item) => item && item.id === presetId) || null;
  const presetExists = Boolean(preset && preset.exists === true);
  closePresetMenu();
  const cursorX = Number.isFinite(Number(payload.x)) ? Number(payload.x) : 0;
  const cursorY = Number.isFinite(Number(payload.y)) ? Number(payload.y) : 0;
  const display = screen.getDisplayNearestPoint({ x: cursorX, y: cursorY });
  const area = display?.workArea || { x: 0, y: 0, width: 1920, height: 1080 };
  const menuWidth = 60;
  const menuHeight = presetExists ? 124 : 154;
  const x = Math.max(area.x, Math.min(cursorX, area.x + area.width - menuWidth));
  const y = Math.max(area.y, Math.min(cursorY, area.y + area.height - menuHeight));
  presetMenuWindow = new BrowserWindow({
    parent: presetPanelWindow,
    x,
    y,
    width: menuWidth,
    height: menuHeight,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    show: false,
    skipTaskbar: false,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  presetMenuWindow.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(buildPresetMenuHtml(presetId, presetExists))}`);
  presetMenuWindow.once('ready-to-show', () => {
    if (!presetMenuWindow || presetMenuWindow.isDestroyed()) return;
    presetMenuWindow.show();
    presetMenuWindow.focus();
  });
  presetMenuWindow.on('closed', () => {
    presetMenuWindow = null;
  });
  return { ok: true };
}

function canShowDevicePanel() {
  if (!mainWindow || mainWindow.isDestroyed()) return false;
  if (windowState.mode !== 'main') return false;
  if (windowState.layoutSize !== 'ptz') return false;
  if (mainWindow.isMinimized()) return false;
  if (!mainWindow.isVisible()) return false;
  return true;
}

function canShowPresetPanel() {
  return canShowDevicePanel();
}

function syncDevicePanelBounds() {
  if (devicePanelWindow && !devicePanelWindow.isDestroyed()) {
    const bounds = getDevicePanelBounds();
    if (bounds) {
      devicePanelWindow.setBounds(bounds);
    }
  }
  syncPresetPanelBounds();
}

function syncPresetPanelBounds() {
  if (!presetPanelWindow || presetPanelWindow.isDestroyed()) return;
  const bounds = getPresetPanelBounds();
  if (!bounds) return;
  presetPanelWindow.setBounds(bounds);
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
    emitPanelState();
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
    syncPresetPanelBounds();
    emitPanelState();
  });
  devicePanelWindow.on('closed', () => {
    devicePanelWindow = null;
    syncPresetPanelBounds();
    emitPanelState();
  });
  syncPresetPanelBounds();
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

function openPresetPanel() {
  if (!canShowPresetPanel()) {
    closePresetPanel();
    return { ok: false, open: false };
  }
  if (presetPanelWindow && !presetPanelWindow.isDestroyed()) {
    syncPresetPanelBounds();
    presetPanelWindow.show();
    presetPanelWindow.focus();
    ensurePresetPanelSeedData();
    pushPresetPanelData(presetPanelData);
    if (!presetPanelInitialized) {
      presetPanelInitialized = true;
      const targetPage = presetPageFromId(presetPanelData.activePresetId || 'preset-001');
      void refreshPresetPanelPage(targetPage, { activePresetId: presetPanelData.activePresetId });
    }
    emitPanelState();
    return { ok: true, open: true };
  }
  const bounds = getPresetPanelBounds();
  if (!bounds) {
    return { ok: false, open: false };
  }
  presetPanelWindow = new BrowserWindow({
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
  presetPanelWindow.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(buildPresetPanelHtml())}`);
  presetPanelWindow.once('ready-to-show', () => {
    if (!presetPanelWindow || presetPanelWindow.isDestroyed()) return;
    presetPanelWindow.show();
    ensurePresetPanelSeedData();
    pushPresetPanelData(presetPanelData);
    if (!presetPanelInitialized) {
      presetPanelInitialized = true;
      const targetPage = presetPageFromId(presetPanelData.activePresetId || 'preset-001');
      void refreshPresetPanelPage(targetPage, { activePresetId: presetPanelData.activePresetId });
    }
    emitPanelState();
  });
  presetPanelWindow.on('closed', () => {
    presetPanelWindow = null;
    emitPanelState();
  });
  return { ok: true, open: true };
}

function togglePresetPanel() {
  if (!canShowPresetPanel()) {
    closePresetPanel();
    return { ok: false, open: false };
  }
  if (presetPanelWindow && !presetPanelWindow.isDestroyed() && presetPanelWindow.isVisible()) {
    closePresetPanel();
    return { ok: true, open: false };
  }
  return openPresetPanel();
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

  mainWindow.on('system-context-menu', (event) => {
    event.preventDefault();
  });

  mainWindow.on('closed', () => {
    closeDevicePanel();
    closePresetPanel();
    mainWindow = null;
  });

  mainWindow.on('hide', () => {
    closeDevicePanel();
    closePresetPanel();
  });

  mainWindow.on('minimize', () => {
    closeDevicePanel();
    closePresetPanel();
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

  ballWindow.webContents.on('context-menu', (_event, params) => {
    if (!ballWindow || ballWindow.isDestroyed()) return;
    const menu = Menu.buildFromTemplate([
      {
        label: 'Exit',
        click: () => app.quit(),
      },
    ]);
    menu.popup({
      window: ballWindow,
      x: Math.round(params?.x ?? 0),
      y: Math.round(params?.y ?? 0),
    });
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
  closePresetPanel();
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
  closePresetPanel();
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
    closePresetPanel();
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
  closePresetPanel();
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
      res.on('end', async () => {
        try {
          const result = data ? JSON.parse(data) : {};
          const errorText = typeof result?.error === 'string' ? result.error : '';
          if (errorText.toLowerCase().includes('link down')) {
            console.warn('[UVC] Link down detected, restarting IMVT service');
            await restartImvtCameraService();
          }
          console.log('[UVC] Response:', result);
          resolve(result);
        } catch (err) {
          const raw = String(data || '');
          if (raw.toLowerCase().includes('link down')) {
            console.warn('[UVC] Link down detected from raw response, restarting IMVT service');
            await restartImvtCameraService();
          }
          console.error('[UVC] Failed to parse response:', err);
          resolve({ ok: false, error: raw || 'Invalid JSON response' });
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
  closePresetPanel();
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('window:close', () => app.quit());

ipcMain.handle('imvt:restartService', async () => {
  try {
    return await restartImvtCameraService();
  } catch (error) {
    return { ok: false, error: error?.message || String(error) };
  }
});

ipcMain.handle('cameraState:refresh', async (_, payload) => {
  try {
    const requestedKeys = Array.isArray(payload?.keys)
      ? payload.keys.filter((item) => typeof item === 'string' && item.trim().length > 0)
      : [];
    const body = requestedKeys.length > 0 ? { keys: requestedKeys } : {};
    const refreshed = await requestCameraService('/refresh', 'POST', body);
    if (refreshed?.state) {
      pushCameraState(refreshed.state);
    }
    return { ok: true, state: refreshed?.state || null };
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  }
});

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

ipcMain.handle('presetPanel:toggle', () => togglePresetPanel());

ipcMain.handle('presetPanel:hide', () => {
  closePresetPanel();
  return { ok: true, open: false };
});

ipcMain.handle('presetPanel:update', (_, payload) => {
  const data = pushPresetPanelData(payload || {});
  return { ok: true, data };
});

ipcMain.handle('presetPanel:getData', () => presetPanelData);
ipcMain.handle('presetPanel:ensurePage', async (_, payload) => {
  const page = Number.parseInt(String(payload?.page ?? 1), 10);
  const data = await refreshPresetPanelPage(page, { activePresetId: presetPanelData.activePresetId });
  return { ok: true, data };
});
ipcMain.handle('presetPanel:openMenu', (_, payload) => openPresetMenu(payload || {}));
ipcMain.handle('presetPanel:confirmReplace', async () => {
  const parentWindow = (presetMenuWindow && !presetMenuWindow.isDestroyed())
    ? presetMenuWindow
    : ((presetPanelWindow && !presetPanelWindow.isDestroyed()) ? presetPanelWindow : null);
  const confirmWindow = new BrowserWindow({
    parent: parentWindow || undefined,
    modal: Boolean(parentWindow),
    width: 280,
    height: 128,
    frame: false,
    transparent: true,
    resizable: false,
    minimizable: false,
    maximizable: false,
    show: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  const html = `<!doctype html><html><head><meta charset="UTF-8"><style>
    html,body{margin:0;padding:0;background:transparent;overflow:hidden}
    .box{width:100%;height:100%;box-sizing:border-box;border:1px solid #3a3a3a;border-radius:8px;background:#171717;color:#e8e8e8;padding:10px;display:flex;flex-direction:column;gap:10px;font:12px Arial}
    .title{font-weight:600}
    .desc{font-size:11px;color:#d3d3d3}
    .row{display:flex;justify-content:flex-end;gap:6px;margin-top:auto}
    .btn{height:26px;min-width:64px;border:1px solid #3a3a3a;border-radius:4px;background:#1f1f1f;color:#ddd;cursor:pointer}
    .btn.primary{border-color:#ff7a45;color:#fff}
  </style></head><body><div class="box">
    <div class="title">Replace</div>
    <div class="desc">⚠ Replace this preset with current position?</div>
    <div class="row">
      <button id="cancelBtn" class="btn">Cancel</button>
      <button id="okBtn" class="btn primary">Replace</button>
    </div>
  </div><script>
    const { ipcRenderer } = require('electron');
    function done(ok){
      ipcRenderer.send('presetPanel:replaceConfirmResult', { ok });
      window.close();
    }
    document.getElementById('okBtn').addEventListener('click', () => done(true));
    document.getElementById('cancelBtn').addEventListener('click', () => done(false));
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') done(false);
      if (e.key === 'Enter') done(true);
    });
    window.addEventListener('blur', () => done(false));
  </script></body></html>`;
  return new Promise((resolve) => {
    let settled = false;
    const done = (value) => {
      if (settled) return;
      settled = true;
      try { ipcMain.removeListener('presetPanel:replaceConfirmResult', onResult); } catch {}
      resolve(value);
    };
    const onResult = (_event, payload = {}) => {
      done(Boolean(payload?.ok));
    };
    ipcMain.on('presetPanel:replaceConfirmResult', onResult);
    confirmWindow.once('ready-to-show', () => {
      if (!confirmWindow.isDestroyed()) {
        confirmWindow.show();
        confirmWindow.focus();
      }
    });
    confirmWindow.on('closed', () => {
      done(false);
    });
    confirmWindow.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(html)}`);
  });
});
ipcMain.handle('presetPanel:promptRename', async () => {
  const parentWindow = (presetMenuWindow && !presetMenuWindow.isDestroyed())
    ? presetMenuWindow
    : ((presetPanelWindow && !presetPanelWindow.isDestroyed()) ? presetPanelWindow : null);
  const renameWindow = new BrowserWindow({
    parent: parentWindow || undefined,
    modal: Boolean(parentWindow),
    width: 260,
    height: 132,
    frame: false,
    transparent: true,
    resizable: false,
    minimizable: false,
    maximizable: false,
    show: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  const html = `<!doctype html><html><head><meta charset="UTF-8"><style>
    html,body{margin:0;padding:0;background:transparent;overflow:hidden}
    .box{width:100%;height:100%;box-sizing:border-box;border:1px solid #3a3a3a;border-radius:8px;background:#171717;color:#e8e8e8;padding:10px;display:flex;flex-direction:column;gap:10px;font:12px Arial}
    .title{font-weight:600}
    .input{height:28px;border:1px solid #3a3a3a;border-radius:4px;background:#111;color:#eee;padding:0 8px;outline:none}
    .row{display:flex;justify-content:flex-end;gap:6px}
    .btn{height:26px;min-width:64px;border:1px solid #3a3a3a;border-radius:4px;background:#1f1f1f;color:#ddd;cursor:pointer}
    .btn.primary{border-color:#ff7a45;color:#fff}
  </style></head><body><div class="box">
    <div class="title">Rename</div>
    <input id="nameInput" class="input" placeholder="Enter preset name" maxlength="64" />
    <div class="row">
      <button id="cancelBtn" class="btn">Cancel</button>
      <button id="okBtn" class="btn primary">OK</button>
    </div>
  </div><script>
    const { ipcRenderer } = require('electron');
    const input = document.getElementById('nameInput');
    function submit(){
      ipcRenderer.send('presetPanel:renameResult', { ok: true, name: (input.value || '').trim() });
      window.close();
    }
    document.getElementById('okBtn').addEventListener('click', submit);
    document.getElementById('cancelBtn').addEventListener('click', () => {
      ipcRenderer.send('presetPanel:renameResult', { ok: false });
      window.close();
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submit();
      if (e.key === 'Escape') {
        ipcRenderer.send('presetPanel:renameResult', { ok: false });
        window.close();
      }
    });
    window.addEventListener('blur', () => {
      ipcRenderer.send('presetPanel:renameResult', { ok: false });
      window.close();
    });
    setTimeout(() => input.focus(), 10);
  </script></body></html>`;
  return new Promise((resolve) => {
    let settled = false;
    const done = (value) => {
      if (settled) return;
      settled = true;
      try { ipcMain.removeListener('presetPanel:renameResult', onResult); } catch {}
      resolve(value);
    };
    const onResult = (_event, payload = {}) => {
      if (payload && payload.ok && typeof payload.name === 'string') {
        done(payload.name.trim());
      } else {
        done('');
      }
    };
    ipcMain.on('presetPanel:renameResult', onResult);
    renameWindow.once('ready-to-show', () => {
      if (!renameWindow.isDestroyed()) {
        renameWindow.show();
        renameWindow.focus();
      }
    });
    renameWindow.on('closed', () => {
      done('');
    });
    renameWindow.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(html)}`);
  });
});

ipcMain.handle('presetPanel:selectPreset', async (_, presetId, action, payload) => {
  const id = typeof presetId === 'string' ? presetId : '';
  if (!id) {
    return { ok: false };
  }
  const nextAction = typeof action === 'string' ? action : 'select';
  const presets = Array.isArray(presetPanelData.presets) ? presetPanelData.presets.slice() : [];
  const preset = presets.find((item) => item && item.id === id) || null;
  if (!preset) {
    return { ok: false };
  }

  const index = parsePresetIndexFromId(id);
  const actionPayload = payload && typeof payload === 'object' ? payload : {};

  const runPresetRequest = async () => {
    if (nextAction === 'load' || nextAction === 'recall') {
      return sendUvcRequest({ method: 'GET', url: `/ctrl/preset?action=recall&index=${index}` });
    }
    if (nextAction === 'add' || nextAction === 'store' || nextAction === 'replace') {
      return sendUvcRequest({ method: 'GET', url: `/ctrl/preset?action=set&index=${index}` });
    }
    if (nextAction === 'stop') {
      return sendUvcRequest({ method: 'GET', url: '/ctrl/pt?action=stop_all' });
    }
    if (nextAction === 'delete') {
      return sendUvcRequest({ method: 'GET', url: `/ctrl/preset?action=del&index=${index}` });
    }
    if (nextAction === 'rename') {
      const name = typeof actionPayload.name === 'string' ? actionPayload.name.trim() : '';
      if (!name) return { ok: false, error: 'invalid name' };
      return sendUvcRequest({ method: 'GET', url: `/ctrl/preset?action=set_name&index=${index}&new_name=${encodeURIComponent(name)}` });
    }
    if (nextAction === 'record' || nextAction === 'prepare') {
      return { ok: true };
    }
    return { ok: true };
  };

  let directResult = { ok: true };
  try {
    directResult = await runPresetRequest();
  } catch (error) {
    directResult = { ok: false, error: error?.message || String(error) };
  }

  if (nextAction === 'select' || nextAction === 'load' || nextAction === 'recall' || nextAction === 'record' || nextAction === 'prepare') {
    pushPresetPanelData({ activePresetId: id });
  } else {
    pushPresetPanelData({ activePresetId: id });
  }
  if (nextAction === 'add' || nextAction === 'store' || nextAction === 'replace' || nextAction === 'delete' || nextAction === 'rename') {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const refreshToken = Date.now();
    await refreshSinglePreset(index, id, {
      cacheBuster: refreshToken,
      preserveExistingOnMissing: nextAction === 'replace',
    });
  }

  if (mainWindow && !mainWindow.isDestroyed()) {
    try {
      mainWindow.webContents.send('preset:actionRequest', { id, index, action: nextAction, preset, payload: actionPayload, directResult });
    } catch {
      // ignore bridge failures
    }
  }
  return { ok: Boolean(directResult?.ok !== false), action: nextAction, id, index, result: directResult };
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
