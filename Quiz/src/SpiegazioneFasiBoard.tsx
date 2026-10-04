import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useGameData } from './context/GameDataContext';
import { assetUrl } from './lib/assetUrl';
import { useSyncedState } from './hooks/useSyncedState';

interface SpiegazioneData {
  src?: string;
  videoUrl?: string;
  titolo?: string;
  sottotitolo?: string;
  slideId?: string;
  audioUrl?: string;
  fase1Titolo?: string;
  fase2Titolo?: string;
  fase3Titolo?: string;
}

interface SpiegazioneFasiBoardProps {
  interactive?: boolean;
  revealAll?: boolean;
}

export default function SpiegazioneFasiBoard({
  interactive = true,
  revealAll = false,
}: SpiegazioneFasiBoardProps) {
  const data = useGameData<SpiegazioneData>();
  const slideId = data?.slideId || 'box0_spiegazione';

  const audioSrc = useMemo(() => {
    return assetUrl(data?.audioUrl || '/Audio/spiegazione_fasi_audio.m4a');
  }, [data?.audioUrl]);

  const fase1Title = data?.fase1Titolo || 'PRODROMI DELLO SCONTRO';
  const fase2Title = data?.fase2Titolo || 'CORSA AGLI EQUIPAGGIAMENTI';
  const fase3Title = data?.fase3Titolo || 'TERMOPILI APOCALITTICHE';

  // Sincronizzazione dello stato tra le finestre Electron (Relatore, Schermo Pubblico, Punteggi)
  const [isPlaying, setIsPlaying] = useSyncedState<boolean>(
    `playstate_${slideId}_playing`,
    false
  );
  const [manualStep, setManualStep] = useSyncedState<number>(
    `playstate_${slideId}_step`,
    revealAll ? 4 : 0
  );
  const [isAllRevealed, setIsAllRevealed] = useSyncedState<boolean>(
    `playstate_${slideId}_revealed`,
    revealAll
  );

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(39.5);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hideControlsTimer = useRef<NodeJS.Timeout | null>(null);

  // Sincronizza audio play/pause con isPlaying
  useEffect(() => {
    if (!interactive) return;
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.play().catch((err) => {
        console.warn('Autoplay audio intercettato:', err);
      });
    } else {
      audio.pause();
    }
  }, [isPlaying, interactive]);

  // Aggiornamento tempo audio
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const t = audioRef.current.currentTime;
      setCurrentTime(t);
      if (audioRef.current.duration && !isNaN(audioRef.current.duration)) {
        setDuration(Math.min(39.5, audioRef.current.duration));
      }
      if (t >= 39.2) {
        setIsPlaying(false);
        setIsAllRevealed(true);
      }
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setIsAllRevealed(true);
  };

  // Visibilità dinamica basata sull'audio O step manuale O revealAll
  // Timestamps originali calibrati con la voce della traccia audio:
  // 0s - 3.5s: Intro boot tecnologico
  // ~10.0s: Fase 1 Header card
  // ~13.5s: Fase 1 Tre frecce verso il basso (3-2-1)
  // ~17.0s: Fase 1 Icona Punti
  // ~20.5s: Fase 2 Header card
  // ~23.0s: Fase 2 Due frecce verso il basso
  // ~25.5s: Fase 2 Icona Punti
  // ~27.2s: Fase 2 Barra / e Icona Bonus
  // ~30.8s: Fase 3 Header card
  // ~33.5s: Fase 3 Una freccia verso il basso
  // ~36.0s: Fase 3 Trofeo Finale
  const showIntroBoot = !isAllRevealed && ((isPlaying && currentTime <= 3.8) || manualStep === 0);

  const showFase1Card = isAllRevealed || (isPlaying && currentTime >= 10.0) || manualStep >= 1;
  const showFase1Chevrons = isAllRevealed || (isPlaying && currentTime >= 13.5) || manualStep >= 1;
  const showFase1Bottom = isAllRevealed || (isPlaying && currentTime >= 17.0) || manualStep >= 1;

  const showFase2Card = isAllRevealed || (isPlaying && currentTime >= 20.5) || manualStep >= 2;
  const showFase2Chevrons = isAllRevealed || (isPlaying && currentTime >= 23.0) || manualStep >= 2;
  const showFase2Coins = isAllRevealed || (isPlaying && currentTime >= 25.5) || manualStep >= 2;
  const showFase2Bonus = isAllRevealed || (isPlaying && currentTime >= 27.2) || manualStep >= 2;

  const showFase3Card = isAllRevealed || (isPlaying && currentTime >= 30.8) || manualStep >= 3;
  const showFase3Chevrons = isAllRevealed || (isPlaying && currentTime >= 33.5) || manualStep >= 3;
  const showFase3Trophy = isAllRevealed || (isPlaying && currentTime >= 36.0) || manualStep >= 3;

  // Mostra regole e delta in basso quando tutto è svelato o nella fase finale
  const showTermopiliInfo = isAllRevealed || (isPlaying && currentTime >= 37.0) || manualStep >= 3;

  // Toggle Play / Pause
  const togglePlay = useCallback(() => {
    if (!interactive) return;
    setIsPlaying(!isPlaying);
  }, [isPlaying, setIsPlaying, interactive]);

  // Restart
  const restart = useCallback(() => {
    if (!interactive) return;
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
    setCurrentTime(0);
    setIsAllRevealed(false);
    setManualStep(0);
    setIsPlaying(true);
  }, [interactive, setIsPlaying, setIsAllRevealed, setManualStep]);

  // Reset all
  const resetAllState = useCallback(() => {
    if (!interactive) return;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setCurrentTime(0);
    setIsPlaying(false);
    setIsAllRevealed(false);
    setManualStep(0);
  }, [interactive, setIsPlaying, setIsAllRevealed, setManualStep]);

  // Svela tutto
  const revealEverything = useCallback(() => {
    if (!interactive) return;
    setIsAllRevealed(true);
    setManualStep(4);
  }, [interactive, setIsAllRevealed, setManualStep]);

  // Passo successivo
  const nextStep = useCallback(() => {
    if (!interactive) return;
    if (isAllRevealed) return;
    setManualStep((prev) => {
      const next = prev + 1;
      if (next >= 3) {
        setIsAllRevealed(true);
      }
      return next;
    });
  }, [interactive, isAllRevealed, setManualStep, setIsAllRevealed]);

  // Passo precedente
  const prevStep = useCallback(() => {
    if (!interactive) return;
    setIsAllRevealed(false);
    setManualStep((prev) => Math.max(0, prev - 1));
  }, [interactive, setIsAllRevealed, setManualStep]);

  // Toggle Mute
  const toggleMute = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.muted = !audioRef.current.muted;
      setIsMuted(audioRef.current.muted);
    }
  }, []);

  // Scorciatoie tastiera globali
  useEffect(() => {
    if (!interactive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      if (e.key === ' ' || e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        restart();
      } else if (e.key === '0') {
        e.preventDefault();
        resetAllState();
      } else if (e.key === 's' || e.key === 'S' || e.key === 'Enter') {
        e.preventDefault();
        revealEverything();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        nextStep();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevStep();
      } else if (e.key === '1') {
        e.preventDefault();
        setManualStep(1);
      } else if (e.key === '2') {
        e.preventDefault();
        setManualStep(2);
      } else if (e.key === '3') {
        e.preventDefault();
        setManualStep(3);
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        toggleMute();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    interactive,
    togglePlay,
    restart,
    resetAllState,
    revealEverything,
    nextStep,
    prevStep,
    setManualStep,
    toggleMute,
  ]);

  // Nasconde automaticamente i controlli del relatore dopo inattività
  const handleMouseMove = () => {
    setShowControls(true);
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    hideControlsTimer.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  };

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      className="relative w-[1920px] h-[1080px] overflow-hidden select-none bg-[#07090f] text-white flex flex-col items-center justify-between font-sans px-12 py-8"
    >
      <style>{`
        @keyframes subtle-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes pulse-glow-red {
          0%, 100% { filter: drop-shadow(0 0 10px rgba(239, 68, 68, 0.4)) drop-shadow(0 0 25px rgba(220, 38, 38, 0.2)); }
          50% { filter: drop-shadow(0 0 22px rgba(239, 68, 68, 0.8)) drop-shadow(0 0 45px rgba(220, 38, 38, 0.4)); }
        }
        @keyframes pulse-glow-green {
          0%, 100% { filter: drop-shadow(0 0 10px rgba(16, 185, 129, 0.4)) drop-shadow(0 0 25px rgba(5, 150, 105, 0.2)); }
          50% { filter: drop-shadow(0 0 22px rgba(16, 185, 129, 0.8)) drop-shadow(0 0 45px rgba(5, 150, 105, 0.4)); }
        }
        @keyframes pulse-glow-blue {
          0%, 100% { filter: drop-shadow(0 0 10px rgba(56, 189, 248, 0.4)) drop-shadow(0 0 25px rgba(2, 132, 199, 0.2)); }
          50% { filter: drop-shadow(0 0 22px rgba(56, 189, 248, 0.8)) drop-shadow(0 0 45px rgba(2, 132, 199, 0.4)); }
        }
        @keyframes energy-flow {
          0% { stroke-dashoffset: 60; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes card-entry {
          0% {
            opacity: 0;
            transform: translateY(-40px) scale(0.9);
          }
          60% {
            opacity: 1;
            transform: translateY(6px) scale(1.03);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes badge-entry {
          0% {
            opacity: 0;
            transform: translateY(40px) scale(0.85);
          }
          70% {
            opacity: 1;
            transform: translateY(-5px) scale(1.04);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes chevron-slide {
          0% {
            opacity: 0;
            transform: translateY(-25px);
          }
          60% {
            opacity: 1;
            transform: translateY(3px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes hud-scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(1000%); }
        }
        @keyframes grid-pulse {
          0%, 100% { opacity: 0.12; }
          50% { opacity: 0.24; }
        }
      `}</style>

      {/* Audio Element */}
      {interactive && (
        <audio
          ref={audioRef}
          src={audioSrc}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleAudioEnded}
          preload="auto"
        />
      )}

      {/* ========================================================================= */}
      {/* 1. SFONDO E ATMOSFERA CYBERNETICA IMPERIO (NO foto della giungla)         */}
      {/* ========================================================================= */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Deep ambient color glow lights behind the 3 columns */}
        <div className="absolute -top-24 left-[10%] w-[550px] h-[550px] bg-red-600/15 rounded-full blur-[140px]" />
        <div className="absolute -top-24 left-[50%] -translate-x-1/2 w-[550px] h-[550px] bg-emerald-600/15 rounded-full blur-[140px]" />
        <div className="absolute -top-24 right-[10%] w-[550px] h-[550px] bg-sky-600/15 rounded-full blur-[140px]" />
        <div className="absolute -bottom-32 left-[50%] -translate-x-1/2 w-[900px] h-[400px] bg-indigo-900/15 rounded-full blur-[160px]" />

        {/* Subtle Tech Grid lines */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px)
            `,
            backgroundSize: '48px 48px',
            animation: 'grid-pulse 6s ease-in-out infinite',
          }}
        />

        {/* Hexagonal / Radial blueprint accent in center */}
        <div className="absolute inset-0 bg-radial from-transparent via-[#07090f]/70 to-[#07090f] opacity-90" />

        {/* Futuristic Blueprint Corner Brackets */}
        <svg className="absolute inset-0 w-full h-full text-white/10" fill="none">
          {/* Top-Left Bracket */}
          <path d="M 40 100 L 40 40 L 100 40" stroke="currentColor" strokeWidth="2" />
          <circle cx="40" cy="40" r="3" fill="currentColor" />
          {/* Top-Right Bracket */}
          <path d="M 1880 100 L 1880 40 L 1820 40" stroke="currentColor" strokeWidth="2" />
          <circle cx="1880" cy="40" r="3" fill="currentColor" />
          {/* Bottom-Left Bracket */}
          <path d="M 40 980 L 40 1040 L 100 1040" stroke="currentColor" strokeWidth="2" />
          <circle cx="40" cy="1040" r="3" fill="currentColor" />
          {/* Bottom-Right Bracket */}
          <path d="M 1880 980 L 1880 1040 L 1820 1040" stroke="currentColor" strokeWidth="2" />
          <circle cx="1880" cy="1040" r="3" fill="currentColor" />
        </svg>

        {/* Intro Energy Scan (primi secondi di boot olografico) */}
        {showIntroBoot && (
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-20 flex items-center justify-center pointer-events-none z-30 opacity-80 transition-opacity duration-700">
            <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_25px_#38bdf8]" />
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. HEADER: TITOLO E INTRODUZIONE REGOLAMENTO                             */}
      {/* ========================================================================= */}
      <header className="relative z-10 w-full max-w-[1780px] flex flex-col items-center shrink-0 pt-2 pb-3">
        {/* Top Tech Badge */}
        <div className="flex items-center gap-3 px-4 py-1.5 rounded-full bg-white/5 border border-white/15 backdrop-blur-md shadow-lg mb-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
          <span className="text-xs font-mono font-black uppercase tracking-[0.25em] text-amber-300">
            IMPERIO VIII • REGOLAMENTO UFFICIALE
          </span>
          <span className="text-white/30 text-xs">|</span>
          <span className="text-xs font-mono font-bold tracking-wider text-white/60">
            ARCHITETTURA DEL TORNEO
          </span>
        </div>

        {/* Main Title */}
        <h1 className="text-4xl lg:text-5xl font-black tracking-tight uppercase text-transparent bg-clip-text bg-gradient-to-r from-white via-white/95 to-white/70 drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)] text-center">
          LE TRE FASI DEL GIOCO
        </h1>
        <p className="text-sm font-semibold tracking-widest uppercase text-white/50 mt-1">
          Dalla conquista iniziale dei punti fino alla manche decisiva delle Termopili
        </p>
      </header>

      {/* ========================================================================= */}
      {/* 3. MAIN CONTENT: LE 3 COLONNE (Fasi 1, 2 e 3 con 3-2-1 frecce)           */}
      {/* ========================================================================= */}
      <main className="relative z-10 w-full max-w-[1780px] flex-1 grid grid-cols-3 gap-10 items-stretch min-h-0 my-2">
        {/* ======================================================================= */}
        {/* COLONNA 1: FASE 1 - PRODROMI DELLO SCONTRO (Rosso Neon)                 */}
        {/* ======================================================================= */}
        <section
          className={`flex flex-col items-center justify-between rounded-3xl p-6 transition-all duration-700 relative overflow-hidden ${
            showFase1Card
              ? 'bg-gradient-to-b from-red-950/40 via-red-950/20 to-black/60 border border-red-500/30 shadow-[0_8px_32px_rgba(220,38,38,0.2)] backdrop-blur-md'
              : 'border border-white/5 bg-white/[0.01]'
          }`}
        >
          {/* Subtle top indicator bar */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-80" />

          {/* 1.1 TOP CARD: Header Fase 1 */}
          <div
            className={`w-full transition-all duration-700 ${
              showFase1Card ? 'opacity-100' : 'opacity-0 -translate-y-8 pointer-events-none'
            }`}
            style={{
              animation: showFase1Card ? 'card-entry 0.65s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' : 'none',
            }}
          >
            <div className="relative w-full rounded-2xl p-5 bg-gradient-to-br from-red-600 via-rose-700 to-red-800 border-2 border-red-400 text-white shadow-[0_12px_35px_rgba(220,38,38,0.65)] flex flex-col items-center justify-center text-center overflow-hidden min-h-[140px] group">
              {/* Card light sheen effect */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-white/20 pointer-events-none" />

              <span className="text-xs font-mono font-black tracking-[0.3em] uppercase text-red-200 bg-red-950/70 px-3 py-0.5 rounded-full border border-red-400/40 mb-1.5 shadow-inner">
                FASE 1
              </span>
              <h2 className="text-2xl lg:text-[27px] font-black uppercase tracking-wide leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                {fase1Title}
              </h2>
              <span className="text-[11px] font-bold uppercase tracking-widest text-red-100/80 mt-1.5">
                2 Giochi • Accumulo Punti
              </span>
            </div>
          </div>

          {/* 1.2 CENTER: CHEVRONS (ESATTAMENTE 3 FRECCE VERSO IL BASSO) */}
          <div
            className={`my-auto flex flex-col items-center justify-center transition-all duration-700 py-3 ${
              showFase1Chevrons ? 'opacity-100' : 'opacity-0 scale-75'
            }`}
            style={{
              animation: showFase1Chevrons
                ? 'chevron-slide 0.6s ease-out forwards, pulse-glow-red 2.4s ease-in-out infinite'
                : 'none',
            }}
          >
            {/* SVG con esattamente 3 frecce rosse puntate verso il basso */}
            <svg
              width="120"
              height="200"
              viewBox="0 0 120 200"
              fill="none"
              className="overflow-visible"
            >
              <defs>
                <linearGradient id="redArrowGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#f87171" />
                  <stop offset="100%" stopColor="#ef4444" />
                </linearGradient>
                <filter id="redGlow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Freccia 1 (Alto) */}
              <g filter="url(#redGlow)" className="transition-all duration-300">
                <path
                  d="M 16 25 L 60 65 L 104 25"
                  stroke="url(#redArrowGrad)"
                  strokeWidth="13"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M 22 25 L 60 59 L 98 25"
                  stroke="#ffffff"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeOpacity="0.7"
                />
              </g>

              {/* Freccia 2 (Centro) */}
              <g filter="url(#redGlow)" className="transition-all duration-300">
                <path
                  d="M 16 85 L 60 125 L 104 85"
                  stroke="url(#redArrowGrad)"
                  strokeWidth="13"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M 22 85 L 60 119 L 98 85"
                  stroke="#ffffff"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeOpacity="0.7"
                />
              </g>

              {/* Freccia 3 (Basso) */}
              <g filter="url(#redGlow)" className="transition-all duration-300">
                <path
                  d="M 16 145 L 60 185 L 104 145"
                  stroke="url(#redArrowGrad)"
                  strokeWidth="13"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M 22 145 L 60 179 L 98 145"
                  stroke="#ffffff"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeOpacity="0.7"
                />
              </g>
            </svg>
            <span className="text-[10px] font-mono font-black uppercase tracking-[0.25em] text-red-400/90 mt-1">
              3 GIRONI / 3 SFIDE
            </span>
          </div>

          {/* 1.3 BOTTOM POD: Punti (Monete / Gettoni) */}
          <div
            className={`w-full flex flex-col items-center transition-all duration-700 ${
              showFase1Bottom ? 'opacity-100' : 'opacity-0 translate-y-8 pointer-events-none'
            }`}
            style={{
              animation: showFase1Bottom ? 'badge-entry 0.65s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' : 'none',
            }}
          >
            <div className="relative w-full max-w-[340px] rounded-3xl p-5 bg-gradient-to-b from-[#220707] to-[#120303] border-2 border-red-500/60 shadow-[0_12px_40px_rgba(220,38,38,0.45)] flex flex-col items-center justify-center text-center group hover:scale-[1.02] transition-transform">
              {/* Outer pulsing ring */}
              <div className="absolute -inset-1 rounded-3xl bg-red-600/20 blur-md pointer-events-none group-hover:bg-red-600/35 transition-all" />

              {/* Central Coins Graphic */}
              <div className="relative z-10 w-28 h-28 rounded-2xl bg-gradient-to-br from-red-600/30 to-red-950/60 border border-red-400/40 flex items-center justify-center shadow-inner mb-3">
                <CoinsGraphic className="w-20 h-20 text-amber-400 drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]" />
              </div>

              <span className="relative z-10 text-xl font-black uppercase tracking-wider text-red-100 drop-shadow-md">
                PUNTI IN PALIO
              </span>
              <p className="relative z-10 text-xs font-semibold text-red-200/70 mt-1 max-w-[260px]">
                I punteggi conquistati alimentano la classifica generale del torneo
              </p>
            </div>
          </div>
        </section>

        {/* ======================================================================= */}
        {/* COLONNA 2: FASE 2 - CORSA AGLI EQUIPAGGIAMENTI (Verde Neon)             */}
        {/* ======================================================================= */}
        <section
          className={`flex flex-col items-center justify-between rounded-3xl p-6 transition-all duration-700 relative overflow-hidden ${
            showFase2Card
              ? 'bg-gradient-to-b from-emerald-950/40 via-emerald-950/20 to-black/60 border border-emerald-500/30 shadow-[0_8px_32px_rgba(16,185,129,0.2)] backdrop-blur-md'
              : 'border border-white/5 bg-white/[0.01]'
          }`}
        >
          {/* Subtle top indicator bar */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent opacity-80" />

          {/* 2.1 TOP CARD: Header Fase 2 */}
          <div
            className={`w-full transition-all duration-700 ${
              showFase2Card ? 'opacity-100' : 'opacity-0 -translate-y-8 pointer-events-none'
            }`}
            style={{
              animation: showFase2Card ? 'card-entry 0.65s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' : 'none',
            }}
          >
            <div className="relative w-full rounded-2xl p-5 bg-gradient-to-br from-emerald-600 via-green-700 to-emerald-800 border-2 border-emerald-300 text-white shadow-[0_12px_35px_rgba(16,185,129,0.65)] flex flex-col items-center justify-center text-center overflow-hidden min-h-[140px] group">
              {/* Card light sheen effect */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-white/20 pointer-events-none" />

              <span className="text-xs font-mono font-black tracking-[0.3em] uppercase text-emerald-100 bg-emerald-950/70 px-3 py-0.5 rounded-full border border-emerald-300/40 mb-1.5 shadow-inner">
                FASE 2
              </span>
              <h2 className="text-2xl lg:text-[27px] font-black uppercase tracking-wide leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                {fase2Title}
              </h2>
              <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-100/80 mt-1.5">
                2 Giochi • Punti + Vantaggi Tattici
              </span>
            </div>
          </div>

          {/* 2.2 CENTER: CHEVRONS (ESATTAMENTE 2 FRECCE VERSO IL BASSO) */}
          <div
            className={`my-auto flex flex-col items-center justify-center transition-all duration-700 py-3 ${
              showFase2Chevrons ? 'opacity-100' : 'opacity-0 scale-75'
            }`}
            style={{
              animation: showFase2Chevrons
                ? 'chevron-slide 0.6s ease-out forwards, pulse-glow-green 2.4s ease-in-out infinite'
                : 'none',
            }}
          >
            {/* SVG con esattamente 2 frecce verdi puntate verso il basso */}
            <svg
              width="120"
              height="200"
              viewBox="0 0 120 200"
              fill="none"
              className="overflow-visible"
            >
              <defs>
                <linearGradient id="greenArrowGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#6ee7b7" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
                <filter id="greenGlow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Freccia 1 (Superiore) */}
              <g filter="url(#greenGlow)" className="transition-all duration-300">
                <path
                  d="M 16 50 L 60 92 L 104 50"
                  stroke="url(#greenArrowGrad)"
                  strokeWidth="13"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M 22 50 L 60 86 L 98 50"
                  stroke="#ffffff"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeOpacity="0.75"
                />
              </g>

              {/* Freccia 2 (Inferiore) */}
              <g filter="url(#greenGlow)" className="transition-all duration-300">
                <path
                  d="M 16 118 L 60 160 L 104 118"
                  stroke="url(#greenArrowGrad)"
                  strokeWidth="13"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M 22 118 L 60 154 L 98 118"
                  stroke="#ffffff"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeOpacity="0.75"
                />
              </g>
            </svg>
            <span className="text-[10px] font-mono font-black uppercase tracking-[0.25em] text-emerald-400/90 mt-1">
              2 SFIDE DIRETTE
            </span>
          </div>

          {/* 2.3 BOTTOM POD: Punti + Barra Divisore + Bonus */}
          <div
            className={`w-full flex flex-col items-center transition-all duration-700 ${
              showFase2Coins || showFase2Bonus ? 'opacity-100' : 'opacity-0 translate-y-8 pointer-events-none'
            }`}
            style={{
              animation: showFase2Coins ? 'badge-entry 0.65s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' : 'none',
            }}
          >
            <div className="relative w-full max-w-[460px] rounded-3xl p-5 bg-gradient-to-b from-[#061e12] to-[#04120a] border-2 border-emerald-500/60 shadow-[0_12px_40px_rgba(16,185,129,0.45)] flex flex-col items-center justify-center text-center group hover:scale-[1.02] transition-transform">
              {/* Outer pulsing ring */}
              <div className="absolute -inset-1 rounded-3xl bg-emerald-600/20 blur-md pointer-events-none group-hover:bg-emerald-600/35 transition-all" />

              {/* Badges in fila: Monete / Barra / Bonus */}
              <div className="relative z-10 flex items-center justify-center gap-3.5 mb-3">
                {/* Monete Pod */}
                <div
                  className={`w-24 h-24 rounded-2xl bg-gradient-to-br from-emerald-600/30 to-emerald-950/60 border border-emerald-400/40 flex flex-col items-center justify-center shadow-inner transition-all duration-500 ${
                    showFase2Coins ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
                  }`}
                >
                  <CoinsGraphic className="w-16 h-16 text-amber-400 drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]" />
                  <span className="text-[10px] font-black uppercase text-emerald-200 mt-0.5">Punti</span>
                </div>

                {/* Barra Divisore Inclinata Olografica */}
                <div
                  className={`flex items-center justify-center text-emerald-400 font-mono font-black text-4xl select-none px-1 transition-all duration-500 ${
                    showFase2Bonus ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
                  }`}
                  style={{
                    filter: 'drop-shadow(0 0 10px rgba(52,211,153,0.8))',
                  }}
                >
                  /
                </div>

                {/* Bonus Pod */}
                <div
                  className={`w-24 h-24 rounded-2xl bg-gradient-to-br from-emerald-600/30 to-emerald-950/60 border border-emerald-400/40 flex flex-col items-center justify-center shadow-inner transition-all duration-500 ${
                    showFase2Bonus ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
                  }`}
                >
                  <BonusGraphic className="w-16 h-16 text-emerald-300 drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]" />
                  <span className="text-[10px] font-black uppercase text-emerald-200 mt-0.5">4 Bonus</span>
                </div>
              </div>

              <span className="relative z-10 text-xl font-black uppercase tracking-wider text-emerald-100 drop-shadow-md">
                PUNTI & BONUS EQUIPAGGIAMENTO
              </span>
              <p className="relative z-10 text-xs font-semibold text-emerald-200/70 mt-1 max-w-[340px]">
                Oltre al punteggio, i vincitori ottengono bonus strategici per la finale
              </p>
            </div>
          </div>
        </section>

        {/* ======================================================================= */}
        {/* COLONNA 3: FASE 3 - TERMOPILI APOCALITTICHE (Blu / Ciano Neon)         */}
        {/* ======================================================================= */}
        <section
          className={`flex flex-col items-center justify-between rounded-3xl p-6 transition-all duration-700 relative overflow-hidden ${
            showFase3Card
              ? 'bg-gradient-to-b from-sky-950/40 via-blue-950/20 to-black/60 border border-sky-400/30 shadow-[0_8px_32px_rgba(56,189,248,0.2)] backdrop-blur-md'
              : 'border border-white/5 bg-white/[0.01]'
          }`}
        >
          {/* Subtle top indicator bar */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-sky-400 to-transparent opacity-80" />

          {/* 3.1 TOP CARD: Header Fase 3 */}
          <div
            className={`w-full transition-all duration-700 ${
              showFase3Card ? 'opacity-100' : 'opacity-0 -translate-y-8 pointer-events-none'
            }`}
            style={{
              animation: showFase3Card ? 'card-entry 0.65s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' : 'none',
            }}
          >
            <div className="relative w-full rounded-2xl p-5 bg-gradient-to-br from-blue-600 via-indigo-700 to-sky-800 border-2 border-sky-300 text-white shadow-[0_12px_35px_rgba(2,132,199,0.65)] flex flex-col items-center justify-center text-center overflow-hidden min-h-[140px] group">
              {/* Card light sheen effect */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-white/20 pointer-events-none" />

              <span className="text-xs font-mono font-black tracking-[0.3em] uppercase text-sky-100 bg-sky-950/70 px-3 py-0.5 rounded-full border border-sky-300/40 mb-1.5 shadow-inner">
                FASE FINALE
              </span>
              <h2 className="text-2xl lg:text-[27px] font-black uppercase tracking-wide leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                {fase3Title}
              </h2>
              <span className="text-[11px] font-bold uppercase tracking-widest text-sky-100/80 mt-1.5">
                Manche Finale • Proclamazione Campioni
              </span>
            </div>
          </div>

          {/* 3.2 CENTER: CHEVRON (ESATTAMENTE 1 FRECCIA VERSO IL BASSO) */}
          <div
            className={`my-auto flex flex-col items-center justify-center transition-all duration-700 py-3 ${
              showFase3Chevrons ? 'opacity-100' : 'opacity-0 scale-75'
            }`}
            style={{
              animation: showFase3Chevrons
                ? 'chevron-slide 0.6s ease-out forwards, pulse-glow-blue 2.4s ease-in-out infinite'
                : 'none',
            }}
          >
            {/* SVG con esattamente 1 freccia blu/ciano puntata verso il basso */}
            <svg
              width="120"
              height="200"
              viewBox="0 0 120 200"
              fill="none"
              className="overflow-visible"
            >
              <defs>
                <linearGradient id="blueArrowGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#7dd3fc" />
                  <stop offset="100%" stopColor="#0284c7" />
                </linearGradient>
                <filter id="blueGlow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Unica Freccia Solenne (Centro esatto) */}
              <g filter="url(#blueGlow)" className="transition-all duration-300">
                <path
                  d="M 16 82 L 60 128 L 104 82"
                  stroke="url(#blueArrowGrad)"
                  strokeWidth="14"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M 22 82 L 60 122 L 98 82"
                  stroke="#ffffff"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeOpacity="0.8"
                />
              </g>
            </svg>
            <span className="text-[10px] font-mono font-black uppercase tracking-[0.25em] text-sky-400/90 mt-1">
              1 MANCHE DECISIVA
            </span>
          </div>

          {/* 3.3 BOTTOM POD: Trofeo (Squadra Vincente) */}
          <div
            className={`w-full flex flex-col items-center transition-all duration-700 ${
              showFase3Trophy ? 'opacity-100' : 'opacity-0 translate-y-8 pointer-events-none'
            }`}
            style={{
              animation: showFase3Trophy ? 'badge-entry 0.65s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' : 'none',
            }}
          >
            <div className="relative w-full max-w-[340px] rounded-3xl p-5 bg-gradient-to-b from-[#08172c] to-[#040b17] border-2 border-sky-400/60 shadow-[0_12px_40px_rgba(2,132,199,0.45)] flex flex-col items-center justify-center text-center group hover:scale-[1.02] transition-transform">
              {/* Outer pulsing ring */}
              <div className="absolute -inset-1 rounded-3xl bg-sky-500/20 blur-md pointer-events-none group-hover:bg-sky-500/35 transition-all" />

              {/* Central Trophy Graphic */}
              <div className="relative z-10 w-28 h-28 rounded-2xl bg-gradient-to-br from-sky-500/30 via-amber-500/10 to-blue-950/60 border border-sky-300/40 flex items-center justify-center shadow-inner mb-3">
                <TrophyGraphic className="w-20 h-20 text-amber-300 drop-shadow-[0_4px_12px_rgba(245,158,11,0.6)]" />
              </div>

              <span className="relative z-10 text-xl font-black uppercase tracking-wider text-sky-100 drop-shadow-md">
                SQUADRA VINCITRICE
              </span>
              <p className="relative z-10 text-xs font-semibold text-sky-200/70 mt-1 max-w-[260px]">
                La vincitrice delle Termopili conquista il titolo assoluto di IMPERIO VIII
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* ========================================================================= */}
      {/* 4. FOOTER INFO: DINAMICA PRESCELTI FINALE (Delta Punti Regolamento)       */}
      {/* ========================================================================= */}
      <footer
        className={`relative z-10 w-full max-w-[1780px] shrink-0 transition-all duration-700 mt-1 mb-2 ${
          showTermopiliInfo ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        <div className="w-full rounded-2xl bg-white/[0.04] border border-white/15 px-6 py-3 backdrop-blur-md flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-mono font-black uppercase tracking-wider">
              REGOLA FINALE
            </span>
            <span className="text-xs font-bold uppercase tracking-wide text-white/80">
              Composizione Squadre alle Termopili in base al distacco punti:
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300">
              <span className="font-black">1ª SQUADRA:</span>
              <span className="text-white font-bold">6 Prescelti</span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-sky-950/60 border border-sky-500/40 text-sky-300">
              <span className="font-black">2ª SQUADRA:</span>
              <span className="text-white/90">
                &lt; 3.000 pt (<strong>6</strong>) • 3.000-15.000 pt (<strong>5</strong>) • &gt; 15.000 pt (<strong>4</strong>)
              </span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-300">
              <span className="font-black">3ª SQUADRA:</span>
              <span className="text-white font-bold">3 Prescelti</span>
            </div>
          </div>
        </div>
      </footer>

      {/* ========================================================================= */}
      {/* 5. FLOATING PRESENTER CONTROL BAR                                         */}
      {/* ========================================================================= */}
      {interactive && (
        <nav
          aria-label="Pannello di controllo relatore"
          className={`absolute bottom-3 left-1/2 -translate-x-1/2 z-40 transition-all duration-300 ${
            showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6 pointer-events-none'
          }`}
        >
          <div className="bg-black/90 backdrop-blur-xl border border-white/20 rounded-2xl px-5 py-2.5 flex items-center gap-3.5 shadow-[0_12px_45px_rgba(0,0,0,0.8)]">
            {/* Play / Pause con voce sincronizzata */}
            <button
              type="button"
              onClick={togglePlay}
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold transition-all cursor-pointer ${
                isPlaying
                  ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-[0_0_15px_rgba(245,158,11,0.6)]'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.6)]'
              }`}
              title={isPlaying ? 'Pausa animazione vocale (Spazio)' : 'Avvia animazione sincronizzata con voce (Spazio)'}
            >
              {isPlaying ? '⏸' : '▶'}
            </button>

            {/* Restart */}
            <button
              type="button"
              onClick={restart}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm font-bold border border-white/15 cursor-pointer transition-colors"
              title="Ricomincia spiegazione dall'inizio (R)"
            >
              🔄
            </button>

            {/* Scrubber temporale */}
            <div className="flex items-center gap-2 px-2">
              <span className="text-xs font-mono font-bold text-white/70 w-10 text-right">
                {formatTime(currentTime)}
              </span>
              <div
                className="w-44 h-2 bg-white/15 rounded-full overflow-hidden cursor-pointer relative"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickX = e.clientX - rect.left;
                  const ratio = Math.max(0, Math.min(1, clickX / rect.width));
                  const targetSec = ratio * duration;
                  if (audioRef.current) {
                    audioRef.current.currentTime = targetSec;
                  }
                  setCurrentTime(targetSec);
                }}
              >
                <div
                  className="h-full bg-gradient-to-r from-red-500 via-emerald-400 to-sky-400 transition-all duration-100"
                  style={{ width: `${Math.min(100, (currentTime / duration) * 100)}%` }}
                />
              </div>
              <span className="text-xs font-mono font-bold text-white/50 w-10">
                {formatTime(duration)}
              </span>
            </div>

            <div className="h-6 w-[1px] bg-white/20" />

            {/* Selezione Rapida Fasi (1, 2, 3) */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setManualStep(1)}
                className={`px-3 py-1 rounded-lg text-xs font-black uppercase transition-all cursor-pointer ${
                  manualStep >= 1 && manualStep < 2
                    ? 'bg-red-600 text-white shadow-[0_0_12px_rgba(239,68,68,0.7)]'
                    : 'bg-white/10 text-white/80 hover:bg-white/20'
                }`}
                title="Svela Fase 1 (Tasto 1)"
              >
                Fase 1
              </button>
              <button
                type="button"
                onClick={() => setManualStep(2)}
                className={`px-3 py-1 rounded-lg text-xs font-black uppercase transition-all cursor-pointer ${
                  manualStep >= 2 && manualStep < 3
                    ? 'bg-emerald-600 text-white shadow-[0_0_12px_rgba(16,185,129,0.7)]'
                    : 'bg-white/10 text-white/80 hover:bg-white/20'
                }`}
                title="Svela Fase 2 (Tasto 2)"
              >
                Fase 2
              </button>
              <button
                type="button"
                onClick={() => {
                  setManualStep(3);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-black uppercase transition-all cursor-pointer ${
                  manualStep >= 3 && !isAllRevealed
                    ? 'bg-sky-600 text-white shadow-[0_0_12px_rgba(2,132,199,0.7)]'
                    : 'bg-white/10 text-white/80 hover:bg-white/20'
                }`}
                title="Svela Fase 3 (Tasto 3)"
              >
                Fase 3
              </button>
            </div>

            <div className="h-6 w-[1px] bg-white/20" />

            {/* Svela Tutto */}
            <button
              type="button"
              onClick={revealEverything}
              className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                isAllRevealed
                  ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.7)]'
                  : 'bg-white/15 hover:bg-white/25 text-white border border-white/20'
              }`}
              title="Mostra tutte le 3 fasi contemporaneamente (S o Invio)"
            >
              Mostra Tutto
            </button>

            {/* Mute Audio */}
            <button
              type="button"
              onClick={toggleMute}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm font-bold border border-white/15 cursor-pointer transition-colors"
              title={isMuted ? 'Riattiva Voce Narrante (M)' : 'Silenzia Voce Narrante (M)'}
            >
              {isMuted ? '🔇' : '🔊'}
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}

// =========================================================================
// GRAFICA VETTORIALE AD ALTA DEFINIZIONE (SVG nativo ultra-dettagliato)
// =========================================================================

/**
 * Monete d'Oro / Fiches cesellate con riflessi dorati 3D
 */
function CoinsGraphic({ className = 'w-20 h-20' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" className={className}>
      <defs>
        <linearGradient id="goldEdge" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="40%" stopColor="#eab308" />
          <stop offset="100%" stopColor="#854d0e" />
        </linearGradient>
        <linearGradient id="goldFace" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fef9c3" />
          <stop offset="60%" stopColor="#facc15" />
          <stop offset="100%" stopColor="#ca8a04" />
        </linearGradient>
        <linearGradient id="goldRim" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ca8a04" />
          <stop offset="50%" stopColor="#fef08a" />
          <stop offset="100%" stopColor="#a16207" />
        </linearGradient>
      </defs>

      {/* Pila 1 (Sinistra / Bassa) */}
      <g>
        {/* Moneta 1 (fondo) */}
        <path d="M 16 46 C 16 54 52 54 52 46 L 52 53 C 52 61 16 61 16 53 Z" fill="url(#goldEdge)" />
        <ellipse cx="34" cy="46" rx="18" ry="7" fill="url(#goldFace)" stroke="url(#goldRim)" strokeWidth="1" />

        {/* Moneta 2 */}
        <path d="M 16 38 C 16 46 52 46 52 38 L 52 45 C 52 53 16 53 16 45 Z" fill="url(#goldEdge)" />
        <ellipse cx="34" cy="38" rx="18" ry="7" fill="url(#goldFace)" stroke="url(#goldRim)" strokeWidth="1" />

        {/* Moneta 3 */}
        <path d="M 16 30 C 16 38 52 38 52 30 L 52 37 C 52 45 16 45 16 37 Z" fill="url(#goldEdge)" />
        <ellipse cx="34" cy="30" rx="18" ry="7" fill="url(#goldFace)" stroke="url(#goldRim)" strokeWidth="1" />

        {/* Moneta 4 (cima) */}
        <ellipse cx="34" cy="22" rx="18" ry="7" fill="url(#goldFace)" stroke="url(#goldRim)" strokeWidth="1.2" />
        <ellipse cx="34" cy="22" rx="13" ry="4.8" fill="none" stroke="#854d0e" strokeWidth="0.9" strokeDasharray="2 1.5" />
        <circle cx="34" cy="22" r="2.5" fill="#854d0e" />
      </g>

      {/* Pila 2 (Destra / Superiore sovrapposta) */}
      <g>
        {/* Moneta 1 (fondo) */}
        <path d="M 46 72 C 46 80 86 80 86 72 L 86 79 C 86 87 46 87 46 79 Z" fill="url(#goldEdge)" />
        <ellipse cx="66" cy="72" rx="20" ry="7.5" fill="url(#goldFace)" stroke="url(#goldRim)" strokeWidth="1" />

        {/* Moneta 2 */}
        <path d="M 46 64 C 46 72 86 72 86 64 L 86 71 C 86 79 46 79 46 71 Z" fill="url(#goldEdge)" />
        <ellipse cx="66" cy="64" rx="20" ry="7.5" fill="url(#goldFace)" stroke="url(#goldRim)" strokeWidth="1" />

        {/* Moneta 3 */}
        <path d="M 46 56 C 46 64 86 64 86 56 L 86 63 C 86 71 46 71 46 63 Z" fill="url(#goldEdge)" />
        <ellipse cx="66" cy="56" rx="20" ry="7.5" fill="url(#goldFace)" stroke="url(#goldRim)" strokeWidth="1" />

        {/* Moneta 4 (cima) */}
        <ellipse cx="66" cy="48" rx="20" ry="7.5" fill="url(#goldFace)" stroke="url(#goldRim)" strokeWidth="1.2" />
        <ellipse cx="66" cy="48" rx="14.5" ry="5.2" fill="none" stroke="#854d0e" strokeWidth="1" strokeDasharray="2 1.5" />
        <text x="66" y="51" textAnchor="middle" fill="#854d0e" fontSize="7" fontWeight="900" fontFamily="sans-serif">PT</text>
      </g>
    </svg>
  );
}

/**
 * Icona Bonus Equipaggiamento (Gruppo di Prescelti con Scudo e Mirino Tattico)
 */
function BonusGraphic({ className = 'w-16 h-16' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" className={className}>
      <defs>
        <linearGradient id="emeraldBonusGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a7f3d0" />
          <stop offset="50%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
      </defs>

      {/* Sagoma Giocatore Sinistro */}
      <circle cx="28" cy="40" r="8" fill="#10b981" opacity="0.8" />
      <path d="M 14 66 C 14 55 42 55 42 66 Z" fill="#10b981" opacity="0.8" />

      {/* Sagoma Giocatore Destro */}
      <circle cx="72" cy="40" r="8" fill="#10b981" opacity="0.8" />
      <path d="M 58 66 C 58 55 86 55 86 66 Z" fill="#10b981" opacity="0.8" />

      {/* Sagoma Giocatore Centrale Leader */}
      <circle cx="50" cy="35" r="10" fill="url(#emeraldBonusGrad)" />
      <path d="M 30 68 C 30 53 70 53 70 68 Z" fill="url(#emeraldBonusGrad)" />

      {/* Mirino Tattico / Lente Olografica */}
      <circle
        cx="50"
        cy="42"
        r="24"
        stroke="#6ee7b7"
        strokeWidth="3.5"
        strokeDasharray="4 2.5"
      />
      {/* Assi mirino */}
      <line x1="22" y1="42" x2="28" y2="42" stroke="#6ee7b7" strokeWidth="3" strokeLinecap="round" />
      <line x1="72" y1="42" x2="78" y2="42" stroke="#6ee7b7" strokeWidth="3" strokeLinecap="round" />
      <line x1="50" y1="14" x2="50" y2="20" stroke="#6ee7b7" strokeWidth="3" strokeLinecap="round" />
      <line x1="50" y1="64" x2="50" y2="70" stroke="#6ee7b7" strokeWidth="3" strokeLinecap="round" />

      {/* Manico Lente */}
      <line x1="68" y1="60" x2="85" y2="77" stroke="#34d399" strokeWidth="5" strokeLinecap="round" />
      <circle cx="85" cy="77" r="2.5" fill="#a7f3d0" />
    </svg>
  );
}

/**
 * Trofeo Trionfale delle Termopili con Calice Dorato, Bagliori e Riflessi Metallici
 */
function TrophyGraphic({ className = 'w-20 h-20' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" className={className}>
      <defs>
        <linearGradient id="trophyGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef9c3" />
          <stop offset="35%" stopColor="#fde047" />
          <stop offset="70%" stopColor="#eab308" />
          <stop offset="100%" stopColor="#a16207" />
        </linearGradient>
        <linearGradient id="cupShine" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Calice del Trofeo */}
      <path
        d="M 28 22 L 72 22 C 72 48, 62 58, 50 58 C 38 58, 28 48, 28 22 Z"
        fill="url(#trophyGold)"
        stroke="#fef08a"
        strokeWidth="1.5"
      />

      {/* Riflesso di luce su coppa */}
      <path
        d="M 33 24 L 43 24 C 41 42, 37 46, 35 48 C 33 44, 32 34, 33 24 Z"
        fill="url(#cupShine)"
      />

      {/* Manici Curvi Laterali */}
      <path
        d="M 28 26 C 14 26, 13 46, 29 48"
        stroke="url(#trophyGold)"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      <path
        d="M 72 26 C 86 26, 87 46, 71 48"
        stroke="url(#trophyGold)"
        strokeWidth="4.5"
        strokeLinecap="round"
      />

      {/* Stelo */}
      <path d="M 45 58 L 55 58 L 55 72 L 45 72 Z" fill="url(#trophyGold)" />
      <rect x="42" y="70" width="16" height="4" rx="2" fill="#ca8a04" />

      {/* Piedistallo a gradini */}
      <path d="M 30 74 L 70 74 L 74 86 L 26 86 Z" fill="url(#trophyGold)" stroke="#ca8a04" strokeWidth="1" />
      <rect x="34" y="76" width="32" height="7" rx="1.5" fill="#78350f" opacity="0.6" />
      <circle cx="50" cy="79.5" r="1.5" fill="#fef08a" />

      {/* Stella Trionfale al centro della coppa */}
      <path
        d="M 50 30 L 52 35 L 57 35 L 53 38 L 54.5 43 L 50 40 L 45.5 43 L 47 38 L 43 35 L 48 35 Z"
        fill="#ffffff"
        opacity="0.9"
      />
    </svg>
  );
}
