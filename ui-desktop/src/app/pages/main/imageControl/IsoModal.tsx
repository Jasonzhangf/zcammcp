// IsoModal.tsx
// ISO 选项模态框

import React from 'react';
import { Modal } from '../../../components/Modal.js';

const ISO_OPTIONS = [100, 200, 400, 800, 1600, 3200, 6400, 12800];

interface IsoModalProps {
  open: boolean;
  current?: number;
  anchorRef?: React.RefObject<HTMLElement>;
  onClose: () => void;
  onSelect: (value: number) => void;
}

export const IsoModal: React.FC<IsoModalProps> = ({ open, current, anchorRef, onClose, onSelect }) => {
  return (
    <Modal open={open} title="ISO 感光度" anchorRef={anchorRef} onClose={onClose}>
      <div className="zcam-option-grid">
        {ISO_OPTIONS.map((v) => (
          <button
            key={v}
            type="button"
            className={current === v ? 'zcam-chip-active' : ''}
            onClick={() => {
              onSelect(v);
              onClose();
            }}
          >
            {v}
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
