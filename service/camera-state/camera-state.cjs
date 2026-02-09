#!/usr/bin/env node

/**
 * Camera State Service
 * - Polls ImvtCameraService (UVC) and caches latest camera properties
 * - Exposes HTTP endpoints so UI/CLI can query & refresh state
 */

const http = require('http');
const { URL } = require('url');
const WebSocket = require('ws');

const CAMERA_STATE_HOST = process.env.ZCAM_CAMERA_STATE_HOST || '127.0.0.1';
const CAMERA_STATE_PORT = parseInt(process.env.ZCAM_CAMERA_STATE_PORT || '6292', 10);
const CAMERA_STATE_POLL_INTERVAL = parseInt(process.env.ZCAM_CAMERA_STATE_INTERVAL || '0', 10);
const UVC_BASE_URL = process.env.ZCAM_UVC_BASE || 'http://127.0.0.1:17988';
const UVC_WS_URL = process.env.ZCAM_UVC_WS || 'ws://127.0.0.1:17988/ws';
const WS_RECONNECT_INTERVAL = 3000;

const DEFAULT_KEYS = (
  process.env.ZCAM_CAMERA_STATE_KEYS ||
  'pan,tilt,lens_zoom_pos,lens_focus_pos,exposure,gain,iso,shutter_time,wb,mwb,brightness,contrast,saturation,remain'
)
  .split(',')
  .map((k) => k.trim())
  .filter(Boolean);

const state = {
  values: {},
  updatedAt: null,
  devices: {
    activeDeviceId: null,
    list: [],
    updatedAt: null,
  },
};

let pollingTimer = null;
let wsClient = null;
let wsReconnectTimer = null;

function ensureFetch() {
  if (typeof globalThis.fetch === 'function') {
    return globalThis.fetch.bind(globalThis);
  }
  try {
    const nodeFetch = require('node-fetch');
    return (nodeFetch && nodeFetch.default) ? nodeFetch.default : nodeFetch;
  } catch (err) {
    throw new Error('Camera state service requires Node.js 18+ or node-fetch');
  }
}

const fetchImpl = ensureFetch();

async function fetchProperty(key) {
  if (key === 'pan' || key === 'tilt') {
    const url = new URL('/ctrl/pt', UVC_BASE_URL);
    url.searchParams.set('action', 'query');
    url.searchParams.set('detail', 'y');
    const res = await fetchImpl(url.toString(), { method: 'GET' });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    // Map response fields to value
    // Response expected: { pan_pos: ..., tilt_pos: ... }
    let val = null;
    if (key === 'pan') val = data.pan_pos;
    if (key === 'tilt') val = data.tilt_pos ?? data.tile_pos; // Handle potential typo in firmware

    return normalizeValue(key, { ...data, value: val });
  }

  const url = new URL('/ctrl/get', UVC_BASE_URL);
  url.searchParams.set('k', key);
  const res = await fetchImpl(url.toString(), { method: 'GET' });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  return normalizeValue(key, data);
}

async function fetchDeviceList() {
  try {
    const url = new URL('/usbvideoctrl', UVC_BASE_URL);
    url.searchParams.set('action', 'devices');
    const res = await fetchImpl(url.toString(), { method: 'GET' });
    const data = await res.json();

    if (data.success) {
      state.devices = {
        activeDeviceId: data.activeDeviceId,
        list: data.devices || [],
        updatedAt: Date.now(),
      };
      console.log('[CameraState] Device list updated:', state.devices.list.length, 'devices');
    }
  } catch (err) {
    console.error('[CameraState] Failed to fetch device list:', err.message);
  }
}

function normalizeValue(key, payload) {
  const now = Date.now();
  const result = {
    key,
    value: null,
    raw: payload,
    updatedAt: now,
    error: undefined,
  };

  if (payload && typeof payload === 'object') {
    const numeric = pickNumeric(payload.value ?? payload.current ?? payload.data ?? payload.raw);
    if (numeric !== null) {
      result.value = numeric;
    } else if (typeof payload.value === 'string' && payload.value.length) {
      result.value = payload.value;
    }
  } else if (typeof payload === 'string' || typeof payload === 'number') {
    const numeric = pickNumeric(payload);
    result.value = numeric !== null ? numeric : payload;
  }
  return result;
}

function pickNumeric(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const num = Number(value);
    if (!Number.isNaN(num)) return num;
  }
  return null;
}

async function refreshKeys(keys) {
  const results = [];
  for (const key of keys) {
    try {
      const entry = await fetchProperty(key);
      state.values[key] = entry;
      results.push(entry);
    } catch (err) {
      state.values[key] = {
        key,
        value: null,
        raw: null,
        updatedAt: Date.now(),
        error: err.message || String(err),
      };
    }
  }
  state.updatedAt = Date.now();
  return results;
}

function getStateSnapshot() {
  return {
    updatedAt: state.updatedAt,
    values: state.values,
    camera: projectCameraState(state.values),
    devices: state.devices,
  };
}

// Throttle map for auto-refreshes
const refreshCooldowns = new Map();
const REFRESH_COOLDOWN_MS = 2000;

function triggerLazyRefresh(key) {
  const now = Date.now();
  const last = refreshCooldowns.get(key) || 0;
  if (now - last > REFRESH_COOLDOWN_MS) {
    refreshCooldowns.set(key, now);
    console.log(`[CameraState] Auto-refreshing timeout key: ${key}`);
    refreshKeys([key]).catch(err => console.error(`[CameraState] Auto-refresh for ${key} failed`, err));
  }
}

function projectCameraState(values) {
  const projectValue = (key) => {
    const entry = values[key];

    // [Request] If raw error is timeout, trigger refresh
    if (entry?.raw?.error === 'Timeout') {
      triggerLazyRefresh(key);
    }

    if (!entry || typeof entry.value === 'undefined' || entry.value === null) return undefined;

    return {
      value: entry.value,
      view: String(entry.value),
      opts: entry.raw?.opts ?? entry.raw?.options, // Alias opts for frontend compatibility
      updatedAt: entry.updatedAt,
      w: entry.raw,
    };
  };

  return {
    ptz: {
      pan: projectValue('pan'),
      tilt: projectValue('tilt'),
      zoom: projectValue('lens_zoom_pos'),
      focus: projectValue('lens_focus_pos'),
      speed: projectValue('speed') || projectValue('ptz_common_speed'),
    },
    exposure: {
      exposure: projectValue('exposure'),
      gain: projectValue('gain'),
      iso: projectValue('iso'),
      shutter: projectValue('shutter_time'),
    },
    whiteBalance: (() => {
      const wbEntry = projectValue('wb');
      const mwbEntry = projectValue('mwb');

      const isAuto = wbEntry?.value !== 'Manual' && wbEntry?.value !== undefined;

      let min, max, step;
      // Extract ranges if available in raw options
      const rawOpts = mwbEntry?.w?.opts ?? mwbEntry?.w?.options;
      if (rawOpts && typeof rawOpts === 'object' && !Array.isArray(rawOpts)) {
        if (typeof rawOpts.min === 'number') min = rawOpts.min;
        if (typeof rawOpts.max === 'number') max = rawOpts.max;
        if (typeof rawOpts.step === 'number') step = rawOpts.step;
      }

      return {
        mode: wbEntry,
        awbEnabled: isAuto,
        temperature: {
          ...mwbEntry,
          min,
          max,
          step
        },
      };
    })(),
    image: {
      brightness: projectValue('brightness'),
      contrast: projectValue('contrast'),
      saturation: projectValue('saturation'),
      sharpness: projectValue('sharpness'),
      hue: projectValue('hue'),
      gamma: projectValue('gamma'),
    },
    recording: {
      remain: (() => {
        const entry = projectValue('remain');
        if (!entry) return undefined;
        let duration = 0;
        let remaining = 0;
        try {
          const raw = typeof entry.value === 'string' && entry.value.startsWith('{')
            ? JSON.parse(entry.value)
            : (typeof entry.value === 'object' ? entry.value : null);

          if (raw) {
            // desc: recording duration (s), msg: remaining duration (s)
            duration = Number(raw.desc) || 0;
            remaining = Number(raw.msg) || 0;
          }
        } catch (e) { }

        return {
          ...entry,
          duration,
          remaining
        };
      })(),
      stream_status: projectValue('stream_status'),
    },
  };
}

function respondJson(res, payload, status = 200) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

async function handleRefreshRequest(body) {
  const keys = Array.isArray(body?.keys) && body.keys.length ? body.keys : DEFAULT_KEYS;
  const results = await refreshKeys(keys);
  return {
    ok: true,
    refreshed: results.map((item) => ({ key: item.key, updatedAt: item.updatedAt })),
    state: getStateSnapshot(),
  };
}

function handleApplyRequest(body) {
  const key = typeof body?.key === 'string' ? body.key : null;
  if (!key) {
    return { ok: false, error: 'key is required' };
  }
  const entry = {
    key,
    value: typeof body.value !== 'undefined' ? body.value : null,
    raw: body.raw ?? null,
    updatedAt: Date.now(),
    error: undefined,
  };
  state.values[key] = entry;
  state.updatedAt = Date.now();
  return { ok: true, state: getStateSnapshot() };
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/health') {
      return respondJson(res, { ok: true, updatedAt: state.updatedAt });
    }

    if (req.method === 'GET' && req.url?.startsWith('/state')) {
      return respondJson(res, { ok: true, state: getStateSnapshot() });
    }

    if (req.method === 'POST' && req.url === '/refresh') {
      const body = await parseBody(req);
      const payload = await handleRefreshRequest(body);
      return respondJson(res, payload);
    }

    if (req.method === 'POST' && req.url === '/apply') {
      const body = await parseBody(req);
      const payload = handleApplyRequest(body);
      return respondJson(res, payload, payload.ok ? 200 : 400);
    }

    respondJson(res, { ok: false, error: 'not found' }, 404);
  } catch (err) {
    respondJson(res, { ok: false, error: err.message || String(err) }, 500);
  }
});

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function startServer() {
  server.listen(CAMERA_STATE_PORT, CAMERA_STATE_HOST, () => {
    console.log(`[CameraState] listening on http://${CAMERA_STATE_HOST}:${CAMERA_STATE_PORT}`);
  });
}

async function initialRefresh() {
  try {
    await Promise.all([
      refreshKeys(DEFAULT_KEYS),
      fetchDeviceList(),
    ]);
    console.log('[CameraState] initial refresh completed');
  } catch (err) {
    console.error('[CameraState] initial refresh failed', err);
  }
}

function startPolling() {
  if (CAMERA_STATE_POLL_INTERVAL <= 0) {
    console.log('[CameraState] background polling disabled (interval <= 0)');
    return;
  }
  pollingTimer = setInterval(() => {
    refreshKeys(DEFAULT_KEYS).catch((err) => {
      console.error('[CameraState] background refresh failed', err);
    });
  }, CAMERA_STATE_POLL_INTERVAL);
}

function connectWebSocket() {
  if (wsClient) {
    try {
      wsClient.close();
    } catch (err) {
      // ignore
    }
    wsClient = null;
  }

  try {
    wsClient = new WebSocket(UVC_WS_URL);

    wsClient.on('open', () => {
      console.log('[CameraState] WebSocket connected to', UVC_WS_URL);
    });

    wsClient.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        handleWebSocketMessage(msg);
      } catch (err) {
        console.error('[CameraState] Failed to parse WebSocket message', err);
      }
    });

    wsClient.on('error', (err) => {
      console.error('[CameraState] WebSocket error', err.message || err);
    });

    wsClient.on('close', () => {
      console.log('[CameraState] WebSocket closed, reconnecting...');
      wsClient = null;
      if (!wsReconnectTimer) {
        wsReconnectTimer = setTimeout(() => {
          wsReconnectTimer = null;
          connectWebSocket();
        }, WS_RECONNECT_INTERVAL);
      }
    });
  } catch (err) {
    console.error('[CameraState] Failed to connect WebSocket', err);
  }
}

function handleWebSocketMessage(msg) {
  // Debug log for all WS messages
  // console.log('[CameraState] WS msg:', JSON.stringify(msg));

  if (msg.what === 'ptzfChanged' || msg.what === 'configChanged') {
    const key = msg.key;
    const value = msg.value;
    const isAuto = typeof msg.isAuto === 'boolean' ? msg.isAuto : undefined;
    const supportsAuto = typeof msg.supportsAuto === 'boolean' ? msg.supportsAuto : undefined;

    if (key && (typeof value !== 'undefined' || typeof isAuto !== 'undefined' || typeof supportsAuto !== 'undefined')) {
      const prev = state.values[key];
      const nextValue = typeof value !== 'undefined' ? value : prev?.value;
      const prevRaw = prev?.raw && typeof prev.raw === 'object' ? prev.raw : {};
      const nextRaw = {
        ...prevRaw,
      };
      if (typeof value !== 'undefined') {
        nextRaw.current = value;
      }
      if (typeof isAuto !== 'undefined') {
        nextRaw.isAuto = isAuto;
      }
      if (typeof supportsAuto !== 'undefined') {
        nextRaw.supportsAuto = supportsAuto;
      }
      // 更新缓存
      state.values[key] = {
        key,
        value: nextValue,
        raw: nextRaw,
        updatedAt: Date.now(),
        error: undefined
      };
      state.updatedAt = Date.now();

      console.log(`[CameraState] WebSocket update: ${key} = ${nextValue}`);

      // If Zoom changed, refresh Focus to update range (metadata)
      if (key === 'lens_zoom_pos') {
        console.log('[CameraState] Zoom changed, refreshing focus range...');
        refreshKeys(['lens_focus_pos']).catch(err => console.error('[CameraState] Focus refresh failed', err));
      }
    }
  } else {
    // Log unhandled message types that might be relevant
    if (msg.key === 'speed' || msg.what?.includes('Speed')) {
      console.log('[CameraState] Potential speed message ignored:', JSON.stringify(msg));
    }
  }

  // Handle device list changes
  if (msg.what === 'deviceListChanged') {
    console.log('[CameraState] Device list changed, refreshing...');
    fetchDeviceList().catch(err => {
      console.error('[CameraState] Failed to refresh device list:', err);
    });
  }

  // Handle active device switch
  if (msg.what === 'deviceChanged') {
    console.log('[CameraState] Active device changed:', msg.activeDeviceId);

    // Update active device ID
    if (msg.activeDeviceId) {
      state.devices.activeDeviceId = msg.activeDeviceId;
      state.devices.updatedAt = Date.now();
    }

    // Refresh all camera properties for the new device
    console.log('[CameraState] Refreshing all properties for new device...');
    refreshKeys(DEFAULT_KEYS).catch(err => {
      console.error('[CameraState] Failed to refresh properties after device switch:', err);
    });

    // Also refresh device list to ensure consistency
    fetchDeviceList().catch(err => {
      console.error('[CameraState] Failed to refresh device list after switch:', err);
    });
  }
}

function stopWebSocket() {
  if (wsReconnectTimer) {
    clearTimeout(wsReconnectTimer);
    wsReconnectTimer = null;
  }
  if (wsClient) {
    try {
      wsClient.close();
    } catch (err) {
      // ignore
    }
    wsClient = null;
  }
}

function shutdown() {
  stopWebSocket();
  if (pollingTimer) {
    clearInterval(pollingTimer);
    pollingTimer = null;
  }
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

startServer();
initialRefresh();
startPolling();
connectWebSocket();
