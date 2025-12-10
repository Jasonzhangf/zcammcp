import React from 'react';

import { MainScene } from '../pages/main-scene/index.js';
import { BallScene } from '../pages/ball-scene/index.js';
import { useUiSceneStore } from '../hooks/useUiSceneStore.js';

export function RootScene() {
  const store = useUiSceneStore();
  return store.state.windowMode === 'ball' ? <BallScene /> : <MainScene />;
}
