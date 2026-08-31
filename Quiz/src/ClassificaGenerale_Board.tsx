import React from 'react';
import { useScores } from './context/ScoreContext';
import { useSyncedState } from './hooks/useSyncedState';
import { assetUrl } from './lib/assetUrl';
import { loadSetupStateDb } from './lib/quizDb';

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
  const [setup, setSetup] = React.useState<any>(null);
  const [_, setTick] = React.useState(0);

  const [activeBox] = useSyncedState<number>('playstate_active_box', 1);
  const [activeQuestion] = useSyncedState<number>('playstate_active_question', 1);
  const [box2StarterIdx, setBox2StarterIdx] = useSyncedState<number | null>('playstate_box2_starter_idx', null);
  const [box2ActiveTeamIdx, setBox2ActiveTeamIdx] = useSyncedState<number | null>('playstate_box2_active_team_idx', null);

  const activeSlideId = activeBox === 1 ? `box1_q${activeQuestion}` : '';
  const [bookedTeamVal] = useSyncedState<number | null>(`playstate_${activeSlideId}_booked_team`, null);


  React.useEffect(() => {
    async function loadData() {
      const fromDb = await loadSetupStateDb();
      if (fromDb && fromDb.punteggi) {
        setSetup(fromDb.punteggi);
      } else {
        const saved = localStorage.getItem('imperio_quiz_setup_config_v1');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (parsed.punteggi) {
              setSetup(parsed.punteggi);
            }
          } catch (e) {
            console.error('Error parsing setup state in board:', e);
          }
        }
      }
    }
    loadData();

    const isElectron = (window as any).electron !== undefined;
    if (isElectron) {
      const unsubscribe = (window as any).electron.onStateUpdate((state: any) => {
        if (state && state.setupStateUpdate && state.setupStateUpdate.punteggi) {
          setSetup(state.setupStateUpdate.punteggi);
        }
      });
      return unsubscribe;
    }
  }, []);

  // Sync / calculate starter index safely in a useEffect (no side-effects during render)
  React.useEffect(() => {
    if (activeBox === 2) {
      let currentStarter = box2StarterIdx;
      if (currentStarter === null) {
        // Find the index of the team with the lowest score
        let lowestIdx = 0;
        for (let i = 1; i < scores.length; i++) {
          if (Number(scores[i]) < Number(scores[lowestIdx])) {
            lowestIdx = i;
          }
        }
        setBox2StarterIdx(lowestIdx);
        currentStarter = lowestIdx;
      }
      
      // If we don't have an active team index yet, set it to the starter team for the current activeQuestion
      if (box2ActiveTeamIdx === null && currentStarter !== null) {
        const questionStarterIdx = (currentStarter + (activeQuestion - 1)) % 3;
        setBox2ActiveTeamIdx(questionStarterIdx);
      }
    } else if (activeBox === 1) {
      if (box2StarterIdx !== null) {
        setBox2StarterIdx(null);
      }
      if (box2ActiveTeamIdx !== null) {
        setBox2ActiveTeamIdx(null);
      }
    }
  }, [activeBox, box2StarterIdx, scores]);

  // When activeQuestion or activeBox changes, reset the active team to the starting team of the new question
  React.useEffect(() => {
    if (activeBox === 2 && box2StarterIdx !== null) {
      const questionStarterIdx = (box2StarterIdx + (activeQuestion - 1)) % 3;
      setBox2ActiveTeamIdx(questionStarterIdx);
    }
  }, [activeQuestion, activeBox, box2StarterIdx]);

  const blinkingTeamIdx = activeBox === 2 && box2ActiveTeamIdx !== null ? box2ActiveTeamIdx : -1;

  React.useEffect(() => {
    const handleIdbLoaded = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (
        customEvent.detail?.path === setup?.sfondo ||
        setup?.iconeBonus?.includes(customEvent.detail?.path)
      ) {
        setTick((t) => t + 1);
      }
    };
    window.addEventListener('idb-file-loaded', handleIdbLoaded);
    return () => window.removeEventListener('idb-file-loaded', handleIdbLoaded);
  }, [setup]);

  const teamNames = setup?.nomiSquadre || ['SQUADRA 1', 'SQUADRA 2', 'SQUADRA 3'];
  const teamConfigs = [
    { name: teamNames[0] || 'SQUADRA 1', color: 'bg-red-600', textColor: 'text-red-500' },
    { name: teamNames[1] || 'SQUADRA 2', color: 'bg-blue-600', textColor: 'text-blue-500' },
    { name: teamNames[2] || 'SQUADRA 3', color: 'bg-green-600', textColor: 'text-green-500' },
  ];

  const maxScore = Math.max(...scores, 10000); // Scale histogram to at least 10k

  return (
    <div
      className="relative w-[1920px] h-[1080px] bg-[#0a0a0a] text-white flex flex-col px-10 py-8 overflow-hidden font-sans"
      style={setup?.sfondo ? { backgroundImage: `url("${assetUrl(setup.sfondo)}")`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' } : {}}
    >
      <style>{`
        @keyframes custom-blink {
          0%, 100% { opacity: 1; filter: brightness(1.2) contrast(1.1); transform: scale(1.02); }
          50% { opacity: 0.5; filter: brightness(0.8) contrast(0.9); transform: scale(0.98); }
        }
        .animate-custom-blink {
          animation: custom-blink 1s infinite ease-in-out;
        }
      `}</style>

      {/* Background decoration */}
      {!setup?.sfondo && (
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-600/20 blur-[120px] rounded-full" />
          <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full" />
          <div className="absolute bottom-[-10%] left-[30%] w-[40%] h-[40%] bg-green-600/20 blur-[120px] rounded-full" />
        </div>
      )}

      <h1 className="text-5xl font-black text-center mb-6 tracking-tighter uppercase italic drop-shadow-[0_0_20px_rgba(255,255,255,0.3)] shrink-0">
        Classifica Generale
      </h1>

      <div className="flex-1 grid grid-cols-3 gap-10 min-h-0 px-4">
        {teamConfigs.map((team, i) => {
          const isBlinking = 
            (activeBox === 2 && blinkingTeamIdx === i) ||
            (activeBox === 1 && bookedTeamVal !== null && (bookedTeamVal - 1) === i);
          return (
            <div key={i} className="grid grid-rows-[auto_auto_240px_auto] h-full min-h-0 content-between">
              <div 
                onClick={() => {
                  if (activeBox === 2) {
                    setBox2ActiveTeamIdx(i);
                  }
                }}
                className={`
                  ${team.color} w-full py-4 rounded-2xl shadow-2xl flex items-center justify-center mb-3 border-4 transition-all duration-300
                  ${activeBox === 2 ? 'cursor-pointer hover:scale-105 active:scale-95' : ''}
                  ${isBlinking 
                    ? 'animate-custom-blink border-white ring-4 ring-white/50 shadow-[0_0_30px_rgba(255,255,255,0.6)]' 
                    : 'border-white/20'}
                `}
              >
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

            <div className="w-full bg-white/5 p-6 rounded-3xl border-2 border-white/10 flex justify-center items-center gap-3 min-h-[112px]">
              {[
                { key: 'dado', label: 'Dado', emoji: '🎲' },
                { key: 'switch', label: 'Switch', emoji: '🔄' },
                { key: 'arco', label: 'Arco', emoji: '🏹' },
                { key: 'scudo', label: 'Scudo', emoji: '🛡️' },
              ].map((bonusMeta, bonusIdx) => {
                const customImg = setup?.iconeBonus?.[bonusIdx];
                const isChecked = bonuses[i]?.[bonusIdx];
                return (
                  <div
                    key={bonusIdx}
                    onClick={() => toggleBonus(i, bonusIdx)}
                    title={bonusMeta.label}
                    className={`w-28 h-28 rounded-2xl flex items-center justify-center transition-all duration-500 border-2 cursor-pointer
                      ${isChecked
                        ? `${team.color} border-white shadow-[0_0_20px_rgba(255,255,255,0.4)] scale-110`
                        : 'bg-transparent border-white/10 opacity-20 scale-90 grayscale'}
                    `}
                  >
                    {customImg && customImg.trim() !== '' ? (
                      <img
                        src={assetUrl(customImg)}
                        alt={bonusMeta.label}
                        className="w-[72px] h-[72px] object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : null}
                    {(!customImg || customImg.trim() === '') && (
                      <span className="text-5xl">{bonusMeta.emoji}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )})}
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
