export {};

type ZcamInteractionLogEntry = {
  id: number;
  timestamp: number;
  source: string;
  path?: string;
  action: string;
  data?: Record<string, unknown>;
};

declare global {
  var __ZCAM_TRACE_INPUT__: boolean | undefined;
  var __ZCAM_GET_INPUT_LOG__: (() => ZcamInteractionLogEntry[]) | undefined;
  var __ZCAM_CLEAR_INPUT_LOG__: (() => void) | undefined;

  interface Window {
    __ZCAM_TRACE_INPUT__?: boolean;
    __ZCAM_GET_INPUT_LOG__?: () => ZcamInteractionLogEntry[];
    __ZCAM_CLEAR_INPUT_LOG__?: () => void;
  }
}
