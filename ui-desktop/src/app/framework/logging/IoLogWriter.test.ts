// IoLogWriter.test.ts
// 验证 IoLogWriter 能将日志写入 JSONL 文件

import test from 'node:test';
import assert from 'node:assert';
import os from 'node:os';
import path from 'node:path';
import { promises as fs } from 'node:fs';

import { IoLogWriter, type IoLogEntry } from './IoLogWriter.js';

test('IoLogWriter.append writes JSONL entries', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'zcammcp-ui-io-test-'));
  const writer = new IoLogWriter(tmpDir);

  const entry: IoLogEntry = {
    ts: Date.now(),
    dir: 'out',
    pagePath: 'zcam.camera.pages.main',
    nodePath: 'zcam.camera.pages.main.ptz.focus',
    operationId: 'ptz.setFocus',
    request: {
      id: 'r1',
      command: 'ptz.focus',
      params: { value: 40 },
    },
  };

  await writer.append(entry);

  const files = await fs.readdir(tmpDir);
  assert.ok(files.length > 0, 'log file should be created');

  const content = await fs.readFile(path.join(tmpDir, files[0]), 'utf-8');
  const lines = content.trim().split('\n');
  assert.equal(lines.length, 1);
  const parsed = JSON.parse(lines[0]);
  assert.equal(parsed.operationId, 'ptz.setFocus');
  assert.equal(parsed.nodePath, 'zcam.camera.pages.main.ptz.focus');
});

