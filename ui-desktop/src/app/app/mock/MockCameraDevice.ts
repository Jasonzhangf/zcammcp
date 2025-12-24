import type { CameraState, CliRequest } from '../../framework/state/PageStore.js';
import { PTZ_FOCUS_RANGE, PTZ_PAN_RANGE, PTZ_TILT_RANGE, PTZ_ZOOM_RANGE } from '../operations/ptzOperations.js';

type StateListener = (snapshot: CameraState) => void;
type MotorKey = 'pan' | 'tilt' | 'zoom' | 'focus';
type ImageField = 'brightness' | 'contrast' | 'saturation';

const PTZ_INTERVAL_MS = 100;
const MIN_MOTOR_INTERVAL_MS = 10;
const SIMPLE_UPDATE_DELAY_MS = 50;
const ZOOM_FULL_TRAVEL_MS = 10_000;
const FOCUS_FULL_TRAVEL_MS = 2_000;
const MAX_MOTOR_STEPS_PER_SECOND = 1000;
const ZOOM_STEP = Math.max(1, Math.round((PTZ_ZOOM_RANGE.max - PTZ_ZOOM_RANGE.min) / (ZOOM_FULL_TRAVEL_MS / PTZ_INTERVAL_MS)));
const FOCUS_STEP = Math.max(1, Math.round((PTZ_FOCUS_RANGE.max - PTZ_FOCUS_RANGE.min) / (FOCUS_FULL_TRAVEL_MS / PTZ_INTERVAL_MS)));

interface SliderMeta {
  stepPerInterval?: number;
  intervalMs?: number;
  stop?: boolean;
}

interface MotorConfig {
  stepSize: number;
  intervalMs: number;
}

export class MockCameraDevice {
  private state: CameraState;
  private listeners = new Set<StateListener>();
  private motorTargets: Record<MotorKey, number>;
  private motorTimers: Partial<Record<MotorKey, ReturnType<typeof setInterval>>> = {};
  private motorConfigs: Record<MotorKey, MotorConfig>;
  private pendingTimeouts = new Set<ReturnType<typeof setTimeout>>();

  constructor(initialState: CameraState) {
    this.state = cloneState(initialState);
    this.motorTargets = {
      pan: this.state.ptz?.pan?.value ?? 0,
      tilt: this.state.ptz?.tilt?.value ?? 0,
      zoom: this.state.ptz?.zoom?.value ?? PTZ_ZOOM_RANGE.min,
      focus: this.state.ptz?.focus?.value ?? PTZ_FOCUS_RANGE.min,
    };
    this.motorConfigs = {
      pan: { stepSize: 1, intervalMs: PTZ_INTERVAL_MS },
      tilt: { stepSize: 1, intervalMs: PTZ_INTERVAL_MS },
      zoom: { stepSize: ZOOM_STEP, intervalMs: PTZ_INTERVAL_MS },
      focus: { stepSize: FOCUS_STEP, intervalMs: PTZ_INTERVAL_MS },
    };
  }

  getState(): CameraState {
    return cloneState(this.state);
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  dispose(): void {
    for (const timer of Object.values(this.motorTimers)) {
      if (timer) clearInterval(timer);
    }
    for (const timer of this.pendingTimeouts) {
      clearTimeout(timer);
    }
    this.pendingTimeouts.clear();
    this.listeners.clear();
  }

  async handleRequest(request: CliRequest): Promise<void> {
    const { kind, value, auto, sliderMeta } = parseRequest(request);
    switch (kind) {
      case 'pan':
        this.scheduleMotor('pan', clamp(value ?? 0, PTZ_PAN_RANGE.min, PTZ_PAN_RANGE.max), sliderMeta);
        break;
      case 'tilt':
        this.scheduleMotor('tilt', clamp(value ?? 0, PTZ_TILT_RANGE.min, PTZ_TILT_RANGE.max), sliderMeta);
        break;
      case 'zoom':
        this.scheduleMotor('zoom', clamp(value ?? PTZ_ZOOM_RANGE.min, PTZ_ZOOM_RANGE.min, PTZ_ZOOM_RANGE.max), sliderMeta);
        break;
      case 'focus':
        this.scheduleMotor('focus', clamp(value ?? PTZ_FOCUS_RANGE.min, PTZ_FOCUS_RANGE.min, PTZ_FOCUS_RANGE.max), sliderMeta);
        break;
      case 'speed':
        this.schedulePtzSpeed(clamp(value ?? 50, 0, 100));
        break;
      case 'brightness':
      case 'contrast':
      case 'saturation':
        this.scheduleImageUpdate(kind, clamp(value ?? 50, 0, 100));
        break;
      case 'whitebalance':
        if (typeof auto === 'boolean') {
          this.scheduleAwb(auto);
        } else if (typeof value === 'number') {
          this.scheduleWhiteBalanceTemperature(clamp(value, 2000, 10_000));
        }
        break;
      case 'gain':
        this.scheduleIso(Math.max(100, Math.round(value ?? 100)));
        break;
      case 'exposure':
        if (typeof auto === 'boolean') {
          this.scheduleAe(auto);
        } else if (typeof value === 'number') {
          this.scheduleShutter(Math.max(1, Math.round(value)));
        }
        break;
      default:
        break;
    }
  }

  private scheduleMotor(key: MotorKey, target: number, meta?: SliderMeta): void {
    if (meta?.stop) {
      const ptz = this.state.ptz ?? (this.state.ptz = {});
      const current = Math.round(ptz[key]?.value ?? target ?? this.motorTargets[key] ?? 0);
      this.motorTargets[key] = current;
      this.stopMotorTimer(key);
      return;
    }
    this.motorTargets[key] = target;
    const fallbackStep = this.getDefaultMotorStep(key);
    const currentConfig = this.motorConfigs[key] ?? { stepSize: fallbackStep, intervalMs: PTZ_INTERVAL_MS };
    const intervalMs = normalizeInterval(meta?.intervalMs ?? currentConfig.intervalMs ?? PTZ_INTERVAL_MS);
    const requestedStep = meta?.stepPerInterval ?? currentConfig.stepSize ?? fallbackStep;
    const stepSize = clampStepSize(requestedStep, intervalMs);
    const previousInterval = this.motorConfigs[key]?.intervalMs ?? intervalMs;
    this.motorConfigs[key] = { stepSize, intervalMs };
    if (this.motorTimers[key] && previousInterval !== intervalMs) {
      this.stopMotorTimer(key);
    }
    this.startMotorLoop(key);
  }

  private startMotorLoop(key: MotorKey): void {
    const intervalMs = this.motorConfigs[key]?.intervalMs ?? PTZ_INTERVAL_MS;
    const ptz = this.state.ptz ?? (this.state.ptz = {});
    const goal = Math.round(this.motorTargets[key]);
    const current = Math.round(ptz[key]?.value ?? goal);
    if (current === goal) {
      this.stopMotorTimer(key);
      return;
    }
    if (this.motorTimers[key]) {
      return;
    }
    const tick = () => {
      const ptzState = this.state.ptz ?? (this.state.ptz = {});
      const desired = Math.round(this.motorTargets[key]);
      const cursor = Math.round(ptzState[key]?.value ?? desired);
      if (cursor === desired) {
        this.stopMotorTimer(key);
        return;
      }
      const config = this.motorConfigs[key] ?? { stepSize: this.getDefaultMotorStep(key), intervalMs };
      const effectiveStep = clampStepSize(config.stepSize, config.intervalMs ?? intervalMs);
      const diff = desired - cursor;
      const delta = Math.sign(diff) * Math.min(Math.abs(diff), effectiveStep);
      this.applyMotorValue(key, cursor + delta);
    };
    this.motorTimers[key] = setInterval(tick, intervalMs);
    tick();
  }

  private stopMotorTimer(key: MotorKey): void {
    const timer = this.motorTimers[key];
    if (timer) {
      clearInterval(timer);
      this.motorTimers[key] = undefined;
    }
  }

  private getDefaultMotorStep(key: MotorKey): number {
    switch (key) {
      case 'pan':
      case 'tilt':
        return 1;
      case 'zoom':
        return ZOOM_STEP;
      case 'focus':
        return FOCUS_STEP;
      default:
        return 1;
    }
  }

  private applyMotorValue(key: MotorKey, next: number): void {
    const ptz = this.state.ptz ?? (this.state.ptz = {});
    const rounded = Math.round(next);
    const current = ptz[key]?.value;
    if (current === rounded) return;
    ptz[key] = { value: rounded, view: String(rounded) };
    this.emit();
  }

  private scheduleImageUpdate(field: ImageField, value: number): void {
    this.scheduleSimple(() => {
      const image = this.state.image ?? (this.state.image = {});
      image[field] = Math.round(value);
      this.emit();
    });
  }

  private scheduleWhiteBalanceTemperature(value: number): void {
    this.scheduleSimple(() => {
      const wb = this.state.whiteBalance ?? (this.state.whiteBalance = {});
      const rounded = Math.round(value);
      wb.temperature = { value: rounded, view: `${rounded}K` };
      this.emit();
    });
  }

  private scheduleAwb(enabled: boolean): void {
    this.scheduleSimple(() => {
      const wb = this.state.whiteBalance ?? (this.state.whiteBalance = {});
      wb.awbEnabled = enabled;
      this.emit();
    });
  }

  private scheduleIso(value: number): void {
    this.scheduleSimple(() => {
      const exposure = this.state.exposure ?? (this.state.exposure = {});
      exposure.iso = { value, view: String(value) };
      this.emit();
    });
  }

  private scheduleAe(enabled: boolean): void {
    this.scheduleSimple(() => {
      const exposure = this.state.exposure ?? (this.state.exposure = {});
      exposure.aeEnabled = enabled;
      this.emit();
    });
  }

  private scheduleShutter(value: number): void {
    this.scheduleSimple(() => {
      const exposure = this.state.exposure ?? (this.state.exposure = {});
      exposure.shutter = { value, view: String(value) };
      this.emit();
    });
  }

  private schedulePtzSpeed(value: number): void {
    this.scheduleSimple(() => {
      const ptz = this.state.ptz ?? (this.state.ptz = {});
      ptz.speed = { value, view: String(value) };
      this.emit();
    });
  }

  private scheduleSimple(task: () => void): void {
    const timer = setTimeout(() => {
      this.pendingTimeouts.delete(timer);
      task();
    }, SIMPLE_UPDATE_DELAY_MS);
    this.pendingTimeouts.add(timer);
  }

  private emit(): void {
    if (this.listeners.size === 0) return;
    const snapshot = this.getState();
    for (const listener of this.listeners) {
      try {
        listener(snapshot);
      } catch {
        // ignore listener errors in mock environment
      }
    }
  }
}

function parseRequest(request: CliRequest): { kind: string; value?: number; auto?: boolean; sliderMeta?: SliderMeta } {
  const args = request.args ?? [];
  const kind = args[2] ?? '';
  let value: number | undefined;
  let auto: boolean | undefined;
  for (let i = 3; i < args.length; i += 2) {
    const flag = args[i];
    const raw = args[i + 1];
    if (flag === '--value' && typeof raw !== 'undefined') {
      const numeric = Number(raw);
      if (Number.isFinite(numeric)) {
        value = numeric;
      }
    }
    if (flag === '--auto' && typeof raw !== 'undefined') {
      auto = raw === 'true';
    }
  }
  const sliderMeta = parseSliderMeta(request);
  return { kind, value, auto, sliderMeta };
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function cloneState(state: CameraState): CameraState {
  return JSON.parse(JSON.stringify(state)) as CameraState;
}

function parseSliderMeta(request: CliRequest): SliderMeta | undefined {
  const params = request.params as Record<string, unknown> | undefined;
  if (!params || typeof params !== 'object') {
    return undefined;
  }
  const rawMetaCandidate = params['sliderMeta'] ?? params;
  if (!rawMetaCandidate || typeof rawMetaCandidate !== 'object') {
    return undefined;
  }
  const meta = rawMetaCandidate as Record<string, unknown>;
  const step = Number(meta['stepPerInterval']);
  const interval = Number(meta['intervalMs']);
  const normalized: SliderMeta = {};
  if (Number.isFinite(step) && step > 0) {
    normalized.stepPerInterval = Math.abs(step);
  }
  if (Number.isFinite(interval) && interval > 0) {
    normalized.intervalMs = interval;
  }
  if (typeof meta['stop'] !== 'undefined') {
    normalized.stop = meta['stop'] === true || meta['stop'] === 'true';
  }
  if (normalized.stop || normalized.stepPerInterval || normalized.intervalMs) {
    return normalized;
  }
  return undefined;
}

function normalizeInterval(value?: number): number {
  if (!Number.isFinite(value) || (value ?? 0) < MIN_MOTOR_INTERVAL_MS) {
    return PTZ_INTERVAL_MS;
  }
  return Math.max(MIN_MOTOR_INTERVAL_MS, Math.round(value!));
}

function clampStepSize(stepSize: number, intervalMs: number): number {
  const normalizedInterval = normalizeInterval(intervalMs);
  const maxPerTick = Math.max(1, Math.floor((MAX_MOTOR_STEPS_PER_SECOND * normalizedInterval) / 1000));
  if (!Number.isFinite(stepSize) || stepSize <= 0) {
    return Math.min(1, maxPerTick);
  }
  return Math.max(1, Math.min(Math.round(stepSize), maxPerTick));
}
