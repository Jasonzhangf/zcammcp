// ShutterModal.tsx
// 快门选项模态框

import React from 'react';
import { Modal } from '../../../components/Modal.js';

// Fallback legacy options
const SHUTTER_OPTIONS = [30, 40, 50, 60, 80, 100, 120, 160, 200, 250, 320, 500];

interface OptionItem {
  label: string;
  value: string | number;
}

interface ShutterModalProps {
  open: boolean;
  current?: string | number;
  options?: OptionItem[];
  anchorRef?: React.RefObject<HTMLElement>;
  onClose: () => void;
  onSelect: (value: string | number) => void;
}

export const ShutterModal: React.FC<ShutterModalProps> = ({ open, current, options, anchorRef, onClose, onSelect }) => {
  // If options passed, use them. Otherwise assume legacy "1/v" numbers.
  const displayOptions: OptionItem[] = options?.length
    ? options
    : SHUTTER_OPTIONS.map(v => ({ label: `1/${v}`, value: v })); // Legacy behavior: value is int, label is 1/v

  return (
    <Modal open={open} title="快门速度" anchorRef={anchorRef} onClose={onClose}>
      <div className="zcam-option-grid">
        {displayOptions.map((opt) => (
          <button
            key={String(opt.value)}
            type="button"
            className={current === opt.value ? 'zcam-chip-active' : ''}
            onClick={() => {
              onSelect(opt.value);
              onClose();
            }}
          >
            {opt.label}
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
