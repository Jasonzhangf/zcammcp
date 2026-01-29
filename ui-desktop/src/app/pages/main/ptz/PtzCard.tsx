import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { ContainerNode } from '../../../framework/container/ContainerNode.js';
import { SliderControl } from '../../../components/SliderControl.js';
import { TBarControl } from '../../../components/TBarControl.js';
import { PtzCircularControl, PtzDirection8 } from '../../../components/PtzCircularControl.js';
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
  readValue: (view) => view.ui.ptzSpeed ?? 50,
  formatValue: (value) => String(Math.round(value)),
  onValueChange: (value, store) => {
    store.updateUiState({ ptzSpeed: value });
  },
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
  const [viewMode, setViewMode] = useState<'pad' | 'wheel'>('wheel');

  const holdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdDirectionRef = useRef<DpadDirection | null>(null);
  const holdPathRef = useRef<string | null>(null);
  const holdTickRef = useRef(0);
  const panTargetRef = useRef<number>(panVal);
  const tiltTargetRef = useRef<number>(tiltVal);
  const padFocusRef = useRef<HTMLDivElement | null>(null);
  const focusManager = useFocusManager();
  const ptzBusy = Boolean(view.ui.ptzBusy);
  const isInteractionDisabled = controlsLocked || ptzBusy;

  useFocusableControl(padFocusRef, {
    nodeId: 'zcam.camera.pages.main.ptz.controlPad',
    groupId: 'zcam.camera.pages.main.ptz',
    disabled: isInteractionDisabled,
  });
  const keyboardHoldKeyRef = useRef<string | null>(null);

  useEffect(() => {
    panTargetRef.current = panVal;
  }, [panVal]);

  useEffect(() => {
    tiltTargetRef.current = tiltVal;
  }, [tiltVal]);

  const speedValue = view.ui.ptzSpeed ?? 50;
  const baseStep = useMemo(() => {
    // 直接使用 speedValue 作为步长 (1-100)
    return Math.max(1, speedValue);
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

  const lastJoystickTimeRef = useRef<number>(0);
  const handleJoystickMove = useCallback(
    (panSpeed: number, tiltSpeed: number) => {
      const now = Date.now();
      // Throttle: only send every 50ms, unless stopping (0,0) which sends immediately
      const isStop = panSpeed === 0 && tiltSpeed === 0;
      if (isStop) {
        // Send explicit STOP command on release
        void store.runOperation('zcam.camera.pages.main.ptz', 'ptz.stop', 'ptz.stop', {});
        return;
      }

      if (now - lastJoystickTimeRef.current < 50) {
        return;
      }

      // Use action-based API for analog move
      // This routes through the Store -> OperationRegistry -> RealCliChannel -> Electron Bridge -> Backend
      void store.runOperation('zcam.camera.pages.main.ptz', 'ptz.move_analog', 'ptz.move_analog', {
        params: {
          pan: panSpeed,
          tilt: tiltSpeed
        }
      });

      lastJoystickTimeRef.current = now;
    },
    []
  );

  const applyDirection = useCallback(
    (direction: DpadDirection, nodePath: string) => {
      // Use new action-based API instead of coordinate calculation
      // Normalize speed (0-100) to 0.0-1.0 range
      const rawSpeed = Math.max(1, baseStep); // baseStep is from slider (0-100)
      const speed = parseFloat((rawSpeed / 100.0).toFixed(2));

      void store.runOperation(nodePath, 'ptz.move', 'ptz.move', {
        params: {
          direction: direction,
          speed: speed
        }
      });
    },
    [baseStep, store],
  );

  const stopHold = useCallback(() => {
    if (holdDirectionRef.current) {
      void store.runOperation(holdPathRef.current || 'zcam.camera.pages.main.ptz', 'ptz.stop', 'ptz.stop', {});
    }
    holdDirectionRef.current = null;
    holdPathRef.current = null;
    holdTickRef.current = 0;
    setActiveDirection(null);
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    keyboardHoldKeyRef.current = null;
  }, [store]);

  const startHold = useCallback(
    (direction: DpadDirection, nodePath: string) => {
      holdDirectionRef.current = direction;
      holdPathRef.current = nodePath;
      holdTickRef.current = 0;
      setActiveDirection(direction);
      setActiveDirection(direction);
      applyDirection(direction, nodePath);
      if (holdTimerRef.current) {
        clearInterval(holdTimerRef.current);
      }
      holdTimerRef.current = setInterval(() => {
        // Keep alive logic? Or just rely on single start command?
        // New API uses start/stop, so we don't need to repeatedly send move commands if the device handles continuous movement.
        // However, if the device needs heartbeat, we might need to resend.
        // The previous logic was "step calculation". 
        // For now, let's assume "start" is enough, but maybe we shouldn't act repeatedly.
        // ACTUALLY: applyDirection sends the "move" command.
        // If we want "start" semantics, we call it once.
        // Let's remove the interval for repeat sending if the API is "start moving until stop".

        // If we need to re-send to keep alive, we can keep it.
        // But logs showed "Wait=30ms", it's fast. Re-sending might flood?
        // Let's assume start/stop logic.
      }, 1000); // Dummy interval just to keep 'hold' state active? Or remove interval entirely?
      // Better to remove interval if API handles continuous move.
      clearInterval(holdTimerRef.current);
      holdTimerRef.current = null; // No interval needed for continuous move command
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
      if (isInteractionDisabled) return;
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

  const handleCircularMove = useCallback((direction: PtzDirection8) => {
    // Map 8 directions to ptz.move
    // Using existing applyDirection logic but adapted if needed.
    // DpadDirection has same values as PtzDirection8 (checking types... yes looks same strings)
    // "up", "up-left" etc.
    // We need to find the full path for the "button" context if we want to use the same logging/focus logic,
    // but for raw functionality we just need a valid nodePath to attach the operation to.
    // We can use the container path.
    startHold(direction as DpadDirection, 'zcam.camera.pages.main.ptz.wheel');
  }, [startHold]);

  const toggleViewMode = useCallback(() => {
    setViewMode(prev => prev === 'pad' ? 'wheel' : 'pad');
  }, []);

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
              style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}
            >
              <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 0 }}>
                <PtzCircularControl
                  onStartMove={handleCircularMove}
                  onStopMove={stopHold}
                  onJoystickMove={handleJoystickMove}
                  disabled={isInteractionDisabled}
                  style={{ width: '220px', height: '220px' }}
                />
              </div>

              {/* Home Button */}
              <div
                className="zcam-ptz-home-btn"
                onClick={() => void store.runOperation('zcam.camera.pages.main.ptz.home', 'ptz.home', 'ptz.home', {})}
                style={{
                  position: 'absolute',
                  bottom: '80px', // Adjust to sit in corner of the pad area
                  right: '10px',
                  width: '36px',
                  height: '36px',
                  borderRadius: '6px',
                  backgroundColor: '#333',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: isInteractionDisabled ? 'default' : 'pointer',
                  opacity: isInteractionDisabled ? 0.5 : 1,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                  border: '1px solid #444',
                }}
                title="Home"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#ccc">
                  <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
                </svg>
              </div>

              <div className="zcam-ptz-status-grid" data-path="zcam.camera.pages.main.ptz.statusGrid" style={{ marginTop: 'auto' }}>
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
          <div className="zcam-ptz-sliders" data-path="zcam.camera.pages.main.ptz.sliders" style={{ gap: '12px' }}>
            <div className="zcam-ptz-slider-column" style={{ height: '374px' }}>
              <TBarControl config={zoomSliderConfig} disabled={isInteractionDisabled} styleVariant="skeuomorphic" />
            </div>
            <div className="zcam-ptz-slider-column" style={{ height: '374px' }}>
              <SliderControl config={speedSliderConfig} disabled={isInteractionDisabled} />
            </div>
          </div>
        </div>

        <FocusGroup disabled={isInteractionDisabled} />
      </div>
    </div>
  );
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}
