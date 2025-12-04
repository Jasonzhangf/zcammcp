// ShutterSelect/config.ts
// 快门选择控件配置: 只描述路径/命令/选项/读值方式

import type { ViewState } from '../../../framework/state/PageStore.js';

export interface ModalOption {
  label: string;
  value: number;
}

export interface ShutterSelectConfig {
  nodePath: string;     // e.g. 'zcam.camera.pages.main.exposure.shutter'
  kind: string;         // e.g. 'exposure.shutter'
  operationId: string;  // e.g. 'exposure.setShutter'
  title: string;        // 模态标题
  options: ModalOption[];
  readValue(view: ViewState): number | undefined;
  formatValue?(view: ViewState, value: number | undefined): string;
}

export const defaultShutterSelectConfig: ShutterSelectConfig = {
  nodePath: 'zcam.camera.pages.main.exposure.shutter',
  kind: 'exposure.shutter',
  operationId: 'exposure.setShutter',
  title: '快门速度',
  options: [30, 40, 50, 60, 80, 100, 120, 160, 200, 250, 320, 500].map((v) => ({
    label: `1/${v}`,
    value: v,
  })),
  readValue(view) {
    return view.camera.exposure?.shutter?.value;
  },
  formatValue(view, v) {
    // 优先使用 cameraState 中已有的 view 文本, 回退到选项 label
    const display = view.camera.exposure?.shutter?.view;
    if (display) return display;
    const match = defaultShutterSelectConfig.options.find((o) => o.value === v);
    return match?.label ?? '1/60';
  },
};
