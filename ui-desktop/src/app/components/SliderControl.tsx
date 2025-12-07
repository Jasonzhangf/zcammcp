import React, { useEffect, useRef } from 'react';
import type { SliderControlConfig } from '../framework/ui/ControlConfig.js';
import { usePageStore, useViewState } from '../hooks/usePageStore.js';
import { SliderControlBase } from '../framework/ui/controls/SliderControl.js';
import { DevChannelImpl } from '../framework/ui/DevChannelImpl.js';

export interface SliderControlProps {
  config: SliderControlConfig;
  disabled?: boolean;
}

export const SliderControl: React.FC<SliderControlProps> = ({ config, disabled = false }) => {
  const store = usePageStore();
  const view = useViewState();
  const containerRef = useRef<HTMLDivElement>(null);
  const controlRef = useRef<SliderControlBase | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const dev = new DevChannelImpl();
    const control = new SliderControlBase(config, store, view, dev, disabled);
    controlRef.current = control;
    control.mountTo(containerRef.current);
    return () => {
      control.destroy();
      controlRef.current = null;
    };
  }, [config, store, view, disabled]);

  useEffect(() => {
    controlRef.current?.callUpdate();
  }, [view]);

  return <div ref={containerRef} />;
};
