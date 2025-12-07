import { BaseControl, type DevChannel } from '../BaseControl.js';
import type { ModalSelectProps } from './types.js';
import type { PageStore, ViewState } from '../../state/PageStore.js';

export class ModalSelectControlBase extends BaseControl {
  private btn: HTMLButtonElement | null = null;
  private modal: HTMLElement | null = null;
  private parent: HTMLElement | null = null;
  private open = false;

  constructor(
    private props: ModalSelectProps,
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
    return this.btn!;
  }

  mount(parent: HTMLElement): void {
    this.parent = parent;
    this.btn = document.createElement('button');
    this.btn.type = 'button';
    this.btn.className = 'zcam-grid-trigger';
    this.btn.setAttribute('data-path', this.props.nodePath);
    this.btn.textContent = this.getDisplayValue();
    this.btn.addEventListener('click', () => this.openModal());

    parent.appendChild(this.btn);
  }

  update(): void {
    if (!this.btn) return;
    this.btn.textContent = this.getDisplayValue();
  }

  unmount(): void {
    this.btn?.removeEventListener('click', this.openModal);
    this.btn?.remove();
    this.modal?.remove();
    this.btn = null;
    this.modal = null;
    this.parent = null;
  }

  private getDisplayValue(): string {
    const v = this.props.readValue(this.view);
    if (this.props.formatValue) return this.props.formatValue(this.view, v);
    const match = this.props.options.find((o) => o.value === v);
    return match ? String(match.label) : String(v);
  }

  private openModal() {
    this.wrapInteraction('openModal', () => {
      this.open = true;
      this.renderModal();
    });
  }

  private renderModal() {
    if (!this.open || !this.parent) return;
    if (this.modal) this.modal.remove();
    const modal = document.createElement('div');
    modal.className = 'zcam-modal-overlay';
    modal.style.position = 'absolute';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.zIndex = '9999';
    modal.style.background = 'rgba(0,0,0,0.6)';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';

    const inner = document.createElement('div');
    inner.className = 'zcam-modal';
    inner.style.background = '#1a1a1a';
    inner.style.padding = '16px';
    inner.style.borderRadius = '8px';
    inner.style.minWidth = '240px';

    const title = document.createElement('div');
    title.textContent = this.props.title;
    title.style.fontWeight = 'bold';
    title.style.marginBottom = '12px';

    const optionGrid = document.createElement('div');
    optionGrid.className = 'zcam-option-grid';
    optionGrid.style.display = 'grid';
    optionGrid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(64px, 1fr))';
    optionGrid.style.gap = '8px';

    this.props.options.forEach((opt) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'zcam-chip';
      btn.textContent = opt.label;
      if (opt.value === this.props.readValue(this.view)) {
        btn.style.background = '#0078d4';
        btn.style.color = 'white';
      }
      btn.addEventListener('click', () => this.handleSelect(opt.value));
      optionGrid.appendChild(btn);
    });

    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = '×';
    close.style.position = 'absolute';
    close.style.top = '8px';
    close.style.right = '8px';
    close.style.background = 'transparent';
    close.style.border = 'none';
    close.style.color = '#ccc';
    close.style.fontSize = '18px';
    close.addEventListener('click', () => this.closeModal());

    inner.style.position = 'relative';
    inner.append(close, title, optionGrid);
    modal.append(inner);
    this.parent.appendChild(modal);
    this.modal = modal;
  }

  private async handleSelect(value: any) {
    await this.wrapInteractionAsync('select', async () => {
      await this.store.runOperation(this.props.nodePath, this.props.kind, this.props.operationId, { value });
      this.closeModal();
      this.update();
    });
  }

  private closeModal() {
    this.open = false;
    this.modal?.remove();
    this.modal = null;
  }
}
