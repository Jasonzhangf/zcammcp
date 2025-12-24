// imageOperations.ts
// 图像调节相关 Operation 集合 (亮度/对比度/饱和度)

import type { OperationContext, OperationPayload, OperationResult, OperationDefinition } from '../../framework/state/PageStore.js';
import { buildUvcCliRequest } from './uvcCliRequest.js';

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 50;
  return Math.max(0, Math.min(100, value));
}

export const imageOperations: OperationDefinition[] = [
  {
    id: 'image.setBrightness',
    cliCommand: 'image.brightness',
    async handler(ctx: OperationContext, payload: OperationPayload): Promise<OperationResult> {
      const v = clamp01(Number(payload.value ?? 50));
      return {
        cliRequest: buildUvcCliRequest('brightness', v, { meta: extractSliderMeta(payload) }),
      };
    },
  },
  {
    id: 'image.setContrast',
    cliCommand: 'image.contrast',
    async handler(ctx: OperationContext, payload: OperationPayload): Promise<OperationResult> {
      const v = clamp01(Number(payload.value ?? 50));
      return {
        cliRequest: buildUvcCliRequest('contrast', v, { meta: extractSliderMeta(payload) }),
      };
    },
  },
  {
    id: 'image.setSaturation',
    cliCommand: 'image.saturation',
    async handler(ctx: OperationContext, payload: OperationPayload): Promise<OperationResult> {
      const v = clamp01(Number(payload.value ?? 50));
      return {
        cliRequest: buildUvcCliRequest('saturation', v, { meta: extractSliderMeta(payload) }),
      };
    },
  },
];

function extractSliderMeta(payload: OperationPayload): Record<string, unknown> | undefined {
  const rawMeta = (payload.params as Record<string, unknown> | undefined)?.['sliderMeta'];
  if (!rawMeta || typeof rawMeta !== 'object') return undefined;
  return rawMeta as Record<string, unknown>;
}
