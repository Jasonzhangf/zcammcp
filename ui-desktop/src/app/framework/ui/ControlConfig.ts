import type { ViewState } from '../state/PageStore.js';

export type SliderOrientation = 'vertical' | 'horizontal';
export type SliderSize = 'small' | 'medium' | 'large';

export interface SliderControlConfig {
  nodePath: string;
  kind: string;
  label: string;
  operationId?: string;
  valueRange: {
    min: number;
    max: number;
    step?: number;
  };
  orientation?: SliderOrientation;
  size?: SliderSize;
  enablePointerDrag?: boolean;
  minHoldStep?: number;
  focusGroupId?: string;
  hideHeaderValue?: boolean;
  keyBindings?: string[];
  keyInputMode?: 'focus' | 'global';
  keyAcceptWhenBlurred?: boolean;
  readValue?: (view: ViewState) => number;
  readValueRange?: (view: ViewState) => { min: number; max: number; step: number };
  formatValue?: (value: number, range?: { min: number; max: number; step: number }) => string;
  valueMapper?: {
    toDisplay?(value: number): number;
    toActual?(value: number): number;
  };
  profileKey?: string;
  onValueChange?: (value: number, store: any) => void;
}

export interface ToggleControlConfig {
  nodePath: string;
  kind: string;
  label?: string;
  operationId: string;
  readValue(view: ViewState): boolean;
  trueLabel?: string;
  falseLabel?: string;
}


