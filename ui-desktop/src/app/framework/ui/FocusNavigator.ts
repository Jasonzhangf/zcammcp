export type Direction = 'left' | 'right' | 'up' | 'down';

export const FOCUS_NAV_KEYS: Record<string, Direction> = {
  w: 'up',
  s: 'down',
  a: 'left',
  d: 'right',
};

export function deriveFocusGroupId(nodePath: string): string {
  if (!nodePath) return 'default';
  const parts = nodePath.split('.');
  if (parts.length <= 1) return nodePath;
  parts.pop();
  return parts.join('.');
}

export function moveFocusToDirection(origin: HTMLElement | null, direction: Direction): void {
  if (!origin) return;
  const target = findDirectionalControl(origin, direction);
  if (target) {
    target.focus();
  }
}

function findDirectionalControl(origin: HTMLElement, direction: Direction): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  const allNodes = Array.from(document.querySelectorAll<HTMLElement>('.zcam-focusable-control'));
  if (allNodes.length === 0) return null;
  const groupId = origin.getAttribute('data-focus-group') ?? '';
  const candidates = getGroupPrioritizedNodes(allNodes, origin, groupId);
  const currentRect = origin.getBoundingClientRect();
  const currentX = currentRect.left + currentRect.width / 2;
  const currentY = currentRect.top + currentRect.height / 2;
  let best: HTMLElement | null = null;
  let bestScore = Number.POSITIVE_INFINITY;
  for (const node of candidates) {
    if (node === origin) continue;
    if (node.tabIndex < 0) continue;
    const rect = node.getBoundingClientRect();
    const targetX = rect.left + rect.width / 2;
    const targetY = rect.top + rect.height / 2;
    const dx = targetX - currentX;
    const dy = targetY - currentY;
    if (!isDirectionalMatch(direction, dx, dy)) continue;
    const score = Math.hypot(dx, dy);
    if (score < bestScore) {
      bestScore = score;
      best = node;
    }
  }
  return best;
}

function getGroupPrioritizedNodes(nodes: HTMLElement[], origin: HTMLElement, groupId: string): HTMLElement[] {
  if (!groupId) {
    return nodes.filter((node) => node !== origin);
  }
  const sameGroup = nodes.filter(
    (node) => node !== origin && node.getAttribute('data-focus-group') === groupId,
  );
  if (sameGroup.length > 0) {
    return sameGroup;
  }
  return nodes.filter((node) => node !== origin);
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
