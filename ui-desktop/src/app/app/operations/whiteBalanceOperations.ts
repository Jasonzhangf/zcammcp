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
      const mode = enabled ? 'auto' : 'manual';
      return {
        cliRequest: {
          id: `uvc-wb-mode-${Date.now()}`,
          command: `image whitebalance mode ${mode}`,
          args: ['image', 'whitebalance', 'mode', mode],
        }
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
        cliRequest: {
          id: `uvc-wb-kelvin-${Date.now()}`,
          command: `image whitebalance manual kelvin ${clamped}`,
          args: ['image', 'whitebalance', 'manual', 'kelvin', String(clamped)],
        }
      };
    },
  },
];

function extractSliderMeta(payload: OperationPayload): Record<string, unknown> | undefined {
  const rawMeta = (payload.params as Record<string, unknown> | undefined)?.['sliderMeta'];
  if (!rawMeta || typeof rawMeta !== 'object') return undefined;
  return rawMeta as Record<string, unknown>;
}
