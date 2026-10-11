import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useGameData } from './context/GameDataContext';
import { assetUrl } from './lib/assetUrl';
import { useSyncedState } from './hooks/useSyncedState';

interface SpiegazioneBox5Data {
  src?: string;
  videoUrl?: string;
  sfondo?: string;
  sfondoSpiegazione?: string;
  titolo?: string;
  titoloGioco?: string;
  sottotitolo?: string;
  slideId?: string;
  audioUrl?: string;
  audioSpiegazione?: string;
  notePresentatore?: string;
}

interface SpiegazioneBox5BoardProps {
  interactive?: boolean;
  revealAll?: boolean;
  isPresenter?: boolean;
  onReturnToMap?: () => void;
}

// =========================================================================
// MOTORE EFFETTI SONORI PROCEDURALI (Web Audio API nativo a bassissima latenza)
// =========================================================================
class SoundFXEngine {
  private ctx: AudioContext | null = null;

  public resume() {
    this.getContext();
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return null;

    if (!this.ctx || this.ctx.state === 'closed') {
      try {
        this.ctx = new AudioCtx();
      } catch {
        return null;
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Suono olografico per attivazione pillole e schede
   */
  playBoxActivation() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = Math.max(ctx.currentTime, 0.05);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(580, now + 0.18);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, now);
    filter.frequency.exponentialRampToValueAtTime(3400, now + 0.18);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.32);
  }

  /**
   * Tintinnio per rivelazione dettagli indizi
   */
  playArrowTin() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = Math.max(ctx.currentTime, 0.05);

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.001, now);
    masterGain.gain.linearRampToValueAtTime(0.35, now + 0.004);
    masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    masterGain.connect(ctx.destination);

    const harmonics = [1046.5, 1567.98, 2093.0];
    const weights = [0.55, 0.35, 0.2];

    harmonics.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      oscGain.gain.setValueAtTime(weights[idx], now);
      osc.connect(oscGain);
      oscGain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.38);
    });
  }

  /**
   * Effetto rotolamento dadi per il bonus DADO
   */
  playDiceRoll() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = Math.max(ctx.currentTime, 0.05);

    [0, 0.07, 0.15, 0.22, 0.31].forEach((offset, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400 + idx * 75, now + offset);
      osc.frequency.exponentialRampToValueAtTime(200, now + offset + 0.06);

      gain.gain.setValueAtTime(0.001, now + offset);
      gain.gain.linearRampToValueAtTime(0.28 - idx * 0.04, now + offset + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.07);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.08);
    });
  }

  /**
   * Effetto warp dimensionale per il bonus SWITCH
   */
  playSwitchSound() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = Math.max(ctx.currentTime, 0.05);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(960, now + 0.14);
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.28);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, now);
    filter.Q.setValueAtTime(4, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.32, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.36);
  }

  /**
   * Rilascio e freccia per il bonus ARCO
   */
  playArrowWhoosh() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = Math.max(ctx.currentTime, 0.05);

    // Corda che scocca
    const twang = ctx.createOscillator();
    const twangGain = ctx.createGain();
    twang.type = 'triangle';
    twang.frequency.setValueAtTime(600, now);
    twang.frequency.exponentialRampToValueAtTime(180, now + 0.15);

    twangGain.gain.setValueAtTime(0.35, now);
    twangGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
    twang.connect(twangGain);
    twangGain.connect(ctx.destination);
    twang.start(now);
    twang.stop(now + 0.22);

    // Sibilo freccia
    const bufferSize = ctx.sampleRate * 0.25;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, now);
    filter.frequency.exponentialRampToValueAtTime(2600, now + 0.12);
    filter.Q.setValueAtTime(6, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.001, now);
    noiseGain.gain.linearRampToValueAtTime(0.25, now + 0.04);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + 0.26);
  }

  /**
   * Resonanza metallica e clang per il bonus SCUDO
   */
  playShieldClang() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = Math.max(ctx.currentTime, 0.05);

    const freqs = [320, 560, 840, 1180];
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.3 - i * 0.05, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.65);
    });
  }

  /**
   * Fanfara trionfale per passaggio di slide e conclusione
   */
  playFanfare() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = Math.max(ctx.currentTime, 0.05);

    const chord = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    chord.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.04);

      gain.gain.setValueAtTime(0.001, now + idx * 0.04);
      gain.gain.linearRampToValueAtTime(0.26, now + idx * 0.04 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.04 + 0.7);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.04);
      osc.stop(now + idx * 0.04 + 0.75);
    });
  }
}

const soundFX = new SoundFXEngine();

export default function SpiegazioneBox5Board({
  interactive = true,
  revealAll = false,
  isPresenter,
  onReturnToMap,
}: SpiegazioneBox5BoardProps) {
  const data = useGameData<SpiegazioneBox5Data>();

  // Identificativo univoco di slide per sincronizzazione Multi-Window
  const slideId = useMemo(() => {
    return data?.slideId || 'slide_spiegazione_box5';
  }, [data?.slideId]);

  // Identificazione modalità Relatore vs Schermo Pubblico
  const isPresenterMode = useMemo(() => {
    if (isPresenter !== undefined) return isPresenter;
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    if (params.get('sandbox') === 'true') return true;
    if (
      params.get('mode') === 'games' ||
      params.get('mode') === 'scores' ||
      params.get('project') === 'true'
    ) {
      return false;
    }
    return true;
  }, [isPresenter]);

  // Gestione emissione audio: in Electron multi-finestra, solo la finestra Giochi emette audio
  const isMultiWindowRelatore = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const isElectron = (window as any).electron !== undefined;
    if (!isElectron) return false;
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    const isSandbox = params.get('sandbox') === 'true';
    return (mode === 'presenter' || isPresenter === true) && !isSandbox;
  }, [isPresenter]);

  // =========================================================================
  // STATO SINCRONIZZATO TRA FINESTRE (useSyncedState su localStorage + IPC)
  // =========================================================================
  // activeSlide: 0 = Slide 1 (Regole Scontro), 1 = Slide 2 (I 4 Bonus & Jolly)
  const [activeSlide, setActiveSlide] = useSyncedState<number>(
    `playstate_${slideId}_slide`,
    0
  );
  // manualStep: da 0 a 10
  // Step 0..4: Slide 1 (Regola 1..4)
  // Step 5..10: Slide 2 (Intro, Dado, Switch, Arco, Scudo, Banner Finale)
  const [manualStep, setManualStep] = useSyncedState<number>(
    `playstate_${slideId}_step`,
    revealAll ? 10 : 0
  );
  const [isAllRevealed, setIsAllRevealed] = useSyncedState<boolean>(
    `playstate_${slideId}_revealed`,
    revealAll
  );
  const [isPlaying, setIsPlaying] = useSyncedState<boolean>(
    `playstate_${slideId}_playing`,
    false
  );

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(30);
  const isMuted = isMultiWindowRelatore;

  const formatTime = (secs: number) => {
    const s = Math.floor(secs);
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
  };

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Pulizia e stop audio all'unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    };
  }, []);

  // Sincronizza audio play/pause se audio disponibile
  useEffect(() => {
    if (!interactive) return;
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.play().catch((err) => {
        console.warn('Audio non riprodotto (potrebbe non essere ancora caricato):', err);
      });
    } else {
      audio.pause();
    }
  }, [isPlaying, interactive]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const t = audioRef.current.currentTime;
      if (!isNaN(t)) setCurrentTime(t);
      if (audioRef.current.duration && !isNaN(audioRef.current.duration)) {
        setDuration(audioRef.current.duration);
      }
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setIsAllRevealed(true);
  };

  // Visibilità dinamica sincronizzata per le 4 regole di Slide 1
  const showRegola1Pill = isAllRevealed || manualStep >= 1;
  const showRegola1Card = isAllRevealed || manualStep >= 1;

  const showRegola2Pill = isAllRevealed || manualStep >= 2;
  const showRegola2Card = isAllRevealed || manualStep >= 2;

  const showRegola3Pill = isAllRevealed || manualStep >= 3;
  const showRegola3Card = isAllRevealed || manualStep >= 3;

  const showRegola4Pill = isAllRevealed || manualStep >= 4;
  const showRegola4Card = isAllRevealed || manualStep >= 4;

  // Visibilità dinamica sincronizzata per i 4 bonus di Slide 2
  const showBonusDado = isAllRevealed || manualStep >= 6;
  const showBonusSwitch = isAllRevealed || manualStep >= 7;
  const showBonusArco = isAllRevealed || manualStep >= 8;
  const showBonusScudo = isAllRevealed || manualStep >= 9;
  const showFinaleBanner = isAllRevealed || manualStep >= 10;

  // Ritorno alla mappa dell'isola
  const returnToMap = useCallback(() => {
    if (onReturnToMap) {
      onReturnToMap();
    } else {
      window.dispatchEvent(new CustomEvent('imperio-return-to-map'));
    }
  }, [onReturnToMap]);

  // Transizione a Domanda 1 del Finale
  const handleStartFinale = useCallback(() => {
    if (!interactive) return;
    soundFX.resume();
    soundFX.playFanfare();
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('imperio-advance-to-q1'));
    }, 400);
  }, [interactive]);

  // Step avanti manuale
  const nextStep = useCallback(() => {
    if (!interactive) return;
    soundFX.resume();

    if (activeSlide === 0) {
      if (manualStep < 4) {
        soundFX.playBoxActivation();
        setManualStep(manualStep + 1);
      } else {
        // Passaggio a Slide 2 (I 4 Bonus)
        soundFX.playFanfare();
        setActiveSlide(1);
        setManualStep(5);
      }
    } else {
      if (manualStep < 6) {
        soundFX.playDiceRoll();
        setManualStep(6);
      } else if (manualStep === 6) {
        soundFX.playSwitchSound();
        setManualStep(7);
      } else if (manualStep === 7) {
        soundFX.playArrowWhoosh();
        setManualStep(8);
      } else if (manualStep === 8) {
        soundFX.playShieldClang();
        setManualStep(9);
      } else if (manualStep === 9) {
        soundFX.playFanfare();
        setManualStep(10);
        setIsAllRevealed(true);
      } else {
        handleStartFinale();
      }
    }
  }, [interactive, activeSlide, manualStep, setManualStep, setActiveSlide, setIsAllRevealed, handleStartFinale]);

  // Step indietro manuale (protetto: a step 0 non esce dalla mappa)
  const prevStep = useCallback(() => {
    if (!interactive) return;
    soundFX.resume();

    if (activeSlide === 1) {
      if (manualStep > 6) {
        setManualStep(manualStep - 1);
      } else if (manualStep <= 6 && manualStep > 5) {
        setManualStep(5);
      } else {
        // Ritorna a Slide 1 all'ultimo step
        setActiveSlide(0);
        setManualStep(4);
      }
    } else {
      if (manualStep > 0) {
        setManualStep(manualStep - 1);
      }
    }
  }, [interactive, activeSlide, manualStep, setManualStep, setActiveSlide]);

  // Svela tutto
  const revealEverything = useCallback(() => {
    if (!interactive) return;
    soundFX.resume();
    soundFX.playFanfare();
    if (activeSlide === 0) {
      setManualStep(4);
    } else {
      setManualStep(10);
      setIsAllRevealed(true);
    }
  }, [interactive, activeSlide, setManualStep, setIsAllRevealed]);

  // Reset completo
  const resetAllState = useCallback(() => {
    if (!interactive) return;
    soundFX.resume();
    setActiveSlide(0);
    setManualStep(0);
    setIsAllRevealed(false);
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setCurrentTime(0);
  }, [interactive, setActiveSlide, setManualStep, setIsAllRevealed, setIsPlaying]);

  // Selettore slide manuale
  const selectSlide = useCallback(
    (slideIdx: number) => {
      if (!interactive) return;
      soundFX.resume();
      soundFX.playBoxActivation();
      setActiveSlide(slideIdx);
      if (slideIdx === 0 && manualStep > 4) {
        setManualStep(4);
      } else if (slideIdx === 1 && manualStep < 5) {
        setManualStep(5);
      }
    },
    [interactive, setActiveSlide, manualStep, setManualStep]
  );

  // Toggle play/pause
  const togglePlay = useCallback(() => {
    if (!interactive) return;
    soundFX.resume();
    setIsPlaying(!isPlaying);
  }, [interactive, isPlaying, setIsPlaying]);

  // Gestione tastiera sul relatore
  useEffect(() => {
    if (!interactive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;

      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        e.stopPropagation();
        nextStep();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        e.stopPropagation();
        prevStep();
      } else if (e.key === ' ' || e.key.toLowerCase() === 's') {
        e.preventDefault();
        e.stopPropagation();
        revealEverything();
      } else if (e.key.toLowerCase() === 'r') {
        e.preventDefault();
        e.stopPropagation();
        resetAllState();
      } else if (e.key.toLowerCase() === 'm' || e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        returnToMap();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [interactive, nextStep, prevStep, revealEverything, resetAllState, returnToMap]);

  // Asset e testi dinamici
  const customSfondo = assetUrl(
    data?.sfondoSpiegazione || data?.sfondo || '/Icone/sfondi/sfondo_box5_arena_acqua.jpg'
  );
  const audioSrc = assetUrl(
    data?.audioSpiegazione || data?.audioUrl || '/Audio/Spiegazioni/Spiegazione_box5.mp3'
  );
  const titoloGioco = data?.titoloGioco || data?.titolo || 'TERMOPILI — SCONTRO FINALE';
  const sottotitoloGioco =
    data?.sottotitolo ||
    (activeSlide === 0
      ? "ARENA D'ACQUA • SFIDA DIRETTA A ELIMINAZIONE"
      : 'I 4 EQUIPAGGIAMENTI • JOLLY E BONUS DEL TORNEO');

  return (
    <div className="relative w-[1920px] h-[1080px] overflow-hidden select-none bg-[#090308] text-white flex flex-col items-center justify-between font-sans px-12 py-7">
      {/* Elemento Audio di supporto */}
      <audio
        ref={audioRef}
        src={audioSrc}
        preload="auto"
        muted={isMuted}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleAudioEnded}
      />

      {/* ========================================================================= */}
      {/* SFONDO E LIVELLO CINEMATICO DELL'ARENA D'ACQUA                            */}
      {/* Trasparente per rendere pienamente visibile lo sfondo spettacolare         */}
      {/* ========================================================================= */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {customSfondo ? (
          <div
            className="absolute inset-0 bg-cover bg-center transition-all duration-1000 scale-[1.01]"
            style={{
              backgroundImage: `url(${customSfondo})`,
              filter: 'brightness(0.68) contrast(1.15) saturate(1.1)',
            }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-[#140608] via-[#1f0a10] to-[#0a0205]" />
        )}

        {/* Gradiente sfumato morbido che garantisce leggibilità perfetta ai testi */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/75" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-black/25 to-black/85" />

        {/* Effetto bagliore termopili rosso rubino/dorato */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-red-600/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl" />
      </div>

      {/* ========================================================================= */}
      {/* HEADER CINEMATICO AD ALTO IMPATTO                                         */}
      {/* Con selettore delle 2 Slide sincronizzato                                 */}
      {/* ========================================================================= */}
      <header className="relative z-10 w-full flex flex-col items-center justify-center shrink-0 mb-2 text-center">
        <div className="flex items-center gap-4 mb-2">
          {/* Badge di ambientazione */}
          <div className="flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-slate-950/85 border border-red-500/40 shadow-lg backdrop-blur-md">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400 animate-pulse" />
            <span className="text-[11px] font-mono font-bold tracking-widest text-red-300 uppercase">
              FASE FINALE: TERMOPILI
            </span>
            <span className="text-white/30 text-xs">|</span>
            <span className="text-xs font-mono font-bold tracking-wider text-amber-300">
              BOX 5 • ARENA D'ACQUA
            </span>
          </div>

          {/* Selettore Fasi / Slide (Clickable anche dal Relatore) */}
          <div className="flex items-center gap-1.5 p-1 rounded-full bg-slate-950/90 border border-white/20 shadow-md backdrop-blur-md">
            <button
              type="button"
              onClick={() => selectSlide(0)}
              className={`px-4 py-1 rounded-full text-xs font-bold uppercase transition-all tracking-wide ${
                activeSlide === 0
                  ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)] scale-105'
                  : 'text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              ⚔️ 1. REGOLE DELLO SCONTRO
            </button>
            <button
              type="button"
              onClick={() => selectSlide(1)}
              className={`px-4 py-1 rounded-full text-xs font-bold uppercase transition-all tracking-wide ${
                activeSlide === 1
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.5)] scale-105'
                  : 'text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              🛡️ 2. I 4 BONUS & JOLLY
            </button>
          </div>
        </div>

        <h1 className="text-4xl lg:text-5xl font-black tracking-tight uppercase text-transparent bg-clip-text bg-gradient-to-r from-red-200 via-rose-300 to-amber-300 drop-shadow-[0_4px_24px_rgba(239,68,68,0.5)] text-center font-serif">
          {titoloGioco}
        </h1>
        <p className="text-[11px] lg:text-xs font-semibold tracking-[0.3em] uppercase text-slate-300/85 mt-1">
          {sottotitoloGioco}
        </p>
      </header>

      {/* ========================================================================= */}
      {/* CONTENUTO CENTRALE: SLIDE 1 (REGOLE DELLO SCONTRO FINALE)                 */}
      {/* 4 righe compatte eleganti (Sx 5 col vs Dx 7 col) senza tag badges         */}
      {/* ========================================================================= */}
      {activeSlide === 0 ? (
        <main className="relative z-10 w-full flex-1 flex flex-col justify-center gap-3.5 max-w-[1780px] my-auto py-1">
          {/* RIGA 1: LA MANO & IL DADO */}
          <div className="w-full grid grid-cols-12 gap-6 items-center">
            {/* 1. PILL MANO & DADO (SX - 5 COLONNE) */}
            <div className="col-span-5 pl-4">
              <div
                className={`transition-all duration-700 transform ${
                  showRegola1Pill
                    ? 'opacity-100 translate-x-0 scale-100'
                    : 'opacity-0 -translate-x-12 scale-95'
                }`}
              >
                <div className="relative group p-0.5 rounded-2xl bg-gradient-to-r from-amber-500/40 via-red-500/20 to-transparent">
                  <div className="px-6 py-3.5 rounded-[18px] bg-slate-950/85 border border-amber-400/50 shadow-[0_0_25px_rgba(245,158,11,0.25)] backdrop-blur-md flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-xl shadow-inner">
                        🎲
                      </div>
                      <div>
                        <span className="text-[9px] font-mono font-bold tracking-widest text-amber-400/80 uppercase">
                          Regola 01
                        </span>
                        <h2 className="text-xl lg:text-2xl font-black uppercase tracking-wider text-white">
                          LA MANO & IL DADO
                        </h2>
                      </div>
                    </div>
                    <span className="text-amber-400 font-mono text-[11px] px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-400/30 font-bold">
                      15 DOMANDE
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 1: DETTAGLIO MANO & DADO (DX - 7 COLONNE) */}
            <div className="col-span-7 pr-4">
              <div
                className={`transition-all duration-700 transform ${
                  showRegola1Card
                    ? 'opacity-100 translate-y-0 scale-100'
                    : 'opacity-0 translate-y-6 scale-95'
                }`}
              >
                <div className="p-4 px-6 rounded-2xl bg-slate-900/80 border border-amber-400/35 shadow-xl backdrop-blur-md flex items-center gap-5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

                  <div className="shrink-0 flex items-center justify-center">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500 to-orange-700 p-0.5 shadow-[0_0_20px_rgba(245,158,11,0.4)] flex items-center justify-center">
                      <div className="w-full h-full rounded-[10px] bg-slate-950/80 flex items-center justify-center text-2xl">
                        🎯
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 space-y-1">
                    <p className="text-sm lg:text-base font-medium text-slate-200 leading-snug">
                      Chi detiene la mano di gioco <strong className="text-amber-300 font-bold">lancia il dado</strong> per capire quale squadra sfidare e sceglie una fra le <strong className="text-cyan-300 font-bold">domande numerate fino a 15</strong>.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGA 2: ESITO RISPOSTA & ELIMINAZIONE */}
          <div className="w-full grid grid-cols-12 gap-6 items-center">
            {/* 2. PILL ESITO (SX - 5 COLONNE) */}
            <div className="col-span-5 pl-4">
              <div
                className={`transition-all duration-700 transform delay-75 ${
                  showRegola2Pill
                    ? 'opacity-100 translate-x-0 scale-100'
                    : 'opacity-0 -translate-x-12 scale-95'
                }`}
              >
                <div className="relative group p-0.5 rounded-2xl bg-gradient-to-r from-red-500/40 via-rose-500/20 to-transparent">
                  <div className="px-6 py-3.5 rounded-[18px] bg-slate-950/85 border border-red-400/50 shadow-[0_0_25px_rgba(239,68,68,0.25)] backdrop-blur-md flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-xl bg-red-500/20 border border-red-400/50 flex items-center justify-center text-xl shadow-inner">
                        ⚔️
                      </div>
                      <div>
                        <span className="text-[9px] font-mono font-bold tracking-widest text-red-400/80 uppercase">
                          Regola 02
                        </span>
                        <h2 className="text-xl lg:text-2xl font-black uppercase tracking-wider text-white">
                          ESITO & ELIMINAZIONE
                        </h2>
                      </div>
                    </div>
                    <span className="text-red-300 font-mono text-[11px] px-2.5 py-0.5 rounded-full bg-red-500/10 border border-red-400/30 font-bold">
                      SFIDA DIRETTA
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 2: DETTAGLIO ESITO (DX - 7 COLONNE) */}
            <div className="col-span-7 pr-4">
              <div
                className={`transition-all duration-700 transform ${
                  showRegola2Card
                    ? 'opacity-100 translate-y-0 scale-100'
                    : 'opacity-0 translate-y-6 scale-95'
                }`}
              >
                <div className="p-4 px-6 rounded-2xl bg-slate-900/80 border border-red-400/35 shadow-xl backdrop-blur-md flex items-center gap-5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-36 h-36 bg-red-500/10 rounded-full blur-2xl pointer-events-none" />

                  <div className="shrink-0 flex items-center justify-center">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-red-500 to-rose-700 p-0.5 shadow-[0_0_20px_rgba(239,68,68,0.4)] flex items-center justify-center">
                      <div className="w-full h-full rounded-[10px] bg-slate-950/80 flex items-center justify-center text-2xl">
                        🌊
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 space-y-1">
                    <p className="text-sm lg:text-base font-medium text-slate-200 leading-snug">
                      In caso di <strong className="text-emerald-300 font-bold">risposta esatta</strong> si elimina il primo componente della squadra sfidata; in caso di <strong className="text-rose-400 font-bold">risposta errata</strong> si elimina se stessi!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGA 3: CONSULTAZIONE PRESCELTI */}
          <div className="w-full grid grid-cols-12 gap-6 items-center">
            {/* 3. PILL CONSULTAZIONE (SX - 5 COLONNE) */}
            <div className="col-span-5 pl-4">
              <div
                className={`transition-all duration-700 transform delay-150 ${
                  showRegola3Pill
                    ? 'opacity-100 translate-x-0 scale-100'
                    : 'opacity-0 -translate-x-12 scale-95'
                }`}
              >
                <div className="relative group p-0.5 rounded-2xl bg-gradient-to-r from-cyan-500/40 via-blue-500/20 to-transparent">
                  <div className="px-6 py-3.5 rounded-[18px] bg-slate-950/85 border border-cyan-400/50 shadow-[0_0_25px_rgba(6,182,212,0.25)] backdrop-blur-md flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-xl bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-xl shadow-inner">
                        👥
                      </div>
                      <div>
                        <span className="text-[9px] font-mono font-bold tracking-widest text-cyan-400/80 uppercase">
                          Regola 03
                        </span>
                        <h2 className="text-xl lg:text-2xl font-black uppercase tracking-wider text-white">
                          CONSULTAZIONE
                        </h2>
                      </div>
                    </div>
                    <span className="text-cyan-300 font-mono text-[11px] px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-400/30 font-bold">
                      POSIZIONI 2-3 & 4-5-6
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 3: DETTAGLIO CONSULTAZIONE (DX - 7 COLONNE) */}
            <div className="col-span-7 pr-4">
              <div
                className={`transition-all duration-700 transform ${
                  showRegola3Card
                    ? 'opacity-100 translate-y-0 scale-100'
                    : 'opacity-0 translate-y-6 scale-95'
                }`}
              >
                <div className="p-4 px-6 rounded-2xl bg-slate-900/80 border border-cyan-400/35 shadow-xl backdrop-blur-md flex items-center gap-5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-36 h-36 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

                  <div className="shrink-0 flex items-center justify-center">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-700 p-0.5 shadow-[0_0_20px_rgba(6,182,212,0.4)] flex items-center justify-center">
                      <div className="w-full h-full rounded-[10px] bg-slate-950/80 flex items-center justify-center text-2xl">
                        🗣️
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 space-y-1">
                    <p className="text-sm lg:text-base font-medium text-slate-200 leading-snug">
                      Si potranno consultare <strong className="text-cyan-300 font-bold">solo i prescelti in posizione due e il tre</strong>, e solo <strong className="text-amber-300 font-bold">in quattro, cinque e sei</strong>.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGA 4: IL CAPITANO & LA PULSANTIERA DEI JOLLY */}
          <div className="w-full grid grid-cols-12 gap-6 items-center">
            {/* 4. PILL CAPITANO (SX - 5 COLONNE) */}
            <div className="col-span-5 pl-4">
              <div
                className={`transition-all duration-700 transform delay-200 ${
                  showRegola4Pill
                    ? 'opacity-100 translate-x-0 scale-100'
                    : 'opacity-0 -translate-x-12 scale-95'
                }`}
              >
                <div className="relative group p-0.5 rounded-2xl bg-gradient-to-r from-purple-500/40 via-amber-500/20 to-transparent">
                  <div className="px-6 py-3.5 rounded-[18px] bg-slate-950/85 border border-purple-400/50 shadow-[0_0_25px_rgba(168,85,247,0.25)] backdrop-blur-md flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-xl bg-purple-500/20 border border-purple-400/50 flex items-center justify-center text-xl shadow-inner">
                        👑
                      </div>
                      <div>
                        <span className="text-[9px] font-mono font-bold tracking-widest text-purple-400/80 uppercase">
                          Regola 04
                        </span>
                        <h2 className="text-xl lg:text-2xl font-black uppercase tracking-wider text-white">
                          IL CAPITANO
                        </h2>
                      </div>
                    </div>
                    <span className="text-purple-300 font-mono text-[11px] px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-400/30 font-bold">
                      PULSANTIERA & JOLLY
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 4: DETTAGLIO CAPITANO (DX - 7 COLONNE) */}
            <div className="col-span-7 pr-4">
              <div
                className={`transition-all duration-700 transform ${
                  showRegola4Card
                    ? 'opacity-100 translate-y-0 scale-100'
                    : 'opacity-0 translate-y-6 scale-95'
                }`}
              >
                <div className="p-4 px-6 rounded-2xl bg-slate-900/80 border border-purple-400/35 shadow-xl backdrop-blur-md flex items-center gap-5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-36 h-36 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

                  <div className="shrink-0 flex items-center justify-center">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-700 p-0.5 shadow-[0_0_20px_rgba(168,85,247,0.4)] flex items-center justify-center">
                      <div className="w-full h-full rounded-[10px] bg-slate-950/80 flex items-center justify-center text-2xl">
                        🔘
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 space-y-1">
                    <p className="text-sm lg:text-base font-medium text-slate-200 leading-snug">
                      Il capitano può intervenire per decidere di <strong className="text-purple-300 font-bold">giocare un jolly</strong>, tramite la <strong className="text-amber-300 font-bold">pulsantiera</strong>.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      ) : (
        /* ========================================================================= */
        /* CONTENUTO CENTRALE: SLIDE 2 (I 4 BONUS & JOLLY DELL'ARENA)               */
        /* Griglia 2x2 spettacolare con icone iconiche e descrizioni nitide          */
        /* ========================================================================= */
        <main className="relative z-10 w-full flex-1 flex flex-col justify-center gap-6 max-w-[1720px] my-auto py-2">
          <div className="grid grid-cols-2 gap-7 w-full">
            {/* 1. BONUS DADO */}
            <div
              className={`transition-all duration-700 transform ${
                showBonusDado
                  ? 'opacity-100 translate-y-0 scale-100'
                  : 'opacity-0 translate-y-10 scale-95'
              }`}
            >
              <div className="relative group p-0.5 rounded-3xl bg-gradient-to-br from-amber-500/50 via-yellow-500/20 to-transparent shadow-[0_0_30px_rgba(245,158,11,0.2)]">
                <div className="p-6 rounded-[22px] bg-slate-950/85 border border-amber-400/40 backdrop-blur-md flex items-center gap-6 min-h-[175px]">
                  <div className="shrink-0 relative">
                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600 p-1 shadow-[0_0_30px_rgba(245,158,11,0.5)] flex items-center justify-center">
                      <div className="w-full h-full rounded-[14px] bg-slate-950/85 flex items-center justify-center text-5xl">
                        🎲
                      </div>
                    </div>
                    <span className="absolute -top-2 -right-2 px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 font-black text-[10px] uppercase font-mono shadow-md">
                      BONUS
                    </span>
                  </div>

                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-2xl lg:text-3xl font-black uppercase tracking-wider text-amber-300 font-serif">
                        DADO
                      </h3>
                      <span className="text-[11px] font-mono font-bold text-amber-400/80 uppercase px-3 py-1 rounded-full bg-amber-500/10 border border-amber-400/30">
                        RILANCIO DELLA SORTE
                      </span>
                    </div>
                    <p className="text-base lg:text-lg text-slate-200 leading-relaxed font-medium">
                      Permette di <strong className="text-amber-300 font-bold">rilanciare il dado</strong> per determinare una nuova squadra da sfidare.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. BONUS SWITCH */}
            <div
              className={`transition-all duration-700 transform delay-75 ${
                showBonusSwitch
                  ? 'opacity-100 translate-y-0 scale-100'
                  : 'opacity-0 translate-y-10 scale-95'
              }`}
            >
              <div className="relative group p-0.5 rounded-3xl bg-gradient-to-br from-cyan-500/50 via-sky-500/20 to-transparent shadow-[0_0_30px_rgba(6,182,212,0.2)]">
                <div className="p-6 rounded-[22px] bg-slate-950/85 border border-cyan-400/40 backdrop-blur-md flex items-center gap-6 min-h-[175px]">
                  <div className="shrink-0 relative">
                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-cyan-400 via-sky-500 to-blue-600 p-1 shadow-[0_0_30px_rgba(6,182,212,0.5)] flex items-center justify-center">
                      <div className="w-full h-full rounded-[14px] bg-slate-950/85 flex items-center justify-center text-5xl">
                        🔄
                      </div>
                    </div>
                    <span className="absolute -top-2 -right-2 px-2 py-0.5 rounded-md bg-cyan-400 text-slate-950 font-black text-[10px] uppercase font-mono shadow-md">
                      BONUS
                    </span>
                  </div>

                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-2xl lg:text-3xl font-black uppercase tracking-wider text-cyan-300 font-serif">
                        SWITCH
                      </h3>
                      <span className="text-[11px] font-mono font-bold text-cyan-400/80 uppercase px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/30">
                        CAMBIO DOMANDA
                      </span>
                    </div>
                    <p className="text-base lg:text-lg text-slate-200 leading-relaxed font-medium">
                      Permette di <strong className="text-cyan-300 font-bold">cambiare domanda</strong>. Essa resterà comunque disponibile per le altre squadre in caso vogliano sceglierla.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. BONUS ARCO */}
            <div
              className={`transition-all duration-700 transform delay-150 ${
                showBonusArco
                  ? 'opacity-100 translate-y-0 scale-100'
                  : 'opacity-0 translate-y-10 scale-95'
              }`}
            >
              <div className="relative group p-0.5 rounded-3xl bg-gradient-to-br from-rose-500/50 via-red-500/20 to-transparent shadow-[0_0_30px_rgba(244,63,94,0.2)]">
                <div className="p-6 rounded-[22px] bg-slate-950/85 border border-rose-400/40 backdrop-blur-md flex items-center gap-6 min-h-[175px]">
                  <div className="shrink-0 relative">
                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-rose-400 via-red-500 to-rose-700 p-1 shadow-[0_0_30px_rgba(244,63,94,0.5)] flex items-center justify-center">
                      <div className="w-full h-full rounded-[14px] bg-slate-950/85 flex items-center justify-center text-5xl">
                        🏹
                      </div>
                    </div>
                    <span className="absolute -top-2 -right-2 px-2 py-0.5 rounded-md bg-rose-500 text-white font-black text-[10px] uppercase font-mono shadow-md">
                      BONUS
                    </span>
                  </div>

                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-2xl lg:text-3xl font-black uppercase tracking-wider text-rose-300 font-serif">
                        ARCO
                      </h3>
                      <span className="text-[11px] font-mono font-bold text-rose-400/80 uppercase px-3 py-1 rounded-full bg-rose-500/10 border border-rose-400/30">
                        RISPOSTA COATTA
                      </span>
                    </div>
                    <p className="text-base lg:text-lg text-slate-200 leading-relaxed font-medium">
                      <strong className="text-rose-400 font-bold">Obbliga la squadra sfidata a rispondere</strong> al posto della squadra che gioca tale bonus.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. BONUS SCUDO */}
            <div
              className={`transition-all duration-700 transform delay-200 ${
                showBonusScudo
                  ? 'opacity-100 translate-y-0 scale-100'
                  : 'opacity-0 translate-y-10 scale-95'
              }`}
            >
              <div className="relative group p-0.5 rounded-3xl bg-gradient-to-br from-emerald-500/50 via-teal-500/20 to-transparent shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                <div className="p-6 rounded-[22px] bg-slate-950/85 border border-emerald-400/40 backdrop-blur-md flex items-center gap-6 min-h-[175px]">
                  <div className="shrink-0 relative">
                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-emerald-400 via-teal-500 to-emerald-700 p-1 shadow-[0_0_30px_rgba(16,185,129,0.5)] flex items-center justify-center">
                      <div className="w-full h-full rounded-[14px] bg-slate-950/85 flex items-center justify-center text-5xl">
                        🛡️
                      </div>
                    </div>
                    <span className="absolute -top-2 -right-2 px-2 py-0.5 rounded-md bg-emerald-500 text-slate-950 font-black text-[10px] uppercase font-mono shadow-md">
                      BONUS
                    </span>
                  </div>

                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-2xl lg:text-3xl font-black uppercase tracking-wider text-emerald-300 font-serif">
                        SCUDO
                      </h3>
                      <span className="text-[11px] font-mono font-bold text-emerald-400/80 uppercase px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-400/30">
                        SALVATAGGIO PRESCELTO
                      </span>
                    </div>
                    <p className="text-base lg:text-lg text-slate-200 leading-relaxed font-medium">
                      In ogni fase del gioco può essere usato per <strong className="text-emerald-300 font-bold">salvare un prescelto</strong> dall'eliminazione.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* ========================================================================= */}
      {/* BANNER INFERIORE: CTA SCONTRO FINALE / TRANSIZIONE                        */}
      {/* ========================================================================= */}
      {activeSlide === 1 && (
        <div className="relative z-10 w-full max-w-[1720px] shrink-0 mt-0 mb-1">
          <div
            className={`transition-all duration-700 transform ${
              showFinaleBanner
                ? 'opacity-100 translate-y-0 scale-100'
                : 'opacity-0 translate-y-6 scale-95 pointer-events-none'
            }`}
          >
            <div className="p-3.5 px-8 rounded-2xl bg-gradient-to-r from-red-950/80 via-slate-950/90 to-amber-950/80 border border-red-500/50 shadow-[0_0_35px_rgba(239,68,68,0.35)] backdrop-blur-md flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-2xl animate-bounce">⚔️</span>
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-red-400">
                    FASE FINALE: TERMOPILI
                  </span>
                  <p className="text-base font-black uppercase text-white tracking-wide">
                    TUTTO PRONTO — CHE LO SCONTRO ABBIA INIZIO SULL'ARENA D'ACQUA!
                  </p>
                </div>
              </div>

              {interactive && isPresenterMode && (
                <button
                  type="button"
                  onClick={handleStartFinale}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs uppercase tracking-wider shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <span>AVVIA SCONTRO FINALE</span>
                  <span className="text-xs">➔</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DECK DI CONTROLLO REGIA RELATORE (Visibile ESCLUSIVAMENTE sul monitor PC)  */}
      {/* ========================================================================= */}
      {interactive && isPresenterMode && (
        <footer className="relative z-20 w-full max-w-[1780px] shrink-0 mt-2 p-3 px-6 rounded-2xl bg-slate-950/90 border border-white/20 shadow-2xl backdrop-blur-md flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Play / Pausa Audio (se presente audio) */}
            <button
              type="button"
              onClick={togglePlay}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all tracking-wider flex items-center gap-2 shadow-md ${
                isPlaying
                  ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-amber-500/30'
                  : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-600/30'
              }`}
              title="Avvia o metti in pausa l'audio"
            >
              <span>{isPlaying ? '⏸ PAUSA' : '▶ AVVIA'}</span>
              <span className="text-[10px] font-mono opacity-80">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </button>

            {/* Switch Scheda 1 / Scheda 2 */}
            <div className="flex items-center gap-1 bg-white/10 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => selectSlide(0)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeSlide === 0
                    ? 'bg-red-600 text-white shadow'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                1. Regole Scontro
              </button>
              <button
                type="button"
                onClick={() => selectSlide(1)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeSlide === 1
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                2. I 4 Bonus & Jolly
              </button>
            </div>
          </div>

          {/* Indicatori Step Sincronizzati */}
          <div className="flex items-center gap-1.5">
            {activeSlide === 0 ? (
              <>
                <button
                  type="button"
                  onClick={() => setManualStep(1)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    manualStep >= 1 ? 'bg-amber-500/20 text-amber-300 border border-amber-400/50' : 'bg-white/5 text-slate-400'
                  }`}
                >
                  1. Mano & Dado
                </button>
                <button
                  type="button"
                  onClick={() => setManualStep(2)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    manualStep >= 2 ? 'bg-red-500/20 text-red-300 border border-red-400/50' : 'bg-white/5 text-slate-400'
                  }`}
                >
                  2. Eliminazione
                </button>
                <button
                  type="button"
                  onClick={() => setManualStep(3)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    manualStep >= 3 ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50' : 'bg-white/5 text-slate-400'
                  }`}
                >
                  3. Consultazione
                </button>
                <button
                  type="button"
                  onClick={() => setManualStep(4)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    manualStep >= 4 ? 'bg-purple-500/20 text-purple-300 border border-purple-400/50' : 'bg-white/5 text-slate-400'
                  }`}
                >
                  4. Capitano
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setManualStep(6)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    manualStep >= 6 ? 'bg-amber-500/20 text-amber-300 border border-amber-400/50' : 'bg-white/5 text-slate-400'
                  }`}
                >
                  🎲 Dado
                </button>
                <button
                  type="button"
                  onClick={() => setManualStep(7)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    manualStep >= 7 ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50' : 'bg-white/5 text-slate-400'
                  }`}
                >
                  🔄 Switch
                </button>
                <button
                  type="button"
                  onClick={() => setManualStep(8)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    manualStep >= 8 ? 'bg-rose-500/20 text-rose-300 border border-rose-400/50' : 'bg-white/5 text-slate-400'
                  }`}
                >
                  🏹 Arco
                </button>
                <button
                  type="button"
                  onClick={() => setManualStep(9)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    manualStep >= 9 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/50' : 'bg-white/5 text-slate-400'
                  }`}
                >
                  🛡️ Scudo
                </button>
              </>
            )}
          </div>

          {/* Azioni Regia rapide */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={prevStep}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all"
              title="Passo precedente (Freccia Sinistra)"
            >
              ← Indietro
            </button>
            <button
              type="button"
              onClick={nextStep}
              className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md transition-all"
              title="Passo successivo (Freccia Destra)"
            >
              Avanza →
            </button>
            <button
              type="button"
              onClick={revealEverything}
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-all"
              title="Svela tutto (Tasto S o Spazio)"
            >
              Svela Tutto
            </button>
            <button
              type="button"
              onClick={resetAllState}
              className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white text-xs font-mono"
              title="Resetta spiegazione (Tasto R)"
            >
              R
            </button>
            <button
              type="button"
              onClick={returnToMap}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/20 text-white text-xs font-bold transition-all flex items-center gap-1.5"
              title="Torna alla Mappa (Tasto M o ESC)"
            >
              <span>🗺️ Mappa</span>
              <span className="text-[10px] px-1 py-0.2 rounded bg-white/10 font-mono text-amber-300">
                M
              </span>
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}
