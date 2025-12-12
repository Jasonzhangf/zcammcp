import React from 'react';

import { MainScene } from '../pages/main-scene/index.js';
import { BallScene } from '../pages/ball-scene/index.js';
import { useUiSceneState } from '../hooks/useUiSceneStore.js';

export function RootScene() {
  const scene = useUiSceneState();
  return scene.windowMode === 'ball' ? <BallScene /> : <MainScene />;
}
