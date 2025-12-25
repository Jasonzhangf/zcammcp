import { useEffect, useState } from 'react';

const SAFE_MARGIN_PX = 4;

export function useRootScale(): number {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    let frame = 0;
    const update = () => {
      const root = document.querySelector('.zcam-root-scale.page-shell') as HTMLElement | null;
      if (!root) {
        return;
      }

      const scrollWidth = root.scrollWidth || root.clientWidth;
      const scrollHeight = root.scrollHeight || root.clientHeight;
      if (scrollWidth <= 0 || scrollHeight <= 0) {
        return;
      }

      const naturalWidth = scrollWidth;
      const naturalHeight = scrollHeight;

      const availWidth = (window.innerWidth || naturalWidth) - SAFE_MARGIN_PX * 2;
      const availHeight = (window.innerHeight || naturalHeight) - SAFE_MARGIN_PX * 2;

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
  }, []);

  return scale;
}
