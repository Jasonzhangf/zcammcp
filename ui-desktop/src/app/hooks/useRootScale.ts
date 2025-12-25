import { useEffect, useState } from 'react';

const SAFE_MARGIN_PX = 4;

export function useRootScale(): number {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    let frame = 0;
    let currentScale = 1;

    const applyScale = (next: number) => {
      currentScale = next;
      setScale(next);
    };

    const update = () => {
      const root = document.querySelector('.zcam-root-scale.page-shell') as HTMLElement | null;
      if (!root) {
        if (currentScale !== 1) {
          applyScale(1);
        }
        return;
      }

      const rect = root.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        if (currentScale !== 1) {
          applyScale(1);
        }
        return;
      }

      const naturalWidth = rect.width / currentScale;
      const naturalHeight = rect.height / currentScale;

      const availWidth = (window.innerWidth || naturalWidth) - SAFE_MARGIN_PX * 2;
      const availHeight = (window.innerHeight || naturalHeight) - SAFE_MARGIN_PX * 2;

      const scaleX = availWidth / naturalWidth;
      const scaleY = availHeight / naturalHeight;
      const raw = Math.min(1, scaleX, scaleY);
      const next = raw > 0 && Number.isFinite(raw) ? raw : 1;

      if (Math.abs(next - currentScale) > 0.001) {
        applyScale(next);
      }
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
  }, []);

  return scale;
}

