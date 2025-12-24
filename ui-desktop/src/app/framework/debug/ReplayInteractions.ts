// ReplayInteractions.ts
// 基于 InteractionLogger + PageStore 的轻量级录制 / 回放工具。
// 当前只回放 SliderControl 的 commit 事件（source='slider', action='commit'），
// 并通过 PageStore.runOperation 重新触发同样的业务操作。

import type { OperationPayload, PageStore } from '../state/PageStore.js';
import { getInteractionLogs } from './InteractionLogger.js';

export interface ReplayInteractionsOptions {
  startTs?: number;
  endTs?: number;
}

export interface ReplayInteractionsResult {
  count: number;
}

export async function replayInteractions(
  store: PageStore,
  options: ReplayInteractionsOptions = {},
): Promise<ReplayInteractionsResult> {
  const { startTs, endTs } = options;
  const logs = getInteractionLogs();

  const start = typeof startTs === 'number' && Number.isFinite(startTs) ? startTs : undefined;
  const end = typeof endTs === 'number' && Number.isFinite(endTs) ? endTs : undefined;

  const candidates = logs.filter((entry) => {
    if (entry.source !== 'slider' || entry.action !== 'commit') return false;
    if (typeof entry.timestamp !== 'number') return false;
    if (start !== undefined && entry.timestamp < start) return false;
    if (end !== undefined && entry.timestamp > end) return false;
    if (!entry.path) return false;
    return true;
  });

  if (candidates.length === 0) {
    return { count: 0 };
  }

  let replayed = 0;

  for (const entry of candidates) {
    const path = entry.path!;
    const data = (entry.data ?? {}) as Record<string, unknown>;
    const rawValue = data.value as unknown;
    const value = typeof rawValue === 'number' ? rawValue : Number(rawValue);
    if (!Number.isFinite(value)) continue;

    const operationId = typeof data.operationId === 'string' ? data.operationId : '';
    const kind = typeof data.kind === 'string' ? data.kind : '';
    if (!operationId) continue;

    const payload: OperationPayload = { value };
    const meta = data.meta as Record<string, unknown> | undefined;
    if (meta && typeof meta === 'object') {
      payload.params = { sliderMeta: meta };
    }

    try {
      // 使用与 SliderControl 相同的调用方式回放操作。
      // 忽略单个操作的错误，继续回放后续条目。
      // eslint-disable-next-line no-await-in-loop
      await store.runOperation(path, kind, operationId, payload);
      replayed += 1;
    } catch {
      // ignore individual replay errors
    }
  }

  return { count: replayed };
}

