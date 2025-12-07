import React, { useEffect, useRef } from 'react';
import type { ToggleControlConfig } from '../framework/ui/ControlConfig.js';
import { usePageStore, useViewState } from '../hooks/usePageStore.js';
import { ToggleControlBase } from '../framework/ui/controls/ToggleControl.js';
import { DevChannelImpl } from '../framework/ui/DevChannelImpl.js';

interface ToggleControlProps {
  config: ToggleControlConfig;
}

export const ToggleControl: React.FC<ToggleControlProps> = ({ config }) => {
  const store = usePageStore();
  const view = useViewState();
  const containerRef = useRef<HTMLDivElement>(null);
  const controlRef = useRef<ToggleControlBase | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const dev = new DevChannelImpl();
    const control = new ToggleControlBase(config, store, view, dev);
    controlRef.current = control;
    control.mountTo(containerRef.current);
    return () => {
      control.destroy();
      controlRef.current = null;
    };
  }, [config, store, view]);

  useEffect(() => {
    controlRef.current?.callUpdate();
  }, [view]);

  return <div ref={containerRef} />;
};
