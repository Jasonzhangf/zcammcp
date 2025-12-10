import React from 'react';

import { PageShell } from '../../components/PageShell.js';
import { MainSceneConfig } from '../../framework/ui/LayoutConfig.js';

export function MainScene() {
  return <PageShell scene={MainSceneConfig} />;
}
