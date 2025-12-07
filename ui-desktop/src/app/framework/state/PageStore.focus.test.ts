import test from 'node:test';
import assert from 'node:assert';

import { PageStore, type UiState } from './PageStore.js';
import { OperationRegistry } from '../operations/OperationRegistry.js';
import { MockCliChannel } from '../transport/CliChannel.js';

test('PageStore setActiveNode / setHighlight update uiState correctly', () => {
  const ops = new OperationRegistry();
  const cli = new MockCliChannel();

  const initialUi: UiState = {
    selectedNodes: [],
    debugMode: 'normal',
    highlightMap: {},
    layoutMode: 'full',
  };

  const store = new PageStore({
    path: 'zcam.camera.pages.main',
    operations: ops,
    cli,
    initialUiState: initialUi,
  });

  const zoomPath = 'zcam.camera.pages.main.ptz.zoom';

  store.setActiveNode(zoomPath);
  const v1 = store.getViewState();
  assert.equal(v1.ui.activeNodePath, zoomPath);
  assert.deepEqual(v1.ui.selectedNodes, [zoomPath]);

  store.setHighlight(zoomPath, 'hover');
  const v2 = store.getViewState();
  assert.equal(v2.ui.highlightMap[zoomPath], 'hover');

  store.setHighlight(zoomPath, 'none');
  const v3 = store.getViewState();
  assert.ok(!('zcam.camera.pages.main.ptz.zoom' in v3.ui.highlightMap));
});
