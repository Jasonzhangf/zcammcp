import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import type {
  ContainerBounds,
  ContainerKind,
  ContainerPatch,
} from '../framework/state/ContainerStore.js';
import { useContainerState, useContainerStore } from '../hooks/useContainerStore.js';
import { useContainerResizeFlag } from '../hooks/useContainerResizeFlag.js';

export interface ContainerHostProps extends React.HTMLAttributes<HTMLDivElement> {
  id: string;
  parentId?: string;
  kind: ContainerKind;
  defaultBounds?: ContainerBounds;
  data?: Record<string, unknown>;
  visible?: boolean;
  resizable?: boolean;
}

export function ContainerHost({
  id,
  parentId,
  kind,
  className,
  children,
  style,
  defaultBounds,
  data,
  visible,
  resizable = false,
  ...rest
}: ContainerHostProps) {
  const store = useContainerStore();
  const { enabled: resizeEnabled } = useContainerResizeFlag();
  const state = useContainerState(id);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const enableResize = resizable && resizeEnabled;
  const [isHovered, setIsHovered] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [translate, setTranslate] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastSyncedBoundsKeyRef = useRef<string | null>(null);
  const defaultBoundsKey = useMemo(() => {
    if (!defaultBounds) return null;
    const { x, y, width, height } = defaultBounds;
    return `${x}-${y}-${width}-${height}`;
  }, [defaultBounds]);

  useEffect(() => {
    if (!store.get(id)) {
      store.register({
        id,
        parentId,
        kind,
        bounds: defaultBounds ?? { x: 0, y: 0, width: 100, height: 100 },
        visible: typeof visible === 'boolean' ? visible : true,
        ui: {},
        data: data ?? {},
        errors: [],
        updatedAt: Date.now(),
      });
      if (defaultBoundsKey) {
        lastSyncedBoundsKeyRef.current = defaultBoundsKey;
      }
      return;
    }
    const patch: ContainerPatch = {};
    const shouldSyncBounds = Boolean(
      defaultBounds && defaultBoundsKey && lastSyncedBoundsKeyRef.current !== defaultBoundsKey,
    );
    if (defaultBounds && shouldSyncBounds) {
      patch.bounds = defaultBounds;
      lastSyncedBoundsKeyRef.current = defaultBoundsKey;
    }
    if (typeof visible === 'boolean') {
      patch.visible = visible;
    }
    if (data) {
      patch.data = data;
    }
    if (Object.keys(patch).length > 0) {
      store.update(id, patch);
    }
  }, [data, defaultBounds, defaultBoundsKey, id, kind, parentId, store, visible]);

  const showHandle = enableResize && isActive;
  const resolvedState = state ?? null;
  const mergedStyle = useMemo<React.CSSProperties>(() => {
    const next: React.CSSProperties = { ...(style ?? {}) };
    const baseTransform = typeof next.transform === 'string' ? next.transform : undefined;
    if (resolvedState?.bounds) {
      const { x, y, width, height } = resolvedState.bounds;
      const custom = next as Record<string, string | number>;
      custom['--container-x'] = `${x}`;
      custom['--container-y'] = `${y}`;
      custom['--container-width'] = `${width}`;
      custom['--container-height'] = `${height}`;
      const translateValue = `translate(${translate.x}px, ${translate.y}px)`;
      next.transform = baseTransform ? `${baseTransform} ${translateValue}` : translateValue;
    }
    if (resolvedState?.ui?.background) {
      next.background = resolvedState.ui.background;
    }
    if (resolvedState?.ui?.textColor) {
      next.color = resolvedState.ui.textColor;
    }
    if (typeof resolvedState?.ui?.opacity === 'number') {
      next.opacity = resolvedState.ui.opacity;
    }
    if (typeof resolvedState?.ui?.zIndex === 'number') {
      next.zIndex = resolvedState.ui.zIndex;
    }
    if (resolvedState && resolvedState.visible === false) {
      next.display = 'none';
    }
    if (showHandle && (!next.position || next.position === 'static')) {
      next.position = 'relative';
    }
    return next;
  }, [enableResize, resolvedState, showHandle, style, translate.x, translate.y]);

  const debugMode = resolvedState?.ui?.debugMode ?? 'off';
  const isVisible = resolvedState?.visible ?? true;
  const dataAttrs = {
    'data-container-id': id,
    'data-container-kind': kind,
    'data-container-visible': String(isVisible),
    'data-container-debug': debugMode,
  };

  const startResize = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!enableResize) return;
      const element = hostRef.current;
      if (!element) return;
      const parent = element.parentElement;
      if (!parent) return;
      const parentRect = parent.getBoundingClientRect();
      const startRect = element.getBoundingClientRect();
      const startX = event.clientX;
      const startY = event.clientY;
      event.preventDefault();
      event.stopPropagation();

      const onPointerMove = (moveEvent: PointerEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const deltaY = moveEvent.clientY - startY;
        const newWidthPx = Math.max(60, startRect.width + deltaX);
        const newHeightPx = Math.max(60, startRect.height + deltaY);
        const widthPercent = clampPercent((newWidthPx / parentRect.width) * 100);
        const heightPercent = clampPercent((newHeightPx / parentRect.height) * 100);
        store.update(id, {
          bounds: {
            ...(resolvedState?.bounds ?? { x: 0, y: 0 }),
            width: widthPercent,
            height: heightPercent,
          },
        });
      };

      const onPointerUp = () => {
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
      };

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
    },
    [enableResize, id, resolvedState?.bounds, store],
  );

  const startMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!enableResize) return;
      const element = hostRef.current;
      if (!element) return;
      const parent = element.parentElement;
      if (!parent) return;
      const parentRect = parent.getBoundingClientRect();
      const bounds = resolvedState?.bounds ?? { x: 0, y: 0, width: 100, height: 100 };
      const startX = event.clientX;
      const startY = event.clientY;
      const initialX = bounds.x ?? 0;
      const initialY = bounds.y ?? 0;
      const widthPercent = bounds.width ?? 100;
      const heightPercent = bounds.height ?? 100;
      event.preventDefault();
      event.stopPropagation();
      setIsActive(true);
      setIsHovered(true);

      const onPointerMove = (moveEvent: PointerEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const deltaY = moveEvent.clientY - startY;
        const deltaXPct = (deltaX / parentRect.width) * 100;
        const deltaYPct = (deltaY / parentRect.height) * 100;
        const nextX = clampPosition(initialX + deltaXPct, widthPercent);
        const nextY = clampPosition(initialY + deltaYPct, heightPercent);
        store.update(id, {
          bounds: {
            ...bounds,
            x: nextX,
            y: nextY,
          },
        });
      };

      const onPointerUp = () => {
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
      };

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
    },
    [enableResize, id, resolvedState?.bounds, store],
  );

  const hostClassName = useMemo(() => {
    const extras: string[] = [];
    if (enableResize && isHovered) extras.push('zcam-container-resize-hover');
    if (enableResize && isActive) extras.push('zcam-container-resize-active');
    return [className, ...extras].filter(Boolean).join(' ');
  }, [className, enableResize, isActive, isHovered]);

  const handlePointerEnter = useCallback(() => {
    if (!enableResize) return;
    setIsHovered(true);
  }, [enableResize]);

  const handlePointerLeave = useCallback(() => {
    if (!enableResize) return;
    setIsHovered(false);
  }, [enableResize]);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!enableResize) return;
      if (event.button === 0) {
        event.preventDefault();
        event.stopPropagation();
        setIsActive(true);
        setIsHovered(true);
      }
    },
    [enableResize],
  );

  const handleContextMenu = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!enableResize) return;
      event.preventDefault();
      setIsActive(false);
      setIsHovered(false);
    },
    [enableResize],
  );

  useEffect(() => {
    if (!enableResize) {
      setIsHovered(false);
      setIsActive(false);
    }
  }, [enableResize]);

  useLayoutEffect(() => {
    const element = hostRef.current;
    const parent = element?.parentElement;
    if (!element || !parent) {
      return;
    }
    let frame = 0;
    const update = () => {
      if (frame) {
        cancelAnimationFrame(frame);
      }
      frame = requestAnimationFrame(() => {
        const rect = parent.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) {
          setTranslate({ x: 0, y: 0 });
          return;
        }
        const bounds = resolvedState?.bounds;
        const xPercent = bounds?.x ?? 0;
        const yPercent = bounds?.y ?? 0;
        setTranslate({
          x: (xPercent / 100) * rect.width,
          y: (yPercent / 100) * rect.height,
        });
      });
    };
    update();
    const handleResize = () => update();
    window.addEventListener('resize', handleResize);
    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => update());
      observer.observe(parent);
    }
    return () => {
      window.removeEventListener('resize', handleResize);
      if (frame) {
        cancelAnimationFrame(frame);
      }
      observer?.disconnect();
    };
  }, [enableResize, resolvedState?.bounds?.x, resolvedState?.bounds?.y]);

  return (
    <div
      ref={hostRef}
      className={hostClassName}
      style={mergedStyle}
      {...dataAttrs}
      {...rest}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onPointerDown={handlePointerDown}
      onContextMenu={handleContextMenu}
    >
      {children}
      {showHandle ? (
        <div className="zcam-container-resize-handle" onPointerDown={startResize} role="presentation" />
      ) : null}
      {enableResize && (isActive || isHovered) ? (
        <div className="zcam-container-move-handle" onPointerDown={startMove} role="presentation" />
      ) : null}
    </div>
  );
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(5, Math.min(100, Math.round(value * 100) / 100));
}

function clampPosition(value: number, size: number): number {
  if (!Number.isFinite(value)) return 0;
  const max = Math.max(0, 100 - Math.max(5, size ?? 0));
  return Math.max(0, Math.min(max, Math.round(value * 100) / 100));
}
