// whiteBalanceOperations.ts
// 白平衡相关 Operation 集合 (AWB / 色温)

import type {
  CameraState,
  OperationContext,
  OperationPayload,
  OperationResult,
  OperationDefinition,
} from '../../framework/state/PageStore.js';

export const whiteBalanceOperations: OperationDefinition[] = [
  {
    id: 'whiteBalance.setAwbEnabled',
    cliCommand: 'wb.awb',
    async handler(ctx: OperationContext, payload: OperationPayload): Promise<OperationResult> {
      const enabled = Boolean(payload.value);
      const wb = ctx.cameraState.whiteBalance ?? {};

      const newState: Partial<CameraState> = {
        whiteBalance: {
          ...wb,
          awbEnabled: enabled,
        },
      };

      return {
        newStatePartial: newState,
        cliRequest: {
          id: `wb-awb-${Date.now()}`,
          command: 'wb.awb',
          params: { enabled },
        },
      };
    },
  },
  {
    id: 'whiteBalance.setTemperature',
    cliCommand: 'wb.temperature',
    async handler(ctx: OperationContext, payload: OperationPayload): Promise<OperationResult> {
      const value = Number(payload.value ?? 3200);
      const clamped = Number.isFinite(value) ? Math.max(2000, Math.min(10000, value)) : 5600;
      const wb = ctx.cameraState.whiteBalance ?? {};

      const newState: Partial<CameraState> = {
        whiteBalance: {
          ...wb,
          temperature: { value: clamped, view: `${clamped}K` },
        },
      };

      return {
        newStatePartial: newState,
        cliRequest: {
          id: `wb-temp-${Date.now()}`,
          command: 'wb.temperature',
          params: { value: clamped },
        },
      };
    },
  },
];

