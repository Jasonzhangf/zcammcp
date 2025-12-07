// IsoSelect.tsx
// 独立 ISO 选择控件模块: 使用 CoreModal + PageStore + BaseControl

import React, { useEffect, useRef } from 'react';
import { usePageStore, useViewState } from '../../../hooks/usePageStore.js';
import { defaultIsoSelectConfig, type IsoSelectConfig } from './config.js';
import { DevChannelImpl } from '../../../framework/ui/DevChannelImpl.js';
import { ModalSelectControlBase } from '../../../framework/ui/controls/ModalSelectControl.js';

export interface IsoSelectProps {
  config?: IsoSelectConfig;
}

export const IsoSelect: React.FC<IsoSelectProps> = ({ config }) => {
  const cfg = config ?? defaultIsoSelectConfig;
  const store = usePageStore();
  const view = useViewState();
  const containerRef = useRef<HTMLDivElement>(null);
  const controlRef = useRef<ModalSelectControlBase | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const dev = new DevChannelImpl();
    // 将 ISO 配置映射为 ModalSelectProps
    const modalProps = {
      type: 'modal' as const,
      nodePath: cfg.nodePath,
      kind: cfg.kind,
      operationId: cfg.operationId,
      title: cfg.title,
      options: cfg.options,
      readValue: cfg.readValue,
      formatValue: cfg.formatValue,
    };
    const control = new ModalSelectControlBase(modalProps, store, view, dev);
    controlRef.current = control;
    control.mountTo(containerRef.current);
    return () => {
      control.destroy();
      controlRef.current = null;
    };
  }, [cfg, store, view]);

  useEffect(() => {
    controlRef.current?.callUpdate();
  }, [view]);

  return <div ref={containerRef} />;
};
