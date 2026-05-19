import type { Slide } from '../App';
import SlideCanvas from './SlideCanvas';

/** Larghezza anteprima nella colonna slide (stile PowerPoint) */
export const SLIDE_THUMB_WIDTH = 128;

interface SlideThumbnailProps {
  slide: Slide;
  index: number;
  isActive: boolean;
  onClick: () => void;
}

export default function SlideThumbnail({ slide, index, isActive, onClick }: SlideThumbnailProps) {
  return (
    <div className="flex items-center gap-2 py-0.5 w-full">
      <span
        className={`w-5 shrink-0 text-right text-xs tabular-nums leading-none ${
          isActive ? 'text-white font-medium' : 'text-white/50'
        }`}
      >
        {index + 1}
      </span>
      <button
        type="button"
        onClick={onClick}
        className={`shrink-0 rounded-[3px] overflow-hidden transition-shadow ${
          isActive
            ? 'ring-[3px] ring-[#c75a3a] ring-offset-1 ring-offset-[#2b2b2b] shadow-md'
            : 'ring-1 ring-white/15 hover:ring-white/30 opacity-90 hover:opacity-100'
        }`}
        aria-label={`Diapositiva ${index + 1}`}
        aria-current={isActive ? 'true' : undefined}
      >
        <SlideCanvas
          slide={slide}
          mode="thumbnail"
          thumbWidth={SLIDE_THUMB_WIDTH}
          interactive={false}
        />
      </button>
    </div>
  );
}
