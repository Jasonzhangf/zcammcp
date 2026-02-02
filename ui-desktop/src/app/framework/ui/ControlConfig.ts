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

  // New: +/- button operation configs
  incrementOperation?: {
    onPress: string;    // operation ID on button press
    onRelease: string;  // operation ID on button release
  };
  decrementOperation?: {
    onPress: string;
    onRelease: string;
  };

  // New: disable optimistic UI for button operations
  // When true, button operations will immediately sync with backend values
  // instead of using optimistic UI + 10s timeout
  buttonOperationsDisableOptimistic?: boolean;

  // New: visually invert the slider progress bar (100% -> 0%)
  // Useful when Min value corresponds to "Full" or "Far" conceptually, or vice versa
  displayInverted?: boolean;
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


