import React from 'react';
import { useScores } from './context/ScoreContext';
import { useSyncedState } from './hooks/useSyncedState';
import { assetUrl } from './lib/assetUrl';
import { loadSetupStateDb } from './lib/quizDb';
import { formatScoreNumber } from './lib/formatUtils';
import { playTeamBookingSound } from './lib/teamBookingSound';
import BuzzerStatusBadge from './components/BuzzerStatusBadge';
import { useBuzzerActive } from './hooks/useBuzzerActive';

let sharedScoreAudioCtx: AudioContext | null = null;
function getScoreAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedScoreAudioCtx || sharedScoreAudioCtx.state === 'closed') {
    sharedScoreAudioCtx = new AudioCtx();
  }
  if (sharedScoreAudioCtx.state === 'suspended') {
    sharedScoreAudioCtx.resume().catch(() => {});
  }
  return sharedScoreAudioCtx;
}

function playScoreTickTone(progress: number) {
  try {
    const ctx = getScoreAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    // Frequenza crescente fluida da 440Hz a 980Hz mentre i punti salgono
    const freq = 440 + Math.min(1, Math.max(0, progress)) * 540;
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.08, now + 0.045);
    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.048);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.05);
  } catch {}
}

function playScoreCompleteChime() {
  try {
    const ctx = getScoreAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [880, 1108.73, 1318.51].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.045);
      gain.gain.setValueAtTime(0.14 / (idx + 1), now + idx * 0.045);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.045 + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.045);
      osc.stop(now + idx * 0.045 + 0.38);
    });
  } catch {}
}

const EditableScore: React.FC<{ 
  index: number; 
  score: number; 
  setScore: (i: number, val: number) => void;
  isAnimated?: boolean;
  canPlaySound?: boolean;
  onAnimationProgress?: (index: number, isAnimating: boolean, currentScore: number) => void;
}> = ({ index, score, setScore, isAnimated = false, canPlaySound = false, onAnimationProgress }) => {
  const [isEditing, setIsEditing] = React.useState(false);
  const [localValue, setLocalValue] = React.useState(score.toString());
  const [animScore, setAnimScore] = React.useState(isAnimated ? 0 : score);
  const [isPulsing, setIsPulsing] = React.useState(isAnimated);
  const [pulseKey, setPulseKey] = React.useState(0);

  const prevScoreRef = React.useRef(score);
  const animScoreRef = React.useRef(animScore);
  animScoreRef.current = animScore;

  const isFirstRender = React.useRef(true);
  const prevIsAnimatedRef = React.useRef(isAnimated);
  const animIdRef = React.useRef<number | null>(null);
  const pulseTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const lastTickSoundRef = React.useRef<number>(0);
  const onAnimProgressRef = React.useRef(onAnimationProgress);
  onAnimProgressRef.current = onAnimationProgress;

  const triggerPulse = React.useCallback(() => {
    if (pulseTimerRef.current) {
      clearTimeout(pulseTimerRef.current);
      pulseTimerRef.current = null;
    }
    setPulseKey((k) => k + 1);
    setIsPulsing(true);
    pulseTimerRef.current = setTimeout(() => {
      setIsPulsing(false);
      pulseTimerRef.current = null;
    }, 1800);
  }, []);

  const animateCount = React.useCallback((startVal: number, targetVal: number, duration: number, delay: number = 0) => {
    if (animIdRef.current) {
      cancelAnimationFrame(animIdRef.current);
      animIdRef.current = null;
    }

    if (startVal === targetVal) {
      setAnimScore(targetVal);
      onAnimProgressRef.current?.(index, false, targetVal);
      return;
    }

    const isIncreasing = targetVal > startVal;
    let startTimestamp: number | null = null;
    lastTickSoundRef.current = 0;
    onAnimProgressRef.current?.(index, isIncreasing, startVal);

    const step = (timestamp: number) => {
      if (startTimestamp === null) {
        startTimestamp = timestamp;
      }

      const elapsed = timestamp - startTimestamp;
      if (elapsed < delay) {
        animIdRef.current = requestAnimationFrame(step);
        return;
      }

      const progress = Math.min(1, (elapsed - delay) / duration);
      // Easing cubico fluido (ease-out)
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startVal + (targetVal - startVal) * ease);
      setAnimScore(current);
      onAnimProgressRef.current?.(index, isIncreasing && progress < 1, current);

      if (canPlaySound && isIncreasing && progress < 1) {
        if (timestamp - lastTickSoundRef.current >= 60) {
          lastTickSoundRef.current = timestamp;
          playScoreTickTone(progress);
        }
      }

      if (progress < 1) {
        animIdRef.current = requestAnimationFrame(step);
      } else {
        setAnimScore(targetVal);
        onAnimProgressRef.current?.(index, false, targetVal);
        if (canPlaySound && isIncreasing) {
          playScoreCompleteChime();
        }
        animIdRef.current = null;
      }
    };

    animIdRef.current = requestAnimationFrame(step);
  }, [index, canPlaySound]);

  // Cleanup animazioni e timer all'unmount
  React.useEffect(() => {
    return () => {
      if (animIdRef.current) cancelAnimationFrame(animIdRef.current);
      if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
    };
  }, []);

  // Gestione animazione: all'ingresso Box 1/transizione 'T' o ad ogni variazione dei punteggi
  React.useEffect(() => {
    // 1. Primo montaggio
    if (isFirstRender.current) {
      isFirstRender.current = false;
      prevScoreRef.current = score;
      prevIsAnimatedRef.current = isAnimated;

      if (isAnimated) {
        triggerPulse();
        animateCount(0, score, 1600, index * 250);
      } else {
        setAnimScore(score);
      }
      return;
    }

    // 2. Transizione forzata (es. passaggio a Box 1 o scorciatoia 'T')
    if (isAnimated && !prevIsAnimatedRef.current) {
      prevIsAnimatedRef.current = isAnimated;
      prevScoreRef.current = score;
      triggerPulse();
      animateCount(0, score, 1600, index * 250);
      return;
    }
    prevIsAnimatedRef.current = isAnimated;

    // 3. Modifica punteggio dall'esterno (assegnazione punti da un gioco o reset)
    if (!isEditing && score !== prevScoreRef.current) {
      const prev = prevScoreRef.current;
      prevScoreRef.current = score;

      if (score === 0) {
        if (animIdRef.current) {
          cancelAnimationFrame(animIdRef.current);
          animIdRef.current = null;
        }
        setAnimScore(0);
        setIsPulsing(false);
      } else if (score > prev) {
        // Incremento punti: conteggio progressivo graduale e bagliore luminoso
        triggerPulse();
        const startVal = animScoreRef.current;
        animateCount(startVal, score, 1200, 0);
      } else {
        // Decremento punti: transizione fluida
        const startVal = animScoreRef.current;
        animateCount(startVal, score, 800, 0);
      }
    }
  }, [score, isAnimated, isEditing, index, animateCount, triggerPulse]);

  // Sincronizza il valore locale se non in fase di modifica manuale
  React.useEffect(() => {
    if (!isEditing) {
      setLocalValue(animScore.toString());
    }
  }, [isEditing, animScore]);

  const displayValue = isEditing ? localValue : formatScoreNumber(animScore);

  return (
    <div 
      key={pulseKey}
      className={`mb-3 group relative shrink-0 flex items-center justify-center ${isPulsing ? 'animate-point-pulse' : ''}`}
    >
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
            const parsed = parseInt(val, 10);
            prevScoreRef.current = parsed;
            setAnimScore(parsed);
            setScore(index, parsed);
          }
        }}
        onBlur={() => {
          setIsEditing(false);
          const finalVal = localValue === '' ? 0 : parseInt(localValue, 10) || 0;
          prevScoreRef.current = finalVal;
          setAnimScore(finalVal);
          setLocalValue(finalVal.toString());
          setScore(index, finalVal);
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
  const [box1BookedTeam] = useSyncedState<number | null>(`playstate_${activeSlideId}_booked_team`, null);
  const [box1AssignedTeam] = useSyncedState<number | null>(`playstate_${activeSlideId}_assigned_team`, null);
  const [box1ExcludedTeams] = useSyncedState<number[]>(`playstate_${activeSlideId}_excluded_teams`, []);

  // Sincronizzazione stato Box 5 (Finale a Squadre): lampeggio in classifica solo su prenotazione bonus
  const [finaleBookedTeam] = useSyncedState<number | null>('playstate_finale_squadre_booked_team', null);

  // Sincronizzazione stato Mille e una Nadia per illuminazione ed esclusione squadre
  const [nadiaActive] = useSyncedState<boolean>('playstate_nadia_active', false);
  const [nadiaBookedTeam] = useSyncedState<number | null>('playstate_nadia_booked_team', null);
  const [nadiaExcludedTeams] = useSyncedState<number[]>('playstate_nadia_excluded_teams', []);
  const [nadiaAssignedTeam] = useSyncedState<number | null>('playstate_nadia_assigned_team', null);


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

  const canPlaySound = React.useMemo(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    if (mode === 'games' || mode === 'scores' || mode === 'ipad') return false;
    return true;
  }, []);

  const isBuzzerActive = useBuzzerActive();

  const [animatingTeams, setAnimatingTeams] = React.useState<Record<number, boolean>>({});
  const [pulseCounters, setPulseCounters] = React.useState<Record<number, number>>({ 0: 0, 1: 0, 2: 0 });
  const [liveAnimScores, setLiveAnimScores] = React.useState<Record<number, number>>({});
  const prevAnimatingRef = React.useRef<Record<number, boolean>>({});

  const handleAnimationProgress = React.useCallback((idx: number, isAnimating: boolean, currentScore: number) => {
    setLiveAnimScores((prev) => (prev[idx] === currentScore ? prev : { ...prev, [idx]: currentScore }));
    if (isAnimating && !prevAnimatingRef.current[idx]) {
      prevAnimatingRef.current[idx] = true;
      setAnimatingTeams((prev) => ({ ...prev, [idx]: true }));
      setPulseCounters((prev) => ({ ...prev, [idx]: (prev[idx] || 0) + 1 }));
    } else if (!isAnimating && prevAnimatingRef.current[idx]) {
      prevAnimatingRef.current[idx] = false;
      setTimeout(() => {
        setAnimatingTeams((prev) => ({ ...prev, [idx]: false }));
      }, 450);
    }
  }, []);

  const teamNames = setup?.nomiSquadre || ['SQUADRA 1', 'SQUADRA 2', 'SQUADRA 3'];
  const teamConfigs = [
    {
      name: teamNames[0] || 'SQUADRA 1',
      color: 'bg-red-600',
      textColor: 'text-red-500',
      backGlow: 'from-red-600/45 via-amber-500/25 to-red-900/35',
      beamGlow: 'from-transparent via-red-400/55 to-amber-200/80',
      borderGlow: 'border-red-400/70 shadow-[0_0_45px_rgba(239,68,68,0.45),inset_0_0_40px_rgba(239,68,68,0.3)]',
    },
    {
      name: teamNames[1] || 'SQUADRA 2',
      color: 'bg-blue-600',
      textColor: 'text-blue-500',
      backGlow: 'from-blue-600/45 via-cyan-400/25 to-blue-900/35',
      beamGlow: 'from-transparent via-cyan-300/55 to-white/80',
      borderGlow: 'border-cyan-400/70 shadow-[0_0_45px_rgba(59,130,246,0.45),inset_0_0_40px_rgba(59,130,246,0.3)]',
    },
    {
      name: teamNames[2] || 'SQUADRA 3',
      color: 'bg-green-600',
      textColor: 'text-green-500',
      backGlow: 'from-emerald-600/45 via-amber-300/25 to-emerald-900/35',
      beamGlow: 'from-transparent via-emerald-300/55 to-amber-200/80',
      borderGlow: 'border-emerald-400/70 shadow-[0_0_45px_rgba(16,185,129,0.45),inset_0_0_40px_rgba(16,185,129,0.3)]',
    },
  ];

  const maxScore = Math.max(...scores, 10000); // Scale histogram to at least 10k
  const isBox0 = activeBox === 0;
  const isAnyTeamAnimating = Boolean(animatingTeams[0] || animatingTeams[1] || animatingTeams[2]);

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

      {/* Fascio di luce dorata che spazza lo schermo alla transizione o all'aumento punti */}
      {(isTransitioning || isAnyTeamAnimating) && (
        <div
          key={`sweep-${isTransitioning ? 'init' : `${pulseCounters[0]}-${pulseCounters[1]}-${pulseCounters[2]}`}`}
          className="absolute inset-0 pointer-events-none z-10 overflow-hidden"
        >
          <div className="w-[180%] h-full bg-gradient-to-r from-transparent via-amber-300/25 to-transparent animate-gold-sweep" />
        </div>
      )}

      {/* Background decoration in Box 0 o durante incremento punti (colora lo sfondo dietro gli istogrammi come nella transizione iniziale) */}
      <div
        className={`absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none transition-opacity duration-700 ${
          isBox0 || isTransitioning || isAnyTeamAnimating ? 'opacity-35' : 'opacity-0'
        }`}
      >
        <div
          className={`absolute top-[-10%] left-[-10%] w-[45%] h-[55%] bg-red-600/30 blur-[120px] rounded-full transition-opacity duration-500 ${
            isBox0 || isTransitioning || animatingTeams[0] ? 'opacity-100' : 'opacity-20'
          }`}
        />
        <div
          className={`absolute top-[20%] left-[28%] w-[45%] h-[55%] bg-blue-600/30 blur-[120px] rounded-full transition-opacity duration-500 ${
            isBox0 || isTransitioning || animatingTeams[1] ? 'opacity-100' : 'opacity-20'
          }`}
        />
        <div
          className={`absolute bottom-[-10%] right-[-10%] w-[45%] h-[55%] bg-emerald-600/30 blur-[120px] rounded-full transition-opacity duration-500 ${
            isBox0 || isTransitioning || animatingTeams[2] ? 'opacity-100' : 'opacity-20'
          }`}
        />
      </div>

      {/* Indicatore sempre presente stato Pulsantiera (Pallino Verde = Attiva / Rosso = Non attiva) */}
      <BuzzerStatusBadge
        isActive={isBuzzerActive}
        variant="stage"
        className="absolute top-7 right-10 z-30"
      />

      <h1 className="text-5xl font-black text-center mb-6 tracking-tighter uppercase italic drop-shadow-[0_0_20px_rgba(255,255,255,0.3)] shrink-0 z-20">
        Classifica Generale
      </h1>

      {isBox0 ? (
        /* Vista Box 0: Senza sfondo, visibili solo i nomi delle squadre e i punteggi */
        <div className="flex-1 flex flex-col justify-center items-center px-4 z-20">
          <div className="w-full max-w-6xl grid grid-cols-3 gap-12">
            {teamConfigs.map((team, i) => {
              const teamNum = i + 1;
              const isNadiaBooked = nadiaActive && nadiaBookedTeam !== null && (nadiaBookedTeam - 1) === i;
              const isNadiaExcluded = nadiaActive && (nadiaExcludedTeams || []).includes(teamNum);
              const isNadiaWinner = nadiaActive && nadiaAssignedTeam !== null && (nadiaAssignedTeam - 1) === i;

              const isExcluded = isNadiaExcluded;
              const isWinner = isNadiaWinner;
              const isBlinking = isNadiaBooked;

              return (
                <div 
                  key={i} 
                  className={`bg-[#18181b]/80 border-2 rounded-3xl p-8 flex flex-col items-center justify-center shadow-2xl backdrop-blur-md transition-all duration-500 ${
                    isExcluded 
                      ? 'opacity-35 grayscale border-slate-600 scale-95' 
                      : isWinner
                      ? 'border-emerald-400 ring-4 ring-emerald-400/50 shadow-[0_0_40px_rgba(16,185,129,0.5)]'
                      : isBlinking
                      ? 'border-amber-300 ring-8 ring-amber-400/70 shadow-[0_0_45px_rgba(251,191,36,0.9)]'
                      : 'border-white/20'
                  }`}
                >
                  <div className={`${team.color} w-full py-5 rounded-2xl shadow-xl flex flex-col items-center justify-center mb-6 border-2 transition-all ${
                    isBlinking ? 'border-white animate-custom-blink ring-4 ring-white/50' : 'border-white/30'
                  }`}>
                    <span className={`text-4xl font-black tracking-widest uppercase ${isExcluded ? 'line-through opacity-80' : ''}`}>
                      {team.name}
                    </span>
                    {isExcluded && (
                      <span className="text-xs font-bold text-red-200 tracking-wider uppercase mt-1">
                        ✕ Esclusa
                      </span>
                    )}
                    {isWinner && (
                      <span className="text-xs font-bold text-emerald-100 tracking-wider uppercase mt-1">
                        {isNadiaWinner ? '✨ Risposta Esatta +1000 PT' : '✨ Risposta Esatta'}
                      </span>
                    )}
                  </div>

                  <div className="py-4">
                    <EditableScore 
                      index={i} 
                      score={scores[i]} 
                      setScore={setScore} 
                      isAnimated={isTransitioning}
                      canPlaySound={canPlaySound}
                      onAnimationProgress={handleAnimationProgress}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Vista Normale: Istogramma completo e bonus con rivelazione graduale all'ingresso nel Box 1 */
        <div className="flex-1 grid grid-cols-3 gap-10 min-h-0 px-4 z-20 transition-all duration-700">
          {teamConfigs.map((team, i) => {
            const teamNum = i + 1;
            const isNadiaBooked = nadiaActive && nadiaBookedTeam !== null && (nadiaBookedTeam - 1) === i;
            const isNadiaExcluded = nadiaActive && (nadiaExcludedTeams || []).includes(teamNum);
            const isNadiaWinner = nadiaActive && nadiaAssignedTeam !== null && (nadiaAssignedTeam - 1) === i;

            const isBox1Booked = !nadiaActive && activeBox === 1 && box1BookedTeam !== null && (box1BookedTeam - 1) === i;
            const isBox1Excluded = !nadiaActive && activeBox === 1 && (box1ExcludedTeams || []).includes(teamNum);
            const isBox1Winner = !nadiaActive && activeBox === 1 && box1AssignedTeam !== null && (box1AssignedTeam - 1) === i;

            const isBox5Booked = !nadiaActive && activeBox === 5 && activeQuestion >= 1 && finaleBookedTeam !== null && (finaleBookedTeam - 1) === i;

            const isExcluded = isNadiaExcluded || isBox1Excluded;
            const isWinner = isNadiaWinner || isBox1Winner;
            const isBlinking = 
              isNadiaBooked ||
              isBox1Booked ||
              isBox5Booked ||
              (!nadiaActive && activeBox === 2 && blinkingTeamIdx === i);

            const teamScore = liveAnimScores[i] !== undefined ? liveAnimScores[i] : (scores[i] || 0);
            const barHeightPct = Math.max((teamScore / maxScore) * 100, 6); // Base minima visibile del 6%
            const isTeamAnimating = isTransitioning || Boolean(animatingTeams[i]);

            return (
              <div 
                key={i} 
                className={`grid grid-rows-[auto_auto_240px_auto] h-full min-h-0 content-between transition-all duration-500 ${
                  isExcluded ? 'opacity-35 grayscale scale-[0.98]' : ''
                }`}
              >
                <div 
                  onClick={() => {
                    if (activeBox === 2) {
                      setBox2ActiveTeamIdx(i);
                      playTeamBookingSound();
                    }
                  }}
                  className={`
                    ${team.color} w-full py-4 rounded-2xl shadow-2xl flex flex-col items-center justify-center mb-3 border-4 transition-all duration-300
                    ${activeBox === 2 ? 'cursor-pointer hover:scale-105 active:scale-95' : ''}
                    ${isBlinking 
                      ? 'animate-custom-blink border-amber-300 ring-8 ring-amber-400/70 shadow-[0_0_40px_rgba(251,191,36,0.9)]' 
                      : isWinner
                      ? 'border-emerald-300 ring-4 ring-emerald-400/50 shadow-[0_0_35px_rgba(16,185,129,0.7)]'
                      : isExcluded
                      ? 'border-slate-500'
                      : 'border-white/20'}
                  `}
                >
                  <span className={`text-3xl font-black tracking-widest ${isExcluded ? 'line-through opacity-80' : ''}`}>
                    {team.name}
                  </span>
                  {isExcluded && (
                    <span className="text-[11px] font-bold text-red-200 tracking-wider uppercase mt-0.5">
                      ✕ Esclusa
                    </span>
                  )}
                  {isWinner && (
                    <span className="text-[11px] font-bold text-emerald-100 tracking-wider uppercase mt-0.5">
                      {isNadiaWinner ? '🏆 +1000 PT' : '🏆 Risposta Esatta'}
                    </span>
                  )}
                </div>

                <EditableScore 
                  index={i} 
                  score={scores[i]} 
                  setScore={setScore} 
                  isAnimated={isTransitioning}
                  canPlaySound={canPlaySound}
                  onAnimationProgress={handleAnimationProgress}
                />

                {/* Traccia Istogramma e Colonna che cresce dal basso verso l'alto */}
                <div
                  className={`w-full relative overflow-hidden min-h-[180px] my-2 rounded-t-3xl border transition-all duration-500 ${
                    isTeamAnimating
                      ? `bg-gradient-to-t ${team.backGlow} ${team.borderGlow}`
                      : 'bg-white/5 border-white/10 shadow-inner'
                  }`}
                >
                  {/* Retro dell'istogramma che si colora e s'illumina durante la transizione iniziale o l'aumento punti */}
                  <div
                    className={`absolute inset-0 bg-gradient-to-t ${team.backGlow} pointer-events-none transition-opacity duration-500 ${
                      isTeamAnimating ? 'opacity-100' : 'opacity-0'
                    }`}
                  />

                  {/* Fascio di energia che sale lungo il retro dell'istogramma */}
                  {isTeamAnimating && (
                    <div
                      key={`beam-${i}-${pulseCounters[i] || 0}-${isTransitioning ? 'init' : 'inc'}`}
                      className={`absolute inset-x-0 h-32 bg-gradient-to-t ${team.beamGlow} blur-md pointer-events-none z-10`}
                      style={{
                        animation: `energyBeamSweep 1.4s ease-out ${isTransitioning ? i * 0.25 : 0}s forwards`,
                      }}
                    />
                  )}

                  {/* Riflesso dorato diagonale sul retro dell'istogramma */}
                  {isTeamAnimating && (
                    <div
                      key={`gold-${i}-${pulseCounters[i] || 0}-${isTransitioning ? 'init' : 'inc'}`}
                      className="absolute inset-0 pointer-events-none z-10 overflow-hidden"
                    >
                      <div className="w-[180%] h-full bg-gradient-to-r from-transparent via-amber-200/35 to-transparent animate-gold-sweep" />
                    </div>
                  )}

                  {/* Barra colorata dell'istogramma con crescita graduale */}
                  <div
                    className={`absolute bottom-0 left-0 w-full ${team.color} shadow-[0_0_40px_rgba(255,255,255,0.1)] rounded-t-3xl origin-bottom`}
                    style={{
                      height: `${barHeightPct}%`,
                      animation: isTransitioning
                        ? `barGrowUp 1.6s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.25}s backwards`
                        : undefined,
                      transition: isTransitioning ? undefined : 'height 120ms linear',
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                    <div className={`absolute top-0 left-0 w-full h-1.5 bg-white/70 ${isTeamAnimating ? 'shadow-[0_0_20px_#fde047,0_0_10px_white]' : 'shadow-[0_0_10px_white]'}`} />
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
