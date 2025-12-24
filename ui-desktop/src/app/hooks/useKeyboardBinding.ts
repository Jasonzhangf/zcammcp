import { useEffect, useMemo, useRef } from 'react';
import type { RefObject } from 'react';

export type KeyboardBindingMode = 'focus' | 'global';

export interface KeyboardBindingOptions {
  keys: string[];
  enabled?: boolean;
  mode?: KeyboardBindingMode;
  acceptWhenBlurred?: boolean;
  targetRef?: RefObject<HTMLElement | null> | (() => HTMLElement | null);
  onKeyDown?(event: KeyboardEvent): boolean | void;
  onKeyUp?(event: KeyboardEvent): void;
}

function resolveElement(targetRef?: RefObject<HTMLElement | null> | (() => HTMLElement | null)): HTMLElement | null {
  if (!targetRef) return null;
  if (typeof targetRef === 'function') {
    try {
      return targetRef();
    } catch {
      return null;
    }
  }
  return targetRef.current ?? null;
}

export function useKeyboardBinding(options: KeyboardBindingOptions): void {
  const { keys, enabled = true, mode = 'focus', acceptWhenBlurred = false, targetRef, onKeyDown, onKeyUp } = options;
  const signature = useMemo(() => keys.join('|'), [keys]);
  const activeKeysRef = useRef(new Set<string>());

  useEffect(() => {
    if (!enabled || keys.length === 0) return;
    const keySet = new Set(keys);

    const shouldHandle = (): boolean => {
      if (mode === 'global') {
        return true;
      }
      const target = resolveElement(targetRef);
      if (!target) return false;
      const activeEl = typeof document !== 'undefined' ? (document.activeElement as HTMLElement | null) : null;
      if (target === activeEl) return true;
      if (acceptWhenBlurred && activeEl && target.contains(activeEl)) {
        return true;
      }
      return false;
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!keySet.has(event.key)) return;
      if (!shouldHandle()) return;
      const result = onKeyDown?.(event);
      if (result !== false) {
        event.preventDefault();
        event.stopPropagation();
      }
      activeKeysRef.current.add(event.key);
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (!keySet.has(event.key)) return;
      if (!activeKeysRef.current.has(event.key)) return;
      activeKeysRef.current.delete(event.key);
      onKeyUp?.(event);
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keyup', handleKeyUp, true);
      activeKeysRef.current.clear();
    };
  }, [acceptWhenBlurred, enabled, mode, onKeyDown, onKeyUp, targetRef, signature, keys]);
}
