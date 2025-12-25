import { useEffect, useState } from 'react';

const DESIGN_WIDTH = 1200;
const DESIGN_HEIGHT = 720;

export function useRootScale(): number {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const update = () => {
      const width = window.innerWidth || DESIGN_WIDTH;
      const height = window.innerHeight || DESIGN_HEIGHT;
      const scaleX = width / DESIGN_WIDTH;
      const scaleY = height / DESIGN_HEIGHT;
      const next = Math.min(1, scaleX, scaleY);
      setScale(next > 0 && Number.isFinite(next) ? next : 1);
    };

    update();
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('resize', update);
    };
  }, []);

  return scale;
}

