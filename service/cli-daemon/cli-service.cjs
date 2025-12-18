#!/usr/bin/env node

/**
 * CLI Service Daemon
 * - Accepts HTTP requests (default http://127.0.0.1:6291)
 * - Executes zcam CLI commands
 * - Caches the latest result for monitoring
 */

const http = require('http');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const HOST = process.env.ZCAM_CLI_SERVICE_HOST || '127.0.0.1';
const PORT = parseInt(process.env.ZCAM_CLI_SERVICE_PORT || '6291', 10);
const CLI_ROOT = process.env.ZCAM_CLI_ROOT || path.resolve(__dirname, '..', '..', 'cli');
const CLI_ENTRY = process.env.ZCAM_CLI_ENTRY || path.resolve(CLI_ROOT, 'src', 'index.js');
const NODE_BIN = process.env.ZCAM_NODE_BIN || process.execPath;
const DEFAULT_TIMEOUT = parseInt(process.env.ZCAM_CLI_TIMEOUT || '10000', 10);
const ALLOW_ORIGIN = typeof process.env.ZCAM_CLI_ALLOW_ORIGIN === 'string' ? process.env.ZCAM_CLI_ALLOW_ORIGIN : '*';
const CAMERA_STATE_HOST = process.env.ZCAM_CAMERA_STATE_HOST || '127.0.0.1';
const CAMERA_STATE_PORT = parseInt(process.env.ZCAM_CAMERA_STATE_PORT || '6292', 10);

let lastResult = {
  ok: false,
  message: 'CLI service started',
  updatedAt: Date.now(),
};

function applyCors(res) {
  if (!ALLOW_ORIGIN) {
    return;
  }
  res.setHeader('Access-Control-Allow-Origin', ALLOW_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function respondJson(res, payload, status = 200) {
  res.statusCode = status;
  applyCors(res);
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

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

function buildCliArgs(baseArgs, expectJson = true) {
  const next = Array.isArray(baseArgs) ? [...baseArgs] : [];
  if (expectJson && !next.includes('--json')) {
    next.push('--json');
  }
  return next;
}

function runCliCommand(payload = {}) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(CLI_ENTRY)) {
      return reject(new Error(`CLI entry not found at ${CLI_ENTRY}`));
    }
    const args = buildCliArgs(payload.args, payload.expectJson !== false);
    if (args.length === 0) {
      return reject(new Error('CLI args are required'));
    }

    const timeoutMs =
      typeof payload.timeoutMs === 'number' && Number.isFinite(payload.timeoutMs)
        ? payload.timeoutMs
        : DEFAULT_TIMEOUT;

    const child = spawn(NODE_BIN, [CLI_ENTRY, ...args], {
      cwd: CLI_ROOT,
      env: { ...process.env, ...payload.env },
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let timeoutHandle = null;
    if (timeoutMs > 0) {
      timeoutHandle = setTimeout(() => {
        child.kill();
        reject(new Error(`CLI command timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    }

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (err) => {
      if (timeoutHandle) clearTimeout(timeoutHandle);
      reject(err);
    });

    child.on('close', (code) => {
      if (timeoutHandle) clearTimeout(timeoutHandle);
      resolve({
        ok: code === 0,
        code,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      });
    });
  });
}

function updateLastResult(patch) {
  lastResult = { ...lastResult, ...patch, updatedAt: Date.now() };
  return lastResult;
}

function deriveCameraKeys(args) {
  if (!Array.isArray(args) || args.length === 0) return [];
  if (args[0] === 'uvc' && args[1] === 'set' && typeof args[2] === 'string') {
    return [args[2]];
  }
  return [];
}

function notifyCameraState(keys) {
  if (!CAMERA_STATE_PORT || !CAMERA_STATE_HOST) return Promise.resolve();
  const payload = JSON.stringify({ keys });
  const options = {
    hostname: CAMERA_STATE_HOST,
    port: CAMERA_STATE_PORT,
    path: '/refresh',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
    },
  };
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      res.on('data', () => {});
      res.on('end', resolve);
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

const server = http.createServer(async (req, res) => {
  try {
    applyCors(res);
    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }
    if (req.method === 'GET' && req.url === '/health') {
      return respondJson(res, { ok: true, pid: process.pid, updatedAt: Date.now() });
    }

    if (req.method === 'GET' && req.url === '/state') {
      return respondJson(res, { ok: true, state: lastResult });
    }

    if (req.method === 'POST' && req.url === '/run') {
      const body = await parseBody(req);
      const startedAt = Date.now();
      try {
        const result = await runCliCommand(body);
        updateLastResult({ ...result, startedAt });
        const keys = deriveCameraKeys(body.args);
        notifyCameraState(keys).catch((err) => {
          console.warn('[CLI Service] camera state refresh failed', err.message || err);
        });
        return respondJson(res, { ok: true, result });
      } catch (err) {
        updateLastResult({ ok: false, error: err.message, startedAt });
        return respondJson(res, { ok: false, error: err.message }, 500);
      }
    }

    respondJson(res, { ok: false, error: 'not found' }, 404);
  } catch (err) {
    respondJson(res, { ok: false, error: err.message }, 500);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`[CLI Service] listening on http://${HOST}:${PORT}`);
});

process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  server.close(() => process.exit(0));
});
