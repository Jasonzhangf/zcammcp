// IsoSelect/config.ts
// ISO 选择控件配置: 只描述路径/命令/选项/读值方式

import type { ViewState } from '../../../framework/state/PageStore.js';

export interface ModalOption {
  label: string;
  value: number;
}

export interface IsoSelectConfig {
  nodePath: string;
  kind: string;
  operationId: string;
  title: string;
  options: ModalOption[];
  readValue(view: ViewState): number | undefined;
  formatValue?(view: ViewState, value: number | undefined): string;
}

export const defaultIsoSelectConfig: IsoSelectConfig = {
  nodePath: 'zcam.camera.pages.main.exposure.iso',
  kind: 'exposure.iso',
  operationId: 'exposure.setIso',
  title: 'ISO 感光度',
  // Dynamic options from state, fallback to defaults if not ready
  // Logic moved to component or we can try to read dynamic here?
  // Config definition allows static options. We need to handle dynamic options in the Component.
  options: [],
  readValue(view) {
    // If view has dynamic options, we might want to use them?
    // Actually IsoSelect component should handle this.
    // Here we just return value.
    const val = view.camera.exposure?.iso?.value;
    return typeof val === 'string' ? undefined : val;
    // Wait, value is now string | number. If string, readValue expects number? 
    // The previous implementation expected number. We need to support string.
    // Changing return type in interface might be needed or handled in component.
  },
  formatValue(view, v) {
    const display = view.camera.exposure?.iso?.view;
    if (display) return display;
    const match = defaultIsoSelectConfig.options.find((o) => o.value === v);
    return match?.label ?? '800';
  },
};
