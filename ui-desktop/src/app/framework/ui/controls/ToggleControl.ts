import { BaseControl, type DevChannel } from '../BaseControl.js';
import type { ToggleProps } from './types.js';
import type { PageStore, ViewState } from '../../state/PageStore.js';

export class ToggleControlBase extends BaseControl {
  private container: HTMLElement | null = null;
  private button: HTMLButtonElement | null = null;
  private labelEl: HTMLElement | null = null;

  constructor(
    private props: ToggleProps,
    private store: PageStore,
    private view: ViewState,
    dev?: DevChannel
  ) {
    super(dev);
  }

  getId(): string {
    return this.props.nodePath;
  }

  getView(): HTMLElement {
    return this.container!;
  }

  mount(parent: HTMLElement): void {
    const wrap = document.createElement('div');
    wrap.className = 'zcam-field-row';
    wrap.setAttribute('data-path', this.props.nodePath);

    const label = document.createElement('label');
    label.textContent = this.props.label ?? '';

    const toggleGroup = document.createElement('div');
    toggleGroup.className = 'zcam-toggle-group';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'zcam-toggle';
    btn.addEventListener('click', () => this.handleToggle());

    const knob = document.createElement('span');
    knob.className = 'zcam-toggle-knob';
    btn.appendChild(knob);

    const stateLabel = document.createElement('span');

    toggleGroup.append(btn, stateLabel);
    wrap.append(label, toggleGroup);
    parent.appendChild(wrap);

    this.container = wrap;
    this.button = btn;
    this.labelEl = stateLabel;
    this.updateClasses();
  }

  update(): void {
    this.updateClasses();
  }

  unmount(): void {
    this.container?.remove();
    this.container = null;
    this.button = null;
    this.labelEl = null;
  }

  private updateClasses() {
    if (!this.button || !this.labelEl) return;
    const value = this.props.readValue(this.view);
    this.button.className = `zcam-toggle ${value ? 'zcam-toggle-on' : 'zcam-toggle-off'}`;
    this.labelEl.className = value ? 'zcam-toggle-label-on' : 'zcam-toggle-label-off';
    this.labelEl.textContent = value ? 'ON' : 'OFF';
  }

  private handleToggle() {
    this.wrapInteractionAsync('toggle', async () => {
      const next = !this.props.readValue(this.view);
      await this.store.runOperation(this.props.nodePath, this.props.kind, this.props.operationId, { value: next });
      this.updateClasses();
    });
  }
}
