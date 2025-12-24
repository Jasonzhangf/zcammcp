import React from 'react';
import { createRoot } from 'react-dom/client';
import { BallPage } from './index.js';
import { FocusManagerProvider } from '../../framework/ui/FocusManager.js';
import './style.css';

const rootEl = document.getElementById('ball-root');
if (!rootEl) throw new Error('ball-root missing');
const root = createRoot(rootEl);
root.render(
  <FocusManagerProvider>
    <BallPage />
  </FocusManagerProvider>,
);
