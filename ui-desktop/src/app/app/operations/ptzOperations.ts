// ptzOperations.ts
// ZCAM PTZ 相关 Operation 的最小骨架

import type {
  CameraState,
  OperationContext,
  OperationPayload,
  OperationResult,
  OperationDefinition,
} from '../../framework/state/PageStore.js';

// 根据当前 CameraState 和 payload 生成新的 PTZ 子树
export const ptzOperations: OperationDefinition[] = [
  {
    id: 'ptz.setZoom',
    cliCommand: 'ptz.zoom',
    async handler(ctx: OperationContext, payload: OperationPayload): Promise<OperationResult> {
      const value = Number(payload.value ?? 0);
      const clamped = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;

      const newState: Partial<CameraState> = {
        ptz: {
          ...ctx.cameraState.ptz,
          zoom: { value: clamped, view: String(clamped) },
        },
      };

      return {
        newStatePartial: newState,
        cliRequest: {
          id: `ptz-zoom-${Date.now()}`,
          command: 'ptz.zoom',
          params: { value: clamped },
        },
      };
    },
  },
  {
    id: 'ptz.setSpeed',
    cliCommand: 'ptz.speed',
    async handler(ctx: OperationContext, payload: OperationPayload): Promise<OperationResult> {
      const value = Number(payload.value ?? 0);
      const clamped = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;

      const newState: Partial<CameraState> = {
        ptz: {
          ...ctx.cameraState.ptz,
          speed: { value: clamped, view: String(clamped) },
        },
      };

      return {
        newStatePartial: newState,
        cliRequest: {
          id: `ptz-speed-${Date.now()}`,
          command: 'ptz.speed',
          params: { value: clamped },
        },
      };
    },
  },
  {
    id: 'ptz.setFocus',
    cliCommand: 'ptz.focus',
    async handler(ctx: OperationContext, payload: OperationPayload): Promise<OperationResult> {
      const value = Number(payload.value ?? 0);
      const clamped = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;

      const newState: Partial<CameraState> = {
        ptz: {
          ...ctx.cameraState.ptz,
          focus: { value: clamped, view: String(clamped) },
        },
      };

      return {
        newStatePartial: newState,
        cliRequest: {
          id: `ptz-focus-${Date.now()}`,
          command: 'ptz.focus',
          params: { value: clamped },
        },
      };
    },
  },
];
