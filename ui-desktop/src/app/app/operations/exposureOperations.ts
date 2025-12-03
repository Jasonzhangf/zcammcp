// exposureOperations.ts
// ZCAM 曝光相关 Operation 集合 (AE / Shutter / ISO)

import type {
  CameraState,
  OperationContext,
  OperationPayload,
  OperationResult,
  OperationDefinition,
} from '../../framework/state/PageStore.js';

export const exposureOperations: OperationDefinition[] = [
  {
    id: 'exposure.setAeEnabled',
    cliCommand: 'exposure.ae',
    async handler(ctx: OperationContext, payload: OperationPayload): Promise<OperationResult> {
      const enabled = Boolean(payload.value);
      const exposure = ctx.cameraState.exposure ?? {};

      const newState: Partial<CameraState> = {
        exposure: {
          ...exposure,
          aeEnabled: enabled,
        },
      };

      return {
        newStatePartial: newState,
        cliRequest: {
          id: `exposure-ae-${Date.now()}`,
          command: 'exposure.ae',
          params: { enabled },
        },
      };
    },
  },
  {
    id: 'exposure.setShutter',
    cliCommand: 'exposure.shutter',
    async handler(ctx: OperationContext, payload: OperationPayload): Promise<OperationResult> {
      const value = Number(payload.value ?? 0);
      const clamped = Number.isFinite(value) ? Math.max(1, value) : 1;
      const exposure = ctx.cameraState.exposure ?? {};

      const view = `${clamped}`; // 应用层可映射为 "1/60" 等

      const newState: Partial<CameraState> = {
        exposure: {
          ...exposure,
          shutter: { value: clamped, view },
        },
      };

      return {
        newStatePartial: newState,
        cliRequest: {
          id: `exposure-shutter-${Date.now()}`,
          command: 'exposure.shutter',
          params: { value: clamped },
        },
      };
    },
  },
  {
    id: 'exposure.setIso',
    cliCommand: 'exposure.iso',
    async handler(ctx: OperationContext, payload: OperationPayload): Promise<OperationResult> {
      const value = Number(payload.value ?? 0);
      const clamped = Number.isFinite(value) ? Math.max(100, value) : 100;
      const exposure = ctx.cameraState.exposure ?? {};

      const view = String(clamped);

      const newState: Partial<CameraState> = {
        exposure: {
          ...exposure,
          iso: { value: clamped, view },
        },
      };

      return {
        newStatePartial: newState,
        cliRequest: {
          id: `exposure-iso-${Date.now()}`,
          command: 'exposure.iso',
          params: { value: clamped },
        },
      };
    },
  },
];

