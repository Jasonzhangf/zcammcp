import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { ContainerNode } from '../../../framework/container/ContainerNode.js';
import { SliderControl } from '../../../components/SliderControl.js';
import type { SliderControlConfig } from '../../../framework/ui/ControlConfig.js';
import { usePageStore, useViewState } from '../../../hooks/usePageStore.js';
import { useContainerData, useContainerState } from '../../../hooks/useContainerStore.js';
import { focusGroupNode, FocusGroup } from './FocusGroup.js';
import { PTZ_FOCUS_RANGE, PTZ_PAN_RANGE, PTZ_TILT_RANGE, PTZ_ZOOM_RANGE } from '../../../app/operations/ptzOperations.js';
import {
  Direction,
  FOCUS_NAV_KEYS,
  useFocusManager,
  useFocusableControl,
} from '../../../framework/ui/FocusManager.js';
import { computeNormalizedStep, getProfileInterval, getSliderProfile } from '../../../framework/ui/SliderProfiles.js';

export const ptzCardNode: ContainerNode = {
  path: 'zcam.camera.pages.main.ptz',
  role: 'container',
  kind: 'ptz.card',
  selectable: true,
  children: [focusGroupNode],
};

const zoomSliderConfig: SliderControlConfig = {
  nodePath: 'zcam.camera.pages.main.ptz.zoom',
  kind: 'ptz.zoom',
  label: 'Zoom',
  size: 'small',
  orientation: 'vertical',
  valueRange: { min: PTZ_ZOOM_RANGE.min, max: PTZ_ZOOM_RANGE.max, step: 10 },
  readValue: (view) => view.camera.ptz?.zoom?.value ?? PTZ_ZOOM_RANGE.min,
  formatValue: (value) => String(Math.round(value)),
  operationId: 'ptz.setZoom',
  profileKey: 'zoom',
  hideHeaderValue: true,
  focusGroupId: 'zcam.camera.pages.main.ptz',
  keyAcceptWhenBlurred: true,
};

const speedSliderConfig: SliderControlConfig = {
  nodePath: 'zcam.camera.pages.main.ptz.speed',
  kind: 'ptz.speed',
  label: 'Speed',
  size: 'small',
  orientation: 'vertical',
  valueRange: { min: 0, max: 100, step: 1 },
  readValue: (view) => view.camera.ptz?.speed?.value ?? 50,
  formatValue: (value) => String(Math.round(value)),
  operationId: 'ptz.setSpeed',
  profileKey: 'default',
  hideHeaderValue: true,
  focusGroupId: 'zcam.camera.pages.main.ptz',
  keyAcceptWhenBlurred: true,
};

type DpadDirection =
  | 'up-left'
  | 'up'
  | 'up-right'
  | 'left'
  | 'right'
  | 'down-left'
  | 'down'
  | 'down-right';

const arrow = {
  upLeft: '\u2196',
  up: '\u2191',
  upRight: '\u2197',
  left: '\u2190',
  stop: '\u25a0',
  right: '\u2192',
  downLeft: '\u2199',
  down: '\u2193',
  downRight: '\u2198',
};

const DPAD_LAYOUT: Array<{ path: string; label: string; direction?: DpadDirection }> = [
  { path: 'zcam.camera.pages.main.ptz.moveUpLeft', direction: 'up-left', label: arrow.upLeft },
  { path: 'zcam.camera.pages.main.ptz.moveUp', direction: 'up', label: arrow.up },
  { path: 'zcam.camera.pages.main.ptz.moveUpRight', direction: 'up-right', label: arrow.upRight },
  { path: 'zcam.camera.pages.main.ptz.moveLeft', direction: 'left', label: arrow.left },
  { path: 'zcam.camera.pages.main.ptz.stop', label: arrow.stop },
  { path: 'zcam.camera.pages.main.ptz.moveRight', direction: 'right', label: arrow.right },
  { path: 'zcam.camera.pages.main.ptz.moveDownLeft', direction: 'down-left', label: arrow.downLeft },
  { path: 'zcam.camera.pages.main.ptz.moveDown', direction: 'down', label: arrow.down },
  { path: 'zcam.camera.pages.main.ptz.moveDownRight', direction: 'down-right', label: arrow.downRight },
];

const DPAD_VECTOR: Record<DpadDirection, { pan?: number; tilt?: number }> = {
  'up-left': { pan: -1, tilt: 1 },
  up: { tilt: 1 },
  'up-right': { pan: 1, tilt: 1 },
  left: { pan: -1 },
  right: { pan: 1 },
  'down-left': { pan: -1, tilt: -1 },
  down: { tilt: -1 },
  'down-right': { pan: 1, tilt: -1 },
};

const DPAD_KEYBOARD_MAP: Record<string, DpadDirection> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
};

const PAD_KEYBOARD_NODE_PATH = 'zcam.camera.pages.main.ptz.dpad.keyboard';
const DPAD_PROFILE_KEY = 'aggressive';
const DPAD_STEP_SCALE = 0.2;

interface AxisStepMeta {
  stepPerInterval: number;
  intervalMs: number;
  direction: 1 | -1;
}

export function PtzCard() {
  const store = usePageStore();
  const view = useViewState();
  const containerState = useContainerState('group.ptz');
  const controlsLocked = Boolean(containerState?.data?.['lockControls']);
  const zoomVal = view.camera.ptz?.zoom?.value ?? PTZ_ZOOM_RANGE.min;
  const focusVal = view.camera.ptz?.focus?.value ?? PTZ_FOCUS_RANGE.min;
  const panVal = view.camera.ptz?.pan?.value ?? 0;
  const tiltVal = view.camera.ptz?.tilt?.value ?? 0;
  const panDisplay = Math.round(panVal);
  const tiltDisplay = Math.round(tiltVal);
  const zoomDisplay = Math.round(zoomVal);
  const focusDisplay = Math.round(focusVal);

  const [activeDirection, setActiveDirection] = useState<DpadDirection | null>(null);

  const holdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);     
  const holdDirectionRef = useRef<DpadDirection | null>(null);
  const holdPathRef = useRef<string | null>(null);
  const holdTickRef = useRef(0);
  const panTargetRef = useRef<number>(panVal);
  const tiltTargetRef = useRef<number>(tiltVal);
  const padFocusRef = useRef<HTMLDivElement | null>(null);
  const focusManager = useFocusManager();
  useFocusableControl(padFocusRef, {
    nodeId: 'zcam.camera.pages.main.ptz.controlPad',
    groupId: 'zcam.camera.pages.main.ptz',
    disabled: controlsLocked,
  });
  const keyboardHoldKeyRef = useRef<string | null>(null);

  useEffect(() => {
    panTargetRef.current = panVal;
  }, [panVal]);

  useEffect(() => {
    tiltTargetRef.current = tiltVal;
  }, [tiltVal]);

  const speedValue = view.camera.ptz?.speed?.value ?? 50;
  const baseStep = useMemo(() => {
    const normalized = Math.max(1, Math.min(100, speedValue));
    return Math.max(1, Math.round((normalized / 100) * 20));
  }, [speedValue]);

  const containerData = useMemo(
    () => ({
      pan: panDisplay,
      tilt: tiltDisplay,
      zoom: zoomDisplay,
      focus: focusDisplay,
      speed: Math.round(speedValue),
    }),
    [focusDisplay, panDisplay, speedValue, tiltDisplay, zoomDisplay],
  );
  useContainerData('group.ptz', containerData);
  const dpadProfile = useMemo(() => getSliderProfile(DPAD_PROFILE_KEY), []);

  const adjustAxis = useCallback(
    (axis: 'pan' | 'tilt', delta: number, nodePath: string, stepMeta?: AxisStepMeta) => {
      const ref = axis === 'pan' ? panTargetRef : tiltTargetRef;
      const range = axis === 'pan' ? PTZ_PAN_RANGE : PTZ_TILT_RANGE;
      const current = ref.current ?? (axis === 'pan' ? panVal : tiltVal);
      const candidate = Math.round(current + delta);
      const next = clamp(candidate, range.min, range.max);
      ref.current = next;
      const opId = axis === 'pan' ? 'ptz.setPan' : 'ptz.setTilt';
      const kind = axis === 'pan' ? 'ptz.pan' : 'ptz.tilt';
      const payload = stepMeta
        ? { value: next, params: { sliderMeta: stepMeta } }
        : { value: next };
      void store.runOperation(nodePath, kind, opId, payload);
    },
    [panVal, store, tiltVal],
  );

  const applyDirection = useCallback(
    (direction: DpadDirection, nodePath: string, tick = 0) => {
      const vector = DPAD_VECTOR[direction];
      if (!vector) return;
      // DPAD使用固定步长，不受归一化速度影响
      const baseStep = 1;
      const scaledStep = Math.max(1, baseStep * DPAD_STEP_SCALE);
      const intervalMs = getProfileInterval(dpadProfile);
      if (vector.pan) {
        const direction = vector.pan > 0 ? 1 : -1;
        adjustAxis('pan', vector.pan * scaledStep, nodePath, {
          stepPerInterval: Math.abs(vector.pan * scaledStep),
          intervalMs,
          direction,
        });
      }
      if (vector.tilt) {
        const direction = vector.tilt > 0 ? 1 : -1;
        adjustAxis('tilt', vector.tilt * scaledStep, nodePath, {
          stepPerInterval: Math.abs(vector.tilt * scaledStep),
          intervalMs,
          direction,
        });
      }
    },
    [adjustAxis, baseStep, dpadProfile],
  );

  const stopHold = useCallback(() => {
    holdDirectionRef.current = null;
    holdPathRef.current = null;
    holdTickRef.current = 0;
    setActiveDirection(null);
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    keyboardHoldKeyRef.current = null;
  }, []);

  const startHold = useCallback(
    (direction: DpadDirection, nodePath: string) => {
      holdDirectionRef.current = direction;
      holdPathRef.current = nodePath;
      holdTickRef.current = 0;
       setActiveDirection(direction);
      applyDirection(direction, nodePath, 0);
      if (holdTimerRef.current) {
        clearInterval(holdTimerRef.current);
      }
      const interval = getProfileInterval(dpadProfile);
      holdTimerRef.current = setInterval(() => {
        if (holdDirectionRef.current && holdPathRef.current) {
          holdTickRef.current += 1;
          applyDirection(holdDirectionRef.current, holdPathRef.current, holdTickRef.current);
        }
      }, interval);
    },
    [applyDirection, dpadProfile],
  );

  useEffect(() => {
    return () => {
      stopHold();
    };
  }, [stopHold]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleKeyUp = (event: KeyboardEvent) => {
      if (!keyboardHoldKeyRef.current) return;
      if (event.key === keyboardHoldKeyRef.current) {
        stopHold();
      }
    };
    const handleBlur = () => {
      if (keyboardHoldKeyRef.current) {
        stopHold();
      }
    };
    window.addEventListener('keyup', handleKeyUp, true);
    window.addEventListener('blur', handleBlur, true);
    return () => {
      window.removeEventListener('keyup', handleKeyUp, true);
      window.removeEventListener('blur', handleBlur, true);
    };
  }, [stopHold]);

  const handleCenter = useCallback(() => {
    void store.runOperation('zcam.camera.pages.main.ptz.stop', 'ptz.pan', 'ptz.setPan', { value: 0 });
    void store.runOperation('zcam.camera.pages.main.ptz.stop', 'ptz.tilt', 'ptz.setTilt', { value: 0 });
  }, [store]);

  const movePadFocus = useCallback(
    (direction: Direction) => {
      focusManager.moveToDirection(padFocusRef.current, direction);
    },
    [focusManager],
  );

  const handlePadKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (controlsLocked) return;
      const key = event.key;
      const lowerKey = key.length === 1 ? key.toLowerCase() : key;
      const navDirection = (FOCUS_NAV_KEYS as Record<string, Direction | undefined>)[lowerKey];
      if (navDirection) {
        event.preventDefault();
        stopHold();
        movePadFocus(navDirection);
        return;
      }
      const direction = DPAD_KEYBOARD_MAP[key as keyof typeof DPAD_KEYBOARD_MAP];
      if (direction) {
        event.preventDefault();
        if (event.repeat && holdDirectionRef.current === direction) {
          return;
        }
        keyboardHoldKeyRef.current = key;
        startHold(direction, PAD_KEYBOARD_NODE_PATH);
        return;
      }
      if (key === ' ' || key === 'Enter') {
        event.preventDefault();
        handleCenter();
      }
    },
    [controlsLocked, handleCenter, movePadFocus, startHold, stopHold],
  );

  const handlePadKeyUp = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const direction = DPAD_KEYBOARD_MAP[event.key as keyof typeof DPAD_KEYBOARD_MAP];
      if (direction) {
        event.preventDefault();
        stopHold();
      }
    },
    [stopHold],
  );

  return (
    <div className="zcam-card" data-path="zcam.camera.pages.main.ptz">
      <div className="zcam-card-header">
        <span className="zcam-card-title">PTZ</span>
        <span className="zcam-card-header-right">
          <span className="zcam-control-select" data-path="zcam.camera.pages.main.ptz.shortcutSelect" />
        </span>
      </div>
      <div className="zcam-card-body">
        <div className="zcam-ptz-layout" data-path="zcam.camera.pages.main.ptz.layout">
          <div className="zcam-ptz-pad-wrapper" data-path="zcam.camera.pages.main.ptz.controlPad">
            <div
              className="zcam-ptz-pad zcam-focusable-control"
              tabIndex={controlsLocked ? -1 : 0}
              data-focus-group="zcam.camera.pages.main.ptz"
              onKeyDown={handlePadKeyDown}
              onKeyUp={handlePadKeyUp}
              onBlur={stopHold}
              ref={padFocusRef}
            >
              <div className="zcam-ptz-grid" data-path="zcam.camera.pages.main.ptz.dpad">
                {DPAD_LAYOUT.map((btn) => {
                  if (!btn.direction) {
                    return (
                      <button
                        key={btn.path}
                        className="zcam-ptz-btn zcam-ptz-btn-main"
                        data-path={btn.path}
                        onClick={handleCenter}
                        disabled={controlsLocked}
                        tabIndex={-1}
                      >
                        {btn.label}
                      </button>
                    );
                  }
                  const direction = btn.direction;
                  const isActive = activeDirection === direction;
                  return (
                    <button
                      key={btn.path}
                      className={`zcam-ptz-btn${isActive ? ' zcam-ptz-btn-active' : ''}`}
                      data-path={btn.path}
                      tabIndex={-1}
                      onPointerDown={(e) => {
                        if (controlsLocked) return;
                        e.preventDefault();
                        if (e.currentTarget.setPointerCapture) {
                          try {
                            e.currentTarget.setPointerCapture(e.pointerId);
                          } catch {
                            // ignore
                          }
                        }
                        startHold(direction, btn.path);
                      }}
                      onPointerUp={(e) => {
                        e.preventDefault();
                        if (e.currentTarget.releasePointerCapture) {
                          try {
                            e.currentTarget.releasePointerCapture(e.pointerId);
                          } catch {
                            // ignore
                          }
                        }
                        stopHold();
                      }}
                      onPointerLeave={stopHold}
                      onTouchStart={(e) => {
                        if (controlsLocked) return;
                        e.preventDefault();
                        startHold(direction, btn.path);
                      }}
                      onTouchEnd={(e) => {
                        e.preventDefault();
                        stopHold();
                      }}
                      disabled={controlsLocked}
                    >
                      {btn.label}
                    </button>
                  );
                })}
              </div>
              <div className="zcam-ptz-status-grid" data-path="zcam.camera.pages.main.ptz.statusGrid">
                <div className="zcam-ptz-status-cell">
                  <span className="zcam-ptz-status-label">Pan</span>
                  <span className="zcam-ptz-status-value">{panDisplay}</span>
                </div>
                <div className="zcam-ptz-status-cell">
                  <span className="zcam-ptz-status-label">Tilt</span>
                  <span className="zcam-ptz-status-value">{tiltDisplay}</span>
                </div>
                <div className="zcam-ptz-status-cell">
                  <span className="zcam-ptz-status-label">Zoom</span>
                  <span className="zcam-ptz-status-value">{zoomDisplay}</span>
                </div>
                <div className="zcam-ptz-status-cell">
                  <span className="zcam-ptz-status-label">Focus</span>
                  <span className="zcam-ptz-status-value">{focusDisplay}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="zcam-ptz-sliders" data-path="zcam.camera.pages.main.ptz.sliders">
            <div className="zcam-ptz-slider-column">
              <SliderControl config={zoomSliderConfig} disabled={controlsLocked} />
            </div>
            <div className="zcam-ptz-slider-column">
              <SliderControl config={speedSliderConfig} disabled={controlsLocked} />
            </div>
          </div>
        </div>

        <FocusGroup disabled={controlsLocked} />
      </div>
    </div>
  );
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}
