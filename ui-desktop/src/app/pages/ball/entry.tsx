import React from 'react';
import { createRoot } from 'react-dom/client';
import { BallPage } from './index.js';
const root=document.getElementById('ball-root');
if(root){const reactRoot=createRoot(root); reactRoot.render(React.createElement(BallPage));}