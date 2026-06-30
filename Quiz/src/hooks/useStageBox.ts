import { useEffect, useState, type RefObject } from 'react';

export const STAGE_W = 1920;
export const STAGE_H = 1080;
export const STAGE_RATIO = STAGE_W / STAGE_H;

export type StageMode = 'fit' | 'fill';

export interface StageMetrics {
  boxW: number;
  boxH: number;
  scale: number;
}

function measureContainer(el: HTMLElement) {
  const rect = el.getBoundingClientRect();
  return {
    w: Math.round(rect.width),
    h: Math.round(rect.height),
  };
}

/**
 * fit  = rettangolo 16:9 massimo nel contenitore (anteprime relatore)
 * fill = cover centrato, riempie senza bande (finestre esterne / fullscreen)
 */
export function useStageBox(
  containerRef: RefObject<HTMLElement | null>,
  mode: StageMode = 'fit',
): StageMetrics {
  const [metrics, setMetrics] = useState<StageMetrics>({
    boxW: 0,
    boxH: 0,
    scale: 0,
  });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const { w: pw, h: ph } = measureContainer(el);
      if (!pw || !ph) return;

      if (mode === 'fill') {
        const fillScale = Math.max(pw / STAGE_W, ph / STAGE_H);
        setMetrics({
          boxW: STAGE_W * fillScale,
          boxH: STAGE_H * fillScale,
          scale: fillScale,
        });
        return;
      }

      const pr = pw / ph;
      const boxW = pr > STAGE_RATIO ? ph * STAGE_RATIO : pw;
      const boxH = pr > STAGE_RATIO ? ph : pw / STAGE_RATIO;
      setMetrics({
        boxW,
        boxH,
        scale: boxW / STAGE_W,
      });
    };

    const onViewportChanged = () => requestAnimationFrame(update);

    update();

    const observer = new ResizeObserver(onViewportChanged);
    observer.observe(el);
    window.addEventListener('resize', onViewportChanged);
    document.addEventListener('fullscreenchange', onViewportChanged);

    const electron = (window as unknown as { electron?: { onViewportChanged?: (cb: () => void) => () => void } }).electron;
    const unsubscribeViewport = electron?.onViewportChanged?.(onViewportChanged);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', onViewportChanged);
      document.removeEventListener('fullscreenchange', onViewportChanged);
      if (unsubscribeViewport) unsubscribeViewport();
    };
  }, [containerRef, mode]);

  return metrics;
}
