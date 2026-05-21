import { useCallback, useEffect, useRef, useState } from 'react';

interface Options {
  initialWidth: number;
  minWidth: number;
  maxWidth: number;
  storageKey?: string;
  initialCollapsed?: boolean;
}

export function useResizablePanel({ initialWidth, minWidth, maxWidth, storageKey, initialCollapsed = false }: Options) {
  const [width, setWidth] = useState(() => {
    if (storageKey) {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const n = Number(saved);
        if (!Number.isNaN(n)) return Math.min(maxWidth, Math.max(minWidth, n));
      }
    }
    return initialWidth;
  });
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  useEffect(() => {
    if (storageKey && !collapsed) {
      localStorage.setItem(storageKey, String(width));
    }
  }, [width, collapsed, storageKey]);

  const onResizeStart = useCallback(
    (e: React.MouseEvent, side: 'left' | 'right') => {
      e.preventDefault();
      dragging.current = true;
      startX.current = e.clientX;
      startWidth.current = width;

      const onMove = (ev: MouseEvent) => {
        if (!dragging.current) return;
        const delta = ev.clientX - startX.current;
        const next = side === 'left' ? startWidth.current + delta : startWidth.current - delta;
        setWidth(Math.min(maxWidth, Math.max(minWidth, next)));
      };

      const onUp = () => {
        dragging.current = false;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };

      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [width, minWidth, maxWidth],
  );

  return { width, setWidth, collapsed, setCollapsed, onResizeStart };
}
