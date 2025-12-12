import '../../../test/setupDom.js';

import assert from 'node:assert/strict';
import test from 'node:test';

import type { CliRequest } from '../state/PageStore.js';
import { RealCliChannel } from './RealCliChannel.js';

function createRequest(command: string, overrides: Partial<CliRequest> = {}): CliRequest {
  return {
    id: `req-${Date.now()}`,
    command,
    ...overrides,
  };
}

test('RealCliChannel returns error when bridge is missing', async () => {
  const channel = new RealCliChannel({ electronAPI: undefined });
  const res = await channel.send(createRequest('ui window status'));
  assert.equal(res.ok, false);
  assert.match(res.error ?? '', /bridge unavailable/i);
});

test('RealCliChannel skips when no executable args derived', async () => {
  const api = {
    runCliCommand: async () => ({ ok: true }),
    pushState: async () => {},
  };
  const channel = new RealCliChannel({ electronAPI: api });
  const result = await channel.send(createRequest('ptz.zoom'));
  assert.equal(result.ok, true);
  assert.deepEqual(result.data, { skipped: true });
});

test('RealCliChannel forwards args to the bridge', async () => {
  let capturedPayload: any = null;
  const api = {
    runCliCommand: async (payload: any) => {
      capturedPayload = payload;
      return { ok: true, stdout: '{"mode":"main"}' };
    },
    pushState: async () => {},
  };
  const channel = new RealCliChannel({ electronAPI: api });
  const result = await channel.send(createRequest('ui window status'));

  assert.equal(result.ok, true);
  const data = result.data as { stdout?: string };
  assert.ok(data?.stdout);
  assert.ok(Array.isArray(capturedPayload.args));
  assert.deepEqual(capturedPayload.args, ['ui', 'window', 'status']);
});
