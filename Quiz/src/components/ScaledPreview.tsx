import { type ReactNode } from 'react';
import StageViewport from './StageViewport';
import type { StageMode } from '../hooks/useStageBox';

interface ScaledPreviewProps {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
  mode?: StageMode;
}

export default function ScaledPreview({
  children,
  className = '',
  interactive = true,
  mode = 'fill',
}: ScaledPreviewProps) {
  return (
    <StageViewport className={className} interactive={interactive} mode={mode}>
      {children}
    </StageViewport>
  );
}
