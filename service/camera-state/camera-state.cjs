#!/usr/bin/env node

/**
 * Camera State Service
 * - Polls ImvtCameraService (UVC) and caches latest camera properties
 * - Exposes HTTP endpoints so UI/CLI can query & refresh state
 */

const http = require('http');
const { URL } = require('url');

const CAMERA_STATE_HOST = process.env.ZCAM_CAMERA_STATE_HOST || '127.0.0.1';
const CAMERA_STATE_PORT = parseInt(process.env.ZCAM_CAMERA_STATE_PORT || '6292', 10);
const CAMERA_STATE_POLL_INTERVAL = parseInt(process.env.ZCAM_CAMERA_STATE_INTERVAL || '0', 10);
const UVC_BASE_URL = process.env.ZCAM_UVC_BASE || 'http://127.0.0.1:17988';

const DEFAULT_KEYS = (
  process.env.ZCAM_CAMERA_STATE_KEYS ||
  'pan,tilt,zoom,focus,exposure,gain,whitebalance,brightness,contrast,saturation,sharpness,hue,gamma'
)
  .split(',')
  .map((k) => k.trim())
  .filter(Boolean);

const state = {
  values: {},
  updatedAt: null,
};

let pollingTimer = null;

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
  const url = new URL('/usbvideoctrl', UVC_BASE_URL);
  url.searchParams.set('key', key);
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
  };
}

function projectCameraState(values) {
  const projectValue = (key) => {
    const entry = values[key];
    if (!entry || typeof entry.value === 'undefined' || entry.value === null) return undefined;
    return {
      value: entry.value,
      view: String(entry.value),
      updatedAt: entry.updatedAt,
      raw: entry.raw,
    };
  };

  return {
    ptz: {
      pan: projectValue('pan'),
      tilt: projectValue('tilt'),
      zoom: projectValue('zoom'),
      focus: projectValue('focus'),
    },
    exposure: {
      exposure: projectValue('exposure'),
      gain: projectValue('gain'),
    },
    whiteBalance: projectValue('whitebalance'),
    image: {
      brightness: projectValue('brightness'),
      contrast: projectValue('contrast'),
      saturation: projectValue('saturation'),
      sharpness: projectValue('sharpness'),
      hue: projectValue('hue'),
      gamma: projectValue('gamma'),
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
    await refreshKeys(DEFAULT_KEYS);
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

function shutdown() {
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
