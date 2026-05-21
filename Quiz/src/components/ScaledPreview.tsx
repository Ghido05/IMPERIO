import { useEffect, useRef, useState, type ReactNode, type CSSProperties } from 'react';

interface ScaledPreviewProps {
  children: ReactNode;
  logicalWidth?: number;
  logicalHeight?: number;
  className?: string;
  interactive?: boolean;
}

export default function ScaledPreview({
  children,
  logicalWidth = 1920,
  logicalHeight = 1080,
  className = '',
  interactive = true,
}: ScaledPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setScale(Math.min(width / logicalWidth, height / logicalHeight));
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [logicalWidth, logicalHeight]);

  const stageStyle: CSSProperties = {
    width: logicalWidth,
    height: logicalHeight,
    transform: `scale(${scale})`,
    transformOrigin: 'center center',
  };

  return (
    <div ref={containerRef} className={`relative w-full h-full overflow-hidden ${className}`}>
      <style>{`.min-h-screen { min-height: ${logicalHeight}px !important; }`}</style>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className={interactive ? '' : 'pointer-events-none'} style={stageStyle}>
          {children}
        </div>
      </div>
    </div>
  );
}
