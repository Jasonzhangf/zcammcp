import React from 'react';
import { createRoot } from 'react-dom/client';
import { BallPage } from './index.js';
import { FocusManagerProvider } from '../../framework/ui/FocusManager.js';
const root=document.getElementById('ball-root');
if(root){const reactRoot=createRoot(root); reactRoot.render(React.createElement(FocusManagerProvider,null,React.createElement(BallPage)));}
