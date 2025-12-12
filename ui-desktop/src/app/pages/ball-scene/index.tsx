import React from 'react';

import { PageShell } from '../../components/PageShell.js';
import { getSceneConfig } from '../../framework/ui/LayoutConfig.js';
import { useUiSceneState } from '../../hooks/useUiSceneStore.js';

export function BallScene() {
  const sceneState = useUiSceneState();
  const sceneConfig = getSceneConfig('ball', sceneState.layoutSize);
  return <PageShell scene={sceneConfig} />;
}
