import type { ViewState } from '../../state/PageStore.js';

export type SliderSize = 'small' | 'medium' | 'large';

export type ControlKind = 'slider' | 'toggle' | 'modal';

export interface BaseControlProps {
  nodePath: string;
  kind: string;
  label?: string;
  operationId: string;
}

export interface SliderProps extends BaseControlProps {
  type: 'slider';
  orientation?: 'horizontal' | 'vertical';
  size?: SliderSize;
  valueRange: { min: number; max: number; step?: number };
  readValue(view: ViewState): number;
  formatValue?(value: number): string;
}

export interface ToggleProps extends BaseControlProps {
  type: 'toggle';
  readValue(view: ViewState): boolean;
}

export interface ModalSelectOption {
  label: string;
  value: number | string;
}

export interface ModalSelectProps extends BaseControlProps {
  type: 'modal';
  title: string;
  options: ModalSelectOption[];
  readValue(view: ViewState): number | string | undefined;
  formatValue?(view: ViewState, value: number | string | undefined): string;
}

export type ControlProps = SliderProps | ToggleProps | ModalSelectProps;
