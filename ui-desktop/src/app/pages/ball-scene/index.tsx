import React from 'react';

import { PageShell } from '../../components/PageShell.js';
import { BallSceneConfig } from '../../framework/ui/LayoutConfig.js';

export function BallScene() {
  return <PageShell scene={BallSceneConfig} />;
}
