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

      const baseWidth = root.scrollWidth || root.clientWidth;
      const baseHeight = root.scrollHeight || root.clientHeight;
      if (baseWidth <= 0 || baseHeight <= 0) {
        return;
      }

      // 为了避免控件的阴影 / 描边在缩放后被“吃掉”，这里把自然尺寸略微放大一个 SAFE_MARGIN，
      // 再用窗口尺寸减去 SAFE_MARGIN 计算可用空间，相当于多缩一点点，保证四条边都有缓冲。
      const naturalWidth = baseWidth + SAFE_MARGIN_PX * 2;
      const naturalHeight = baseHeight + SAFE_MARGIN_PX * 2;

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
