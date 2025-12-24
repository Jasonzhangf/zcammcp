// exposureOperations.ts
// ZCAM 曝光相关 Operation 集合 (AE / Shutter / ISO)

import type { OperationContext, OperationPayload, OperationResult, OperationDefinition } from '../../framework/state/PageStore.js';
import { buildUvcCliRequest } from './uvcCliRequest.js';

export const exposureOperations: OperationDefinition[] = [
  {
    id: 'exposure.setAeEnabled',
    cliCommand: 'exposure.ae',
    async handler(ctx: OperationContext, payload: OperationPayload): Promise<OperationResult> {
      const enabled = Boolean(payload.value);
      void ctx; // context reserved for future use
      return {
        cliRequest: buildUvcCliRequest('exposure', undefined, { auto: enabled, meta: extractSliderMeta(payload) }),
      };
    },
  },
  {
    id: 'exposure.setShutter',
    cliCommand: 'exposure.shutter',
    async handler(ctx: OperationContext, payload: OperationPayload): Promise<OperationResult> {
      const value = Number(payload.value ?? 0);
      const clamped = Number.isFinite(value) ? Math.max(1, value) : 1;
      void ctx;
      return {
        cliRequest: buildUvcCliRequest('exposure', clamped, { meta: extractSliderMeta(payload) }),
      };
    },
  },
  {
    id: 'exposure.setIso',
    cliCommand: 'exposure.iso',
    async handler(ctx: OperationContext, payload: OperationPayload): Promise<OperationResult> {
      const value = Number(payload.value ?? 0);
      const clamped = Number.isFinite(value) ? Math.max(100, value) : 100;
      void ctx;
      return {
        cliRequest: buildUvcCliRequest('gain', clamped, { meta: extractSliderMeta(payload) }),
      };
    },
  },
];

function extractSliderMeta(payload: OperationPayload): Record<string, unknown> | undefined {
  const rawMeta = (payload.params as Record<string, unknown> | undefined)?.['sliderMeta'];
  if (!rawMeta || typeof rawMeta !== 'object') return undefined;
  return rawMeta as Record<string, unknown>;
}
