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
      // When AWB is enabled, set wb=Auto; when disabled, set wb=Manual
      const wbValue = enabled ? 'Auto' : 'Manual';

      // Use direct HTTP request format
      return {
        cliRequest: {
          id: `wb-mode-${Date.now()}`,
          command: `/ctrl/set?wb=${wbValue}`,
          args: [],
        },
      };
    },
  },
  {
    id: 'whiteBalance.setTemperature',
    cliCommand: 'wb.temperature',
    async handler(ctx: OperationContext, payload: OperationPayload): Promise<OperationResult> {
      const defaults = { min: 2000, max: 10000, step: 100 };
      const range = ctx.cameraState.whiteBalance?.temperature;
      const min = range?.min ?? defaults.min;
      const max = range?.max ?? defaults.max;
      const step = range?.step ?? defaults.step;

      let value = Number(payload.value ?? 3200);
      if (!Number.isFinite(value)) value = 5600;

      // Clamp
      value = Math.max(min, Math.min(max, value));

      // Snap to step
      if (step > 0) {
        value = Math.round(value / step) * step;
      }

      // Re-clamp in case snapping went out of bounds (though unlikely with round)
      value = Math.max(min, Math.min(max, value));

      return {
        cliRequest: {
          id: `uvc-wb-kelvin-${Date.now()}`,
          command: `image whitebalance manual kelvin ${value}`,
          args: ['image', 'whitebalance', 'manual', 'kelvin', String(value)],
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
