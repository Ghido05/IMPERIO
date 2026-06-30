import React from 'react';
import { useScores } from './context/ScoreContext';
import { assetUrl } from './lib/assetUrl';

const teamConfigs = [
  { name: 'SQUADRA 1', color: 'bg-red-600', textColor: 'text-red-500' },
  { name: 'SQUADRA 2', color: 'bg-blue-600', textColor: 'text-blue-500' },
  { name: 'SQUADRA 3', color: 'bg-green-600', textColor: 'text-green-500' },
];

const EditableScore: React.FC<{ index: number; score: number; setScore: (i: number, val: number) => void }> = ({ index, score, setScore }) => {
  const [localValue, setLocalValue] = React.useState(score.toString());

  // Sincronizza il valore locale se cambia dall'esterno (es. reset o altra finestra)
  React.useEffect(() => {
    setLocalValue(score.toString());
  }, [score]);

  return (
    <div className="mb-3 group relative shrink-0 flex items-center justify-center">
      <input
        type="text"
        inputMode="numeric"
        value={localValue}
        onChange={(e) => {
          const val = e.target.value.replace(/\D/g, '');
          setLocalValue(val);
          if (val !== '') {
            setScore(index, parseInt(val));
          }
        }}
        onBlur={() => {
          if (localValue === '') {
            setLocalValue('0');
            setScore(index, 0);
          }
        }}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Enter') {
            (e.target as HTMLInputElement).blur();
          }
        }}
        className="bg-transparent text-6xl font-black text-center w-full focus:outline-none focus:ring-2 focus:ring-white/20 rounded-xl transition-all hover:bg-white/5 cursor-text"
        style={{ width: `${Math.max(localValue.length, 3)}ch` }}
      />
      <span className="text-2xl font-black ml-2 opacity-50">PT</span>
      <div className="absolute -bottom-1 left-0 w-full h-0.5 bg-white/20 scale-x-0 group-hover:scale-x-100 transition-transform" />
    </div>
  );
};

const ClassificaGenerale_Board: React.FC = () => {
  const { scores, bonuses, setScore, toggleBonus, resetAll } = useScores();

  const maxScore = Math.max(...scores, 10000); // Scale histogram to at least 10k

  return (
    <div className="relative w-[1920px] h-[1080px] bg-[#0a0a0a] text-white flex flex-col px-10 py-8 overflow-hidden font-sans">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-600/20 blur-[120px] rounded-full" />
        <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[30%] w-[40%] h-[40%] bg-green-600/20 blur-[120px] rounded-full" />
      </div>

      <h1 className="text-5xl font-black text-center mb-6 tracking-tighter uppercase italic drop-shadow-[0_0_20px_rgba(255,255,255,0.3)] shrink-0">
        Classifica Generale
      </h1>

      <div className="flex-1 grid grid-cols-3 gap-10 min-h-0 px-4">
        {teamConfigs.map((team, i) => (
          <div key={i} className="grid grid-rows-[auto_auto_240px_auto] h-full min-h-0 content-between">
            <div className={`${team.color} w-full py-4 rounded-2xl shadow-2xl flex items-center justify-center mb-3 border-4 border-white/20`}>
              <span className="text-3xl font-black tracking-widest">{team.name}</span>
            </div>

            <EditableScore index={i} score={scores[i]} setScore={setScore} />

            <div className="w-full relative overflow-hidden min-h-[180px] my-2">
              <div
                className={`absolute bottom-0 left-0 w-full ${team.color} transition-all duration-1000 ease-out shadow-[0_0_40px_rgba(255,255,255,0.1)] rounded-t-3xl`}
                style={{ height: `${(scores[i] / maxScore) * 100}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                <div className="absolute top-0 left-0 w-full h-1 bg-white/40" />
              </div>
            </div>

            <div className="w-full bg-white/5 p-4 rounded-3xl border-2 border-white/10 flex justify-center gap-5">
              {[0, 1, 2].map(bonusIdx => (
                <div
                  key={bonusIdx}
                  onClick={() => toggleBonus(i, bonusIdx)}
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-500 border-2 cursor-pointer
                    ${bonuses[i][bonusIdx]
                      ? `${team.color} border-white shadow-[0_0_20px_rgba(255,255,255,0.4)] scale-110`
                      : 'bg-transparent border-white/10 opacity-20 scale-90 grayscale'}
                  `}
                >
                  <img
                    src={assetUrl(`Icone/nessuno_musicale/${bonusIdx === 0 ? 'Primo' : bonusIdx === 1 ? 'Secondo' : 'Terzo'} indizio.svg`)}
                    alt="Bonus"
                    className="w-10 h-10 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://placehold.co/100x100/ffffff/000000?text=B${bonusIdx + 1}`;
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Reset button hidden for safety but accessible via keyboard or dev */}
      <div className="fixed bottom-4 right-4 opacity-5 hover:opacity-100 transition-opacity">
        <button 
          onClick={() => {
            if (window.confirm("Sei sicuro di voler resettare tutti i punteggi?")) {
              resetAll();
            }
          }}
          className="bg-red-900 text-white text-xs px-2 py-1 rounded"
        >
          RESET
        </button>
      </div>
    </div>
  );
};

export default ClassificaGenerale_Board;
