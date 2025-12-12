const http = require('http');
const { URL } = require('url');

class StateHost {
  constructor(options = {}) {
    const envPort = process.env.ZCAM_STATE_PORT ? parseInt(process.env.ZCAM_STATE_PORT, 10) : undefined;
    this.port = options.port || envPort || 6224;
    this.host = options.host || '127.0.0.1';
    this.state = {
      window: {},
      ui: {},
      cli: {},
      services: {},
    };
    this.handlers = new Map();
    this.server = null;
  }

  async start() {
    if (this.server) return;
    this.server = http.createServer((req, res) => {
      this.handleRequest(req, res).catch((err) => {
        console.error('[StateHost] request error', err);
        this.sendJson(res, { ok: false, error: err.message }, 500);
      });
    });
    return new Promise((resolve, reject) => {
      this.server.once('error', reject);
      this.server.listen(this.port, this.host, () => {
        console.log(`[StateHost] listening on http://${this.host}:${this.port}`);
        resolve();
      });
    });
  }

  async stop() {
    if (!this.server) return;
    await new Promise((resolve, reject) => {
      this.server.close((err) => (err ? reject(err) : resolve()));
    });
    this.server = null;
  }

  registerHandler(channel, handler) {
    this.handlers.set(channel, handler);
  }

  push(channel, payload) {
    if (!channel) {
      throw new Error('channel is required');
    }
    const prev = this.state[channel] || {};
    const next = { ...prev, ...payload, updatedAt: Date.now() };
    this.state[channel] = next;
    return next;
  }

  get(channel) {
    if (!channel) return this.state;
    return this.state[channel] || null;
  }

  async handleRequest(req, res) {
    const url = new URL(req.url, `http://${this.host}:${this.port}`);
    if (req.method === 'GET' && url.pathname === '/state') {
      const channel = url.searchParams.get('channel');
      return this.sendJson(res, { ok: true, state: this.get(channel) });
    }

    if (req.method === 'POST' && url.pathname === '/state') {
      const body = await this.parseBody(req);
      const { channel, payload } = body || {};
      if (!channel) {
        return this.sendJson(res, { ok: false, error: 'channel required' }, 400);
      }
      const state = this.push(channel, payload || {});
      return this.sendJson(res, { ok: true, state });
    }

    if (req.method === 'POST' && url.pathname === '/command') {
      const body = await this.parseBody(req);
      const { channel, action, payload } = body || {};
      if (!channel || !action) {
        return this.sendJson(res, { ok: false, error: 'channel and action required' }, 400);
      }
      const handler = this.handlers.get(channel);
      if (!handler) {
        return this.sendJson(res, { ok: false, error: `no handler for channel ${channel}` }, 404);
      }
      try {
        const result = await handler(action, payload || {});
        return this.sendJson(res, { ok: true, result, state: this.get(channel) });
      } catch (err) {
        return this.sendJson(res, { ok: false, error: err.message });
      }
    }

    this.sendJson(res, { ok: false, error: 'not found' }, 404);
  }

  async parseBody(req) {
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

  sendJson(res, payload, status = 200) {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(payload));
  }
}

module.exports = { StateHost };
