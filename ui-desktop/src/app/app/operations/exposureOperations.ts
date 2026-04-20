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
    id: 'exposure.setShutterOperation',
    cliCommand: 'exposure.shutterOperation',
    async handler(ctx: OperationContext, payload: OperationPayload): Promise<OperationResult> {
      const raw = String(payload.value ?? 'Speed').trim();
      const mode = raw.toLowerCase() === 'angle' ? 'Angle' : 'Speed';
      void ctx;
      return {
        cliRequest: buildUvcCliRequest('sht_operation', mode, { meta: extractSliderMeta(payload) }),
      };
    },
  },
  {
    id: 'exposure.setShutter',
    cliCommand: 'exposure.shutter',
    async handler(ctx: OperationContext, payload: OperationPayload): Promise<OperationResult> {
      const value = payload.value;
      let finalValue = String(value);
      if (typeof value === 'number' && Number.isFinite(value)) {
        finalValue = String(value);
      }
      const modeFromPayload = String((payload.params as Record<string, unknown> | undefined)?.['mode'] ?? '').trim();
      const modeFromState = String(ctx.cameraState.exposure?.shutterOperation?.value ?? '').trim();
      const mode = (modeFromPayload || modeFromState).toLowerCase() === 'angle' ? 'Angle' : 'Speed';
      const shutterKey = mode === 'Angle' ? 'shutter_angle' : 'shutter_time';
      return {
        cliRequest: buildUvcCliRequest(shutterKey, finalValue, { meta: extractSliderMeta(payload) }),
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
