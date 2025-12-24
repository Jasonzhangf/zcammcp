import type { PageStore, ViewState } from '../framework/state/PageStore.js';
import { getInteractionLogs, clearInteractionLogs, logInteraction } from '../framework/debug/InteractionLogger.js';
import { replayInteractions } from '../framework/debug/ReplayInteractions.js';

type TestCommandPayload = {
  requestId: string;
  action: string;
  payload?: Record<string, unknown>;
};

type TestHandlerResult = {
  ok: boolean;
  data?: unknown;
  error?: string;
};

type InstallOptions = {
  store: PageStore;
};

const DEFAULT_TIMEOUT = 5000;

export function installTestHarness({ store }: InstallOptions): void {
  if (typeof window === 'undefined') return;
  const api = window.electronAPI;
  if (!api?.registerTestHandler) return;

  const pushState = (patch: Record<string, unknown>) => {
    void api.pushState?.('uiTest', {
      ...patch,
      focusedPath: getFocusedPath(),
      timestamp: Date.now(),
    });
  };

  const handler = async (message: TestCommandPayload): Promise<TestHandlerResult> => {
    const action = message?.action;
    const payload = (message?.payload ?? {}) as Record<string, unknown>;
    switch (action) {
      case 'ping':
        return { ok: true, data: { pong: Date.now() } };
      case 'focus':
        return focusControl(payload);
      case 'blur':
        return blurActiveElement();
      case 'keyDown':
        return dispatchKey('keydown', payload);
      case 'keyUp':
        return dispatchKey('keyup', payload);
      case 'keySequence':
        return runKeySequence(payload);
      case 'queryFocus':
        return { ok: true, data: { focusedPath: getFocusedPath() } };
      case 'getViewState':
        return { ok: true, data: { view: cloneViewState(store.getViewState()) } };
      case 'getInteractionLog':
        return { ok: true, data: { entries: getInteractionLogs() } };
      case 'clearInteractionLog':
        clearInteractionLogs();
        return { ok: true };
      case 'setInputTrace':
        return setTraceFlag(payload);
      case 'replayInteractions':
        return await replayInteractionsHandler(store, payload);
      default:
        throw new Error(`unknown test action: ${action}`);
    }
  };

  const dispose = api.registerTestHandler(async (message: TestCommandPayload) => {
    pushState({ lastCommand: message?.action });
    try {
      const result = await handler(message);
      pushState({ lastResult: { action: message?.action, ok: result.ok } });
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      pushState({ lastError: { action: message?.action, error: errorMessage } });
      return { ok: false, error: errorMessage };
    }
  });

  window.addEventListener('beforeunload', () => dispose?.());
  pushState({ ready: true });
}

function focusControl(payload: Record<string, unknown>): TestHandlerResult {
  const rawPath = typeof payload.path === 'string' ? payload.path : '';
  if (!rawPath) {
    throw new Error('focus path required');
  }
  const element = findElementByPath(rawPath);
  if (!element) {
    throw new Error(`focus target not found: ${rawPath}`);
  }
  if (typeof element.scrollIntoView === 'function') {
    element.scrollIntoView({ block: 'center', inline: 'center', behavior: 'auto' });
  }
  const focusTarget = resolveFocusableTarget(element);
  if (!focusTarget) {
    throw new Error(`no focusable child for ${rawPath}`);
  }
  focusTarget.focus();
  logInteraction({ source: 'test', action: 'focus', path: rawPath });
  return { ok: true, data: { focusedPath: getFocusedPath() } };
}

function blurActiveElement(): TestHandlerResult {
  const active = document.activeElement as HTMLElement | null;
  if (active && typeof active.blur === 'function') {
    active.blur();
  }
  logInteraction({ source: 'test', action: 'blur' });
  return { ok: true };
}

function dispatchKey(type: 'keydown' | 'keyup', payload: Record<string, unknown>): TestHandlerResult {
  const key = typeof payload.key === 'string' ? payload.key : '';
  if (!key) {
    throw new Error('key required');
  }
  const repeat = payload.repeat === true;
  const altKey = payload.altKey === true;
  const ctrlKey = payload.ctrlKey === true;
  const metaKey = payload.metaKey === true;
  const shiftKey = payload.shiftKey === true;
  const targetPath = typeof payload.path === 'string' ? payload.path : null;
  const target = targetPath ? resolveFocusableTarget(findElementByPath(targetPath)) : document.activeElement;
  const eventInit: KeyboardEventInit = {
    key,
    bubbles: true,
    cancelable: true,
    repeat,
    altKey,
    ctrlKey,
    metaKey,
    shiftKey,
  };
  const dispatchTarget = (target as HTMLElement | null) ?? (document.body as HTMLElement | null);
  const keyboardEvent = new KeyboardEvent(type, eventInit);
  if (dispatchTarget) {
    dispatchTarget.dispatchEvent(keyboardEvent);
  }
  if (typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new KeyboardEvent(type, eventInit));
  }
  logInteraction({ source: 'test', action: type, data: { key, path: targetPath ?? getFocusedPath() } });

  return {
    ok: true,
    data: {
      focusedPath: getFocusedPath(),
    },
  };
}

async function runKeySequence(payload: Record<string, unknown>): Promise<TestHandlerResult> {
  const sequence = Array.isArray(payload.sequence) ? payload.sequence : null;
  if (!sequence || sequence.length === 0) {
    throw new Error('key sequence required');
  }
  for (const step of sequence) {
    if (!step || typeof step !== 'object') continue;
    const key = typeof step.key === 'string' ? step.key : '';
    if (!key) continue;
    const delay = typeof step.delay === 'number' ? Math.max(0, step.delay) : 50;
    dispatchKey('keydown', { ...step, key });
    await wait(delay);
    dispatchKey('keyup', { ...step, key });
    if (step.pauseAfter) {
      await wait(Math.max(0, Number(step.pauseAfter) || 0));
    }
  }
  return { ok: true };
}

function setTraceFlag(payload: Record<string, unknown>): TestHandlerResult {
  const enabled = payload.enabled === true;
  window.__ZCAM_TRACE_INPUT__ = enabled;
  return { ok: true, data: { enabled } };
}

function findElementByPath(path: string): HTMLElement | null {
  try {
    const selector = `[data-path="${cssEscape(path)}"]`;
    const el = document.querySelector(selector);
    return (el as HTMLElement) ?? null;
  } catch {
    return null;
  }
}

function resolveFocusableTarget(root: HTMLElement | null): HTMLElement | null {
  if (!root) return null;
  if (root.matches('.zcam-focusable-control')) {
    return root;
  }
  const focusable = root.querySelector('.zcam-focusable-control');
  if (focusable instanceof HTMLElement) {
    return focusable;
  }
  if (root.tabIndex >= 0) {
    return root;
  }
  return root.querySelector('[tabindex]') as HTMLElement | null;
}

function getFocusedPath(): string | null {
  const active = document.activeElement as HTMLElement | null;
  if (!active) return null;
  const owner = active.closest('[data-path]');
  return owner?.getAttribute('data-path') ?? null;
}

function cloneViewState(view: ViewState): ViewState {
  return JSON.parse(JSON.stringify(view)) as ViewState;
}

async function replayInteractionsHandler(
  store: PageStore,
  payload: Record<string, unknown>,
): Promise<TestHandlerResult> {
  const startRaw = payload.startTs;
  const endRaw = payload.endTs;
  const startTs =
    typeof startRaw === 'number'
      ? startRaw
      : typeof startRaw === 'string'
        ? Number(startRaw)
        : undefined;
  const endTs =
    typeof endRaw === 'number'
      ? endRaw
      : typeof endRaw === 'string'
        ? Number(endRaw)
        : undefined;

  const result = await replayInteractions(store, {
    startTs: Number.isFinite(startTs as number) ? (startTs as number) : undefined,
    endTs: Number.isFinite(endTs as number) ? (endTs as number) : undefined,
  });

  return { ok: true, data: result };
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, Math.min(DEFAULT_TIMEOUT, Math.max(0, ms))));
}

function cssEscape(value: string): string {
  if (typeof CSS !== 'undefined' && CSS.escape) {
    return CSS.escape(value);
  }
  return value.replace(/"/g, '\\"');
}
