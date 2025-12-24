import type { CliRequest } from '../../framework/state/PageStore.js';

export interface UvcCommandOptions {
  auto?: boolean;
  meta?: Record<string, unknown>;
}

export function buildUvcCliRequest(kind: string, value?: number | string, options: UvcCommandOptions = {}): CliRequest {
  const args = ['uvc', 'set', kind];
  if (typeof value !== 'undefined') {
    args.push('--value', String(value));
  }
  if (typeof options.auto === 'boolean') {
    args.push('--auto', options.auto ? 'true' : 'false');
  }

  const request: CliRequest = {
    id: `uvc-${kind}-${Date.now()}`,
    command: `uvc set ${kind}`,
    args,
  };

  if (options.meta) {
    request.params = {
      ...(request.params ?? {}),
      sliderMeta: options.meta,
    };
  }

  return request;
}
