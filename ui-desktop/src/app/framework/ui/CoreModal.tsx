// CoreModal.tsx
// 框架层通用模态框组件: 支持 anchorRef 定位, 但不关心业务内容

import React, { useEffect, useRef } from 'react';

export interface CoreModalProps {
  open: boolean;
  title: string;
  anchorRef?: React.RefObject<HTMLElement>;
  onClose: () => void;
  children?: React.ReactNode;
}

/**
 * 注意: #zcam-camera-root 使用了 transform/position fixed,
 * 因此这里不要直接用 window 坐标系做 position: fixed.
 * CoreModal 通过 backdrop 的坐标系计算 modal 的绝对定位,
 * 避免被外层 transform / overflow 裁剪。
 */
export const CoreModal: React.FC<CoreModalProps> = ({ open, title, anchorRef, onClose, children }) => {
  const backdropRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const timer = setTimeout(() => {
      const modal = modalRef.current;
      const backdrop = backdropRef.current;
      const anchor = anchorRef?.current;
      if (!modal || !backdrop || !anchor) {
        // 没有锚点时, 退回 CSS flex 居中
        return;
      }

      const anchorRect = anchor.getBoundingClientRect();
      const backdropRect = backdrop.getBoundingClientRect();
      const modalRect = modal.getBoundingClientRect();
      const width = modalRect.width || 260;

      // 以 backdrop 为坐标系计算
      const anchorCenterX = anchorRect.left + anchorRect.width / 2 - backdropRect.left;
      const top = anchorRect.bottom - backdropRect.top + 6; // 下方 6px
      const left = anchorCenterX - width / 2;

      modal.style.position = 'absolute';
      modal.style.left = `${Math.max(8, Math.min(left, backdropRect.width - width - 8))}px`;
      modal.style.top = `${Math.max(8, top)}px`;
    }, 0);

    return () => clearTimeout(timer);
  }, [open, anchorRef]);

  if (!open) return null;

  return (
    <div
      className="zcam-modal-backdrop"
      ref={backdropRef}
      onClick={onClose}
    >
      <div
        className="zcam-modal"
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="zcam-modal-header">
          <span className="zcam-modal-title">{title}</span>
        </div>
        <div className="zcam-modal-body">{children}</div>
      </div>
    </div>
  );
};
