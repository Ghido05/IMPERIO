import React from 'react';
import { useScores } from './context/ScoreContext';
import { useSyncedState } from './hooks/useSyncedState';
import { assetUrl } from './lib/assetUrl';
import { loadSetupStateDb } from './lib/quizDb';
import { formatScoreNumber } from './lib/formatUtils';

const EditableScore: React.FC<{ 
  index: number; 
  score: number; 
  setScore: (i: number, val: number) => void;
  isAnimated?: boolean;
}> = ({ index, score, setScore, isAnimated = false }) => {
  const [isEditing, setIsEditing] = React.useState(false);
  const [localValue, setLocalValue] = React.useState(score.toString());
  const [animScore, setAnimScore] = React.useState(isAnimated ? 0 : score);

  // Animazione progressiva di conteggio all'avvio del Box 1
  React.useEffect(() => {
    if (!isAnimated) {
      setAnimScore(score);
      return;
    }
    let startTime: number | null = null;
    const startVal = 0;
    const targetVal = score;
    const duration = 1600;

    let animId: number;
    const animate = (now: number) => {
      if (!startTime) startTime = now;
      const progress = Math.min(1, (now - startTime) / duration);
      // Easing cubico fluido
      const ease = 1 - Math.pow(1 - progress, 3);
      setAnimScore(Math.round(startVal + (targetVal - startVal) * ease));
      if (progress < 1) {
        animId = requestAnimationFrame(animate);
      } else {
        setAnimScore(targetVal);
      }
    };
    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [score, isAnimated]);

  // Sincronizza il valore locale se cambia dall'esterno (es. reset o altra finestra)
  React.useEffect(() => {
    if (!isEditing) {
      setLocalValue(isAnimated ? animScore.toString() : score.toString());
    }
  }, [score, isEditing, animScore, isAnimated]);

  const displayValue = isEditing ? localValue : formatScoreNumber(isAnimated ? animScore : score);

  return (
    <div className={`mb-3 group relative shrink-0 flex items-center justify-center ${isAnimated ? 'animate-point-pulse' : ''}`}>
      <input
        type="text"
        inputMode="numeric"
        value={displayValue}
        onFocus={() => {
          setIsEditing(true);
          setLocalValue((score || 0).toString());
        }}
        onChange={(e) => {
          const val = e.target.value.replace(/\D/g, '');
          setLocalValue(val);
          if (val !== '') {
            setScore(index, parseInt(val, 10));
          }
        }}
        onBlur={() => {
          setIsEditing(false);
          if (localValue === '') {
            setLocalValue('0');
            setScore(index, 0);
          } else {
            setScore(index, parseInt(localValue, 10) || 0);
          }
        }}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Enter') {
            (e.target as HTMLInputElement).blur();
          }
        }}
        className="bg-transparent text-6xl font-black text-center w-full focus:outline-none focus:ring-2 focus:ring-white/20 rounded-xl transition-all hover:bg-white/5 cursor-text drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
        style={{ width: `${Math.max(displayValue.length, 3)}ch` }}
      />
      <span className="text-2xl font-black ml-2 opacity-70 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">PT</span>
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
      if (customEvent.detail?.path === setup?.sfondo) {
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
  const isBox0 = activeBox === 0;

  const prevBoxRef = React.useRef<number | null>(null);
  const [isTransitioning, setIsTransitioning] = React.useState(false);

  React.useEffect(() => {
    // Transizione specifica da fine Box 0 ad inizio Box 1
    if (prevBoxRef.current === 0 && activeBox === 1) {
      setIsTransitioning(true);
      const timer = setTimeout(() => {
        setIsTransitioning(false);
      }, 2800);
      return () => clearTimeout(timer);
    }
    // Entrata iniziale in Box 1
    if (prevBoxRef.current === null && activeBox === 1) {
      setIsTransitioning(true);
      const timer = setTimeout(() => {
        setIsTransitioning(false);
      }, 2800);
      prevBoxRef.current = activeBox;
      return () => clearTimeout(timer);
    }
    prevBoxRef.current = activeBox;
  }, [activeBox]);

  // Supporto scorciatoia da tastiera "T" per rivedere la transizione dei punteggi e dello sfondo
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }
      if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        setIsTransitioning(true);
        setTimeout(() => setIsTransitioning(false), 2800);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="relative w-[1920px] h-[1080px] bg-[#0a0a0a] text-white flex flex-col px-10 py-8 overflow-hidden font-sans select-none">
      <style>{`
        @keyframes custom-blink {
          0%, 100% { opacity: 1; filter: brightness(1.2) contrast(1.1); transform: scale(1.02); }
          50% { opacity: 0.5; filter: brightness(0.8) contrast(0.9); transform: scale(0.98); }
        }
        .animate-custom-blink {
          animation: custom-blink 1s infinite ease-in-out;
        }

        @keyframes pointGlowPulse {
          0% {
            filter: drop-shadow(0 0 2px rgba(255,255,255,0.4));
            transform: scale(0.95);
          }
          45% {
            filter: drop-shadow(0 0 28px rgba(251, 191, 36, 1)) drop-shadow(0 0 45px rgba(245, 158, 11, 0.7));
            transform: scale(1.06);
          }
          100% {
            filter: drop-shadow(0 2px 8px rgba(0,0,0,0.8));
            transform: scale(1);
          }
        }
        .animate-point-pulse {
          animation: pointGlowPulse 1.8s ease-out forwards;
        }

        @keyframes barGrowUp {
          0% {
            transform: scaleY(0);
            opacity: 0;
          }
          25% {
            opacity: 1;
          }
          100% {
            transform: scaleY(1);
            opacity: 1;
          }
        }

        @keyframes energyBeamSweep {
          0% {
            transform: translateY(180px);
            opacity: 0;
          }
          30% {
            opacity: 1;
          }
          100% {
            transform: translateY(-200px);
            opacity: 0;
          }
        }

        @keyframes bonusSlideIn {
          0% {
            opacity: 0;
            transform: translateY(28px) scale(0.88);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes goldLightSweep {
          0% {
            transform: translateX(-100%) skewX(-15deg);
            opacity: 0;
          }
          35% {
            opacity: 0.6;
          }
          100% {
            transform: translateX(180%) skewX(-15deg);
            opacity: 0;
          }
        }
        .animate-gold-sweep {
          animation: goldLightSweep 2.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* SFONDO GENERALE DEL TORNEO - Dissolvenza graduale fluida tra Box 0 e Box 1 */}
      <div
        className={`absolute inset-0 bg-cover bg-center pointer-events-none transition-opacity duration-1500 ease-in-out ${
          !isBox0 ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          backgroundImage: `url("${assetUrl(setup?.sfondo || '/Icone/sfondi/sfondo_generale_torneo.jpg')}")`,
          backgroundRepeat: 'no-repeat',
        }}
      />

      {/* Bagliore atmosferico di transizione allo sfondo */}
      <div
        className={`absolute inset-0 pointer-events-none transition-opacity duration-1500 ease-in-out bg-gradient-to-t from-black/80 via-black/40 to-black/60 ${
          !isBox0 ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Fascio di luce dorata che spazza lo schermo alla transizione */}
      {isTransitioning && (
        <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
          <div className="w-[180%] h-full bg-gradient-to-r from-transparent via-amber-300/25 to-transparent animate-gold-sweep" />
        </div>
      )}

      {/* Background decoration in Box 0 (sfuma via fluidamente entrando in Box 1) */}
      <div
        className={`absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none transition-opacity duration-1200 ${
          isBox0 ? 'opacity-25' : 'opacity-0'
        }`}
      >
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-600/20 blur-[120px] rounded-full" />
        <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[30%] w-[40%] h-[40%] bg-green-600/20 blur-[120px] rounded-full" />
      </div>

      <h1 className="text-5xl font-black text-center mb-6 tracking-tighter uppercase italic drop-shadow-[0_0_20px_rgba(255,255,255,0.3)] shrink-0 z-20">
        Classifica Generale
      </h1>

      {isBox0 ? (
        /* Vista Box 0: Senza sfondo, visibili solo i nomi delle squadre e i punteggi */
        <div className="flex-1 flex flex-col justify-center items-center px-4 z-20">
          <div className="w-full max-w-6xl grid grid-cols-3 gap-12">
            {teamConfigs.map((team, i) => (
              <div 
                key={i} 
                className="bg-[#18181b]/80 border-2 border-white/20 rounded-3xl p-8 flex flex-col items-center justify-center shadow-2xl backdrop-blur-md"
              >
                <div className={`${team.color} w-full py-5 rounded-2xl shadow-xl flex items-center justify-center mb-6 border-2 border-white/30`}>
                  <span className="text-4xl font-black tracking-widest uppercase">{team.name}</span>
                </div>

                <div className="py-4">
                  <EditableScore index={i} score={scores[i]} setScore={setScore} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Vista Normale: Istogramma completo e bonus con rivelazione graduale all'ingresso nel Box 1 */
        <div className="flex-1 grid grid-cols-3 gap-10 min-h-0 px-4 z-20 transition-all duration-700">
          {teamConfigs.map((team, i) => {
            const isBlinking = 
              (activeBox === 2 && blinkingTeamIdx === i) ||
              (activeBox === 1 && bookedTeamVal !== null && (bookedTeamVal - 1) === i);
            const teamScore = scores[i] || 0;
            const barHeightPct = Math.max((teamScore / maxScore) * 100, 6); // Base minima visibile del 6%

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

                <EditableScore 
                  index={i} 
                  score={scores[i]} 
                  setScore={setScore} 
                  isAnimated={isTransitioning}
                />

                {/* Traccia Istogramma e Colonna che cresce dal basso verso l'alto */}
                <div className="w-full relative overflow-hidden min-h-[180px] my-2 rounded-t-3xl bg-white/5 border border-white/10 shadow-inner">
                  {/* Fascio di energia che sale all'inizio del box 1 */}
                  {isTransitioning && (
                    <div
                      className="absolute inset-x-0 h-28 bg-gradient-to-t from-transparent via-amber-300/40 to-white/70 blur-md pointer-events-none z-10"
                      style={{
                        animation: `energyBeamSweep 1.6s ease-out ${i * 0.25}s forwards`,
                      }}
                    />
                  )}

                  {/* Barra colorata dell'istogramma con crescita graduale */}
                  <div
                    className={`absolute bottom-0 left-0 w-full ${team.color} shadow-[0_0_40px_rgba(255,255,255,0.1)] rounded-t-3xl origin-bottom`}
                    style={{
                      height: `${barHeightPct}%`,
                      animation: isTransitioning
                        ? `barGrowUp 1.6s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.25}s backwards`
                        : undefined,
                      transition: isTransitioning ? undefined : 'height 1000ms ease-out',
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-white/50 shadow-[0_0_10px_white]" />
                  </div>
                </div>

                {/* Vaschetta Equipaggiamenti / Bonus che compaiono a cascata */}
                <div className="w-full bg-white/5 p-6 rounded-3xl border-2 border-white/10 flex justify-center items-center gap-3 min-h-[112px]">
                  {[
                    { key: 'dado', label: 'Dado', emoji: '🎲' },
                    { key: 'switch', label: 'Switch', emoji: '🔄' },
                    { key: 'arco', label: 'Arco', emoji: '🏹' },
                    { key: 'scudo', label: 'Scudo', emoji: '🛡️' },
                  ].map((bonusMeta, bonusIdx) => {
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
                        style={isTransitioning ? {
                          animation: `bonusSlideIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${0.4 + bonusIdx * 0.12}s backwards`
                        } : undefined}
                      >
                        <span className="text-5xl">{bonusMeta.emoji}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reset button hidden for safety but accessible via keyboard or dev */}
      <div className="fixed bottom-4 right-4 opacity-5 hover:opacity-100 transition-opacity z-30">
        <button 
          onClick={() => {
            if (window.confirm("Sei sicuro di voler resettare tutti i punteggi?")) {
              resetAll();
            }
          }}
          className="bg-red-900 text-white text-xs px-2 py-1 rounded cursor-pointer"
        >
          RESET
        </button>
      </div>
    </div>
  );
};

export default ClassificaGenerale_Board;
