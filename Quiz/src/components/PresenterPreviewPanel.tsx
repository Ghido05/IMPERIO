import { type ReactNode } from 'react';
import StageViewport from './StageViewport';

interface PresenterPreviewPanelProps {
  title?: string;
  headerLeft?: ReactNode;
  headerCenter?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  bottomRightAction?: ReactNode;
  onToggleMaximize?: () => void;
  isMaximized?: boolean;
  contentMode?: 'fit' | 'fill';
}

/** Anteprima relatore: contenitore 16:9 esatto ('fit') o esteso all'intero spazio grigio ('fill'). */
export default function PresenterPreviewPanel({ 
  title, 
  headerLeft,
  headerCenter,
  children, 
  footer,
  bottomRightAction,
  onToggleMaximize,
  isMaximized = false,
  contentMode = 'fit',
}: PresenterPreviewPanelProps) {
  return (
    <div className="flex flex-col min-h-0 min-w-0 h-full bg-black rounded-xl overflow-hidden shadow-2xl flex-1">
      <div className="h-8 bg-[#2b2b2b] flex items-center justify-between px-3 border-b border-white/10 shrink-0 text-white/70 select-none">
        <div className="w-24 flex items-center justify-start shrink-0">
          {headerLeft}
        </div>
        {headerCenter ? (
          <div className="flex-1 flex justify-center items-center min-w-0">
            {headerCenter}
          </div>
        ) : (
          <span className="text-xs font-bold tracking-wide uppercase text-white/50 text-center flex-1 truncate px-2">
            {title}
          </span>
        )}
        <div className="w-24 flex items-center justify-end shrink-0">
          {onToggleMaximize && (
            <button
              type="button"
              onClick={onToggleMaximize}
              className="text-[9px] font-black uppercase tracking-wider text-white/40 hover:text-white bg-white/5 hover:bg-white/15 px-2.5 py-0.5 rounded border border-white/10 transition-all text-center cursor-pointer active:scale-95"
              title={isMaximized ? "Ripristina visuale divisa" : "Ingrandisci questa visuale"}
            >
              {isMaximized ? "↙ RIDUCI" : "⛶ ESPANDI"}
            </button>
          )}
        </div>
      </div>
      <div className={`flex-1 min-h-0 w-full ${contentMode === 'fill' ? 'flex flex-col' : 'flex items-center justify-center'} bg-[#2b2b2b] p-2 relative overflow-hidden`}>
        {contentMode === 'fill' ? (
          <div className="w-full h-full min-h-0 overflow-hidden rounded-md shadow-inner">
            {children}
          </div>
        ) : (
          <div className="relative w-full max-h-full aspect-video overflow-hidden bg-black rounded-md shadow-inner">
            <StageViewport mode="fit">{children}</StageViewport>
          </div>
        )}
        {footer && (
          <div className="absolute bottom-2 inset-x-0 flex justify-center pointer-events-none z-30 px-3">
            <div className="pointer-events-auto">
              {footer}
            </div>
          </div>
        )}
        {bottomRightAction && (
          <div className="absolute bottom-2.5 right-3 z-30 pointer-events-auto">
            {bottomRightAction}
          </div>
        )}
      </div>
    </div>
  );
}
