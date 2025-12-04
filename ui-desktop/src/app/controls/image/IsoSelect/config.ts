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
  options: [100, 200, 400, 800, 1600, 3200, 6400, 12800].map((v) => ({
    label: String(v),
    value: v,
  })),
  readValue(view) {
    return view.camera.exposure?.iso?.value;
  },
  formatValue(view, v) {
    const display = view.camera.exposure?.iso?.view;
    if (display) return display;
    const match = defaultIsoSelectConfig.options.find((o) => o.value === v);
    return match?.label ?? '800';
  },
};
