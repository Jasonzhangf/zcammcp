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
      const value = payload.value;
      // Allow string values (e.g. "1/100") directly. Only clamp if it's purely numeric.
      let finalValue = String(value);

      if (typeof value === 'number' && Number.isFinite(value)) {
        // Existing numeric logic (clamping if needed, but usually shutter is string or specific numbers)
        // Actually, for Z CAM, shutter can be angles (numbers) or time (fractions).
        // If it's a number, we pass it. If string, we pass it.
        finalValue = String(value);
      }

      void ctx;
      return {
        cliRequest: {
          id: `image-shutter-${Date.now()}`,
          command: `image adjust shutter_time ${finalValue}`,
          args: ['image', 'adjust', 'shutter_time', finalValue],
        },
      };
    },
  },
  {
    id: 'exposure.setIso',
    cliCommand: 'exposure.iso',
    async handler(ctx: OperationContext, payload: OperationPayload): Promise<OperationResult> {
      const value = String(payload.value ?? 'Auto');
      // The user requested a specific CLI command format: node src/index.js image adjust iso <value>
      return {
        cliRequest: {
          id: `image-iso-${Date.now()}`,
          command: `image adjust iso ${value}`,
          args: ['image', 'adjust', 'iso', value],
        },
      };
    },
  },
];

function extractSliderMeta(payload: OperationPayload): Record<string, unknown> | undefined {
  const rawMeta = (payload.params as Record<string, unknown> | undefined)?.['sliderMeta'];
  if (!rawMeta || typeof rawMeta !== 'object') return undefined;
  return rawMeta as Record<string, unknown>;
}
