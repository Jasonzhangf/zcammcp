interface InteractionLogEntry {
  id: number;
  timestamp: number;
  source: string;
  path?: string;
  action: string;
  data?: Record<string, unknown>;
}

type InteractionLogInput = Omit<InteractionLogEntry, 'id' | 'timestamp'>;

const MAX_ENTRIES = 500;
const buffer: InteractionLogEntry[] = [];
let sequence = 0;
let globalsRegistered = false;

export function logInteraction(entry: InteractionLogInput): InteractionLogEntry {
  const record: InteractionLogEntry = {
    id: sequence++,
    timestamp: Date.now(),
    ...entry,
  };
  buffer.push(record);
  if (buffer.length > MAX_ENTRIES) {
    buffer.shift();
  }
  if (shouldPrint()) {
    const details = record.data ? JSON.stringify(record.data) : '';
    // eslint-disable-next-line no-console
    console.debug(`[ZCAM][${record.source}] ${record.action} ${record.path ?? ''} ${details}`);
  }
  registerGlobalHelpers();
  return record;
}

export function getInteractionLogs(): InteractionLogEntry[] {
  return buffer.slice();
}

export function clearInteractionLogs(): void {
  buffer.length = 0;
}

function shouldPrint(): boolean {
  const host = getGlobalHost();
  if (typeof host.__ZCAM_TRACE_INPUT__ === 'boolean') {
    return host.__ZCAM_TRACE_INPUT__;
  }
  return false;
}

function registerGlobalHelpers(): void {
  if (globalsRegistered) return;
  const host = getGlobalHost();
  if (!host) return;
  if (!host.__ZCAM_GET_INPUT_LOG__) {
    host.__ZCAM_GET_INPUT_LOG__ = () => getInteractionLogs();
  }
  if (!host.__ZCAM_CLEAR_INPUT_LOG__) {
    host.__ZCAM_CLEAR_INPUT_LOG__ = () => clearInteractionLogs();
  }
  globalsRegistered = true;
}

type TraceHost = typeof globalThis & {
  __ZCAM_TRACE_INPUT__?: boolean;
  __ZCAM_GET_INPUT_LOG__?: () => InteractionLogEntry[];
  __ZCAM_CLEAR_INPUT_LOG__?: () => void;
};

function getGlobalHost(): TraceHost {
  return globalThis as TraceHost;
}
