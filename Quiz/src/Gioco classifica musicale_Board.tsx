import React, { useState, useEffect, useRef, useCallback } from "react";
import { useGameData } from './context/GameDataContext';
import { assetUrl, assetUrlCss } from './lib/assetUrl';
import { useSyncedState } from './hooks/useSyncedState';
import { useScores } from './context/ScoreContext';
import { ClassificaStaircaseSuspenseOverlay, type Box2SuspenseData } from './components/ClassificaStaircaseSuspenseOverlay';

// ============================================================================
// Cronometro circolare (stile Box 4) — Manche Canzoni (Classifica Musicale)
// Parte dopo che la risposta della lista è stata rivelata (5 secondi)
// ============================================================================
export const CountdownTimer: React.FC<{ seconds: number; totalSeconds: number }> = ({ seconds, totalSeconds }) => {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(1, seconds / totalSeconds));
  const strokeOffset = circumference * (1 - progress);

  const isUrgent = seconds <= 2;
  const strokeColor = isUrgent ? 'rgb(239 68 68)' : 'rgb(251 191 36)';
  const glowColor = isUrgent ? 'rgba(239,68,68,0.7)' : 'rgba(251,191,36,0.7)';
  const textColor = isUrgent ? 'text-red-400' : 'text-amber-400';

  return (
    <div className="flex flex-col items-center">
      <span className={`text-[9px] font-black uppercase tracking-widest mb-1.5 ${textColor}`}>TEMPO</span>
      <div className="relative w-[80px] h-[80px]">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={radius} fill="none" stroke="rgb(39 39 42)" strokeWidth="8" />
          <circle
            cx="60" cy="60" r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeOffset}
            className="transition-[stroke-dashoffset] duration-100 ease-linear"
            style={{ filter: `drop-shadow(0 0 8px ${glowColor})` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-3xl font-black tabular-nums leading-none ${textColor}`}>
            {Math.ceil(seconds)}
          </span>
          <span className={`text-[8px] font-black uppercase tracking-wider mt-0.5 ${textColor}/60`}>sec</span>
        </div>
      </div>
    </div>
  );
};

interface SolutionProps {
  isVisible: boolean;
  revealAll?: boolean;
  onClose?: () => void;
  isPresenter?: boolean;
}

// Componente per la Soluzione Finale (senza assegnazione punti e intestazioni superflue, con spazio per artista/dettagli)
const Solution: React.FC<SolutionProps> = ({ isVisible, revealAll = false, onClose, isPresenter = false }) => {
  const gameData = useGameData();
  if (!gameData) return null;

  const soluzioneTitolo = (gameData as any).soluzione?.titolo || gameData.soluzioneTesto || 'Soluzione';
  const rawArtista = String((gameData as any).soluzione?.artista || '').trim().replace(/^[-–—\s]+/, '').replace(/[-–—\s]+$/, '');
  const rawAnno = String((gameData as any).soluzione?.anno || '').trim().replace(/^[-–—\s]+/, '').replace(/[-–—\s]+$/, '');
  const subtitle = (rawArtista && rawAnno)
    ? (rawArtista.toLowerCase() === rawAnno.toLowerCase() ? rawArtista : `${rawArtista} - ${rawAnno}`)
    : (rawArtista || rawAnno);

  if (revealAll && isVisible) {
    return (
      <div className="absolute bottom-4 left-4 z-50 px-6 py-4 rounded-2xl border border-[#792ba6]/50 bg-slate-900/90 backdrop-blur-lg shadow-[0_10px_30px_rgba(0,0,0,0.5)] border-l-4 border-l-[#792ba6] max-w-md pointer-events-auto animate-zoom-in">
        <span className="text-[9px] font-black text-purple-300 uppercase tracking-widest block mb-1">Soluzione Finale</span>
        <h2 className="text-xl font-black text-white leading-tight">
          {soluzioneTitolo}
        </h2>
        {subtitle && (
          <p className="text-xs font-semibold text-slate-400 mt-0.5">
            {subtitle}
          </p>
        )}
      </div>
    );
  }

  if (!isVisible && !revealAll) {
    return null;
  }

  return (
    <div 
      className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md animate-fade-in"
      onClick={isPresenter ? onClose : undefined}
    >
      <div 
        className="relative group flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Bagliore retrostante purple-blue */}
        <div className="absolute -inset-10 bg-gradient-to-r from-[#792ba6] to-blue-600 rounded-full blur-3xl opacity-30 group-hover:opacity-50 transition duration-1000" />
        
        <div 
          className="relative text-center space-y-6 px-12 py-10 border-[#0f2d54] bg-[#792ba6]/90 backdrop-blur-2xl shadow-[0_0_50px_rgba(121,43,166,0.6)] overflow-hidden w-[40vw] max-w-[90%]"
          style={{ 
            borderWidth: "clamp(4px, 0.5208vw, 10px)",
            borderRadius: "clamp(6px, 0.5208vw, 12px)"
          }}
        >
          {/* Effetto luce che scorre */}
          <div className="absolute top-0 -left-[100%] w-[200%] h-full bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 group-hover:left-[100%] transition-all duration-1000 ease-in-out" />

          {/* Pulsante chiusura discreto in alto a destra (solo relatore) */}
          {isPresenter && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="absolute top-3 right-3 text-white/60 hover:text-white bg-black/40 hover:bg-black/70 rounded-full w-8 h-8 flex items-center justify-center text-xs font-black border border-white/20 transition-all z-20 cursor-pointer"
              title="Torna alla lista (Esc / S)"
            >
              ✕
            </button>
          )}

          {/* Badge Punti Soluzione */}
          <div className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 font-black text-xs md:text-sm uppercase tracking-widest shadow-lg">
            <span>⭐</span> +5.000 PT
          </div>

          <h2 className="text-[clamp(24px,3vw,56px)] font-black text-white tracking-tight leading-tight animate-zoom-in drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
            {soluzioneTitolo}
          </h2>

          {subtitle && (
            <>
              <div className="h-[2px] w-24 bg-gradient-to-r from-[#00ff00] to-yellow-400 mx-auto rounded-full" />
              <p className="text-[clamp(14px,1.2vw,24px)] font-light text-white/70 tracking-[0.2em] uppercase animate-fade-up">
                {subtitle}
              </p>
            </>
          )}

          {/* Pulsante per tornare esplicitamente sulla lista (solo relatore) */}
          {isPresenter && onClose && (
            <div className="pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 active:scale-95 border border-white/30 text-white font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg inline-flex items-center gap-2 hover:shadow-cyan-500/20"
              >
                <span>↩</span> Torna alla lista
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ClassificaMusicaleBoard = ({ 
  interactive = true, 
  revealAll = false,
  isPresenter = false
}: { 
  interactive?: boolean; 
  revealAll?: boolean;
  isPresenter?: boolean;
}): React.JSX.Element => {
  const gameData = useGameData();
  if (!gameData) return <div className="text-white flex items-center justify-center w-full h-full">In attesa di dati...</div>;

  const slideId = gameData.slideId ?? 'sandbox';

  const { scores, addScore } = useScores();
  const questionNum = React.useMemo(() => {
    const match = slideId.match(/q(\d+)/);
    return match ? parseInt(match[1], 10) : 1;
  }, [slideId]);

  const [step, setStep] = useSyncedState<number>(`playstate_${slideId}_step`, revealAll ? 2 : 0);
  const effectiveStep = revealAll ? 2 : step;

  const [revealed, setRevealed] = useSyncedState<Record<number, boolean>>(`playstate_${slideId}_revealed`, {});
  const [, setPointsAssigned] = useSyncedState<Record<number, number>>(`playstate_${slideId}_points`, {});
  const [, setLatestClue] = useSyncedState<number>(`playstate_${slideId}_latest`, 0);
  const [showTitle, setShowTitle] = useSyncedState(`playstate_${slideId}_showtitle`, false);
  const [showSolution, setShowSolution] = useSyncedState(`playstate_${slideId}_showsolution`, false);
  const [isPlaying, setIsPlaying] = useSyncedState<boolean>(`playstate_${slideId}_playing`, false);
  const [playTrigger, setPlayTrigger] = useSyncedState<number>(`playstate_${slideId}_play_trigger`, 0);
  const [solutionAwarded, setSolutionAwarded] = useSyncedState<boolean>(`playstate_${slideId}_solution_awarded`, false);
  const [activeSuspense, setActiveSuspense] = useSyncedState<Box2SuspenseData | null>(`playstate_${slideId}_suspense`, null);
  const [turnOffset, setTurnOffset] = useSyncedState<number>(`playstate_${slideId}_turn_offset`, 0);
  
  // ── Cronometro sincronizzato (stile Box 4) — Manche Canzoni ────────────────
  // Parte per la squadra di turno dopo che la risposta della lista è stata rivelata (5 secondi)
  const [timerEndAt, setTimerEndAt] = useSyncedState<number>(`playstate_${slideId}_timer_end`, 0);
  const [timerDisplay, setTimerDisplay] = useState(0);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevTimerDisplayRef = useRef(0);
  const gongPlayedForRef = useRef<number>(0);

  // Nomi squadre sincronizzati da setup
  const [teamNames] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('imperio_quiz_setup');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.punteggi?.nomiSquadre && Array.isArray(parsed.punteggi.nomiSquadre)) {
          return parsed.punteggi.nomiSquadre;
        }
      }
    } catch {}
    return ['SQUADRA 1', 'SQUADRA 2', 'SQUADRA 3'];
  });
  
  const shouldPlayAudio = React.useMemo(() => {
    if (!interactive) return false;
    if (isPresenter) return false;
    const mode = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('mode') : null;
    const isSandbox = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('sandbox') === 'true' : false;
    return mode === 'games' || isSandbox || !mode;
  }, [interactive, isPresenter]);

  const audiosRef = React.useRef<Record<number, HTMLAudioElement>>({});
  const finalAudioRef = React.useRef<HTMLAudioElement | null>(null);
  const isPlayingStemsRef = React.useRef(false);
  const isFadingOutRef = React.useRef(false);

  // Stringa identificativa degli stems per evitare ri-creazioni audio a ogni re-render padre
  const stemsAudioKey = React.useMemo(() => {
    return (gameData.elementi || [])
      .map((el: any) => `${el?.posizione ?? ''}:${el?.audio ?? ''}`)
      .join('|');
  }, [gameData.elementi]);
  const canzoneFinaleUrl = (gameData as any).canzoneFinale || '';

  // Funzione di utilità per fermare e zittire istantaneamente e completamente tutti gli stems
  const stopAndMuteAllStems = React.useCallback(() => {
    isPlayingStemsRef.current = false;
    Object.values(audiosRef.current).forEach(a => {
      try {
        a.pause();
        a.currentTime = 0;
        a.volume = 0;
        a.muted = true;
      } catch (e) {
        console.warn("Errore stop stem:", e);
      }
    });
  }, []);

  // Inizializza gli audio stems e l'audio finale (stabile, si attiva solo al cambio slide o traccia)
  useEffect(() => {
    if (!shouldPlayAudio) {
      stopAndMuteAllStems();
      if (finalAudioRef.current) {
        try {
          finalAudioRef.current.pause();
          finalAudioRef.current.currentTime = 0;
          finalAudioRef.current.removeAttribute('src');
          finalAudioRef.current.load();
        } catch (e) {}
        finalAudioRef.current = null;
      }
      return;
    }

    // Ferma eventuali tracce precedenti
    stopAndMuteAllStems();
    if (finalAudioRef.current) {
      try {
        finalAudioRef.current.pause();
        finalAudioRef.current.currentTime = 0;
        finalAudioRef.current.removeAttribute('src');
        finalAudioRef.current.load();
      } catch (e) {}
      finalAudioRef.current = null;
    }

    // Stems (iniziano rigorosamente mutati e con volume 0)
    const newAudios: Record<number, HTMLAudioElement> = {};
    (gameData.elementi || []).forEach((el: any) => {
      if (el?.audio) {
        const audio = new Audio(assetUrl(el.audio));
        audio.loop = false; // NON ripartono automaticamente alla fine
        audio.volume = 0;   // Partono tutti mutati
        audio.muted = true;
        newAudios[el.posizione] = audio;
      }
    });
    audiosRef.current = newAudios;

    // Canzone finale della soluzione
    if (canzoneFinaleUrl) {
      const finAudio = new Audio(assetUrl(canzoneFinaleUrl));
      finAudio.loop = false;
      finAudio.volume = 1;
      finAudio.muted = false;
      finalAudioRef.current = finAudio;
    }

    return () => {
      stopAndMuteAllStems();
      try {
        localStorage.setItem(`playstate_${slideId}_playing`, 'false');
      } catch (e) {}
      Object.values(audiosRef.current).forEach(a => {
        try {
          a.removeAttribute('src');
          a.load();
        } catch (e) {}
      });
      audiosRef.current = {};
      if (finalAudioRef.current) {
        try {
          finalAudioRef.current.pause();
          finalAudioRef.current.currentTime = 0;
          finalAudioRef.current.removeAttribute('src');
          finalAudioRef.current.load();
        } catch (e) {}
        finalAudioRef.current = null;
      }
    };
  }, [shouldPlayAudio, slideId, canzoneFinaleUrl, stemsAudioKey, stopAndMuteAllStems]);

  // Smuta gli stems in base ai clue rivelati (SOLO se la soluzione NON è attiva e non è già stata assegnata)
  useEffect(() => {
    if (!shouldPlayAudio) return;

    if (showSolution || solutionAwarded) {
      // Se la soluzione è attiva o è già stata svelata/assegnata, NESSUNO stem deve mai avere volume > 0 o suonare
      stopAndMuteAllStems();
      return;
    }

    // Altrimenti, abilita il volume solo degli indizi svelati e silenzia gli altri
    Object.keys(revealed).forEach(key => {
      const clue = Number(key);
      const stemAudio = audiosRef.current[clue];
      if (stemAudio) {
        if (revealed[clue]) {
          if (!isFadingOutRef.current) {
            stemAudio.muted = false;
            stemAudio.volume = 1;
          }
        } else {
          stemAudio.volume = 0;
          stemAudio.muted = true;
        }
      }
    });
  }, [revealed, showSolution, solutionAwarded, shouldPlayAudio, stopAndMuteAllStems]);

  // Traccia l'ultimo trigger gestito per evitare di ri-eseguire trigger passati memorizzati al mount della slide
  const lastTriggerRef = React.useRef<number>(playTrigger);

  // Scatena la riproduzione sincronizzata da capo su tutti gli schermi collegati (Presenter, GamesView, ecc.)
  useEffect(() => {
    if (!shouldPlayAudio || !playTrigger || showSolution || solutionAwarded) return;
    if (playTrigger === lastTriggerRef.current) return;
    lastTriggerRef.current = playTrigger;

    isPlayingStemsRef.current = true;
    Object.values(audiosRef.current).forEach(a => {
      try {
        a.currentTime = 0;
        const p = a.play();
        if (p !== undefined) p.catch(err => console.log("Errore riproduzione stem trigger:", err));
      } catch (err) {}
    });
  }, [playTrigger, shouldPlayAudio, showSolution, solutionAwarded]);

  // Gestione Play / Pausa globale sincronizzata (es. comando tastiera M)
  const isInitialMountPlayingRef = React.useRef(true);
  useEffect(() => {
    if (!shouldPlayAudio) return;

    if (isInitialMountPlayingRef.current) {
      isInitialMountPlayingRef.current = false;
      // All'avvio della slide, non avviare autoplay anche se isPlaying era precedentemente true
      if (isPlaying) {
        setIsPlaying(false);
      }
      return;
    }

    if (showSolution) {
      // Quando la soluzione è attiva, gli stems sono categoricamente fermati e mutati
      stopAndMuteAllStems();
      if (finalAudioRef.current) {
        if (isPlaying) {
          if (finalAudioRef.current.paused) {
            finalAudioRef.current.play().catch(err => console.log("Errore play finale:", err));
          }
        } else {
          finalAudioRef.current.pause();
        }
      }
      return;
    }

    // Se la soluzione è già stata svelata/assegnata, NON ripartire con gli stems in automatico
    if (solutionAwarded) {
      stopAndMuteAllStems();
      return;
    }

    if (!isPlaying) {
      isPlayingStemsRef.current = false;
      stopAndMuteAllStems();
    } else {
      isPlayingStemsRef.current = true;
      Object.values(audiosRef.current).forEach(a => {
        try {
          if (a.ended || a.currentTime >= a.duration) {
            a.currentTime = 0;
          }
          if (a.paused) {
            const p = a.play();
            if (p !== undefined) p.catch(err => console.log("Errore resume stem:", err));
          }
        } catch (err) {}
      });
    }
  }, [isPlaying, shouldPlayAudio, showSolution, solutionAwarded, setIsPlaying, stopAndMuteAllStems]);

  // Quando viene mostrata la soluzione, ferma tutti gli stems e riproduce solo la canzone finale
  const isInitialMountSolutionRef = React.useRef(true);
  useEffect(() => {
    if (!shouldPlayAudio) return;

    if (showSolution) {
      // 1. ZITTISCI E FERMA ALL'ISTANTE TUTTI GLI STEMS
      stopAndMuteAllStems();

      // Evita di far ripartire la canzone finale al caricamento/ritorno sulla slide se era già stata svelata in precedenza
      if (isInitialMountSolutionRef.current) {
        isInitialMountSolutionRef.current = false;
        return;
      }

      // 2. Riproduci ESCLUSIVAMENTE la canzone finale della soluzione (singola istanza pulita)
      if (finalAudioRef.current) {
        try {
          finalAudioRef.current.currentTime = 0;
          finalAudioRef.current.muted = false;
          finalAudioRef.current.volume = 1;
          const p = finalAudioRef.current.play();
          if (p !== undefined) {
            p.catch(err => console.log("Errore riproduzione canzone finale:", err));
          }
        } catch (err) {
          console.log("Errore riproduzione canzone finale:", err);
        }
      }
    } else {
      isInitialMountSolutionRef.current = false;
      // Se la soluzione viene nascosta/resettata, ferma la canzone finale
      if (finalAudioRef.current) {
        try {
          finalAudioRef.current.pause();
          finalAudioRef.current.currentTime = 0;
        } catch (e) {}
      }
      // Assicura che tornando alla lista gli strumenti NON ripartano
      stopAndMuteAllStems();
      setIsPlaying(false);
    }
  }, [showSolution, shouldPlayAudio, stopAndMuteAllStems, setIsPlaying]);

  const getPhraseStyle = (clue: number, isRevealed: boolean) => {
    if (!isRevealed) return "bg-white/5 border border-white/10";
    
    // 4 tonalità di Azzurro/Blu (dalla più chiara alla più scura)
    if (clue === 1) return "bg-[#00b3f6] text-white";
    if (clue === 2) return "bg-[#0099ff] text-white";
    if (clue === 3) return "bg-[#007acc] text-white";
    if (clue === 4) return "bg-[#005c8a] text-white";
    
    // 2 tonalità di Verde (dalla più chiara alla più scura)
    if (clue === 5) return "bg-[#00ff00] text-[#1b1b1b]";
    if (clue === 6) return "bg-[#00b300] text-white";
    
    // 1 tonalità di Giallo
    return "bg-[#f7f700] text-[#1b1b1b]"; // clue 7
  };

  const getInstrumentIcon = (audioPath?: string, text?: string, frase?: string): string => {
    const combined = `${audioPath || ''} ${text || ''} ${frase || ''}`.toLowerCase();
    
    // 1. Batteria / Percussioni
    if (combined.includes('batteria') || combined.includes('drum') || combined.includes('percuss') || combined.includes('cassa') || combined.includes('rullante')) {
      return 'Icone/classifica_musicale/batteria.svg';
    }
    // 2. Basso (prima di chitarra per evitare conflitti)
    if (combined.includes('basso') || combined.includes('bass') || combined.includes('contrabbasso')) {
      return 'Icone/classifica_musicale/basso.svg';
    }
    // 3. Chitarra Elettrica
    if (
      combined.includes('chitarra elettrica') || 
      combined.includes('elettr') || 
      combined.includes('electric guitar')
    ) {
      return 'Icone/classifica_musicale/chitarra_elettrica.svg';
    }
    // 4. Chitarra Acustica / Classica / Generica
    if (
      combined.includes('chitarra') || 
      combined.includes('guitar') || 
      combined.includes('acustic') || 
      combined.includes('acustica') ||
      combined.includes('classica')
    ) {
      return 'Icone/classifica_musicale/chitarra_acustica.svg';
    }
    // 5. Pianoforte
    if (
      combined.includes('pianoforte') || 
      combined.includes('piano') || 
      combined.includes('grand piano') ||
      combined.includes('pianino') ||
      combined.includes('pfe')
    ) {
      return 'Icone/classifica_musicale/pianoforte.svg';
    }
    // 6. Sintetizzatore / Tastiera / Synth
    if (
      combined.includes('sintetizzatore') || 
      combined.includes('synth') || 
      combined.includes('tastiera') || 
      combined.includes('keyboard') || 
      combined.includes('lead') || 
      combined.includes('square') || 
      combined.includes('elettronico')
    ) {
      return 'Icone/classifica_musicale/sintetizzatore.svg';
    }
    // 7. Archi / Violino / Viola / Cello / Arpa
    if (
      combined.includes('violino') || 
      combined.includes('archi') || 
      combined.includes('viola') || 
      combined.includes('violoncello') || 
      combined.includes('cello') || 
      combined.includes('strings') ||
      combined.includes('arpa')
    ) {
      return 'Icone/classifica_musicale/archi.svg';
    }
    // 8. Voce / Coro / Cantato / Vocal
    if (
      combined.includes('voce') || 
      combined.includes('coro') || 
      combined.includes('canto') || 
      combined.includes('cantato') || 
      combined.includes('vocal') || 
      combined.includes('voice') ||
      combined.includes('sing') ||
      combined.includes('coristi')
    ) {
      return 'Icone/classifica_musicale/voce.svg';
    }
    // 9. Flauto / Fiati
    if (
      combined.includes('flauto') || 
      combined.includes('fluato') || 
      combined.includes('flute') || 
      combined.includes('ottavino') ||
      combined.includes('fiati')
    ) {
      return 'Icone/classifica_musicale/flauto.svg';
    }
    // 10. Tromba / Ottoni / Brass
    if (
      combined.includes('tromba') || 
      combined.includes('ottoni') || 
      combined.includes('ottone') || 
      combined.includes('brass') || 
      combined.includes('trombone') || 
      combined.includes('corno') ||
      combined.includes('tuba')
    ) {
      return 'Icone/classifica_musicale/tromba.svg';
    }
    // 11. Sassofono / Sax
    if (combined.includes('sassofono') || combined.includes('sax') || combined.includes('saxofono')) {
      return 'Icone/classifica_musicale/sassofono.svg';
    }
    // 12. Organo
    if (combined.includes('organo') || combined.includes('organ') || combined.includes('hammond')) {
      return 'Icone/classifica_musicale/organo.svg';
    }
    // Default musicale
    return 'Icone/classifica_musicale/musica_default.svg';
  };

  // Suono gong / avviso scadenza del timer tramite Web Audio API
  const playTimerGong = useCallback(() => {
    if (!shouldPlayAudio) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      [220, 277, 330, 440].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.015);
        gain.gain.setValueAtTime(0.12 / (i + 1), now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.6);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.015);
        osc.stop(now + 1.7);
      });
    } catch (e) {}
  }, []);

  // Aggiorna il display del cronometro locale in tempo reale
  useEffect(() => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (!timerEndAt) {
      setTimerDisplay(0);
      prevTimerDisplayRef.current = 0;
      return;
    }
    const update = () => {
      const remaining = (timerEndAt - Date.now()) / 1000;
      if (remaining <= 0) {
        setTimerDisplay(0);
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      } else {
        setTimerDisplay(remaining);
      }
    };
    update();
    timerIntervalRef.current = setInterval(update, 50);
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [timerEndAt]);

  // Gong sonoro alla scadenza del timer (transizione da >0 a 0)
  useEffect(() => {
    if (
      interactive &&
      timerEndAt > 0 &&
      prevTimerDisplayRef.current > 0 &&
      timerDisplay <= 0 &&
      gongPlayedForRef.current !== timerEndAt
    ) {
      gongPlayedForRef.current = timerEndAt;
      playTimerGong();
    }
    prevTimerDisplayRef.current = timerDisplay;
  }, [timerDisplay, timerEndAt, interactive, playTimerGong]);

  // Se viene mostrata la soluzione, ferma il timer
  useEffect(() => {
    if (showSolution) {
      setTimerEndAt(0);
    }
  }, [showSolution, setTimerEndAt]);

  // Cleanup intervallo timer all'unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  const getBox2StarterIdx = React.useCallback((): number => {
    const saved = localStorage.getItem('playstate_box2_starter_idx');
    if (saved !== null) {
      return parseInt(saved, 10);
    }
    let lowestIdx = 0;
    for (let i = 1; i < scores.length; i++) {
      if (Number(scores[i]) < Number(scores[lowestIdx])) {
        lowestIdx = i;
      }
    }
    localStorage.setItem('playstate_box2_starter_idx', lowestIdx.toString());
    return lowestIdx;
  }, [scores]);

  const questionStarterIdx = (getBox2StarterIdx() + (questionNum - 1)) % 3;

  const getCluePoints = (clueNum: number) => {
    if (clueNum >= 1 && clueNum <= 4) return 1000;
    if (clueNum === 5 || clueNum === 6) return 2000;
    if (clueNum === 7) return 3000;
    return 0;
  };

  const getActiveTeamIdx = React.useCallback((currentRevealedCount: number): number => {
    const savedActive = localStorage.getItem('playstate_box2_active_team_idx');
    if (savedActive !== null) {
      return parseInt(savedActive, 10);
    }
    return (questionStarterIdx + currentRevealedCount + turnOffset) % 3;
  }, [questionStarterIdx, turnOffset]);

  const triggerRevealClue = React.useCallback((numKey: number) => {
    if (effectiveStep < 1) return; // Non rivelare prima dello step 1
    if (showSolution) return; // Non avviare né toccare se la soluzione è già attiva
    if (revealed[numKey]) return;
    if (activeSuspense) return;

    const currentRevealedCount = Object.values(revealed).filter(v => v === true).length;
    const targetTeamIdx = getActiveTeamIdx(currentRevealedCount);
    const cluePoints = getCluePoints(numKey);
    const el = gameData.elementi?.[numKey - 1];
    const clueText = el?.testo || `Strumento ${numKey}`;
    const clueIcon = getInstrumentIcon(el?.audio, el?.testo, el?.frase);

    setActiveSuspense({
      clueIndex: numKey,
      teamIdx: targetTeamIdx,
      timestamp: Date.now(),
      totalClues: 7,
      points: cluePoints,
      clueText: clueText,
      clueIcon: clueIcon,
      clueFrase: el?.frase,
      isError: false,
    });
  }, [effectiveStep, showSolution, revealed, activeSuspense, getActiveTeamIdx, getCluePoints, gameData.elementi, getInstrumentIcon, setActiveSuspense]);

  const triggerErrorSuspense = React.useCallback((targetStep?: number) => {
    if (effectiveStep < 1) return;
    if (showSolution) return;
    if (activeSuspense) return;

    let chosenStep = targetStep;
    const unrevealed = [1, 2, 3, 4, 5, 6, 7].filter(i => !revealed[i]);
    if (unrevealed.length === 0) return;

    if (!chosenStep || revealed[chosenStep] || chosenStep < 1 || chosenStep > 7) {
      chosenStep = unrevealed[Math.floor(Math.random() * unrevealed.length)];
    }

    const currentRevealedCount = Object.values(revealed).filter(v => v === true).length;
    const targetTeamIdx = getActiveTeamIdx(currentRevealedCount);

    setActiveSuspense({
      clueIndex: chosenStep,
      teamIdx: targetTeamIdx,
      timestamp: Date.now(),
      totalClues: 7,
      points: 0,
      clueText: 'RISPOSTA ERRATA',
      isError: true,
    });
  }, [effectiveStep, showSolution, activeSuspense, revealed, getActiveTeamIdx, setActiveSuspense]);

  const isPublicScreen = React.useMemo(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('mode') === 'games' || (isPresenter === false && params.get('mode') !== null);
  }, [isPresenter]);

  const handleCloseSolution = React.useCallback(() => {
    setShowSolution(false);
    setIsPlaying(false);
    stopAndMuteAllStems();
    setTimerEndAt(0);
  }, [setShowSolution, setIsPlaying, stopAndMuteAllStems, setTimerEndAt]);

  const handleSuspenseReveal = React.useCallback((clueNum: number, targetTeamIdx: number, points: number) => {
    // Solo la finestra di controllo assegna i punti ed evita doppi conteggi tra finestre
    if (!isPublicScreen) {
      const storageKey = `playstate_${slideId}_score_awarded_${clueNum}`;
      if (!localStorage.getItem(storageKey)) {
        localStorage.setItem(storageKey, 'true');
        addScore(targetTeamIdx, points);
      }
    }
    setRevealed(prev => ({ ...prev, [clueNum]: true }));
    setPointsAssigned(prev => ({ ...prev, [clueNum]: targetTeamIdx + 1 }));
    setLatestClue(clueNum);
    setPlayTrigger(Date.now());
    setIsPlaying(true);
  }, [slideId, isPublicScreen, addScore, setRevealed, setPointsAssigned, setLatestClue, setPlayTrigger, setIsPlaying]);

  const handleSuspenseComplete = React.useCallback(() => {
    const wasError = activeSuspense?.isError;
    setActiveSuspense(null);
    if (wasError) {
      // In caso di risposta errata: la scalata ha comunicato l'errore, passa il turno alla squadra successiva
      setTurnOffset(prev => prev + 1);
    } else {
      if (!showSolution && !solutionAwarded) {
        setTimerEndAt(Date.now() + 5000);
      }
    }
  }, [activeSuspense?.isError, setActiveSuspense, setTurnOffset, showSolution, solutionAwarded, setTimerEndAt]);

  const handleGiveSolution = React.useCallback(() => {
    setTimerEndAt(0);
    if (showSolution) {
      // Se la soluzione è già svelata, premere S o Invio torna alla lista senza far ripartire la musica!
      handleCloseSolution();
      return;
    }

    // Se la soluzione non è stata ancora assegnata in questa manche/slide, assegna i 5000pt alla squadra di turno
    if (!solutionAwarded) {
      const currentRevealedCount = Object.values(revealed).filter(v => v === true).length;
      const targetTeamIdx = getActiveTeamIdx(currentRevealedCount);
      if (!isPublicScreen) {
        const solKey = `playstate_${slideId}_score_awarded_solution`;
        if (!localStorage.getItem(solKey)) {
          localStorage.setItem(solKey, 'true');
          addScore(targetTeamIdx, 5000);
        }
      }
      setSolutionAwarded(true);
    }

    // Ferma e silenzia all'istante e completamente tutti gli stems
    stopAndMuteAllStems();

    // Svela tutte le 7 risposte della lista
    const allRevealedObj: Record<number, boolean> = {};
    for (let i = 1; i <= 7; i++) {
      allRevealedObj[i] = true;
    }
    setRevealed(allRevealedObj);
    setIsPlaying(true);

    // Mostra la soluzione: l'effetto dedicato showSolution farà partire ESCLUSIVAMENTE la traccia finale
    setShowSolution(true);
  }, [showSolution, handleCloseSolution, solutionAwarded, revealed, getActiveTeamIdx, isPublicScreen, slideId, addScore, setSolutionAwarded, stopAndMuteAllStems, setRevealed, setIsPlaying, setShowSolution, setTimerEndAt]);

  // Input da tastiera (1-7, S / Invio, M, T, E, X, C)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      const key = e.key;

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        setStep(prev => Math.min(prev + 1, 2));
        return;
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        setStep(prev => Math.max(prev - 1, 0));
        return;
      }

      if (key >= '1' && key <= '7') {
        const numKey = Number(key);
        if (e.shiftKey) {
          triggerErrorSuspense(numKey);
        } else {
          triggerRevealClue(numKey);
        }
      } else if (key.toLowerCase() === 's' || key === 'Enter') {
        if (effectiveStep < 2) {
          setStep(2);
        } else {
          handleGiveSolution();
        }
      } else if (key === 'Escape' || key === 'Backspace') {
        if (showSolution) {
          handleCloseSolution();
          return;
        }
      } else if (key.toLowerCase() === 'e' || key.toLowerCase() === 'x') {
        setTimerEndAt(0);
        triggerErrorSuspense();
      } else if (key.toLowerCase() === 'c') {
        // Tasto rapido C: avvia o arresta il timer 5s
        if (timerDisplay > 0) {
          setTimerEndAt(0);
        } else {
          setTimerEndAt(Date.now() + 5000);
        }
      } else if (key.toLowerCase() === 't') {
        setShowTitle(true);
      } else if (key.toLowerCase() === 'm') {
        // Alterna Play / Pausa sincronizzato sia per gli stems che per la canzone finale
        setIsPlaying(prev => !prev);
      }
    };

    if (!interactive) return;
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [interactive, triggerRevealClue, triggerErrorSuspense, showSolution, handleGiveSolution, handleCloseSolution, setIsPlaying, setStep, effectiveStep, timerDisplay, setTimerEndAt]);

  const rankingMarkers = [
    { value: 7, top: "34.070%" }, // Giallo (1 indizio)
    { value: 6, top: "48.500%" }, // Verde alto
    { value: 5, top: "56.000%" }, // Verde basso
    { value: 4, top: "68.000%" }, // Blu 1
    { value: 3, top: "75.000%" }, // Blu 2
    { value: 2, top: "82.000%" }, // Blu 3
    { value: 1, top: "89.000%" }  // Blu 4
  ];

  const currentSfondo = (gameData as any).sfondo || '/Icone/sfondi/sfondo_box2_cristalli.jpg';

  const currentRevealedCount = Object.values(revealed).filter(v => v === true).length;
  const activeTeamIdx = getActiveTeamIdx(currentRevealedCount);
  const activeTeamName = teamNames[activeTeamIdx] || `SQUADRA ${activeTeamIdx + 1}`;
  const teamColorConfigs = [
    { text: 'text-red-400', border: 'border-red-500/80', bg: 'bg-red-950/90' },
    { text: 'text-blue-400', border: 'border-blue-500/80', bg: 'bg-blue-950/90' },
    { text: 'text-emerald-400', border: 'border-emerald-500/80', bg: 'bg-emerald-950/90' }
  ];
  const activeTeamColor = teamColorConfigs[activeTeamIdx] || teamColorConfigs[0];

  return (
    <div 
      className={`relative w-full min-h-screen ${currentSfondo ? 'bg-black' : 'bg-gradient-to-br from-neutral-950 to-neutral-900'} overflow-hidden flex items-center justify-center`}
      style={currentSfondo ? { backgroundImage: assetUrlCss(currentSfondo), backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' } : {}}
    >
      {/* EFFETTI DI LUCE SULLO SFONDO (Decorativi) */}
      {!currentSfondo && (
        <>
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-500/10 blur-[120px] rounded-full pointer-events-none" />
        </>
      )}

      {/* Frame 16:9 scalato automaticamente sul viewport */}
      <div className="relative w-full max-w-[1920px] aspect-[16/9]">
        
        {/* Barra di controllo Step per il Relatore */}
        {isPresenter && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 px-4 py-2 rounded-2xl shadow-2xl backdrop-blur-md">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 mr-1">
              Schermo Pubblico:
            </span>
            <button
              type="button"
              onClick={() => setStep(0)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                effectiveStep === 0
                  ? 'bg-yellow-500 text-slate-950 shadow-md ring-2 ring-yellow-400/50'
                  : 'bg-slate-700/60 hover:bg-slate-700 text-slate-300'
              }`}
            >
              Step 0: Sfondo
            </button>
            <button
              type="button"
              onClick={() => setStep(1)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                effectiveStep === 1
                  ? 'bg-yellow-500 text-slate-950 shadow-md ring-2 ring-yellow-400/50'
                  : 'bg-slate-700/60 hover:bg-slate-700 text-slate-300'
              }`}
            >
              Step 1: Canzone & Indizi
            </button>
            <button
              type="button"
              onClick={() => setStep(2)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                effectiveStep === 2
                  ? 'bg-yellow-500 text-slate-950 shadow-md ring-2 ring-yellow-400/50'
                  : 'bg-slate-700/60 hover:bg-slate-700 text-slate-300'
              }`}
            >
              Step 2: Domanda & Risposte
            </button>
            <div className="h-4 w-[1px] bg-slate-700 mx-1" />
            <button
              type="button"
              onClick={() => {
                if (timerDisplay > 0) {
                  setTimerEndAt(0);
                } else {
                  setTimerEndAt(Date.now() + 5000);
                }
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                timerDisplay > 0
                  ? 'bg-amber-500 text-slate-950 shadow-md ring-2 ring-amber-400/50 animate-pulse'
                  : 'bg-slate-700/60 hover:bg-slate-700 text-amber-300'
              }`}
              title="Tasto rapido [C]: Avvia o ferma il timer da 5s per indovinare la canzone"
            >
              <span>⏱</span>
              <span>{timerDisplay > 0 ? `Timer: ${Math.ceil(timerDisplay)}s (Stop)` : 'Timer 5s [C]'}</span>
            </button>
            <button
              type="button"
              onClick={() => triggerErrorSuspense()}
              className="px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 bg-red-950/80 hover:bg-red-900 border border-red-500/60 text-red-300 shadow-md active:scale-95"
              title="Tasto rapido [E] o [X]: Avvia la scalata per risposta errata e passa il turno"
            >
              <span>❌</span>
              <span>Scalata Errata [E]</span>
            </button>
          </div>
        )}

        {/* Step 1+: Scritta CANZONE sopra la lista di indizi */}
        {effectiveStep >= 1 && (
          <div
            className="absolute left-[5.026%] top-[7.87%] w-[35.794%] h-[14.444%] bg-[#792ba6] border-[#0f2d54] flex items-center justify-center px-[2%] transition-all duration-700 shadow-[0_0_40px_rgba(121,43,166,0.6)] animate-in fade-in"
            style={{
              borderWidth: "clamp(4px, 0.5208vw, 10px)",
              borderRadius: "clamp(30px, 6.5vw, 124px)"
            }}
          >
            <h2 className="text-white font-black uppercase tracking-tight text-[clamp(16px,2vw,42px)] text-center leading-none">
              CANZONE
            </h2>
          </div>
        )}

        {/* Step 1+: Cronometro 5s — Centrato perfettamente nel varco tra i due banner superiori */}
        {timerDisplay > 0 && !showSolution && effectiveStep >= 1 && (
          <div 
            onClick={() => setTimerEndAt(0)}
            className="absolute left-[44.63%] top-[15.092%] -translate-x-1/2 -translate-y-1/2 z-40 animate-zoom-in cursor-pointer select-none group"
            title="Clicca per fermare il cronometro (oppure premi C)"
          >
            <div className={`px-4 py-2.5 rounded-2xl backdrop-blur-xl flex flex-col items-center border-2 transition-all duration-300 group-hover:scale-105 active:scale-95 ${
              timerDisplay <= 2
                ? 'bg-red-950/95 border-red-500 shadow-[0_0_35px_rgba(239,68,68,0.8)] animate-pulse'
                : 'bg-slate-950/95 border-amber-400/80 shadow-[0_0_35px_rgba(251,191,36,0.6)]'
            }`}>
              <CountdownTimer seconds={timerDisplay} totalSeconds={5} />
              <div className="mt-1 flex flex-col items-center">
                <span className="text-[8px] font-black uppercase tracking-wider text-white/60">
                  TENTATIVO
                </span>
                <span className={`text-[10px] font-black uppercase tracking-wider ${activeTeamColor.text}`}>
                  {activeTeamName}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Step 1+: Riquadro sinistro (Frasi da svelare / Stems indizi) */}
        {effectiveStep >= 1 && (
          <div
            className="absolute left-[5.026%] top-[29.907%] w-[35.794%] h-[65.315%] border-[#8e3600] bg-black/40 backdrop-blur-md overflow-hidden flex-shrink-0 p-4 transition-all duration-700 animate-in fade-in"
            style={{ borderWidth: "clamp(6px, 1.0417vw, 20px)" }}
          >
            <div className="w-full h-full flex flex-col justify-around gap-2">
              {[...gameData.elementi].reverse().map((el: any) => {
                const isRevealed = revealAll || !!revealed[el.posizione];
                const iconPath = getInstrumentIcon(el.audio, el.testo, el.frase);
                return (
                  <div 
                    key={el.posizione}
                    className={`flex-1 flex items-center justify-between px-4 rounded-xl transition-all duration-700 ${getPhraseStyle(el.posizione, isRevealed)}`}
                    style={{ boxShadow: isRevealed ? "inset 0 0 20px rgba(255,255,255,0.2)" : "none" }}
                  >
                    <span className={`font-black tracking-tight text-[clamp(14px,1.5vw,28px)] text-left flex-1 transition-all duration-700 ${isRevealed ? 'opacity-100 scale-100' : 'opacity-0 scale-90 text-transparent'}`}>
                      {(el as any).frase || el.testo}
                    </span>
                    {isRevealed && (
                      <div className="h-[85%] max-h-[76px] aspect-square flex items-center justify-center shrink-0 ml-3 transition-transform duration-300 hover:scale-110 drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)] animate-zoom-in">
                        <img
                          src={assetUrl(iconPath)}
                          alt="Strumento"
                          className="w-full h-full object-contain filter drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2+: Pill superiore destra (Domanda Categoria - centrata sopra la lista) */}
        {effectiveStep >= 2 && (
          <div
            className={`absolute left-[48.438%] top-[7.87%] w-[42.5%] h-[14.444%] bg-[#792ba6] border-[#0f2d54] flex items-center justify-center px-[2%] transition-all duration-1000 ${showTitle || revealAll ? 'shadow-[0_0_40px_rgba(121,43,166,0.6)]' : ''} animate-in fade-in`}
            style={{
              borderWidth: "clamp(4px, 0.5208vw, 10px)",
              borderRadius: "clamp(30px, 6.5vw, 124px)"
            }}
          >
            <h1 className="text-white font-black uppercase tracking-tight text-[clamp(16px,2vw,42px)] text-center leading-none">
              {gameData.titolo}
            </h1>
          </div>
        )}

        {/* Step 2+: BOX BACKGROUNDS DESTRA & RISPOSTE */}
        {effectiveStep >= 2 && (
          <>
            {/* Box Yellow (7) */}
            <div
              className="absolute left-[53.073%] w-[33.229%] border-[#002164] bg-[#f7f700] top-[29.907%] h-[12.685%] transition-all duration-700 animate-in fade-in"
              style={{
                borderWidth: "clamp(2px, 0.2604vw, 5px)",
                borderRadius: "clamp(6px, 0.5208vw, 10px)"
              }}
            />

            {/* Box Green (5, 6) */}
            <div
              className="absolute left-[53.073%] w-[33.229%] border-[#002164] bg-[#00ff00] top-[45.556%] h-[17.87%] transition-all duration-700 animate-in fade-in"
              style={{
                borderWidth: "clamp(2px, 0.2604vw, 5px)",
                borderRadius: "clamp(6px, 0.5208vw, 10px)"
              }}
            />

            {/* Box Blue (1, 2, 3, 4) */}
            <div
              className="absolute left-[53.073%] w-[33.229%] border-[#002164] bg-[#00b3f6] top-[66.111%] h-[29.111%] transition-all duration-700 animate-in fade-in"
              style={{
                borderWidth: "clamp(2px, 0.2604vw, 5px)",
                borderRadius: "clamp(6px, 0.5208vw, 10px)"
              }}
            />

            {/* TESTI INDIZI E MARKER NUMERICI */}
            {rankingMarkers.map((marker) => {
              const el = gameData.elementi[marker.value - 1];
              const isRevealed = (revealed[marker.value] || revealAll);
              return (
                <React.Fragment key={marker.value}>
                  {/* Testo dell'indizio (Allineato e centrato esattamente al marker) */}
                  <div
                    onClick={(e) => {
                      if (e.shiftKey) {
                        triggerErrorSuspense(marker.value);
                      } else {
                        triggerRevealClue(marker.value);
                      }
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      triggerErrorSuspense(marker.value);
                    }}
                    className={`absolute left-[53.073%] w-[33.229%] flex items-center justify-center px-[3%] transition-all ${
                      !isRevealed ? 'cursor-pointer hover:scale-[1.01]' : ''
                    }`}
                    style={{
                      top: marker.top,
                      height: "4.352%"
                    }}
                    title={!isRevealed ? "Click: Rivelazione esatta | Shift+Click o Tasto destro: Scalata errata" : undefined}
                  >
                    <p className={`w-full font-black uppercase text-[clamp(10px,1.2vw,24px)] leading-tight text-center ${marker.value <= 4 ? 'text-white' : 'text-[#1b1b1b]'}`}>
                      {isRevealed ? el?.testo : ""}
                    </p>
                  </div>

                  {/* Marker numerico a destra */}
                  <div
                    onClick={(e) => {
                      if (e.shiftKey) {
                        triggerErrorSuspense(marker.value);
                      } else {
                        triggerRevealClue(marker.value);
                      }
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      triggerErrorSuspense(marker.value);
                    }}
                    className={`absolute left-[87.708%] w-[3.177%] h-[4.352%] bg-[#3a3838] border-[#002164] flex items-center justify-center group transition-all ${
                      !isRevealed ? 'cursor-pointer hover:scale-110 hover:bg-[#4a4848]' : ''
                    }`}
                    style={{
                      top: marker.top,
                      borderWidth: "clamp(2px, 0.2083vw, 4px)",
                      borderRadius: "clamp(6px, 0.5208vw, 10px)"
                    }}
                    title={!isRevealed ? "Click: Rivelazione esatta | Shift+Click o Tasto destro: Scalata errata" : undefined}
                  >
                    <span className="text-white font-black text-[clamp(12px,1.56vw,30px)] leading-none">
                      {marker.value}
                    </span>
                  </div>
                </React.Fragment>
              );
            })}

            {/* Pulsante per riaprire la soluzione se chiusa e tutti gli elementi sono svelati */}
            {!showSolution && !revealAll && Object.values(revealed).filter(Boolean).length >= 7 && (
              <div className="absolute left-[5.052%] top-[82%] z-40">
                <button
                  type="button"
                  onClick={handleGiveSolution}
                  className="px-5 py-2.5 rounded-2xl bg-[#792ba6]/90 hover:bg-[#792ba6] text-white border-2 border-white/30 text-xs font-black uppercase tracking-wider shadow-[0_0_25px_rgba(121,43,166,0.6)] flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                >
                  <span>🎵</span> Mostra Soluzione [S]
                </button>
              </div>
            )}

            {/* Solution Overlay */}
            <Solution 
              isVisible={showSolution || revealAll} 
              revealAll={revealAll}
              isPresenter={isPresenter}
              onClose={handleCloseSolution}
            />
          </>
        )}
      </div>

      {/* OVERLAY EFFETTO SUSPENCE A SCALA 3D (GIOCO 2 MUSICALE) */}
      <ClassificaStaircaseSuspenseOverlay
        activeSuspense={activeSuspense}
        allElements={(gameData.elementi || []).map((el: any) => ({
          posizione: el.posizione,
          testo: el.testo,
          audio: el.audio,
          icon: getInstrumentIcon(el.audio, el.testo, el.frase),
        }))}
        revealedState={revealed}
        categoryTitle={gameData.titolo || (gameData as any).categoria || 'CLASSIFICA MUSICALE'}
        sfondoUrl={currentSfondo}
        canPlayAudio={shouldPlayAudio}
        onRevealPoint={handleSuspenseReveal}
        onComplete={handleSuspenseComplete}
      />
    </div>
  );
};

export default ClassificaMusicaleBoard;

