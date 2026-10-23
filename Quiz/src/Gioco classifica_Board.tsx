import React, { useState, useEffect, useCallback, useRef } from "react";
import { useGameData } from './context/GameDataContext';
import { assetUrl, assetUrlCss } from './lib/assetUrl';
import { useSyncedState } from './hooks/useSyncedState';
import { useScores } from './context/ScoreContext';
import { ClassificaStaircaseSuspenseOverlay, type Box2SuspenseData } from './components/ClassificaStaircaseSuspenseOverlay';
import { CountdownTimer } from './Gioco classifica musicale_Board';
import { CrystalRankingBox, CrystalNumberMarker } from './components/CrystalRankingBlocks';
import { box2SuspenseSoundFX } from './lib/box2SuspenseSoundFX';

const ClassificaBoard = ({ 
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
  const [isAutoAdvancing, setIsAutoAdvancing] = useSyncedState(`playstate_${slideId}_auto`, false);
  const [showTitle, setShowTitle] = useSyncedState(`playstate_${slideId}_showtitle`, false);
  const [activeSuspense, setActiveSuspense] = useSyncedState<Box2SuspenseData | null>(`playstate_${slideId}_suspense`, null);
  const [turnOffset, setTurnOffset] = useSyncedState<number>(`playstate_${slideId}_turn_offset`, 0);
  
  // ── Segnalazione Errore Risposta con X centrale a schermo ───────────────────
  const [showError, setShowError] = useSyncedState<boolean>(`playstate_${slideId}_show_error`, false);

  // ── Cronometro sincronizzato (stile Box 4) — Manche Immagine ────────────────
  // Parte per la squadra di turno dopo che la risposta della lista è stata rivelata (7 secondi)
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
  
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  // Inizializza l'audio se presente nel JSON
  useEffect(() => {
    if (!interactive) return;
    // @ts-ignore - nel caso in cui audio non sia tipizzato su gameData
    if (gameData.audio) {
      // @ts-ignore
      audioRef.current = new Audio(assetUrl(gameData.audio));
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Controlla se tutti gli indizi da 1 a 10 sono stati svelati
  const isGameComplete = revealAll || Array.from({ length: 10 }, (_, i) => i + 1).every(i => revealed[i]);

  // Avvia l'audio in automatico al completamento del gioco (quando tutti i 10 elementi sono svelati)
  useEffect(() => {
    if (isGameComplete && audioRef.current && interactive) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(err => console.error("Auto play solution audio error:", err));
    }
  }, [isGameComplete, interactive]);

  // Generiamo l'ordine di rivelazione dei tasselli per l'immagine
  const totalTiles = (gameData.griglia?.colonne || 10) * (gameData.griglia?.righe || 10);
  const tileOrder = React.useMemo(() => {
    const cols = gameData.griglia?.colonne || 10;
    const rows = gameData.griglia?.righe || 10;
    
    // Controlliamo se esiste un punto focale definito nel JSON, altrimenti usiamo il centro perfetto
    const centerCol = (gameData.griglia as any)?.puntoFocale?.colonna !== undefined 
      ? (gameData.griglia as any).puntoFocale.colonna 
      : (cols - 1) / 2;
      
    const centerRow = (gameData.griglia as any)?.puntoFocale?.riga !== undefined 
      ? (gameData.griglia as any).puntoFocale.riga 
      : (rows - 1) / 2;
    
    // Massima distanza teorica dal punto focale agli angoli della griglia
    const maxDist = Math.max(
      Math.sqrt(Math.pow(0 - centerCol, 2) + Math.pow(0 - centerRow, 2)), // Angolo Top-Left
      Math.sqrt(Math.pow(cols - 1 - centerCol, 2) + Math.pow(0 - centerRow, 2)), // Angolo Top-Right
      Math.sqrt(Math.pow(0 - centerCol, 2) + Math.pow(rows - 1 - centerRow, 2)), // Angolo Bottom-Left
      Math.sqrt(Math.pow(cols - 1 - centerCol, 2) + Math.pow(rows - 1 - centerRow, 2)) // Angolo Bottom-Right
    );
    
    const tiles = Array.from({ length: totalTiles }, (_, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const dist = Math.sqrt(Math.pow(col - centerCol, 2) + Math.pow(row - centerRow, 2));
      const normalizedDist = dist / (maxDist || 1);
      const weight = (normalizedDist * 0.7) + (Math.random() * 0.3);
      
      return { index: i, weight };
    });
    
    return tiles.sort((a, b) => b.weight - a.weight).map(t => t.index);
  }, [totalTiles, gameData.griglia]);

  const isTileRevealed = (tileIndex: number) => {
    if (revealAll) return true;
    const orderIndex = tileOrder.indexOf(tileIndex);
    // Dividiamo i tasselli in 10 blocchi (chunk 0 a 9)
    // chunk 0 (bordo esterno) è legato all'indizio 1, ecc... fino a chunk 9 (centro) per l'indizio 10.
    const chunkIndex = Math.floor((orderIndex / totalTiles) * 10); 
    const requiredClue = chunkIndex + 1; 
    return !!revealed[requiredClue];
  };

  const getTileColor = (tileIndex: number) => {
    const orderIndex = tileOrder.indexOf(tileIndex);
    const chunkIndex = Math.floor((orderIndex / totalTiles) * 10); 
    const clue = chunkIndex + 1; 
    
    // 5 tonalità di Azzurro/Blu (dalla più chiara alla più scura)
    if (clue === 1) return "bg-[#00b3f6]";
    if (clue === 2) return "bg-[#0099ff]";
    if (clue === 3) return "bg-[#007acc]";
    if (clue === 4) return "bg-[#005c8a]";
    if (clue === 5) return "bg-[#003f5c]";
    
    // 3 tonalità di Verde (dalla più chiara alla più scura)
    if (clue === 6) return "bg-[#00ff00]";
    if (clue === 7) return "bg-[#00b300]";
    if (clue === 8) return "bg-[#008000]";
    
    // 2 tonalità di Giallo (dalla più chiara alla più scura)
    if (clue === 9) return "bg-[#f7f700]";
    return "bg-[#d4d400]"; // clue 10
  };

  // Suono gong / avviso scadenza del timer tramite Web Audio API
  const playTimerGong = useCallback(() => {
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

  // Se viene completato il gioco, ferma il timer
  useEffect(() => {
    if (isGameComplete) {
      setTimerEndAt(0);
    }
  }, [isGameComplete, setTimerEndAt]);

  // Cleanup intervallo timer all'unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  // Avanzamento automatico verso la soluzione
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (isAutoAdvancing) {
      // Trova il primo indizio non ancora svelato (da 1 a 10)
      const nextClue = Array.from({ length: 10 }, (_, i) => i + 1).find(i => !revealed[i]);
      if (nextClue) {
        timer = setTimeout(() => {
          setRevealed(prev => ({ ...prev, [nextClue]: true }));
          setLatestClue(nextClue);
        }, 1000);
      } else {
        setIsAutoAdvancing(false); // Tutti svelati, ferma l'avanzamento
      }
    }
    return () => clearTimeout(timer);
  }, [revealed, isAutoAdvancing]);

  const getBox2StarterIdx = useCallback((): number => {
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

  const getCluePoints = useCallback((clueNum: number) => {
    if (clueNum >= 1 && clueNum <= 5) return 1000;
    if (clueNum >= 6 && clueNum <= 8) return 2000;
    if (clueNum >= 9 && clueNum <= 10) return 3000;
    return 0;
  }, []);

  const getActiveTeamIdx = useCallback((currentRevealedCount: number): number => {
    const savedActive = localStorage.getItem('playstate_box2_active_team_idx');
    if (savedActive !== null) {
      return parseInt(savedActive, 10);
    }
    return (questionStarterIdx + currentRevealedCount + turnOffset) % 3;
  }, [questionStarterIdx, turnOffset]);

  const triggerRevealClue = useCallback((num: number) => {
    if (effectiveStep < 2) return;
    if (showError) return; // Non avviare se c'è l'errore X a schermo
    if (revealed[num]) return;
    if (activeSuspense) return;

    const currentRevealedCount = Object.values(revealed).filter(v => v === true).length;
    const targetTeamIdx = getActiveTeamIdx(currentRevealedCount);
    const cluePoints = getCluePoints(num);
    const clueElement = gameData.elementi?.[num - 1];
    const clueText = clueElement?.testo || `Indizio ${num}`;

    setActiveSuspense({
      clueIndex: num,
      teamIdx: targetTeamIdx,
      timestamp: Date.now(),
      totalClues: 10,
      points: cluePoints,
      clueText: clueText,
      isError: false,
    });
  }, [effectiveStep, showError, revealed, activeSuspense, getActiveTeamIdx, getCluePoints, gameData.elementi, setActiveSuspense]);

  const triggerErrorSuspense = useCallback(() => {
    if (effectiveStep < 2) return;
    if (showError) return; // Non avviare se c'è l'errore X a schermo
    if (activeSuspense) return;

    const currentRevealedCount = Object.values(revealed).filter(v => v === true).length;
    const targetTeamIdx = getActiveTeamIdx(currentRevealedCount);

    setActiveSuspense({
      clueIndex: 0,
      teamIdx: targetTeamIdx,
      timestamp: Date.now(),
      totalClues: 10,
      points: 0,
      clueText: 'RISPOSTA NON IN CLASSIFICA',
      isError: true,
    });
  }, [effectiveStep, showError, activeSuspense, revealed, getActiveTeamIdx, setActiveSuspense]);

  // Errore quando viene tentata la risposta (Grande X Rossa a schermo, senza scalinata)
  const triggerAnswerError = useCallback(() => {
    if (activeSuspense) return; // Non sovrapporre se la scalinata è già in corso
    setTimerEndAt(0);
    setShowError(true);
    setTurnOffset(prev => prev + 1);
    box2SuspenseSoundFX.playErrorReveal();
  }, [activeSuspense, setTimerEndAt, setShowError, setTurnOffset]);

  // Gestione spegnimento automatico errore X dopo 900ms
  useEffect(() => {
    if (showError) {
      box2SuspenseSoundFX.playErrorReveal();
      const timer = setTimeout(() => setShowError(false), 900);
      return () => clearTimeout(timer);
    }
  }, [showError, setShowError]);

  const isPublicScreen = React.useMemo(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('mode') === 'games' || (isPresenter === false && params.get('mode') !== null);
  }, [isPresenter]);

  const handleSuspenseReveal = useCallback((clueNum: number, targetTeamIdx: number, points: number) => {
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
  }, [slideId, isPublicScreen, addScore, setRevealed, setPointsAssigned, setLatestClue]);

  const handleSuspenseComplete = useCallback(() => {
    const wasError = activeSuspense?.isError;
    setActiveSuspense(null);
    if (wasError) {
      // In caso di risposta errata: la scalata ha comunicato l'errore, passa il turno alla squadra successiva
      setTurnOffset(prev => prev + 1);
    } else {
      if (!isGameComplete) {
        setTimerEndAt(Date.now() + 7000);
      }
    }
  }, [activeSuspense?.isError, setActiveSuspense, setTurnOffset, isGameComplete, setTimerEndAt]);

  // Input da tastiera (1-9 e 0 per 10, S / Invio, E / X per Errore Risposta, C per Timer)
  useEffect(() => {
    if (!interactive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      if (isAutoAdvancing) return;

      const key = e.key;

      // Tasto \ (Backslash): avvia subito la scalata errata per la lista
      if (key === '\\' || e.code === 'Backquote' || e.code === 'IntlBackslash') {
        e.preventDefault();
        if (showError || activeSuspense) return;
        triggerErrorSuspense();
        return;
      }

      if (key >= '1' && key <= '9') {
        triggerRevealClue(Number(key));
        return;
      } else if (key === '0') {
        triggerRevealClue(10);
        return;
      }

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        setStep(prev => Math.min(prev + 1, 2));
        return;
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        setStep(prev => Math.max(prev - 1, 0));
        return;
      } else if (key.toLowerCase() === 's' || key === 'Enter') {
        setTimerEndAt(0);
        if (effectiveStep < 2) {
          setStep(2);
        } else {
          if (!isAutoAdvancing && !isGameComplete) {
            const currentRevealedCount = Object.values(revealed).filter(v => v === true).length;
            const targetTeamIdx = getActiveTeamIdx(currentRevealedCount);
            if (!isPublicScreen) {
              const solKey = `playstate_${slideId}_score_awarded_solution`;
              if (!localStorage.getItem(solKey)) {
                localStorage.setItem(solKey, 'true');
                addScore(targetTeamIdx, 5000);
              }
            }
            setIsAutoAdvancing(true);
          } else if (isAutoAdvancing && !isGameComplete) {
            setIsAutoAdvancing(false);
            const allRevealed: Record<number, boolean> = {};
            for (let i = 1; i <= 10; i++) allRevealed[i] = true;
            setRevealed(allRevealed);
          }
        }
      } else if (key.toLowerCase() === 'e' || key.toLowerCase() === 'x') {
        // Tasti E e X: mostrano la grande X rossa centrale a schermo (errore risposta tentata)
        triggerAnswerError();
      } else if (key.toLowerCase() === 'c') {
        // Tasto rapido C: avvia o arresta il timer 7s
        if (timerDisplay > 0) {
          setTimerEndAt(0);
        } else {
          setTimerEndAt(Date.now() + 7000);
        }
      } else if (key.toLowerCase() === 't') {
        setShowTitle(true);
      } else if (key.toLowerCase() === 'm') {
        // Tasto M (Musica) per play/pause
        if (audioRef.current) {
          if (audioRef.current.paused) {
            audioRef.current.play().catch(err => console.error("Audio play error:", err));
          } else {
            audioRef.current.pause();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAutoAdvancing, interactive, triggerRevealClue, triggerErrorSuspense, triggerAnswerError, effectiveStep, setStep, isGameComplete, revealed, getActiveTeamIdx, addScore, setRevealed, setIsAutoAdvancing, setShowTitle, timerDisplay, setTimerEndAt]);

  const rankingMarkers = [
    { value: 10, top: "31.389%" },
    { value: 9, top: "36.852%" },
    { value: 8, top: "46.852%" },
    { value: 7, top: "52.315%" },
    { value: 6, top: "57.685%" },
    { value: 5, top: "67.611%" },
    { value: 4, top: "73.074%" },
    { value: 3, top: "78.444%" },
    { value: 2, top: "84.000%" },
    { value: 1, top: "89.370%" }
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
      className={`relative w-full min-h-screen ${currentSfondo ? 'bg-black' : 'bg-gradient-to-br from-neutral-950 to-neutral-900'} overflow-hidden flex items-center justify-center transition-transform duration-100 ${showError ? 'animate-shake' : ''}`}
      style={currentSfondo ? { backgroundImage: assetUrlCss(currentSfondo), backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' } : {}}
    >
      {/* Overlay di Errore Risposta Tentata (Flash Rosso + X Centrale) */}
      {showError && (
        <div className="absolute inset-0 z-[100] pointer-events-none flex items-center justify-center">
          <div className="absolute inset-0 animate-flash-red" />
          <svg 
            className="w-[45%] h-auto text-red-600 drop-shadow-[0_0_50px_rgba(220,38,38,0.9)] animate-error-x" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="4" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </div>
      )}

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
              Step 1: Immagine & Argomento
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
                  setTimerEndAt(Date.now() + 7000);
                }
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                timerDisplay > 0
                  ? 'bg-amber-500 text-slate-950 shadow-md ring-2 ring-amber-400/50 animate-pulse'
                  : 'bg-slate-700/60 hover:bg-slate-700 text-amber-300'
              }`}
              title="Tasto rapido [C]: Avvia o ferma il timer da 7s per indovinare l'immagine"
            >
              <span>⏱</span>
              <span>{timerDisplay > 0 ? `Timer: ${Math.ceil(timerDisplay)}s (Stop)` : 'Timer 7s [C]'}</span>
            </button>

            {/* Pulsante Errore Risposta Tentata (Grande X Rossa a schermo) */}
            <button
              type="button"
              onClick={triggerAnswerError}
              className="px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 bg-red-600 hover:bg-red-500 border border-red-400 text-white shadow-lg active:scale-95"
              title="Tasto rapido [E] o [X]: Mostra la grande X rossa centrale a schermo e passa il turno alla squadra successiva"
            >
              <span>❌</span>
              <span>Risposta Errata [E / X]</span>
            </button>

            {/* Pulsante Scalata Errata per la lista */}
            <button
              type="button"
              onClick={() => triggerErrorSuspense()}
              className="px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 border shadow-md active:scale-95 bg-red-950/80 hover:bg-red-900 border-red-500/60 text-red-300"
              title="Tasto rapido [ \ ]: Mostra l'animazione della scalinata tutta rossa con errore sulla lista"
            >
              <span>🪜</span>
              <span>Scalata Errata [\]</span>
            </button>
          </div>
        )}

        {/* Step 1+: Cronometro 7s — Centrato nel varco tra l'immagine e il banner domanda */}
        {timerDisplay > 0 && !isGameComplete && effectiveStep >= 1 && (
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
              <CountdownTimer seconds={timerDisplay} totalSeconds={7} />
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

        {/* Step 1+: Riquadro sinistro con Immagine coperta da tasselli */}
        {effectiveStep >= 1 && (
          <div
            className="absolute left-[5.026%] top-[7.87%] w-[35.794%] h-[63.611%] border-[#8e3600] bg-black overflow-hidden flex-shrink-0 transition-all duration-700 animate-in fade-in"
            style={{ borderWidth: "clamp(6px, 1.0417vw, 20px)" }}
          >
            {/* L'Immagine Segreta */}
            <img 
              src={assetUrl(gameData.immagineSegreta)} 
              alt="Immagine Segreta" 
              className="w-full h-full object-cover"
            />
            
            {/* Griglia di Copertura (Tasselli) */}
            <div 
              className="absolute inset-0 grid"
              style={{
                gridTemplateColumns: `repeat(${gameData.griglia?.colonne || 10}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${gameData.griglia?.righe || 10}, minmax(0, 1fr))`
              }}
            >
              {Array.from({ length: totalTiles }).map((_, i) => (
                <div 
                  key={i}
                  className={`w-full h-full border border-white/10 transition-all duration-700 ease-in-out ${
                    isTileRevealed(i) ? 'opacity-0 scale-95' : `opacity-100 ${getTileColor(i)}`
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Step 1+: Pill inferiore sinistra (Argomento dell'immagine) */}
        {effectiveStep >= 1 && (
          <div
            className={`absolute left-[5.052%] top-[80%] w-[35.781%] h-[15.222%] bg-[#792ba6] border-[#0f2d54] flex items-center justify-center px-[2%] transition-all duration-700 animate-in fade-in ${
              isGameComplete ? 'scale-105 shadow-[0_0_50px_rgba(121,43,166,0.6)]' : ''
            }`}
            style={{
              borderWidth: "clamp(4px, 0.5208vw, 10px)",
              borderRadius: "clamp(30px, 6.5vw, 124px)"
            }}
          >
            {!isGameComplete ? (
               <p className="text-white font-black uppercase tracking-tight text-[clamp(14px,1.8vw,36px)] text-center leading-none">
                 {gameData.categoria || (gameData as any).soluzione?.categoria || "Gioco Indizi"}
               </p>
            ) : (
               <div className="animate-zoom-in text-center px-2">
                 <p className="text-white font-black uppercase tracking-tight text-[clamp(16px,2vw,40px)] text-center leading-none">
                   {gameData.soluzioneTesto || (gameData as any).soluzione?.titolo || "SOLUZIONE"}
                 </p>
               </div>
            )}
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

        {/* Step 2+: BOX BACKGROUNDS DESTRA & RISPOSTE A FORMA DI CRISTALLO */}
        {effectiveStep >= 2 && (
          <>
            {/* Box Yellow (9, 10) - Cristallo Topazio */}
            <CrystalRankingBox
              tier="yellow"
              top="29.907%"
              height="12.685%"
              className="animate-in fade-in"
            />

            {/* Box Green (6, 7, 8) - Cristallo Smeraldo */}
            <CrystalRankingBox
              tier="green"
              top="45.556%"
              height="17.87%"
              className="animate-in fade-in"
            />

            {/* Box Blue (1, 2, 3, 4, 5) - Cristallo Zaffiro */}
            <CrystalRankingBox
              tier="blue"
              top="66.111%"
              height="29.111%"
              className="animate-in fade-in"
            />

            {/* TESTI INDIZI E CRISTALLI NUMERICI */}
            {rankingMarkers.map((marker) => {
              const markerTier = marker.value >= 9 ? 'yellow' : marker.value >= 6 ? 'green' : 'blue';
              const isRevealed = !!revealed[marker.value] || revealAll;
              return (
                <React.Fragment key={marker.value}>
                  {/* Testo dell'indizio (Allineato esattamente al marker) */}
                  <div
                    onClick={(e) => {
                      if (e.shiftKey) {
                        triggerErrorSuspense();
                      } else {
                        triggerRevealClue(marker.value);
                      }
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      triggerErrorSuspense();
                    }}
                    className={`absolute left-[53.073%] w-[33.229%] flex items-center justify-center px-[2%] transition-all ${
                      !isRevealed ? 'cursor-pointer hover:scale-[1.01]' : ''
                    }`}
                    style={{
                      top: marker.top,
                      height: "4.352%"
                    }}
                    title={!isRevealed ? "Click: Rivelazione esatta | Shift+Click o Tasto destro: Scalata errata" : undefined}
                  >
                    <p className={`w-full font-black uppercase text-[clamp(10px,1.2vw,24px)] leading-tight text-center ${
                      marker.value <= 5 
                        ? 'text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)]' 
                        : 'text-[#141414] drop-shadow-[0_1px_1px_rgba(255,255,255,0.6)]'
                    }`}>
                      {isRevealed ? gameData.elementi[marker.value - 1]?.testo : ""}
                    </p>
                  </div>

                  {/* Marker numerico a forma di cristallo a destra (1-10) */}
                  <CrystalNumberMarker
                    value={marker.value}
                    top={marker.top}
                    tier={markerTier}
                    isRevealed={isRevealed}
                    canClick={!isRevealed}
                    onClick={(e) => {
                      if (e.shiftKey) {
                        triggerErrorSuspense();
                      } else {
                        triggerRevealClue(marker.value);
                      }
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      triggerErrorSuspense();
                    }}
                    title={!isRevealed ? "Click: Rivelazione esatta | Shift+Click o Tasto destro: Scalata errata" : undefined}
                  />
                </React.Fragment>
              );
            })}
          </>
        )}
      </div>

      {/* OVERLAY EFFETTO SUSPENCE A SCALA 3D (GIOCO 2) */}
      <ClassificaStaircaseSuspenseOverlay
        activeSuspense={activeSuspense}
        allElements={gameData.elementi || []}
        revealedState={revealed}
        categoryTitle={gameData.categoria || (gameData as any).soluzione?.categoria || gameData.titolo || 'CLASSIFICA TOP 10'}
        sfondoUrl={currentSfondo}
        canPlayAudio={interactive}
        onRevealPoint={handleSuspenseReveal}
        onComplete={handleSuspenseComplete}
      />
    </div>
  );
};

export default ClassificaBoard;

