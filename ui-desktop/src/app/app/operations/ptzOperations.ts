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

// Simple Serializer to ensure order and drop intermediate frames
class PtzRequestManager {
  private currentPromise: Promise<void> = Promise.resolve();
  private pendingMove: { p: string; t: string } | null = null;
  private stopRequested = false;

  scheduleMove(pStr: string, tStr: string) {
    this.pendingMove = { p: pStr, t: tStr };
    this.stopRequested = false; // Move cancels stop (if before) - actually stop overrides move usually. 
    // But if user drags (move), then releases (stop)...
    // We strictly want Stop to be processed AFTER moves.
    this.process();
  }

  scheduleStop() {
    this.stopRequested = true;
    this.pendingMove = null; // Clean any pending move, we are stopping.
    this.process();
  }

  private process() {
    this.currentPromise = this.currentPromise.then(async () => {
      // Check what to do next
      if (this.stopRequested) {
        // Send STOP
        this.stopRequested = false; // consume
        try {
          // http://127.0.0.1:17988/ctrl/pt?action=stop
          await fetch('http://127.0.0.1:17988/ctrl/pt?action=stop');
        } catch (e) { console.error('PTZ Stop Error', e); }
        return;
      }

      if (this.pendingMove) {
        const { p, t } = this.pendingMove;
        this.pendingMove = null; // consume
        try {
          const url = `http://127.0.0.1:17988/ctrl/pt?action=pt&pan_speed=${p}&tilt_speed=${t}`;
          await fetch(url);
        } catch (e) { console.error('PTZ Move Error', e); }
      }
    }).catch(() => { });
  }
}

const ptzManager = new PtzRequestManager();


// export const PTZ_PAN_RANGE = { min: -180, max: 180 };
// export const PTZ_TILT_RANGE = { min: -90, max: 90 };

export const PTZ_PAN_RANGE = { min: -17500, max: 17500 };
export const PTZ_TILT_RANGE = { min: -3000, max: 21000 };
export const PTZ_ZOOM_RANGE = { min: 0, max: 4528 };
export const PTZ_FOCUS_RANGE = { min: -5040, max: -1196 };

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
  const speed = ctx.uiState.ptSpeed ?? 50;
  const normalized = clamp(speed, 1, 100);
  return Math.max(1, Math.round((normalized / 100) * 20));
}

// 根据当前 CameraState 和 payload 生成新的 PTZ 子树
// 根据当前 CameraState 和 payload 生成新的 PTZ 子树
export const ptzOperations: OperationDefinition[] = [
  {
    id: 'ptz.setZoom',
    cliCommand: 'ptz.zoom',
    async handler(ctx: OperationContext, payload: OperationPayload): Promise<OperationResult> {
      const value = Number(payload.value ?? 0);
      const clamped = clamp(value, PTZ_ZOOM_RANGE.min, PTZ_ZOOM_RANGE.max);

      // Map to: zcam control zoom pos <value>
      return {
        cliRequest: {
          id: `ptz.zoom.${Date.now()}`,
          command: 'control',
          args: ['control', 'zoom', 'pos', String(clamped)],
          params: {
            // Pass slider metadata to help store reconcile optimistic updates if needed
            ...(extractSliderMeta(payload) ? { sliderMeta: extractSliderMeta(payload) } : {})
          }
        }
      };
    },
  },
  {
    id: 'ptz.setFocus',
    cliCommand: 'ptz.focus',
    async handler(ctx: OperationContext, payload: OperationPayload): Promise<OperationResult> {
      const value = Number(payload.value ?? 0);
      const clamped = clamp(value, PTZ_FOCUS_RANGE.min, PTZ_FOCUS_RANGE.max);

      return {
        cliRequest: buildUvcCliRequest('focus', clamped, { meta: extractSliderMeta(payload) }),
      };
    },
  },
  {
    id: 'ptz.focusNear',
    cliCommand: 'control.ptz.focusnear',
    async handler(ctx: OperationContext, payload: OperationPayload): Promise<OperationResult> {
      // Get fzSpeed from UI state (0-100) and normalize to 0.0-1.0
      const fzSpeed = ctx.uiState.fzSpeed ?? 50;
      const normalizedSpeed = Math.max(0.01, Math.min(1.0, fzSpeed / 100.0));

      return {
        cliRequest: {
          id: `ptz.focusNear.${Date.now()}`,
          command: 'control',
          args: ['control', 'ptz', 'focusnear', String(normalizedSpeed.toFixed(2))],
        }
      };
    },
  },
  {
    id: 'ptz.focusFar',
    cliCommand: 'control.ptz.focusfar',
    async handler(ctx: OperationContext, payload: OperationPayload): Promise<OperationResult> {
      // Get fzSpeed from UI state (0-100) and normalize to 0.0-1.0
      const fzSpeed = ctx.uiState.fzSpeed ?? 50;
      const normalizedSpeed = Math.max(0.01, Math.min(1.0, fzSpeed / 100.0));

      return {
        cliRequest: {
          id: `ptz.focusFar.${Date.now()}`,
          command: 'control',
          args: ['control', 'ptz', 'focusfar', String(normalizedSpeed.toFixed(2))],
        }
      };
    },
  },
  {
    id: 'ptz.focusStop',
    cliCommand: 'control.ptz.focusstop',
    async handler(ctx: OperationContext): Promise<OperationResult> {
      return {
        cliRequest: {
          id: `ptz.focusStop.${Date.now()}`,
          command: 'control',
          args: ['control', 'ptz', 'focusstop'],
        }
      };
    },
  },
  {
    id: 'lens.zoomIn',
    cliCommand: 'control.ptz.zoomin',
    async handler(ctx: OperationContext, payload: OperationPayload): Promise<OperationResult> {
      // Get fzSpeed from UI state and normalize to 0-1
      const fzSpeed = ctx.uiState.fzSpeed ?? 50;
      const normalizedSpeed = fzSpeed / 100;

      return {
        cliRequest: {
          id: `lens.zoomIn.${Date.now()}`,
          command: 'control',
          args: ['control', 'ptz', 'zoomin', normalizedSpeed.toString()],
        }
      };
    },
  },
  {
    id: 'lens.zoomOut',
    cliCommand: 'control.ptz.zoomout',
    async handler(ctx: OperationContext, payload: OperationPayload): Promise<OperationResult> {
      // Get fzSpeed from UI state and normalize to 0-1
      const fzSpeed = ctx.uiState.fzSpeed ?? 50;
      const normalizedSpeed = fzSpeed / 100;

      return {
        cliRequest: {
          id: `lens.zoomOut.${Date.now()}`,
          command: 'control',
          args: ['control', 'ptz', 'zoomout', normalizedSpeed.toString()],
        }
      };
    },
  },
  {
    id: 'lens.zoomStop',
    cliCommand: 'control.ptz.zoomstop',
    async handler(ctx: OperationContext): Promise<OperationResult> {
      return {
        cliRequest: {
          id: `lens.zoomStop.${Date.now()}`,
          command: 'control',
          args: ['control', 'ptz', 'zoomstop'],
        }
      };
    },
  },
  {
    id: 'ptz.move',
    cliCommand: 'control.ptz.move',
    async handler(ctx: OperationContext, payload: OperationPayload): Promise<OperationResult> {
      // payload: { params: { direction: 'left', speed: 0.5 } }
      const direction = payload.params?.['direction'] as string;
      const speed = payload.params?.['speed'] as number ?? 0.5;

      if (!direction) return {};

      return {
        cliRequest: {
          id: `ptz.move.${direction}.${Date.now()}`,
          command: 'control',
          args: ['control', 'ptz', 'move', direction, String(speed)]
        }
      };
    },
  },
  {
    id: 'ptz.move_analog',
    cliCommand: 'control.ptz.move_analog',
    async handler(ctx: OperationContext, payload: OperationPayload): Promise<OperationResult> {
      const pan = Number(payload.params?.['pan'] ?? 0);
      const tilt = Number(payload.params?.['tilt'] ?? 0);

      const pStr = pan.toFixed(3);
      const tStr = tilt.toFixed(3);

      // Version 1: CLI Command
      /*
      return {
        cliRequest: {
          id: `ptz.move_analog.${Date.now()}`,
          command: 'control',
          args: ['control', 'ptz', 'analog', pStr, tStr]
        }
      };
      */

      // Version 2: Direct HTTP Request via Serializer
      ptzManager.scheduleMove(pStr, tStr);
      return {};
    },
  },
  {
    id: 'ptz.stop',
    cliCommand: 'control.ptz.stop',
    async handler(ctx: OperationContext): Promise<OperationResult> {
      return {
        cliRequest: {
          id: `ptz.stop.${Date.now()}`,
          command: 'control',
          args: ['control', 'ptz', 'stop']
        }
      };
    },
  },
  {
    id: 'ptz.home',
    cliCommand: 'control.ptz.home',
    async handler(ctx: OperationContext): Promise<OperationResult> {
      return {
        cliRequest: {
          id: `ptz.home.${Date.now()}`,
          command: 'control',
          args: ['control', 'ptz', 'home']
        }
      };
    },
  },
  // Deprecated coordinate-based operations kept if needed by other components, but effectively unused by new D-Pad
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
];

function extractSliderMeta(payload: OperationPayload): Record<string, unknown> | undefined {
  const rawMeta = (payload.params as Record<string, unknown> | undefined)?.['sliderMeta'];
  if (!rawMeta || typeof rawMeta !== 'object') {
    return undefined;
  }
  return rawMeta as Record<string, unknown>;
}
