import type { ReactNode } from 'react';

interface ResizableSidebarProps {
  side: 'left' | 'right';
  width: number;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onResizeStart: (e: React.MouseEvent, side: 'left' | 'right') => void;
  collapseLabel?: string;
  children: ReactNode;
}

export default function ResizableSidebar({
  side,
  width,
  collapsed,
  onToggleCollapse,
  onResizeStart,
  collapseLabel,
  children,
}: ResizableSidebarProps) {
  if (collapsed) {
    return (
      <div
        className={`shrink-0 flex flex-col items-center py-3 bg-[#2b2b2b] ${
          side === 'left' ? 'border-r' : 'border-l'
        } border-white/10 w-9`}
      >
        <button
          type="button"
          onClick={onToggleCollapse}
          title={collapseLabel ?? 'Apri pannello'}
          className="w-7 h-7 rounded hover:bg-white/10 text-white/70 hover:text-white text-sm flex items-center justify-center"
        >
          {side === 'left' ? '›' : '‹'}
        </button>
      </div>
    );
  }

  return (
    <aside
      style={{ width }}
      className={`relative shrink-0 flex flex-col bg-[#2b2b2b] ${
        side === 'left' ? 'border-r border-white/10' : 'border-l border-white/10'
      }`}
    >
      {children}
      <div
        role="separator"
        aria-orientation="vertical"
        onMouseDown={(e) => onResizeStart(e, side)}
        className={`absolute top-0 bottom-0 w-1.5 z-10 cursor-col-resize hover:bg-[#d24726]/40 active:bg-[#d24726]/60 ${
          side === 'left' ? 'right-0' : 'left-0'
        }`}
      />
    </aside>
  );
}
