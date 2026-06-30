import { useRef, type ReactNode } from 'react';
import { STAGE_H, STAGE_W, type StageMode, useStageBox } from '../hooks/useStageBox';

interface StageViewportProps {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
  mode?: StageMode;
}

export default function StageViewport({
  children,
  className = '',
  interactive = true,
  mode = 'fit',
}: StageViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { boxW, boxH, scale } = useStageBox(containerRef, mode);

  return (
    <div
      ref={containerRef}
      className={`w-full h-full flex items-center justify-center overflow-hidden bg-black ${className}`}
    >
      <div
        className="relative overflow-hidden shrink-0 animate-fade-in"
        style={{ width: boxW, height: boxH }}
      >
        <div
          className={interactive ? '' : 'pointer-events-none'}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: STAGE_W,
            height: STAGE_H,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
