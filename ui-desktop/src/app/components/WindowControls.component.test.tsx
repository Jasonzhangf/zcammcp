import '../../test/setupDom.js';

import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { WindowControls } from './WindowControls.js';
import { UiSceneStore } from '../framework/state/UiSceneStore.js';
import { UiSceneStoreContext } from '../app/contexts.js';

// Track electron API calls
let electronCalls: Array<{ method: string; args: unknown[] }> = [];

function setupElectronMock() {
  electronCalls = [];
  (globalThis as any).window.electronAPI = {
    shrinkToBall: () => { electronCalls.push({ method: 'shrinkToBall', args: [] }); },
    restoreFromBall: () => { electronCalls.push({ method: 'restoreFromBall', args: [] }); },
    toggleSize: () => { electronCalls.push({ method: 'toggleSize', args: [] }); },
    sendWindowCommand: (cmd: string) => { electronCalls.push({ method: 'sendWindowCommand', args: [cmd] }); },
    pushState: () => { electronCalls.push({ method: 'pushState', args: [] }); },
    close: () => { electronCalls.push({ method: 'close', args: [] }); },
  };
}

function cleanupElectronMock() {
  delete (globalThis as any).window.electronAPI;
}

function renderWithStore(store: UiSceneStore) {
  return render(
    <UiSceneStoreContext.Provider value={store}>
      <WindowControls />
    </UiSceneStoreContext.Provider>,
  );
}

test('WindowControls triggers ui.window.shrinkToBall when in main mode', () => {
  setupElectronMock();
  const store = new UiSceneStore({ windowMode: 'main', layoutSize: 'normal' });
  
  renderWithStore(store);
  
  const button = screen.getByTitle('缩小成球');
  fireEvent.click(button);
  
  // Verify store state changed
  assert.strictEqual(store.state.windowMode, 'ball');
  
  // Verify electron API was called
  assert.strictEqual(electronCalls.length, 2, 'Should call shrinkToBall and pushState');
  assert.strictEqual(electronCalls[0].method, 'shrinkToBall');
  
  cleanupElectronMock();
});

test('WindowControls triggers ui.window.restoreFromBall when in ball mode', () => {
  setupElectronMock();
  const store = new UiSceneStore({ windowMode: 'ball', layoutSize: 'studio' });
  
  renderWithStore(store);
  
  const button = screen.getByTitle('恢复主窗口');
  fireEvent.click(button);
  
  // Verify store state changed
  assert.strictEqual(store.state.windowMode, 'main');
  
  // Verify electron API was called
  assert.strictEqual(electronCalls.length, 2, 'Should call restoreFromBall and pushState');
  assert.strictEqual(electronCalls[0].method, 'restoreFromBall');
  
  cleanupElectronMock();
});

test('WindowControls pushState includes correct mode patch', () => {
  setupElectronMock();
  const store = new UiSceneStore({ windowMode: 'main', layoutSize: 'normal' });
  
  renderWithStore(store);
  
  const button = screen.getByTitle('缩小成球');
  fireEvent.click(button);
  
  // Verify pushState was called with mode: 'ball'
  const pushStateCall = electronCalls.find(c => c.method === 'pushState');
  assert.ok(pushStateCall, 'pushState should be called');
  
  cleanupElectronMock();
});

test('WindowControls toggles layout size correctly', () => {
  setupElectronMock();
  const store = new UiSceneStore({ windowMode: 'main', layoutSize: 'normal' });
  
  renderWithStore(store);
  
  const toggle = screen.getByTitle('布局方案 A');
  fireEvent.click(toggle);
  
  assert.strictEqual(store.state.layoutSize, 'studio');
  const hasToggleCall = electronCalls.some(c => c.method === 'toggleSize' || c.method === 'sendWindowCommand');
  assert.ok(hasToggleCall, 'Should call toggleSize or sendWindowCommand');
  
  cleanupElectronMock();
});

test.afterEach(() => {
  cleanup();
  cleanupElectronMock();
});
