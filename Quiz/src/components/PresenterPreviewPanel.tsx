import { type ReactNode } from 'react';
import StageViewport from './StageViewport';

interface PresenterPreviewPanelProps {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

/** Anteprima relatore: contenitore 16:9 esatto, contenuto visibile per intero. */
export default function PresenterPreviewPanel({ title, children, footer }: PresenterPreviewPanelProps) {
  return (
    <div className="flex flex-col min-h-0 min-w-0 h-full bg-black rounded-xl overflow-hidden shadow-2xl">
      <div className="bg-[#2b2b2b] text-center text-xs py-1 text-white/50 border-b border-white/10 shrink-0">
        {title}
      </div>
      <div className="flex-1 min-h-0 w-full flex items-center justify-center bg-[#2b2b2b] p-2">
        <div className="relative w-full max-h-full aspect-video overflow-hidden bg-black rounded-md shadow-inner">
          <StageViewport mode="fit">{children}</StageViewport>
        </div>
      </div>
      {footer && (
        <div className="shrink-0 flex justify-center py-2.5 px-3 bg-[#2b2b2b] border-t border-white/10">
          {footer}
        </div>
      )}
    </div>
  );
}
