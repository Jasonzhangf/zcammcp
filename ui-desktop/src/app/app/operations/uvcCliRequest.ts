import type { CliRequest } from '../../framework/state/PageStore.js';

export interface UvcCommandOptions {
  auto?: boolean;
}

export function buildUvcCliRequest(kind: string, value?: number | string, options: UvcCommandOptions = {}): CliRequest {
  const args = ['uvc', 'set', kind];
  if (typeof value !== 'undefined') {
    args.push('--value', String(value));
  }
  if (typeof options.auto === 'boolean') {
    args.push('--auto', options.auto ? 'true' : 'false');
  }

  return {
    id: `uvc-${kind}-${Date.now()}`,
    command: `uvc set ${kind}`,
    args,
  };
}
