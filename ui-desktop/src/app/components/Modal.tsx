// Modal.tsx
// 通用模态框组件，用于快门/ISO 等选项弹窗，通过 CoreModal 实现锚点定位。

import React from 'react';
import { CoreModal } from '../framework/ui/CoreModal.js';

interface ModalProps {
  open: boolean;
  title: string;
  anchorRef?: React.RefObject<HTMLElement>;
  onClose: () => void;
  children?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = (props) => {
  return <CoreModal {...props} />;
};
