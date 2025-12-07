// Modal.tsx
// 通用模态框组件，用于快门/ISO 等选项弹窗

import React from 'react';

interface ModalProps {
  open: boolean;
  title: string;
  anchorRef?: React.RefObject<HTMLElement>;
  onClose: () => void;
  children?: React.ReactNode;
  footer?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ open, title, anchorRef, onClose, children, footer }) => {
  if (!open) return null;

  const modalNode = (
    <div className="zcam-modal">
      <div className="zcam-modal-header">
        <span className="zcam-modal-title">{title}</span>
      </div>
      <div className="zcam-modal-body">{children}</div>
      {footer && <div className="zcam-modal-footer">{footer}</div>}
    </div>
  );

  return (
    <div className="zcam-modal-backdrop" onClick={onClose}>
      {modalNode}
    </div>
  );
};
