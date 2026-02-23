// IsoModal.tsx
// ISO 选项模态框

import React from 'react';
import { Modal } from '../../../components/Modal.js';

interface IsoModalProps {
  open: boolean;
  current?: number | string;
  options?: string[];
  anchorRef?: React.RefObject<HTMLElement>;
  onClose: () => void;
  onSelect: (value: string) => void;
}

export const IsoModal: React.FC<IsoModalProps> = ({ open, current, options, anchorRef, onClose, onSelect }) => {
  const displayOptions = options && options.length > 0 ? options : ['Auto', '100', '200', '400', '800', '1600', '3200', '6400'];
  return (
    <Modal open={open} title="ISO 感光度" anchorRef={anchorRef} onClose={onClose}>
      <div className="zcam-option-grid">
        {displayOptions.map((v) => (
          <button
            key={v}
            type="button"
            className={String(current) === v ? 'zcam-chip-active' : ''}
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
