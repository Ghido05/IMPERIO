import React, { useState, useMemo, useRef, useLayoutEffect, useEffect } from 'react';

let sharedCanvas: HTMLCanvasElement | null = null;
function getMeasurementCanvas(): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  if (!sharedCanvas) {
    sharedCanvas = document.createElement('canvas');
  }
  return sharedCanvas;
}

function measureLineWidth(
  text: string,
  fontFamily: string,
  fontWeight: string | number,
  refSize: number,
  letterSpacing?: string
): number {
  const canvas = getMeasurementCanvas();
  if (!canvas) return text.length * (refSize * 0.6);
  const ctx = canvas.getContext('2d');
  if (!ctx) return text.length * (refSize * 0.6);

  ctx.font = `${fontWeight} ${refSize}px ${fontFamily}`;
  if (letterSpacing && letterSpacing !== 'normal' && 'letterSpacing' in ctx) {
    try {
      (ctx as any).letterSpacing = letterSpacing;
    } catch {
      // ignore if unsupported
    }
  }
  return ctx.measureText(text).width;
}

export interface AutoFitTextProps {
  text?: string | null;
  maxFontSize?: number;
  minFontSize?: number;
  lineHeight?: number;
  align?: 'center' | 'left';
  fallbackWidth?: number;
  fallbackHeight?: number;
  className?: string;
  style?: React.CSSProperties;
}

export default function AutoFitText({
  text = '',
  maxFontSize = 38,
  minFontSize = 12,
  lineHeight = 1.15,
  align = 'center',
  fallbackWidth = 500,
  fallbackHeight = 84,
  className = '',
  style = {},
}: AutoFitTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: fallbackWidth,
    height: fallbackHeight,
  });

  const [fontFamily, setFontFamily] = useState(
    'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  );
  const [fontWeight, setFontWeight] = useState<string | number>('900');
  const [letterSpacing, setLetterSpacing] = useState('normal');

  // Normalizza il testo e separa le righe SOLO in corrispondenza di \n
  const lines = useMemo(() => {
    const raw = (text || '').replace(/\\n/g, '\n');
    const rawLines = raw.split('\n').map((l) => l.trim());

    // Rimuove eventuali righe vuote iniziali o finali non volute
    while (rawLines.length > 1 && rawLines[rawLines.length - 1] === '') {
      rawLines.pop();
    }
    while (rawLines.length > 1 && rawLines[0] === '') {
      rawLines.shift();
    }

    return rawLines.length > 0 ? rawLines : [''];
  }, [text]);

  // Rileva lo stile computato dal DOM
  useEffect(() => {
    if (containerRef.current) {
      const computed = window.getComputedStyle(containerRef.current);
      if (computed.fontFamily) setFontFamily(computed.fontFamily);
      if (computed.fontWeight) setFontWeight(computed.fontWeight);
      if (computed.letterSpacing) setLetterSpacing(computed.letterSpacing);
    }
  }, []);

  // Monitora le dimensioni effettive del contenitore
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w > 10 && h > 10) {
        setDimensions((prev) => {
          if (Math.abs(prev.width - w) > 1 || Math.abs(prev.height - h) > 1) {
            return { width: w, height: h };
          }
          return prev;
        });
      }
    };

    update();

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(update);
      ro.observe(el);
    }
    window.addEventListener('resize', update);

    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  // Calcolo dinamico della dimensione del font ottimale
  const fontSize = useMemo(() => {
    if (!lines || lines.length === 0 || (lines.length === 1 && lines[0] === '')) {
      return maxFontSize;
    }

    const containerW = dimensions.width;
    const containerH = dimensions.height;

    if (containerW <= 0 || containerH <= 0) {
      return maxFontSize;
    }

    // Vincolo altezza: tutte le righe devono rientrare nell'altezza del contenitore
    const availableH = containerH * 0.94;
    const maxByHeight = availableH / (lines.length * lineHeight);

    // Vincolo larghezza: ogni singola riga deve rientrare nella larghezza del contenitore (no a capo)
    const availableW = containerW * 0.96;
    const refSize = 100;

    let maxByWidth = maxFontSize;
    let minAllowedWidthSize = 9999;

    for (const line of lines) {
      if (!line) continue;
      const wAtRef = measureLineWidth(line, fontFamily, fontWeight, refSize, letterSpacing);
      if (wAtRef > 0) {
        const allowedSize = (availableW / wAtRef) * refSize;
        if (allowedSize < minAllowedWidthSize) {
          minAllowedWidthSize = allowedSize;
        }
      }
    }

    if (minAllowedWidthSize < 9999) {
      maxByWidth = minAllowedWidthSize;
    }

    const optimal = Math.min(maxFontSize, maxByHeight, maxByWidth);
    return Math.max(minFontSize, Math.floor(optimal * 10) / 10);
  }, [lines, dimensions, maxFontSize, minFontSize, lineHeight, fontFamily, fontWeight, letterSpacing]);

  return (
    <div
      ref={containerRef}
      className={`w-full h-full flex flex-col justify-center ${
        align === 'center' ? 'items-center text-center' : 'items-start text-left'
      } overflow-hidden pointer-events-none select-none ${className}`}
      style={style}
    >
      {lines.map((line, idx) => (
        <span
          key={idx}
          style={{
            fontSize: `${fontSize}px`,
            lineHeight: lineHeight,
          }}
          className="block whitespace-nowrap overflow-hidden text-ellipsis max-w-full"
        >
          {line}
        </span>
      ))}
    </div>
  );
}
