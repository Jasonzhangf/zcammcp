import '../../test/setupDom.js';

import assert from 'node:assert/strict';
import test from 'node:test';

import React from 'react';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';

import { SliderControl } from './SliderControl.js';
import type { SliderControlConfig } from '../framework/ui/ControlConfig.js';
import type { OperationPayload, PageStore, ViewState } from '../framework/state/PageStore.js';
import { PageStoreContext } from '../app/contexts.js';
import { FocusManagerProvider } from '../framework/ui/FocusManager.js';
import { getSliderProfile, getProfileInterval } from '../framework/ui/SliderProfiles.js';

type SliderMeta = { stop?: boolean } | undefined;

interface RunCall {
  payload: OperationPayload;
  meta: SliderMeta;
}

class MockSliderStore {
  private listeners = new Set<() => void>();
  private viewState: ViewState;
  private calls: RunCall[] = [];

  constructor(initialValue: number) {
    this.viewState = {
      camera: {
        ptz: {
          pan: { value: 0, view: '0' },
          tilt: { value: 0, view: '0' },
          zoom: { value: initialValue, view: String(initialValue) },
        },
      },
      ui: {
        selectedNodes: [],
        debugMode: 'normal',
        highlightMap: {},
        layoutMode: 'full',
      },
    };
  }

  getCalls(): RunCall[] {
    return this.calls;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getViewState(): ViewState {
    return this.viewState;
  }

  getLastActiveValue(): number | null {
    for (let i = this.calls.length - 1; i >= 0; i -= 1) {
      const meta = this.calls[i].meta;
      if (meta?.stop) {
        continue;
      }
      const value = Number(this.calls[i].payload.value);
      if (Number.isFinite(value)) {
        return value;
      }
    }
    return null;
  }

  getLastCallIsStop(): boolean {
    const last = this.calls[this.calls.length - 1];
    return Boolean(last?.meta?.stop);
  }

  async runOperation(nodePath: string, kind: string, operationId: string, payload: OperationPayload): Promise<void> {
    const meta = (payload.params as Record<string, unknown> | undefined)?.['sliderMeta'] as SliderMeta;
    this.calls.push({ payload, meta });
    const value = Number(payload.value);
    if (Number.isFinite(value)) {
      this.setZoomValue(value);
    }
  }

  private setZoomValue(value: number): void {
    this.viewState = {
      ...this.viewState,
      camera: {
        ...this.viewState.camera,
        ptz: {
          ...(this.viewState.camera.ptz ?? {}),
          zoom: { value, view: String(value) },
        },
      },
    };
    this.notify();
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

}

function renderSlider(store: MockSliderStore, config: SliderControlConfig) {
  return render(
    <FocusManagerProvider>
      <PageStoreContext.Provider value={store as unknown as PageStore}>
        <SliderControl config={config} />
      </PageStoreContext.Provider>
    </FocusManagerProvider>,
  );
}

test('slider resumes stepping after stop-hold cycle', async (t) => {
  const initialValue = 1000;
  const store = new MockSliderStore(initialValue);
  const config: SliderControlConfig = {
    nodePath: 'zcam.camera.ptz.zoomTest',
    kind: 'ptz.zoom',
    label: 'Zoom Test',
    size: 'small',
    orientation: 'vertical',
    valueRange: { min: 0, max: 20000, step: 10 },
    readValue: (view) => view.camera.ptz?.zoom?.value ?? 0,
    formatValue: (value) => String(Math.round(value)),
    operationId: 'ptz.setZoom',
    profileKey: 'zoomBoost',
    keyBindings: ['ArrowUp', 'ArrowDown'],
  };

  const result = renderSlider(store, config);
  t.after(() => {
    cleanup();
  });

  const slider = result.getByRole('slider');
  slider.focus();

  fireEvent.keyDown(slider, { key: 'ArrowUp' });
  await waitFor(() => {
    const active = store.getLastActiveValue();
    assert.ok(active !== null && active > initialValue, `expected active value > ${initialValue}, got ${active}`);
  });
  const firstStep = store.getLastActiveValue()!;

  fireEvent.keyUp(slider, { key: 'ArrowUp' });
  await waitFor(() => {
    assert.ok(store.getLastCallIsStop(), 'expected stop meta after releasing key');
  });

  fireEvent.keyDown(slider, { key: 'ArrowUp' });
  await waitFor(() => {
    const active = store.getLastActiveValue();
    assert.ok(active !== null && active > firstStep, `expected restart value > ${firstStep}, got ${active}`);
  });

  fireEvent.keyUp(slider, { key: 'ArrowUp' });
});

test('slider handles native key repeat and restart after release (black-box)', async (t) => {
  const initialValue = 500;
  const store = new MockSliderStore(initialValue);
  const config: SliderControlConfig = {
    nodePath: 'zcam.camera.ptz.zoomBlackBox',
    kind: 'ptz.zoom',
    label: 'Zoom BlackBox',
    size: 'small',
    orientation: 'vertical',
    valueRange: { min: 0, max: 20000, step: 10 },
    readValue: (view) => view.camera.ptz?.zoom?.value ?? 0,
    formatValue: (value) => String(Math.round(value)),
    operationId: 'ptz.setZoom',
    profileKey: 'zoomBoost',
    keyBindings: ['ArrowUp', 'ArrowDown'],
  };
  const result = renderSlider(store, config);
  t.after(() => cleanup());
  const slider = result.getByRole('slider');
  slider.focus();

  fireEvent.keyDown(slider, { key: 'ArrowUp' });
  fireEvent.keyDown(slider, { key: 'ArrowUp', repeat: true });
  await waitFor(() => {
    const active = store.getLastActiveValue();
    assert.ok(active !== null && active > initialValue, 'should increase on first press');
  });
  fireEvent.keyUp(slider, { key: 'ArrowUp' });
  await waitFor(() => {
    assert.ok(store.getLastCallIsStop(), 'stop command should be sent after keyup');
  });
  const betweenValue = store.getLastActiveValue();
  fireEvent.keyDown(slider, { key: 'ArrowUp' });
  await waitFor(() => {
    const active = store.getLastActiveValue();
    assert.ok(active !== null && active > (betweenValue ?? initialValue), 'second press should increase further');
  });
  fireEvent.keyUp(slider, { key: 'ArrowUp' });
});

test('slider hold speed is capped to 10 normalized units per second', async (t) => {
  const initialValue = 0;
  const store = new MockSliderStore(initialValue);
  const profileKey = 'zoomBoost';
  const config: SliderControlConfig = {
    nodePath: 'zcam.camera.ptz.zoomLimit',
    kind: 'ptz.zoom',
    label: 'Zoom Limit',
    size: 'small',
    orientation: 'vertical',
    valueRange: { min: 0, max: 20000, step: 10 },
    readValue: (view) => view.camera.ptz?.zoom?.value ?? 0,
    formatValue: (value) => String(Math.round(value)),
    operationId: 'ptz.setZoom',
    profileKey,
    minHoldStep: 5000,
    keyBindings: ['ArrowUp'],
  };
  const result = renderSlider(store, config);
  t.after(() => cleanup());
  const slider = result.getByRole('slider');
  slider.focus();
  fireEvent.keyDown(slider, { key: 'ArrowUp' });
  await waitFor(() => {
    expectCalls(store, 1);
  });
  const firstCall = store.getCalls()[0];
  const value = Number(firstCall.payload.value);
  const delta = value - initialValue;
  const profile = getSliderProfile(profileKey);
  const interval = getProfileInterval(profile);
  const normalizedPerTick = (10 * interval) / 1000;
  const expectedDelta = (config.valueRange.max - config.valueRange.min) * (normalizedPerTick / 100);
  assert.equal(delta, expectedDelta, 'normalized speed limit should clamp delta');
  fireEvent.keyUp(slider, { key: 'ArrowUp' });
});

function expectCalls(store: MockSliderStore, minCount: number): void {
  if (store.getCalls().length < minCount) {
    throw new Error(`expected >=${minCount} calls, got ${store.getCalls().length}`);
  }
}
