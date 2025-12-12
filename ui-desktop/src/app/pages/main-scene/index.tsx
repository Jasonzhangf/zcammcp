import React from 'react';

import { PageShell } from '../../components/PageShell.js';
import { getSceneConfig } from '../../framework/ui/LayoutConfig.js';
import { useUiSceneState } from '../../hooks/useUiSceneStore.js';

export function MainScene() {
  const sceneState = useUiSceneState();
  const sceneConfig = getSceneConfig('main', sceneState.layoutSize);
  return <PageShell scene={sceneConfig} />;
}
