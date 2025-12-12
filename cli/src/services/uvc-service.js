const fetch = require('node-fetch');
const { URL } = require('url');

const DEFAULT_BASE_URL = process.env.ZCAM_UVC_BASE || 'http://127.0.0.1:17988';
const DEFAULT_TIMEOUT = parseInt(process.env.ZCAM_UVC_TIMEOUT || '5000', 10);

class UvcService {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || DEFAULT_BASE_URL;
    this.timeoutMs = typeof options.timeoutMs === 'number' ? options.timeoutMs : DEFAULT_TIMEOUT;
    this.fetchImpl = options.fetchImpl || fetch;
  }

  async getProperty(key) {
    return this.request({ key });
  }

  async setProperty(key, value, opts = {}) {
    const params = { key };
    if (typeof value !== 'undefined' && value !== null) {
      params.value = value;
    }
    if (typeof opts.auto === 'boolean') {
      params.auto = String(opts.auto);
    }
    return this.request(params);
  }

  async listResolutions() {
    return this.request({ key: 'resolutions' });
  }

  async setResolution(width, height) {
    return this.request({ key: 'resolutions', width, height });
  }

  async listFramerates() {
    return this.request({ key: 'framerates' });
  }

  async setFramerate(value) {
    return this.request({ key: 'framerates', value });
  }

  async queryAll() {
    return this.request({ action: 'query' });
  }

  async request(params = {}) {
    const url = new URL('/usbvideoctrl', this.baseUrl);
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) continue;
      url.searchParams.append(key, String(value));
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await this.fetchImpl(url.toString(), { method: 'GET', signal: controller.signal });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status} ${res.statusText}: ${body}`);
      }
      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch {
        return { raw: text };
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error(`UVC request timed out after ${this.timeoutMs}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }
}

module.exports = { UvcService };
