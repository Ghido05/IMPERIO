import { type ReactNode } from 'react';
import StageViewport from './StageViewport';

interface PresenterPreviewPanelProps {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  onToggleMaximize?: () => void;
  isMaximized?: boolean;
}

/** Anteprima relatore: contenitore 16:9 esatto, contenuto visibile per intero. */
export default function PresenterPreviewPanel({ 
  title, 
  children, 
  footer,
  onToggleMaximize,
  isMaximized = false
}: PresenterPreviewPanelProps) {
  return (
    <div className="flex flex-col min-h-0 min-w-0 h-full bg-black rounded-xl overflow-hidden shadow-2xl flex-1">
      <div className="bg-[#2b2b2b] flex items-center justify-between px-3 py-1 border-b border-white/10 shrink-0 text-white/70 select-none">
        <div className="w-20" /> {/* Balances button space to keep title centered */}
        <span className="text-xs font-bold tracking-wide uppercase text-white/50 text-center flex-1 truncate">
          {title}
        </span>
        {onToggleMaximize ? (
          <button
            type="button"
            onClick={onToggleMaximize}
            className="w-20 text-[9px] font-black uppercase tracking-wider text-white/40 hover:text-white bg-white/5 hover:bg-white/15 px-2 py-0.5 rounded border border-white/10 transition-all text-center cursor-pointer"
            title={isMaximized ? "Ripristina visuale divisa" : "Ingrandisci questa visuale"}
          >
            {isMaximized ? "↙ RIDUCI" : "⛶ ESPANDI"}
          </button>
        ) : (
          <div className="w-20" />
        )}
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
