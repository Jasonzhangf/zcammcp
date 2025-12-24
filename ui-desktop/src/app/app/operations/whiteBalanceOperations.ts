// whiteBalanceOperations.ts
// 白平衡相关 Operation 集合 (AWB / 色温)

import type { OperationContext, OperationPayload, OperationResult, OperationDefinition } from '../../framework/state/PageStore.js';
import { buildUvcCliRequest } from './uvcCliRequest.js';

export const whiteBalanceOperations: OperationDefinition[] = [
  {
    id: 'whiteBalance.setAwbEnabled',
    cliCommand: 'wb.awb',
    async handler(ctx: OperationContext, payload: OperationPayload): Promise<OperationResult> {
      const enabled = Boolean(payload.value);
      return {
        cliRequest: buildUvcCliRequest('whitebalance', undefined, { auto: enabled, meta: extractSliderMeta(payload) }),
      };
    },
  },
  {
    id: 'whiteBalance.setTemperature',
    cliCommand: 'wb.temperature',
    async handler(ctx: OperationContext, payload: OperationPayload): Promise<OperationResult> {
      const value = Number(payload.value ?? 3200);
      const clamped = Number.isFinite(value) ? Math.max(2000, Math.min(10000, value)) : 5600;
      return {
        cliRequest: buildUvcCliRequest('whitebalance', clamped, { meta: extractSliderMeta(payload) }),
      };
    },
  },
];

function extractSliderMeta(payload: OperationPayload): Record<string, unknown> | undefined {
  const rawMeta = (payload.params as Record<string, unknown> | undefined)?.['sliderMeta'];
  if (!rawMeta || typeof rawMeta !== 'object') return undefined;
  return rawMeta as Record<string, unknown>;
}
