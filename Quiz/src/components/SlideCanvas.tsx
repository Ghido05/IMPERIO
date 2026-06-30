import { GameDataProvider } from '../context/GameDataContext';
import type { Slide } from '../App';
import { cloneDefaultData } from '../lib/defaultGameData';
import SlideRenderer from './SlideRenderer';
import StageViewport from './StageViewport';
import { STAGE_H, STAGE_W, type StageMode } from '../hooks/useStageBox';
import type { CSSProperties } from 'react';

interface SlideCanvasProps {
  slide: Slide;
  interactive?: boolean;
  className?: string;
  mode?: 'full' | 'thumbnail';
  thumbWidth?: number;
  /** fill = finestra esterna; fit = contenitore 16:9; none = solo canvas 1920×1080 (dentro PresenterPreviewPanel) */
  viewportMode?: StageMode | 'none';
}

export default function SlideCanvas({
  slide,
  interactive = true,
  className = '',
  mode = 'full',
  thumbWidth = 128,
  viewportMode = 'fit',
}: SlideCanvasProps) {
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

  const data = {
    ...(slide.data ?? cloneDefaultData(slide.type)),
    slideId: slide.id,
  };

  if (mode === 'thumbnail') {
    const thumbScale = thumbWidth / STAGE_W;
    const thumbHeight = (thumbWidth * 9) / 16;
    const stageStyle: CSSProperties = {
      width: STAGE_W,
      height: STAGE_H,
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
            <SlideRenderer type={slide.type} interactive={false} />
          </GameDataProvider>
        </div>
      </div>
    );
  }

  const stageContent = (
    <GameDataProvider data={data}>
      <div
        className={interactive ? 'relative' : 'relative pointer-events-none'}
        style={{ width: STAGE_W, height: STAGE_H }}
      >
        <SlideRenderer type={slide.type} interactive={interactive} />
      </div>
    </GameDataProvider>
  );

  if (viewportMode === 'none') {
    return <div className={`w-full h-full ${className}`}>{stageContent}</div>;
  }

  return (
    <div className={`w-full h-full ${className}`}>
      <StageViewport interactive={interactive} mode={viewportMode}>
        {stageContent}
      </StageViewport>
    </div>
  );
}
