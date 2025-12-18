import type { CliChannel as CliChannelInterface, CliRequest, CliResponse } from '../state/PageStore.js';

interface CliServicePayload {
  args: string[];
  params?: Record<string, unknown>;
  timeoutMs?: number;
  expectJson?: boolean;
}

interface CliServiceResult {
  ok: boolean;
  stdout?: string;
  stderr?: string;
  code?: number;
  error?: string;
}

interface CliServiceResponse {
  ok: boolean;
  result?: CliServiceResult;
  error?: string;
}

interface HttpCliChannelOptions {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  defaultTimeoutMs?: number;
}

const DEFAULT_BASE_URL = 'http://127.0.0.1:6291';
const DEFAULT_TIMEOUT = 10000;

function hasWhitespace(command: string): boolean {
  return /\s+/.test(command);
}

function detectBaseUrl(options?: HttpCliChannelOptions): string {
  if (options?.baseUrl) {
    return options.baseUrl;
  }
  const globalTarget = globalThis as Record<string, unknown>;
  const fromGlobal = globalTarget.__ZCAM_CLI_SERVICE_BASE__;
  if (typeof fromGlobal === 'string' && fromGlobal.length > 0) {
    return fromGlobal;
  }
  try {
    const env = (import.meta as unknown as { env?: Record<string, unknown> })?.env;
    const viteValue = env?.VITE_ZCAM_CLI_SERVICE_BASE;
    if (typeof viteValue === 'string' && viteValue.length > 0) {
      return viteValue;
    }
  } catch {
    // ignore environments without import.meta
  }
  return DEFAULT_BASE_URL;
}

function ensureFetch(options?: HttpCliChannelOptions): typeof fetch {
  if (options?.fetchImpl) {
    return options.fetchImpl;
  }
  const impl = globalThis.fetch;
  if (!impl) {
    throw new Error('HttpCliChannel requires fetch to be available');
  }
  return impl.bind(globalThis);
}

export class HttpCliChannel implements CliChannelInterface {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly defaultTimeout: number;

  constructor(options?: HttpCliChannelOptions) {
    this.baseUrl = detectBaseUrl(options);
    this.fetchImpl = ensureFetch(options);
    this.defaultTimeout = options?.defaultTimeoutMs ?? DEFAULT_TIMEOUT;
  }

  async send(request: CliRequest): Promise<CliResponse> {
    const payload = this.buildPayload(request);
    if (!payload) {
      return {
        id: request.id,
        ok: true,
        data: { skipped: true },
      };
    }

    try {
      const response = await this.invokeCli(payload);
      const ok = Boolean(response?.ok && response?.result?.ok);
      if (!ok) {
        const error =
          response?.error || response?.result?.stderr || response?.result?.error || 'CLI command failed';
        return { id: request.id, ok: false, error };
      }
      const stdout = response.result?.stdout;
      return {
        id: request.id,
        ok: true,
        data: stdout ? { stdout } : undefined,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        id: request.id,
        ok: false,
        error: message,
      };
    }
  }

  private buildPayload(request: CliRequest): CliServicePayload | null {
    const args = this.deriveArgs(request);
    if (!args || args.length === 0) {
      return null;
    }
    return {
      args,
      params: request.params,
      timeoutMs: request.timeoutMs ?? this.defaultTimeout,
      expectJson: request.expectJson !== false,
    };
  }

  private deriveArgs(request: CliRequest): string[] | null {
    if (Array.isArray(request.args) && request.args.length > 0) {
      return request.args;
    }
    if (request.command && hasWhitespace(request.command)) {
      return request.command
        .trim()
        .split(/\s+/)
        .filter(Boolean);
    }
    return null;
  }

  private async invokeCli(payload: CliServicePayload): Promise<CliServiceResponse> {
    const runUrl = new URL('/run', this.baseUrl);
    const res = await this.fetchImpl(runUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`CLI service HTTP ${res.status}: ${text || res.statusText}`);
    }
    const text = await res.text();
    try {
      return JSON.parse(text) as CliServiceResponse;
    } catch {
      throw new Error('CLI service returned invalid JSON');
    }
  }
}
