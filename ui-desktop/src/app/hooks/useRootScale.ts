import { useEffect, useState } from 'react';
import { useUiSceneState } from './useUiSceneStore.js';

const SAFE_MARGIN_PX = 4;

export function useRootScale(): number {
  const { windowMode } = useUiSceneState();
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    let frame = 0;
    const update = () => {
      const root = document.querySelector(
        '.zcam-root-scale.page-shell',
      ) as HTMLElement | null;
      if (!root) {
        return;
      }

      const rootRect = root.getBoundingClientRect();
      const groupNodes = Array.from(
        root.querySelectorAll<HTMLElement>('[data-container-kind=\"group\"]'),
      );

      let naturalWidth = root.scrollWidth || root.clientWidth;
      let naturalHeight = root.scrollHeight || root.clientHeight;

      if (groupNodes.length > 0 && rootRect.width > 0 && rootRect.height > 0) {
        let minLeft = Number.POSITIVE_INFINITY;
        let maxRight = Number.NEGATIVE_INFINITY;
        let minTop = Number.POSITIVE_INFINITY;
        let maxBottom = Number.NEGATIVE_INFINITY;

        for (const el of groupNodes) {
          const rect = el.getBoundingClientRect();
          if (rect.width <= 0 || rect.height <= 0) continue;
          const left = rect.left - rootRect.left;
          const right = rect.right - rootRect.left;
          const top = rect.top - rootRect.top;
          const bottom = rect.bottom - rootRect.top;
          if (left < minLeft) minLeft = left;
          if (right > maxRight) maxRight = right;
          if (top < minTop) minTop = top;
          if (bottom > maxBottom) maxBottom = bottom;
        }

        const width = maxRight - minLeft;
        const height = maxBottom - minTop;
        if (Number.isFinite(width) && width > 0) {
          naturalWidth = width;
        }
        if (Number.isFinite(height) && height > 0) {
          naturalHeight = height;
        }
      }

      if (naturalWidth <= 0 || naturalHeight <= 0) {
        return;
      }

      const availWidth =
        (window.innerWidth || naturalWidth) - SAFE_MARGIN_PX * 2;
      const availHeight =
        (window.innerHeight || naturalHeight) - SAFE_MARGIN_PX * 2;

      const scaleX = availWidth / naturalWidth;
      const scaleY = availHeight / naturalHeight;
      const raw = Math.min(1, scaleX, scaleY);
      const next = raw > 0 && Number.isFinite(raw) ? raw : 1;
      setScale(next);
    };

    const schedule = () => {
      if (frame) {
        cancelAnimationFrame(frame);
      }
      frame = requestAnimationFrame(update);
    };

    schedule();
    window.addEventListener('resize', schedule);

    return () => {
      window.removeEventListener('resize', schedule);
      if (frame) {
        cancelAnimationFrame(frame);
      }
    };
  }, [windowMode]);

  return scale;
}

