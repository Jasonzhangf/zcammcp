import React, { createContext, useContext, useMemo, useRef, useEffect } from 'react';

export type Direction = 'left' | 'right' | 'up' | 'down';

export const FOCUS_NAV_KEYS: Record<string, Direction> = {
  w: 'up',
  W: 'up',
  s: 'down',
  S: 'down',
  a: 'left',
  A: 'left',
  d: 'right',
  D: 'right',
};

export interface FocusableOptions {
  nodeId: string;
  groupId?: string;
  disabled?: boolean;
}

interface FocusEntry {
  element: HTMLElement;
  nodeId: string;
  groupId: string;
  disabled: boolean;
  order: number;
}

class FocusManagerImpl {
  private entries = new Map<HTMLElement, FocusEntry>();
  private orderCounter = 0;

  register(element: HTMLElement, options: FocusableOptions): () => void {
    const entry: FocusEntry = {
      element,
      nodeId: options.nodeId,
      groupId: options.groupId ?? deriveFocusGroupId(options.nodeId),
      disabled: Boolean(options.disabled),
      order: (this.orderCounter += 1),
    };
    this.entries.set(element, entry);
    return () => {
      this.entries.delete(element);
    };
  }

  moveToDirection(origin: HTMLElement | null, direction: Direction): HTMLElement | null {
    this.pruneEntries();
    const available = this.getEligibleEntries();
    if (available.length === 0) {
      return null;
    }
    const originEntry = origin ? this.entries.get(origin) : undefined;
    if (!originEntry) {
      const first = available[0];
      this.focusElement(first.element);
      return first.element;
    }
    const sameGroup = available.filter((entry) => entry.groupId === originEntry.groupId && entry.element !== originEntry.element);
    const sameGroupTarget = this.pickDirectionalTarget(originEntry, sameGroup, direction);
    if (sameGroupTarget) {
      this.focusElement(sameGroupTarget.element);
      return sameGroupTarget.element;
    }
    const fallback = available.filter((entry) => entry.element !== originEntry.element);
    const fallbackTarget = this.pickDirectionalTarget(originEntry, fallback, direction);
    if (fallbackTarget) {
      this.focusElement(fallbackTarget.element);
      return fallbackTarget.element;
    }
    const fallbackEntry = fallback[0];
    if (fallbackEntry) {
      this.focusElement(fallbackEntry.element);
      return fallbackEntry.element;
    }
    return null;
  }

  private getEligibleEntries(): FocusEntry[] {
    const entries: FocusEntry[] = [];
    for (const entry of this.entries.values()) {
      if (entry.disabled) continue;
      if (!entry.element.isConnected) continue;
      if (entry.element.tabIndex < 0) continue;
      entries.push(entry);
    }
    entries.sort((a, b) => a.order - b.order);
    return entries;
  }

  private pickDirectionalTarget(origin: FocusEntry, candidates: FocusEntry[], direction: Direction): FocusEntry | null {
    if (!origin || candidates.length === 0) return null;
    const originRect = origin.element.getBoundingClientRect();
    const originX = originRect.left + originRect.width / 2;
    const originY = originRect.top + originRect.height / 2;
    let best: FocusEntry | null = null;
    let bestScore = Number.POSITIVE_INFINITY;
    for (const entry of candidates) {
      const rect = entry.element.getBoundingClientRect();
      const targetX = rect.left + rect.width / 2;
      const targetY = rect.top + rect.height / 2;
      const dx = targetX - originX;
      const dy = targetY - originY;
      if (!isDirectionalMatch(direction, dx, dy)) {
        continue;
      }
      const score = Math.hypot(dx, dy);
      if (score < bestScore) {
        bestScore = score;
        best = entry;
      }
    }
    return best;
  }

  private focusElement(element: HTMLElement): void {
    if (element === document.activeElement) return;
    try {
      element.focus();
    } catch {
      // ignore focus errors
    }
  }

  private pruneEntries(): void {
    for (const [element, entry] of this.entries) {
      if (!element.isConnected) {
        this.entries.delete(element);
        continue;
      }
      if (entry.disabled && element === document.activeElement) {
        element.blur();
      }
    }
  }
}

function isDirectionalMatch(direction: Direction, dx: number, dy: number): boolean {
  const threshold = 4;
  switch (direction) {
    case 'left':
      if (dx >= -threshold) return false;
      return Math.abs(dy) <= Math.abs(dx) * 1.5 + threshold;
    case 'right':
      if (dx <= threshold) return false;
      return Math.abs(dy) <= Math.abs(dx) * 1.5 + threshold;
    case 'up':
      if (dy >= -threshold) return false;
      return Math.abs(dx) <= Math.abs(dy) * 1.5 + threshold;
    case 'down':
      if (dy <= threshold) return false;
      return Math.abs(dx) <= Math.abs(dy) * 1.5 + threshold;
    default:
      return false;
  }
}

export function deriveFocusGroupId(nodePath: string): string {
  if (!nodePath) return 'default';
  const parts = nodePath.split('.');
  if (parts.length <= 1) return nodePath;
  parts.pop();
  return parts.join('.');
}

const FocusManagerContext = createContext<FocusManagerImpl | null>(null);

export function FocusManagerProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const managerRef = useRef<FocusManagerImpl | null>(null);
  if (!managerRef.current) {
    managerRef.current = new FocusManagerImpl();
  }
  const manager = managerRef.current!;
  return <FocusManagerContext.Provider value={manager}>{children}</FocusManagerContext.Provider>;
}

export function useFocusManager(): FocusManagerImpl {
  const ctx = useContext(FocusManagerContext);
  if (!ctx) {
    throw new Error('FocusManagerProvider missing');
  }
  return ctx;
}

export function useFocusableControl(ref: React.RefObject<HTMLElement | null>, options: FocusableOptions): void {
  const manager = useFocusManager();
  const memoOptions = useMemo(() => ({ ...options }), [options.nodeId, options.groupId, options.disabled]);
  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    return manager.register(element, memoOptions);
  }, [manager, ref, memoOptions]);
}

export { FocusManagerImpl as FocusManager };
