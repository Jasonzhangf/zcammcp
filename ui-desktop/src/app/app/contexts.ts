import React from 'react';

import type { PageStore } from '../framework/state/PageStore.js';
import type { UiSceneStore } from '../framework/state/UiSceneStore.js';

// Core application contexts. Each store is independently testable
// and provided at the top-level React tree in main.tsx.
export const PageStoreContext = React.createContext<PageStore | null>(null);
export const UiSceneStoreContext = React.createContext<UiSceneStore | null>(null);
