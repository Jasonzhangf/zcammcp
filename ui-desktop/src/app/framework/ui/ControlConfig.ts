// ControlConfig.ts
// 通用控件配置模型: 用配置描述控件的类型、数据映射和操作, 渲染层根据配置统一跑

import type { ViewState } from '../state/PageStore.js';

export type SliderSize = 'small' | 'medium' | 'large';

export type ControlType = 'slider'; // 后续扩展: 'toggle' | 'button' | 'grid' 等

// 所有控件配置的基类: 公共的路径/种类/标签/操作描述
export interface BaseControlConfig {
  type: ControlType;
  nodePath: string; // 容器路径, 例如 zcam.camera.pages.main.ptz.zoom
  kind: string;     // 功能种类, 例如 ptz.zoom
  label: string;
  /** 写操作的标识, 由 OperationRegistry 注册 */
  operationId: string;
}

export interface SliderControlConfig extends BaseControlConfig {
  type: 'slider';
  /** 垂直 / 水平布局, 像 PTZ Zoom/Speed 用垂直, Focus/曝光等用水平 */
  orientation?: 'vertical' | 'horizontal';
  size?: SliderSize;
  valueRange: { min: number; max: number; step?: number };
  /** 从 ViewState 中读出当前 slider 的数值 */
  readValue(view: ViewState): number;
  /** 可选: 显示用的文本, 不提供时直接用数值 */
  formatValue?(v: number): string;
}

export type ControlConfig = SliderControlConfig; // union 的起点
