// imageOperations.ts
// 图像调节相关 Operation 集合 (亮度/对比度/饱和度)

import type {
  CameraState,
  OperationContext,
  OperationPayload,
  OperationResult,
  OperationDefinition,
} from '../../framework/state/PageStore.js';

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
      const img = ctx.cameraState.image ?? {};
      const newState: Partial<CameraState> = {
        image: { ...img, brightness: v },
      };
      return {
        newStatePartial: newState,
        cliRequest: {
          id: `image-brightness-${Date.now()}`,
          command: 'image.brightness',
          params: { value: v },
        },
      };
    },
  },
  {
    id: 'image.setContrast',
    cliCommand: 'image.contrast',
    async handler(ctx: OperationContext, payload: OperationPayload): Promise<OperationResult> {
      const v = clamp01(Number(payload.value ?? 50));
      const img = ctx.cameraState.image ?? {};
      const newState: Partial<CameraState> = {
        image: { ...img, contrast: v },
      };
      return {
        newStatePartial: newState,
        cliRequest: {
          id: `image-contrast-${Date.now()}`,
          command: 'image.contrast',
          params: { value: v },
        },
      };
    },
  },
  {
    id: 'image.setSaturation',
    cliCommand: 'image.saturation',
    async handler(ctx: OperationContext, payload: OperationPayload): Promise<OperationResult> {
      const v = clamp01(Number(payload.value ?? 50));
      const img = ctx.cameraState.image ?? {};
      const newState: Partial<CameraState> = {
        image: { ...img, saturation: v },
      };
      return {
        newStatePartial: newState,
        cliRequest: {
          id: `image-saturation-${Date.now()}`,
          command: 'image.saturation',
          params: { value: v },
        },
      };
    },
  },
];

