import type { SlideType } from '../App';
import { GAME_OPTIONS } from '../lib/gameMeta';

interface GameSelectorProps {
  onSelect: (type: SlideType) => void;
  compact?: boolean;
}

export default function GameSelector({ onSelect, compact = false }: GameSelectorProps) {
  if (compact) {
    return (
      <div className="space-y-2">
        {GAME_OPTIONS.filter((g) => g.type !== 'classifica_generale').map((game) => (
          <button
            key={game.type}
            type="button"
            onClick={() => onSelect(game.type)}
            className="w-full p-3 rounded-lg border border-white/10 hover:border-[#d24726]/50 bg-black/20 hover:bg-black/40 text-left flex gap-3 items-start transition-colors"
          >
            <span className={`w-8 h-8 rounded ${game.color} shrink-0 flex items-center justify-center text-xs font-bold`}>
              {game.shortTitle.charAt(0)}
            </span>
            <span>
              <span className="block text-sm font-semibold">{game.title}</span>
              <span className="block text-[11px] text-white/50 mt-0.5">{game.description}</span>
            </span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="w-full h-full p-8 flex flex-col items-center bg-gray-900 overflow-y-auto">
      <h2 className="text-3xl font-bold text-white mb-8 mt-4 shrink-0">Seleziona un gioco</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl w-full pb-8">
        {GAME_OPTIONS.filter((g) => g.type !== 'classifica_generale').map((game) => (
          <button
            key={game.type}
            type="button"
            onClick={() => onSelect(game.type)}
            className="p-6 rounded-xl border border-gray-700 hover:border-gray-400 transition-all flex flex-col items-start text-left bg-gray-800 hover:bg-gray-750 hover:shadow-lg group"
          >
            <div className={`w-10 h-10 rounded-full mb-4 ${game.color} flex items-center justify-center text-white font-bold text-xl group-hover:scale-110 transition-transform`}>
              {game.title.charAt(0)}
            </div>
            <h3 className="text-lg font-bold text-white mb-2">{game.title}</h3>
            <p className="text-sm text-gray-400">{game.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
