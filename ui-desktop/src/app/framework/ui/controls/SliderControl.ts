/**
 * SliderControl 基类，继承 BaseControl
 * 负责纯 DOM 渲染/交互 + Dev 上报
 */

import { BaseControl, type DevChannel } from '../BaseControl.js';
import type { SliderProps } from './types.js';
import type { PageStore, ViewState } from '../../state/PageStore.js';

export class SliderControlBase extends BaseControl {
  private input: HTMLInputElement | null = null;
  private container: HTMLElement | null = null;
  private parent: HTMLElement | null = null;
  private disabled = false;

  constructor(
    private props: SliderProps,
    private store: PageStore,
    private view: ViewState,
    dev?: DevChannel,
    disabled = false
  ) {
    super(dev);
    this.disabled = disabled;
  }

  getId(): string {
    return this.props.nodePath;
  }

  getView(): HTMLElement {
    return this.container!;
  }

  mount(parent: HTMLElement): void {
    this.parent = parent;
    const { nodePath, label, orientation = 'vertical', size = 'medium', valueRange } = this.props;

    // 外层容器
    const wrap = document.createElement('div');
    wrap.className = `zcam-ptz-slider-wrap zcam-slider-size-${size} zcam-slider-orientation-${orientation}`;
    wrap.setAttribute('data-path', nodePath);

    // label
    const labelEl = document.createElement('span');
    labelEl.className = 'zcam-ptz-slider-label';
    labelEl.textContent = label ?? '';

    // input
    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(valueRange.min);
    input.max = String(valueRange.max);
    input.step = String(valueRange.step ?? 1);
    input.value = String(this.props.readValue(this.view));
    input.addEventListener('input', (e) => this.onInput(e));
    input.addEventListener('wheel', (e) => this.onWheel(e));
    input.disabled = this.disabled;

    // value 显示
    const valueEl = document.createElement('span');
    valueEl.className = 'zcam-ptz-slider-value';
    valueEl.textContent = this.getDisplayValue();

    wrap.append(labelEl, input, valueEl);
    parent.appendChild(wrap);

    this.container = wrap;
    this.input = input;
  }

  update(): void {
    if (!this.input) return;
    const v = this.props.readValue(this.view);
    this.input.value = String(v);
    // 同步显示
    const display = this.container!.querySelector('.zcam-ptz-slider-value') as HTMLElement;
    if (display) display.textContent = this.getDisplayValue();
  }

  unmount(): void {
    this.container?.remove();
    this.input = null;
    this.container = null;
    this.parent = null;
  }

  private getDisplayValue(): string {
    const v = this.props.readValue(this.view);
    return this.props.formatValue ? this.props.formatValue(v) : String(v);
  }

 private onInput(e: Event) {
    if (this.disabled) return;
    this.wrapInteraction('input', () => {
      const val = Number((e.target as HTMLInputElement).value);
      this.store.runOperation(this.props.nodePath, this.props.kind, this.props.operationId, { value: val });
      // 更新显示
      const display = this.container!.querySelector('.zcam-ptz-slider-value') as HTMLElement;
      if (display) display.textContent = this.getDisplayValue();
    });
  }

  private onWheel(e: WheelEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (this.disabled) return;
    this.wrapInteraction('wheel', () => {
      const step = this.props.valueRange.step ?? 1;
      const delta = e.deltaY > 0 ? -step : step;
      const cur = this.props.readValue(this.view);
      const next = Math.max(this.props.valueRange.min, Math.min(this.props.valueRange.max, cur + delta));
      if (next !== cur) {
        this.store.runOperation(this.props.nodePath, this.props.kind, this.props.operationId, { value: next });
        if (this.input) this.input.value = String(next);
        const display = this.container!.querySelector('.zcam-ptz-slider-value') as HTMLElement;
        if (display) display.textContent = this.getDisplayValue();
      }
    });
  }
}
