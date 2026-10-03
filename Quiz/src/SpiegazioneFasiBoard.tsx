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

  const bgImage = useMemo(() => {
    return assetUrl('/spiegazione_bg.png');
  }, []);

  const fase1Title = data?.fase1Titolo || 'PRODROMI DELLO\nSCONTRO';
  const fase2Title = data?.fase2Titolo || 'CORSA AGLI\nEQUIPAGGIAMENTI';
  const fase3Title = data?.fase3Titolo || 'TERMOPILI\nAPOCALITTICHE';

  // Synced States across Electron windows
  const [isPlaying, setIsPlaying] = useSyncedState<boolean>(
    `playstate_${slideId}_playing`,
    false
  );
  const [manualStep, setManualStep] = useSyncedState<number>(
    `playstate_${slideId}_step`,
    revealAll ? 7 : 0
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

  // Sync audio play/pause with isPlaying state
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

  // Audio time update
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const t = audioRef.current.currentTime;
      setCurrentTime(t);
      if (audioRef.current.duration && !isNaN(audioRef.current.duration)) {
        setDuration(Math.min(39.5, audioRef.current.duration));
      }
      if (t >= 39.5) {
        setIsPlaying(false);
        setIsAllRevealed(true);
      }
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setIsAllRevealed(true);
  };

  // Determine visibility of each element based on audio time OR manual step OR revealAll
  // Timestamps from original video:
  // 3.5s - 5.5s: Lightning flash
  // 10.5s: Fase 1 card
  // 14.0s: Fase 1 chevrons
  // 17.5s: Fase 1 coins
  // 20.8s: Fase 2 card
  // 23.0s: Fase 2 chevrons
  // 25.5s: Fase 2 coins
  // 27.5s: Fase 2 divider + bonus
  // 31.0s: Fase 3 card
  // 34.0s: Fase 3 chevrons
  // 36.0s: Fase 3 trophy
  const showLightning =
    !isAllRevealed &&
    ((isPlaying && currentTime >= 3.2 && currentTime <= 5.8) || manualStep === 1);

  const showFase1Card = isAllRevealed || (isPlaying && currentTime >= 10.5) || manualStep >= 2;
  const showFase1Chevrons = isAllRevealed || (isPlaying && currentTime >= 14.0) || manualStep >= 2;
  const showFase1Bottom = isAllRevealed || (isPlaying && currentTime >= 17.5) || manualStep >= 2;

  const showFase2Card = isAllRevealed || (isPlaying && currentTime >= 20.8) || manualStep >= 3;
  const showFase2Chevrons = isAllRevealed || (isPlaying && currentTime >= 23.0) || manualStep >= 3;
  const showFase2Coins = isAllRevealed || (isPlaying && currentTime >= 25.5) || manualStep >= 3;
  const showFase2Bonus = isAllRevealed || (isPlaying && currentTime >= 27.5) || manualStep >= 3;

  const showFase3Card = isAllRevealed || (isPlaying && currentTime >= 31.0) || manualStep >= 4;
  const showFase3Chevrons = isAllRevealed || (isPlaying && currentTime >= 34.0) || manualStep >= 4;
  const showFase3Trophy = isAllRevealed || (isPlaying && currentTime >= 36.0) || manualStep >= 4;

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

  // Reset to initial
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

  // Reveal all elements
  const revealEverything = useCallback(() => {
    if (!interactive) return;
    setIsAllRevealed(true);
    setManualStep(7);
  }, [interactive, setIsAllRevealed, setManualStep]);

  // Advance manual step
  const nextStep = useCallback(() => {
    if (!interactive) return;
    if (isAllRevealed) return;
    setManualStep((prev) => {
      const next = prev + 1;
      if (next >= 4) {
        setIsAllRevealed(true);
      }
      return next;
    });
  }, [interactive, isAllRevealed, setManualStep, setIsAllRevealed]);

  // Previous manual step
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

  // Keyboard navigation
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
        setManualStep(2);
      } else if (e.key === '2') {
        e.preventDefault();
        setManualStep(3);
      } else if (e.key === '3') {
        e.preventDefault();
        setManualStep(4);
        setIsAllRevealed(true);
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
    setIsAllRevealed,
    toggleMute,
  ]);

  // Auto-hide controls
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
      className="relative w-[1920px] h-[1080px] overflow-hidden select-none bg-black flex items-center justify-center font-sans"
    >
      <style>{`
        @keyframes electric-sweep {
          0% {
            transform: translateX(-100%) scaleY(0.7);
            opacity: 0;
          }
          30% {
            transform: translateX(0%) scaleY(1.4);
            opacity: 1;
          }
          70% {
            transform: translateX(0%) scaleY(1.1);
            opacity: 0.95;
          }
          100% {
            transform: translateX(100%) scaleY(0.6);
            opacity: 0;
          }
        }
        @keyframes electric-glow {
          0%, 100% { filter: drop-shadow(0 0 12px #00e5ff) drop-shadow(0 0 25px #00b4d8); }
          50% { filter: drop-shadow(0 0 24px #38bdf8) drop-shadow(0 0 45px #0284c7); }
        }
        @keyframes bounce-drop {
          0% {
            opacity: 0;
            transform: translateY(-50px) scale(0.85);
          }
          65% {
            opacity: 1;
            transform: translateY(8px) scale(1.04);
          }
          85% {
            transform: translateY(-3px) scale(0.98);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes pop-in {
          0% {
            opacity: 0;
            transform: scale(0.4);
          }
          70% {
            opacity: 1;
            transform: scale(1.1);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes chevron-pulse {
          0%, 100% {
            transform: translateY(0);
            opacity: 0.85;
          }
          50% {
            transform: translateY(8px);
            opacity: 1;
          }
        }
      `}</style>

      {/* Hidden Audio Element */}
      {interactive && (
        <audio
          ref={audioRef}
          src={audioSrc}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleAudioEnded}
          preload="auto"
        />
      )}

      {/* 1. Sfondo Schermata: Tablet Olografico nella Laguna */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-all duration-700 pointer-events-none"
        style={{ backgroundImage: `url("${bgImage}")` }}
      >
        {/* Soft vignette on edges */}
        <div className="absolute inset-0 bg-radial from-transparent via-black/20 to-black/60 pointer-events-none" />
      </div>

      {/* 2. Tablet Holographic Screen Area (157..1790 x 106..984) */}
      <div
        className="absolute z-10 pointer-events-none overflow-hidden"
        style={{
          left: '157px',
          top: '106px',
          width: '1633px',
          height: '878px',
        }}
      >
        {/* Electric Lightning Horizontal Zap (Triggered at 3.5s - 5.5s) */}
        {showLightning && (
          <div
            className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-32 flex items-center justify-center z-50 pointer-events-none"
            style={{
              animation: 'electric-sweep 1.8s ease-in-out infinite, electric-glow 0.3s infinite alternate',
            }}
          >
            <svg
              className="w-full h-full overflow-visible"
              viewBox="0 0 1633 120"
              fill="none"
              preserveAspectRatio="none"
            >
              <defs>
                <filter id="lightning-blur" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              {/* Outer Cyan Glow Beam */}
              <path
                d="M 0 60 Q 200 40 400 65 T 800 55 T 1200 65 T 1633 60"
                stroke="#00e5ff"
                strokeWidth="14"
                strokeOpacity="0.75"
                filter="url(#lightning-blur)"
              />
              {/* Jagged Electric Arcs */}
              <path
                d="M 0 60 L 120 48 L 230 68 L 360 44 L 490 74 L 620 48 L 780 70 L 920 42 L 1080 72 L 1240 45 L 1390 68 L 1520 50 L 1633 60"
                stroke="#38bdf8"
                strokeWidth="6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Core White Energy */}
              <path
                d="M 0 60 L 120 54 L 230 64 L 360 50 L 490 68 L 620 52 L 780 65 L 920 48 L 1080 66 L 1240 52 L 1390 64 L 1520 54 L 1633 60"
                stroke="#ffffff"
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}

        {/* ============================================================ */}
        {/* COLONNA 1: PRODROMI DELLO SCONTRO (Sinistra, Red) */}
        {/* ============================================================ */}
        <div
          className="absolute flex flex-col items-center justify-between"
          style={{
            left: '12px',
            top: '22px',
            width: '320px',
            bottom: '22px',
          }}
        >
          {/* Top Card: Prodromi dello Scontro */}
          <div
            className={`w-full transition-all duration-700 ${
              showFase1Card ? 'opacity-100 scale-100' : 'opacity-0 scale-75 -translate-y-12'
            }`}
            style={{
              animation: showFase1Card ? 'bounce-drop 0.65s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' : 'none',
            }}
          >
            <div
              className="w-full py-5 px-4 rounded-3xl bg-[#e60000] border-2 border-red-400 text-white font-black tracking-wide text-center shadow-[0_12px_35px_rgba(230,0,0,0.65)] flex flex-col items-center justify-center min-h-[145px]"
            >
              <span className="text-[25px] leading-tight uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] whitespace-pre-line">
                {fase1Title}
              </span>
            </div>
          </div>

          {/* Center: Red Chevrons */}
          <div
            className={`flex flex-col items-center gap-2 my-auto transition-all duration-700 ${
              showFase1Chevrons ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
            }`}
            style={{
              animation: showFase1Chevrons ? 'chevron-pulse 2s ease-in-out infinite' : 'none',
            }}
          >
            <svg
              width="105"
              height="180"
              viewBox="0 0 100 180"
              fill="none"
              className="drop-shadow-[0_0_12px_rgba(230,0,0,0.8)]"
            >
              <path
                d="M 12 18 L 50 58 L 88 18"
                stroke="#e60000"
                strokeWidth="11"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M 12 70 L 50 110 L 88 70"
                stroke="#e60000"
                strokeWidth="11"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M 12 122 L 50 162 L 88 122"
                stroke="#e60000"
                strokeWidth="11"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {/* Bottom Badge: Red Oval with Coins (Punti) */}
          <div
            className={`transition-all duration-700 ${
              showFase1Bottom ? 'opacity-100 scale-100' : 'opacity-0 scale-50 translate-y-12'
            }`}
            style={{
              animation: showFase1Bottom ? 'pop-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' : 'none',
            }}
          >
            <div
              className="w-[280px] h-[155px] rounded-[50%] bg-[#e60000] border-3 border-red-300 shadow-[0_12px_40px_rgba(230,0,0,0.7)] flex flex-col items-center justify-center p-3 group hover:scale-105 transition-transform"
            >
              <CoinsIcon className="w-24 h-24 text-black drop-shadow-[0_2px_3px_rgba(255,255,255,0.3)]" />
            </div>
            <div className="text-center mt-2">
              <span className="text-xs font-black tracking-widest uppercase text-red-200 bg-red-950/80 px-3 py-1 rounded-full border border-red-500/40 shadow-sm">
                2 Giochi • Punti
              </span>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* COLONNA 2: CORSA AGLI EQUIPAGGIAMENTI (Centro, Green) */}
        {/* ============================================================ */}
        <div
          className="absolute flex flex-col items-center justify-between"
          style={{
            left: '635px',
            top: '22px',
            width: '360px',
            bottom: '22px',
          }}
        >
          {/* Top Card: Corsa agli Equipaggiamenti */}
          <div
            className={`w-full transition-all duration-700 ${
              showFase2Card ? 'opacity-100 scale-100' : 'opacity-0 scale-75 -translate-y-12'
            }`}
            style={{
              animation: showFase2Card ? 'bounce-drop 0.65s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' : 'none',
            }}
          >
            <div
              className="w-full py-5 px-4 rounded-3xl bg-[#00a844] border-2 border-emerald-300 text-white font-black tracking-wide text-center shadow-[0_12px_35px_rgba(0,168,68,0.65)] flex flex-col items-center justify-center min-h-[145px]"
            >
              <span className="text-[25px] leading-tight uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] whitespace-pre-line">
                {fase2Title}
              </span>
            </div>
          </div>

          {/* Center: Green Chevrons */}
          <div
            className={`flex flex-col items-center gap-2 my-auto transition-all duration-700 ${
              showFase2Chevrons ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
            }`}
            style={{
              animation: showFase2Chevrons ? 'chevron-pulse 2s ease-in-out infinite' : 'none',
            }}
          >
            <svg
              width="105"
              height="180"
              viewBox="0 0 100 180"
              fill="none"
              className="drop-shadow-[0_0_12px_rgba(0,168,68,0.8)]"
            >
              <path
                d="M 12 18 L 50 58 L 88 18"
                stroke="#00a844"
                strokeWidth="11"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M 12 70 L 50 110 L 88 70"
                stroke="#00a844"
                strokeWidth="11"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M 12 122 L 50 162 L 88 122"
                stroke="#00a844"
                strokeWidth="11"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {/* Bottom Badges: Green Coins Circle / Slash / Green Bonus Circle */}
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-center gap-2.5">
              {/* Left Circle: Coins (Punti) */}
              <div
                className={`w-[170px] h-[170px] rounded-full bg-[#00a844] border-3 border-emerald-300 shadow-[0_12px_35px_rgba(0,168,68,0.7)] flex items-center justify-center p-3 group hover:scale-105 transition-all duration-700 ${
                  showFase2Coins ? 'opacity-100 scale-100' : 'opacity-0 scale-50 translate-y-12'
                }`}
                style={{
                  animation: showFase2Coins ? 'pop-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' : 'none',
                }}
              >
                <CoinsIcon className="w-24 h-24 text-black drop-shadow-[0_2px_3px_rgba(255,255,255,0.3)]" />
              </div>

              {/* Center Divider: Diagonal Slash */}
              <div
                className={`text-black font-black text-6xl select-none transition-all duration-700 ${
                  showFase2Bonus ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
                }`}
                style={{
                  filter: 'drop-shadow(0 2px 4px rgba(255,255,255,0.4))',
                }}
              >
                /
              </div>

              {/* Right Circle: Bonus Icon (Group / Target) */}
              <div
                className={`w-[170px] h-[170px] rounded-full bg-[#00a844] border-3 border-emerald-300 shadow-[0_12px_35px_rgba(0,168,68,0.7)] flex items-center justify-center p-3 group hover:scale-105 transition-all duration-700 ${
                  showFase2Bonus ? 'opacity-100 scale-100' : 'opacity-0 scale-50 translate-y-12'
                }`}
                style={{
                  animation: showFase2Bonus ? 'pop-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' : 'none',
                }}
              >
                <BonusIcon className="w-26 h-26 text-black drop-shadow-[0_2px_3px_rgba(255,255,255,0.3)]" />
              </div>
            </div>
            <div className="text-center mt-2">
              <span className="text-xs font-black tracking-widest uppercase text-emerald-200 bg-emerald-950/80 px-3 py-1 rounded-full border border-emerald-500/40 shadow-sm">
                2 Giochi • Punti + 4 Bonus
              </span>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* COLONNA 3: TERMOPILI APOCALITTICHE / SCONTRO FINALE (Destra, Blue) */}
        {/* ============================================================ */}
        <div
          className="absolute flex flex-col items-center justify-between"
          style={{
            right: '12px',
            top: '22px',
            width: '320px',
            bottom: '22px',
          }}
        >
          {/* Top Card: Termopili Apocalittiche */}
          <div
            className={`w-full transition-all duration-700 ${
              showFase3Card ? 'opacity-100 scale-100' : 'opacity-0 scale-75 -translate-y-12'
            }`}
            style={{
              animation: showFase3Card ? 'bounce-drop 0.65s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' : 'none',
            }}
          >
            <div
              className="w-full py-5 px-4 rounded-3xl bg-[#0066cc] border-2 border-sky-300 text-white font-black tracking-wide text-center shadow-[0_12px_35px_rgba(0,102,204,0.65)] flex flex-col items-center justify-center min-h-[145px]"
            >
              <span className="text-[25px] leading-tight uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] whitespace-pre-line">
                {fase3Title}
              </span>
            </div>
          </div>

          {/* Center: Blue Chevrons */}
          <div
            className={`flex flex-col items-center gap-2 my-auto transition-all duration-700 ${
              showFase3Chevrons ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
            }`}
            style={{
              animation: showFase3Chevrons ? 'chevron-pulse 2s ease-in-out infinite' : 'none',
            }}
          >
            <svg
              width="105"
              height="180"
              viewBox="0 0 100 180"
              fill="none"
              className="drop-shadow-[0_0_12px_rgba(0,102,204,0.8)]"
            >
              <path
                d="M 12 30 L 50 70 L 88 30"
                stroke="#0066cc"
                strokeWidth="11"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M 12 90 L 50 130 L 88 90"
                stroke="#0066cc"
                strokeWidth="11"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {/* Bottom Badge: Blue Oval with Trophy (Squadra Vincente) */}
          <div
            className={`transition-all duration-700 ${
              showFase3Trophy ? 'opacity-100 scale-100' : 'opacity-0 scale-50 translate-y-12'
            }`}
            style={{
              animation: showFase3Trophy ? 'pop-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' : 'none',
            }}
          >
            <div
              className="w-[280px] h-[155px] rounded-[50%] bg-[#0066cc] border-3 border-sky-300 shadow-[0_12px_40px_rgba(0,102,204,0.7)] flex flex-col items-center justify-center p-3 group hover:scale-105 transition-transform"
            >
              <TrophyIcon className="w-24 h-24 text-black drop-shadow-[0_2px_3px_rgba(255,255,255,0.3)]" />
            </div>
            <div className="text-center mt-2">
              <span className="text-xs font-black tracking-widest uppercase text-sky-200 bg-sky-950/80 px-3 py-1 rounded-full border border-sky-500/40 shadow-sm">
                Manche Finale • Vincitrice
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Floating Presenter Control Bar (Hover to reveal, auto-hides when playing) */}
      {interactive && (
        <div
          className={`absolute bottom-4 left-1/2 -translate-x-1/2 z-40 transition-all duration-300 ${
            showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6 pointer-events-none'
          }`}
        >
          <div className="bg-black/85 backdrop-blur-xl border border-white/20 rounded-2xl px-5 py-2.5 flex items-center gap-3.5 shadow-2xl">
            {/* Play / Pause */}
            <button
              type="button"
              onClick={togglePlay}
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold transition-all cursor-pointer ${
                isPlaying
                  ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-[0_0_15px_rgba(245,158,11,0.5)]'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)]'
              }`}
              title={isPlaying ? 'Pausa (Spazio)' : 'Avvia Animazione con Voce (Spazio)'}
            >
              {isPlaying ? '⏸' : '▶'}
            </button>

            {/* Restart */}
            <button
              type="button"
              onClick={restart}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm font-bold border border-white/15 cursor-pointer"
              title="Ricomincia dall'inizio (R)"
            >
              🔄
            </button>

            {/* Timeline Progress Bar */}
            <div className="flex items-center gap-2 px-2">
              <span className="text-xs font-mono font-bold text-white/70 w-10 text-right">
                {formatTime(currentTime)}
              </span>
              <div
                className="w-48 h-2.5 bg-white/15 rounded-full overflow-hidden cursor-pointer relative"
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

            {/* Manual Phase Step Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setManualStep(2)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-black uppercase transition-all cursor-pointer ${
                  showFase1Card && !showFase2Card
                    ? 'bg-red-600 text-white shadow-md'
                    : 'bg-white/10 text-white/80 hover:bg-white/20'
                }`}
                title="Svela Fase 1 (Tasto 1)"
              >
                Fase 1
              </button>
              <button
                type="button"
                onClick={() => setManualStep(3)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-black uppercase transition-all cursor-pointer ${
                  showFase2Card && !showFase3Card
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-white/10 text-white/80 hover:bg-white/20'
                }`}
                title="Svela Fase 2 (Tasto 2)"
              >
                Fase 2
              </button>
              <button
                type="button"
                onClick={() => {
                  setManualStep(4);
                  setIsAllRevealed(true);
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-black uppercase transition-all cursor-pointer ${
                  showFase3Card
                    ? 'bg-sky-600 text-white shadow-md'
                    : 'bg-white/10 text-white/80 hover:bg-white/20'
                }`}
                title="Svela Fase 3 (Tasto 3)"
              >
                Fase 3
              </button>
            </div>

            <div className="h-6 w-[1px] bg-white/20" />

            {/* Reveal All */}
            <button
              type="button"
              onClick={revealEverything}
              className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                isAllRevealed
                  ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.7)]'
                  : 'bg-white/15 hover:bg-white/25 text-white border border-white/20'
              }`}
              title="Mostra tutti gli elementi immediatamente (S o Invio)"
            >
              Mostra Tutto
            </button>

            {/* Mute Audio */}
            <button
              type="button"
              onClick={toggleMute}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm font-bold border border-white/15 cursor-pointer"
              title={isMuted ? 'Riattiva Audio (M)' : 'Silenzia Audio (M)'}
            >
              {isMuted ? '🔇' : '🔊'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// =========================================================================
// VECTOR ICONS EXACTLY MATCHING Animazione spiegazione quiz.mov
// =========================================================================

function CoinsIcon({ className = 'w-24 h-24' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="currentColor" className={className}>
      {/* Top Stack of 4 Oval Coins */}
      <g>
        {/* Coin 1 (bottom of top stack) */}
        <path d="M 18 36 C 18 42, 54 42, 54 36 L 54 43 C 54 49, 18 49, 18 43 Z" />
        <ellipse cx="36" cy="36" rx="18" ry="6" />
        {/* Coin 2 */}
        <path d="M 18 29 C 18 35, 54 35, 54 29 L 54 36 C 54 42, 18 42, 18 36 Z" />
        <ellipse cx="36" cy="29" rx="18" ry="6" />
        {/* Coin 3 */}
        <path d="M 18 22 C 18 28, 54 28, 54 22 L 54 29 C 54 35, 18 35, 18 29 Z" />
        <ellipse cx="36" cy="22" rx="18" ry="6" />
        {/* Coin 4 (top) */}
        <ellipse cx="36" cy="15" rx="18" ry="6" />
        <ellipse cx="36" cy="15" rx="14" ry="4.5" fill="none" stroke="currentColor" strokeWidth="1" />
      </g>

      {/* Second Stack of 4 Oval Coins (offset to bottom right) */}
      <g>
        {/* Coin 1 */}
        <path d="M 44 65 C 44 71, 82 71, 82 65 L 82 72 C 82 78, 44 78, 44 72 Z" />
        <ellipse cx="63" cy="65" rx="19" ry="6.5" />
        {/* Coin 2 */}
        <path d="M 44 58 C 44 64, 82 64, 82 58 L 82 65 C 82 71, 44 71, 44 65 Z" />
        <ellipse cx="63" cy="58" rx="19" ry="6.5" />
        {/* Coin 3 */}
        <path d="M 44 51 C 44 57, 82 57, 82 51 L 82 58 C 82 64, 44 64, 44 58 Z" />
        <ellipse cx="63" cy="51" rx="19" ry="6.5" />
        {/* Coin 4 */}
        <ellipse cx="63" cy="44" rx="19" ry="6.5" />
        <ellipse cx="63" cy="44" rx="15" ry="5" fill="none" stroke="currentColor" strokeWidth="1.2" />
      </g>
    </svg>
  );
}

function BonusIcon({ className = 'w-24 h-24' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="currentColor" className={className}>
      {/* Left User silhouette */}
      <circle cx="28" cy="38" r="9" />
      <path d="M 12 66 C 12 55, 44 55, 44 66 Z" />

      {/* Right User silhouette */}
      <circle cx="72" cy="38" r="9" />
      <path d="M 56 66 C 56 55, 88 55, 88 66 Z" />

      {/* Center Main User silhouette with Target/Magnifier Ring */}
      <circle cx="50" cy="34" r="11" />
      <path d="M 30 68 C 30 54, 70 54, 70 68 Z" />

      {/* Magnifier / Target ring */}
      <circle cx="50" cy="40" r="23" fill="none" stroke="currentColor" strokeWidth="6" />
      <line x1="66" y1="56" x2="80" y2="70" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
    </svg>
  );
}

function TrophyIcon({ className = 'w-24 h-24' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="currentColor" className={className}>
      {/* Trophy Cup Bowl */}
      <path d="M 28 20 L 72 20 C 72 45, 60 56, 50 56 C 40 56, 28 45, 28 20 Z" />

      {/* Handles */}
      <path
        d="M 28 24 C 14 24, 14 42, 29 44"
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M 72 24 C 86 24, 86 42, 71 44"
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
      />

      {/* Stem */}
      <path d="M 45 56 L 55 56 L 55 72 L 45 72 Z" />

      {/* Base */}
      <path d="M 32 72 L 68 72 L 74 84 L 26 84 Z" />
    </svg>
  );
}
