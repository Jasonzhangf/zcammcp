import type { CliChannel as CliChannelInterface, CliRequest, CliResponse } from '../state/PageStore.js';
import type { ElectronAPI } from '../../types/electron.js';

interface CliBridgeRequest {
  args: string[];
  params?: Record<string, unknown>;
  timeoutMs?: number;
  expectJson?: boolean;
}

interface CliBridgeResult {
  ok: boolean;
  stdout?: string;
  stderr?: string;
  code?: number;
  error?: string;
}

function hasWhitespace(command: string): boolean {
  return /\s+/.test(command);
}

/**
 * RealCliChannel talks to Electron (and then the real CLI binary)
 * via the `runCliCommand` bridge. If the bridge is unavailable we
 * fall back to a no-op response so the UI can continue operating
 * while backend wiring is still under development.
 */
export class RealCliChannel implements CliChannelInterface {
  private electronAPI?: ElectronAPI;

  constructor(options?: { electronAPI?: ElectronAPI }) {
    if (options?.electronAPI) {
      this.electronAPI = options.electronAPI;
    } else if (typeof window !== 'undefined') {
      this.electronAPI = window.electronAPI;
    }
  }

  setElectronAPI(api: ElectronAPI | undefined): void {
    this.electronAPI = api;
  }

  async send(request: CliRequest): Promise<CliResponse> {
    const api = this.electronAPI;

    if (!api?.runCliCommand) {
      return {
        id: request.id,
        ok: false,
        error: 'CLI bridge unavailable',
      };
    }

    const payload = this.buildBridgePayload(request);

    if (!payload) {
      // 未提供真实 CLI 命令时保持向后兼容
      return {
        id: request.id,
        ok: true,
        data: { skipped: true },
      };
    }

    try {
      const result = (await api.runCliCommand(payload)) as CliBridgeResult;
      const ok = Boolean(result?.ok);
      const error = ok ? undefined : result?.stderr || result?.error || 'CLI command failed';

      void api.pushState?.('cli', {
        lastCommand: payload,
        ok,
        stdout: result?.stdout ?? null,
        stderr: result?.stderr ?? null,
        code: result?.code ?? null,
        finishedAt: Date.now(),
      });

      return {
        id: request.id,
        ok,
        data: ok && result?.stdout ? { stdout: result.stdout } : undefined,
        error,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      void api.pushState?.('cli', {
        lastCommand: payload,
        ok: false,
        error: message,
        finishedAt: Date.now(),
      });
      return {
        id: request.id,
        ok: false,
        error: message,
      };
    }
  }

  private buildBridgePayload(request: CliRequest): CliBridgeRequest | null {
    const args = this.deriveArgs(request);

    if (!args || args.length === 0) {
      return null;
    }

    return {
      args,
      params: request.params,
      timeoutMs: request.timeoutMs,
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
}

