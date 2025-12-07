// ShutterModal.tsx
// 快门选项模态框

import React from 'react';
import { Modal } from '../../../components/Modal.js';

const SHUTTER_OPTIONS = [30, 40, 50, 60, 80, 100, 120, 160, 200, 250, 320, 500];

interface ShutterModalProps {
  open: boolean;
  current?: number;
  anchorRef?: React.RefObject<HTMLElement>;
  onClose: () => void;
  onSelect: (value: number) => void;
}

export const ShutterModal: React.FC<ShutterModalProps> = ({ open, current, anchorRef, onClose, onSelect }) => {
  return (
    <Modal open={open} title="快门速度" anchorRef={anchorRef} onClose={onClose}>
      <div className="zcam-option-grid">
        {SHUTTER_OPTIONS.map((v) => (
          <button
            key={v}
            type="button"
            className={current === v ? 'zcam-chip-active' : ''}
            onClick={() => {
              onSelect(v);
              onClose();
            }}
          >
            1/{v}
          </button>
        ))}
      </div>
      <div style={{ marginTop: 8, textAlign: 'center' }}>
        <button type="button" className="zcam-modal-btn" onClick={onClose}>
          取消
        </button>
      </div>
    </Modal>
  );
};
