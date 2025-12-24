// ptzOperations.ts
// ZCAM PTZ 相关 Operation 的最小骨架

import type { CliRequest, OperationContext, OperationPayload, OperationResult, OperationDefinition } from '../../framework/state/PageStore.js';
import { buildUvcCliRequest } from './uvcCliRequest.js';

type PtzDirection =
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'up-left'
  | 'up-right'
  | 'down-left'
  | 'down-right';

export const PTZ_PAN_RANGE = { min: -180, max: 180 };
export const PTZ_TILT_RANGE = { min: -90, max: 90 };
export const PTZ_ZOOM_RANGE = { min: 950, max: 17100 };
export const PTZ_FOCUS_RANGE = { min: 0, max: 1000 };

const PTZ_DIRECTION_DELTAS: Record<PtzDirection, { pan?: number; tilt?: number }> = {
  up: { tilt: 1 },
  down: { tilt: -1 },
  left: { pan: -1 },
  right: { pan: 1 },
  'up-left': { pan: -1, tilt: 1 },
  'up-right': { pan: 1, tilt: 1 },
  'down-left': { pan: -1, tilt: -1 },
  'down-right': { pan: 1, tilt: -1 },
};

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function deriveStep(ctx: OperationContext, payload: OperationPayload): number {
  const explicit = Number(payload.value);
  if (Number.isFinite(explicit) && explicit > 0) {
    return explicit;
  }
  const speed = ctx.cameraState.ptz?.speed?.value ?? 50;
  const normalized = clamp(speed, 1, 100);
  return Math.max(1, Math.round((normalized / 100) * 20));
}

// 根据当前 CameraState 和 payload 生成新的 PTZ 子树
export const ptzOperations: OperationDefinition[] = [
  {
    id: 'ptz.setZoom',
    cliCommand: 'ptz.zoom',
    async handler(ctx: OperationContext, payload: OperationPayload): Promise<OperationResult> {
      const value = Number(payload.value ?? 0);
      const clamped = clamp(value, PTZ_ZOOM_RANGE.min, PTZ_ZOOM_RANGE.max);

      return {
        cliRequest: buildUvcCliRequest('zoom', clamped, { meta: extractSliderMeta(payload) }),
      };
    },
  },
  {
    id: 'ptz.setSpeed',
    cliCommand: 'ptz.speed',
    async handler(ctx: OperationContext, payload: OperationPayload): Promise<OperationResult> {
      const value = Number(payload.value ?? 0);
      const clamped = clamp(value, PTZ_FOCUS_RANGE.min, PTZ_FOCUS_RANGE.max);

      return {
        cliRequest: buildUvcCliRequest('speed', clamped, { meta: extractSliderMeta(payload) }),
      };
    },
  },
  {
    id: 'ptz.setFocus',
    cliCommand: 'ptz.focus',
    async handler(ctx: OperationContext, payload: OperationPayload): Promise<OperationResult> {
      const value = Number(payload.value ?? 0);
      const clamped = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;

      return {
        cliRequest: buildUvcCliRequest('focus', clamped, { meta: extractSliderMeta(payload) }),
      };
    },
  },
  {
    id: 'ptz.setPan',
    cliCommand: 'ptz.pan',
    async handler(ctx: OperationContext, payload: OperationPayload): Promise<OperationResult> {
      const value = Number(payload.value ?? 0);
      const clamped = clamp(value, PTZ_PAN_RANGE.min, PTZ_PAN_RANGE.max);
      return {
        cliRequest: buildUvcCliRequest('pan', clamped, { meta: extractSliderMeta(payload) }),
      };
    },
  },
  {
    id: 'ptz.setTilt',
    cliCommand: 'ptz.tilt',
    async handler(ctx: OperationContext, payload: OperationPayload): Promise<OperationResult> {
      const value = Number(payload.value ?? 0);
      const clamped = clamp(value, PTZ_TILT_RANGE.min, PTZ_TILT_RANGE.max);
      return {
        cliRequest: buildUvcCliRequest('tilt', clamped, { meta: extractSliderMeta(payload) }),
      };
    },
  },
  {
    id: 'ptz.nudge',
    cliCommand: 'ptz.nudge',
    async handler(ctx: OperationContext, payload: OperationPayload): Promise<OperationResult> {
      const directionSource = payload.params ? (payload.params['direction'] as string | undefined) : undefined;
      const directionRaw =
        (typeof directionSource === 'string' && directionSource) ||
        (typeof payload.value === 'string' ? payload.value : '');
      const direction = directionRaw.toLowerCase() as PtzDirection;
      const delta = PTZ_DIRECTION_DELTAS[direction];
      if (!delta) {
        return {};
      }
      const requests: CliRequest[] = [];
      const step = deriveStep(ctx, payload);

      if (typeof delta.pan === 'number' && delta.pan !== 0) {
        const currentPan = ctx.cameraState.ptz?.pan?.value ?? 0;
        const nextPan = clamp(currentPan + delta.pan * step, PTZ_PAN_RANGE.min, PTZ_PAN_RANGE.max);
        if (nextPan !== currentPan) {
          requests.push(buildUvcCliRequest('pan', nextPan, { meta: extractSliderMeta(payload) }));
        }
      }

      if (typeof delta.tilt === 'number' && delta.tilt !== 0) {
        const currentTilt = ctx.cameraState.ptz?.tilt?.value ?? 0;
        const nextTilt = clamp(currentTilt + delta.tilt * step, PTZ_TILT_RANGE.min, PTZ_TILT_RANGE.max);
        if (nextTilt !== currentTilt) {
          requests.push(buildUvcCliRequest('tilt', nextTilt, { meta: extractSliderMeta(payload) }));
        }
      }

      return {
        cliRequests: requests,
      };
    },
  },
];

function extractSliderMeta(payload: OperationPayload): Record<string, unknown> | undefined {
  const rawMeta = (payload.params as Record<string, unknown> | undefined)?.['sliderMeta'];
  if (!rawMeta || typeof rawMeta !== 'object') {
    return undefined;
  }
  return rawMeta as Record<string, unknown>;
}
