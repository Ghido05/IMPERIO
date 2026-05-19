import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { GameDataProvider } from '../context/GameDataContext';
import type { Slide } from '../App';
import { cloneDefaultData } from '../lib/defaultGameData';
import SlideRenderer from './SlideRenderer';

const BASE_W = 1920;
const BASE_H = 1080;

interface SlideCanvasProps {
  slide: Slide;
  interactive?: boolean;
  className?: string;
  mode?: 'full' | 'thumbnail';
  thumbWidth?: number;
}

export default function SlideCanvas({
  slide,
  interactive = true,
  className = '',
  mode = 'full',
  thumbWidth = 128,
}: SlideCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);

  useEffect(() => {
    if (mode === 'thumbnail') return;
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setScale(Math.min(width / BASE_W, height / BASE_H));
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [mode]);

  if (slide.type === 'empty') {
    if (mode === 'thumbnail') {
      const h = (thumbWidth * 9) / 16;
      return (
        <div
          className={`bg-[#1a1a1a] ${className}`}
          style={{ width: thumbWidth, height: h }}
        />
      );
    }
    return (
      <div className={`w-full h-full ${className}`}>
        <div className="w-full h-full flex flex-col items-center justify-center bg-[#1a1a1a] border border-white/10">
          <div className="w-16 h-12 border-2 border-dashed border-white/20 rounded mb-3" />
          <p className="text-white/40 text-sm font-medium">Diapositiva vuota</p>
          <p className="text-white/25 text-xs mt-1">Scegli un gioco dal pannello a destra</p>
        </div>
      </div>
    );
  }

  const data = slide.data ?? cloneDefaultData(slide.type);

  if (mode === 'thumbnail') {
    const thumbScale = thumbWidth / BASE_W;
    const thumbHeight = (thumbWidth * 9) / 16;
    const stageStyle: CSSProperties = {
      width: BASE_W,
      height: BASE_H,
      transform: `scale(${thumbScale})`,
      transformOrigin: 'top left',
    };

    return (
      <div
        className={`overflow-hidden bg-black ${className}`}
        style={{ width: thumbWidth, height: thumbHeight }}
      >
        <div className="pointer-events-none" style={stageStyle}>
          <GameDataProvider data={data}>
            <SlideRenderer type={slide.type} />
          </GameDataProvider>
        </div>
      </div>
    );
  }

  const stageStyle: CSSProperties = {
    width: BASE_W,
    height: BASE_H,
    transform: `scale(${scale})`,
    transformOrigin: 'center center',
  };

  return (
    <div ref={containerRef} className={`relative w-full h-full overflow-hidden bg-black ${className}`}>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className={interactive ? '' : 'pointer-events-none'} style={stageStyle}>
          <GameDataProvider data={data}>
            <div className="relative" style={{ width: BASE_W, height: BASE_H }}>
              <SlideRenderer type={slide.type} />
            </div>
          </GameDataProvider>
        </div>
      </div>
    </div>
  );
}
