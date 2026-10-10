import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useGameData } from './context/GameDataContext';
import { assetUrl } from './lib/assetUrl';
import { useSyncedState } from './hooks/useSyncedState';

interface SpiegazioneBox1Data {
  src?: string;
  videoUrl?: string;
  sfondo?: string;
  sfondoSpiegazione?: string;
  titolo?: string;
  sottotitolo?: string;
  slideId?: string;
  audioUrl?: string;
  audioSpiegazione?: string;
}

interface SpiegazioneBox1BoardProps {
  interactive?: boolean;
  revealAll?: boolean;
  isPresenter?: boolean;
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
   * Rintocco cristallino per attivazione indizi e card
   */
  playArrowTin() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = Math.max(ctx.currentTime, 0.05);

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.001, now);
    masterGain.gain.linearRampToValueAtTime(0.42, now + 0.004);
    masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    masterGain.connect(ctx.destination);

    const harmonics = [1046.5, 1567.98, 2093.0, 2637.02];
    const weights = [0.55, 0.35, 0.25, 0.12];

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
   * Suono olografico per attivazione pillole di intestazione
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
   * Chime scintillante per il punteggio di +3.000 PUNTI
   */
  playRewardChime() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = Math.max(ctx.currentTime, 0.05);

    const notes = [1318.51, 1648.14, 1975.53, 2637.02]; // E6, G#6, B6, E7
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.06);

      gain.gain.setValueAtTime(0.001, now + i * 0.06);
      gain.gain.linearRampToValueAtTime(0.28, now + i * 0.06 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.06 + 0.42);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.45);
    });
  }

  /**
   * Suono mirino radar / lock-on per One Shot
   */
  playRadarLock() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = Math.max(ctx.currentTime, 0.05);

    [0, 0.12].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1760, now + offset);
      osc.frequency.exponentialRampToValueAtTime(2637, now + offset + 0.08);

      gain.gain.setValueAtTime(0.001, now + offset);
      gain.gain.linearRampToValueAtTime(0.32, now + offset + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.1);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.12);
    });
  }

  /**
   * Suono energico buzzer pronto / carica per "Mano sul pulsante"
   */
  playBuzzerReady() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = Math.max(ctx.currentTime, 0.05);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.28);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(3200, now + 0.28);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.5);
  }

  /**
   * Fanfara trionfale di chiusura slide
   */
  playTrophyVictory() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = Math.max(ctx.currentTime, 0.05);

    const chord = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    chord.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);

      gain.gain.setValueAtTime(0.001, now + idx * 0.05);
      gain.gain.linearRampToValueAtTime(0.24, now + idx * 0.05 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.05 + 0.8);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.85);
    });
  }
}

const soundFX = new SoundFXEngine();

// Cue temporali deterministici per sincronizzazione con la traccia audio (23.3s totali)
const SFX_CUES = [
  { id: 'b1_pill_obiettivo', time: 2.6, play: () => soundFX.playBoxActivation() },
  { id: 'b1_card_obiettivo', time: 4.2, play: () => soundFX.playArrowTin() },
  { id: 'b1_pill_punteggio', time: 7.5, play: () => soundFX.playBoxActivation() },
  { id: 'b1_card_punteggio', time: 8.8, play: () => soundFX.playRewardChime() },
  { id: 'b1_pill_prenotazione', time: 11.2, play: () => soundFX.playBoxActivation() },
  { id: 'b1_card_prenotazione', time: 13.5, play: () => soundFX.playRadarLock() },
  { id: 'b1_call_pulsante', time: 18.5, play: () => soundFX.playBuzzerReady() },
  { id: 'b1_finish_victory', time: 22.8, play: () => soundFX.playTrophyVictory() },
];

export default function SpiegazioneBox1Board({
  interactive = true,
  revealAll = false,
  isPresenter,
}: SpiegazioneBox1BoardProps) {
  const data = useGameData<SpiegazioneBox1Data>();
  const slideId = data?.slideId || 'box1_spiegazione';
  const rawSfondo = data?.sfondo || data?.sfondoSpiegazione;
  const customSfondo = rawSfondo && !/\.(m4a|mp3|wav|ogg|aac)($|\?)/i.test(rawSfondo)
    ? rawSfondo
    : '/Mappa/spiegazione_box1_ambientazione.jpg';

  // File audio estratto dalla registrazione schermo (spiegazione_box1_audio.m4a)
  const audioSrc = useMemo(() => {
    const rawUrl = data?.audioUrl || data?.audioSpiegazione || '/Audio/spiegazione_box1_audio.m4a';
    return assetUrl(rawUrl);
  }, [data?.audioUrl, data?.audioSpiegazione]);

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

  // Sincronizzazione degli stati tra finestre tramite IPC / localStorage
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
  const [seekTrigger, setSeekTrigger] = useSyncedState<{ time: number; timestamp: number } | null>(
    `playstate_${slideId}_seek`,
    null
  );
  // Transizione cinematica sincronizzata verso la Domanda 1
  const [isTransitioningToQ1, setIsTransitioningToQ1] = useSyncedState<boolean>(
    'playstate_box1_transition',
    false
  );

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(23.31);
  const [isMuted, setIsMuted] = useState(isMultiWindowRelatore);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playedSoundsRef = useRef<Set<string>>(new Set());
  const isSeekingRef = useRef<boolean>(false);

  // Pulizia e stop audio all'unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    };
  }, []);

  // Sincronizza audio play/pause
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

  // Ricezione del comando di seek sincronizzato da qualsiasi finestra
  useEffect(() => {
    if (!seekTrigger || isNaN(seekTrigger.time)) return;
    const target = Math.max(0, seekTrigger.time);
    isSeekingRef.current = true;
    setCurrentTime(target);
    if (audioRef.current && !isNaN(target)) {
      try {
        audioRef.current.currentTime = target;
      } catch {}
    }

    if (target <= 0.5) {
      playedSoundsRef.current.clear();
    } else {
      const newPlayed = new Set<string>();
      SFX_CUES.forEach((cue) => {
        if (target >= cue.time && playedSoundsRef.current.has(cue.id)) {
          newPlayed.add(cue.id);
        }
      });
      playedSoundsRef.current = newPlayed;
    }

    const timer = setTimeout(() => {
      isSeekingRef.current = false;
    }, 150);
    return () => clearTimeout(timer);
  }, [seekTrigger]);

  // Aggiornamento tempo audio
  const handleTimeUpdate = () => {
    if (isSeekingRef.current) return;
    if (audioRef.current) {
      const t = audioRef.current.currentTime;
      if (!isNaN(t)) {
        setCurrentTime(t);
      }
      if (audioRef.current.duration && !isNaN(audioRef.current.duration) && audioRef.current.duration > 0) {
        setDuration(audioRef.current.duration);
      }
      if (t >= 23.1) {
        setIsPlaying(false);
        setIsAllRevealed(true);
      }
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setIsAllRevealed(true);
  };



  const showObiettivoPill = isAllRevealed || (isPlaying && currentTime >= 2.6) || manualStep >= 1;
  const showObiettivoCard = isAllRevealed || (isPlaying && currentTime >= 4.2) || manualStep >= 1;

  const showPunteggioPill = isAllRevealed || (isPlaying && currentTime >= 7.5) || manualStep >= 2;
  const showPunteggioCard = isAllRevealed || (isPlaying && currentTime >= 8.8) || manualStep >= 2;

  const showPrenotazionePill = isAllRevealed || (isPlaying && currentTime >= 11.2) || manualStep >= 3;
  const showPrenotazioneCard = isAllRevealed || (isPlaying && currentTime >= 13.5) || manualStep >= 3;

  const showPulsanteCallout = isAllRevealed || (isPlaying && currentTime >= 18.5) || manualStep >= 4;

  // Riproduzione procedurale sincronizzata degli effetti sonori durante la voce narrante
  const canPlaySFX = !isMuted && interactive;

  useEffect(() => {
    if (!canPlaySFX || !isPlaying || isAllRevealed) return;

    SFX_CUES.forEach((cue) => {
      if (currentTime >= cue.time && !playedSoundsRef.current.has(cue.id)) {
        playedSoundsRef.current.add(cue.id);
        cue.play();
      }
    });
  }, [currentTime, isPlaying, isAllRevealed, canPlaySFX]);

  // Esegui seek sincronizzato su tutte le finestre
  const seekTo = useCallback(
    (timeInSeconds: number) => {
      soundFX.resume();
      setSeekTrigger({ time: timeInSeconds, timestamp: Date.now() });
    },
    [setSeekTrigger]
  );

  // Toggle Play / Pausa
  const togglePlay = useCallback(() => {
    if (!interactive) return;
    soundFX.resume();
    if (currentTime >= 22.8 || isAllRevealed) {
      playedSoundsRef.current.clear();
      seekTo(0);
      setIsAllRevealed(false);
      setManualStep(0);
      setIsPlaying(true);
      return;
    }
    setIsPlaying((prev) => !prev);
  }, [interactive, currentTime, isAllRevealed, seekTo, setIsAllRevealed, setManualStep, setIsPlaying]);

  // Riavvia dall'inizio
  const restartPlayback = useCallback(() => {
    if (!interactive) return;
    soundFX.resume();
    playedSoundsRef.current.clear();
    seekTo(0);
    setIsAllRevealed(false);
    setManualStep(0);
    setIsPlaying(true);
  }, [interactive, setIsPlaying, setIsAllRevealed, setManualStep, seekTo]);

  // Reset completo
  const resetAllState = useCallback(() => {
    if (!interactive) return;
    soundFX.resume();
    playedSoundsRef.current.clear();
    if (audioRef.current) {
      audioRef.current.pause();
      try {
        audioRef.current.currentTime = 0;
      } catch {}
    }
    setCurrentTime(0);
    setIsPlaying(false);
    setIsAllRevealed(false);
    setManualStep(0);
    setSeekTrigger({ time: 0, timestamp: Date.now() });
  }, [interactive, setIsPlaying, setIsAllRevealed, setManualStep, setSeekTrigger]);

  // Svela tutto immediatamente
  const revealEverything = useCallback(() => {
    if (!interactive) return;
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
    setIsAllRevealed(true);
    setManualStep(4);
    if (canPlaySFX) {
      soundFX.playTrophyVictory();
    }
  }, [interactive, setIsAllRevealed, setManualStep, setIsPlaying, canPlaySFX]);

  // Avanzamento animato alla Domanda 1
  const handleAdvanceToQ1 = useCallback(() => {
    if (!interactive) return;
    soundFX.resume();
    soundFX.playBuzzerReady();
    setIsTransitioningToQ1(true);
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('imperio-advance-to-q1'));
    }, 450);
  }, [interactive, setIsTransitioningToQ1]);

  // Step avanti / indietro manuali
  const nextStep = useCallback(() => {
    if (!interactive) return;
    soundFX.resume();
    if (manualStep < 4) {
      const n = manualStep + 1;
      setManualStep(n);
      if (n === 1) seekTo(2.6);
      else if (n === 2) seekTo(7.5);
      else if (n === 3) seekTo(11.2);
      else if (n === 4) {
        seekTo(18.5);
        revealEverything();
      }
    } else {
      handleAdvanceToQ1();
    }
  }, [interactive, manualStep, setManualStep, seekTo, revealEverything, handleAdvanceToQ1]);

  const prevStep = useCallback(() => {
    if (!interactive) return;
    soundFX.resume();
    if (isAllRevealed) {
      setIsAllRevealed(false);
      setManualStep(3);
      seekTo(11.2);
      return;
    }
    if (manualStep > 0) {
      const p = manualStep - 1;
      setManualStep(p);
      if (p === 0) seekTo(0);
      else if (p === 1) seekTo(2.6);
      else if (p === 2) seekTo(7.5);
      else if (p === 3) seekTo(11.2);
    }
  }, [interactive, isAllRevealed, manualStep, setIsAllRevealed, setManualStep, seekTo]);

  // Scorciatoie da tastiera
  useEffect(() => {
    if (!interactive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (e.code === 'Space' || e.key.toLowerCase() === 'p') {
        e.preventDefault();
        togglePlay();
      } else if (e.key.toLowerCase() === 's' || e.key === 'Enter') {
        e.preventDefault();
        revealEverything();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        nextStep();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevStep();
      } else if (e.key.toLowerCase() === 'r') {
        e.preventDefault();
        resetAllState();
      } else if (e.key.toLowerCase() === 'm') {
        e.preventDefault();
        setIsMuted((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [interactive, togglePlay, revealEverything, nextStep, prevStep, resetAllState]);

  const progressPercent = Math.min(100, Math.max(0, (currentTime / duration) * 100));

  const formatTime = (secs: number) => {
    const s = Math.floor(secs);
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className="relative w-[1920px] h-[1080px] overflow-hidden select-none bg-[#060913] text-white flex flex-col items-center justify-between font-sans px-12 py-8"
    >
      {/* Audio Element nativo */}
      <audio
        ref={audioRef}
        src={audioSrc}
        preload="auto"
        muted={isMuted}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleAudioEnded}
      />

      {/* ========================================================================= */}
      {/* SFONDO E LIVELLO OLOGRAFICO HI-TECH                                        */}
      {/* ========================================================================= */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Sfondo personalizzato se configurato, altrimenti gradiente cosmico profondo */}
        {customSfondo ? (
          <>
            <img
              src={assetUrl(customSfondo)}
              alt="Sfondo Spiegazione Box 1"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#060913]/55 via-[#060913]/35 to-[#060913]/60" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#060913] via-[#080e22] to-[#050814]" />
        )}

        {/* Luci volumetriche ambientali (Cyan, Amber, Violet) */}
        <div className="absolute -top-32 left-[15%] w-[600px] h-[600px] bg-cyan-500/12 rounded-full blur-[150px]" />
        <div className="absolute -top-24 right-[15%] w-[600px] h-[600px] bg-amber-500/12 rounded-full blur-[150px]" />
        <div className="absolute -bottom-36 left-1/2 -translate-x-1/2 w-[800px] h-[450px] bg-blue-600/10 rounded-full blur-[160px]" />

        {/* Griglia Blueprint tecnologica */}
        <div
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(56, 189, 248, 0.08) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(56, 189, 248, 0.08) 1px, transparent 1px)
            `,
            backgroundSize: '44px 44px',
          }}
        />

        {/* Cornice olografica centrale con angolari futuristici */}
        <svg className="absolute inset-0 w-full h-full text-cyan-400/20" fill="none">
          <path d="M 50 110 L 50 50 L 110 50" stroke="currentColor" strokeWidth="2" />
          <circle cx="50" cy="50" r="3.5" fill="currentColor" />
          <path d="M 1870 110 L 1870 50 L 1810 50" stroke="currentColor" strokeWidth="2" />
          <circle cx="1870" cy="50" r="3.5" fill="currentColor" />
          <path d="M 50 970 L 50 1030 L 110 1030" stroke="currentColor" strokeWidth="2" />
          <circle cx="50" cy="1030" r="3.5" fill="currentColor" />
          <path d="M 1870 970 L 1870 1030 L 1810 1030" stroke="currentColor" strokeWidth="2" />
          <circle cx="1870" cy="1030" r="3.5" fill="currentColor" />

          {/* Dettagli tecnici decorativi */}
          <line x1="140" y1="50" x2="300" y2="50" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" />
          <line x1="1620" y1="50" x2="1780" y2="50" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" />
        </svg>


      </div>

      {/* ========================================================================= */}
      {/* CONTENUTO PRINCIPALE                                                      */}
      {/* ========================================================================= */}
      <div className="relative z-10 w-full h-full flex flex-col items-center justify-between">
        {/* HEADER: BADGE E TITOLO DEL GIOCO */}
        <header className="relative w-full flex flex-col items-center shrink-0 pt-1">
          <div className="flex items-center gap-3 px-5 py-1.5 rounded-full bg-slate-900/80 border border-amber-400/30 backdrop-blur-md shadow-[0_0_25px_rgba(245,158,11,0.25)] mb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
            <span className="text-xs font-mono font-black uppercase tracking-[0.25em] text-amber-300">
              IMPERIO VIII • GIOCO 1
            </span>
            <span className="text-white/30 text-xs">|</span>
            <span className="text-xs font-mono font-bold tracking-wider text-cyan-300">
              MODULO 10 DOMANDE (5 CANZONI + 5 IMMAGINI)
            </span>
          </div>

          <h1 className="text-5xl lg:text-6xl font-black tracking-tight uppercase text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 drop-shadow-[0_4px_24px_rgba(245,158,11,0.6)] text-center font-serif">
            IL MIO NOME È NESSUNO
          </h1>
          <p className="text-xs lg:text-sm font-semibold tracking-[0.3em] uppercase text-slate-300/80 mt-1">
            Regolamento & Meccaniche di Sfida tra le Squadre
          </p>
        </header>

        {/* ========================================================================= */}
        {/* AREA CENTRALE: LE 3 REGOLE CARDINALI (OBIETTIVO, PUNTEGGIO, PRENOTAZIONE) */}
        {/* Allineate e centrate a coppie riga per riga (Sx 5 col vs Dx 7 col)        */}
        {/* ========================================================================= */}
        <main className="w-full flex-1 flex flex-col justify-center gap-5 max-w-[1780px] my-auto py-2">
          {/* RIGA 1: OBIETTIVO */}
          <div className="w-full grid grid-cols-12 gap-8 items-center">
            {/* 1. PILL OBIETTIVO (SX - 5 COLONNE) */}
            <div className="col-span-5 pl-4">
              <div
                className={`transition-all duration-700 transform ${
                  showObiettivoPill
                    ? 'opacity-100 translate-x-0 scale-100'
                    : 'opacity-0 -translate-x-12 scale-95'
                }`}
              >
                <div className="relative group p-1 rounded-3xl bg-gradient-to-r from-cyan-500/40 via-sky-500/20 to-transparent">
                  <div className="px-8 py-5 rounded-[22px] bg-slate-950/85 border border-cyan-400/50 shadow-[0_0_30px_rgba(6,182,212,0.3)] backdrop-blur-md flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-2xl shadow-inner">
                        🎯
                      </div>
                      <div>
                        <span className="text-[10px] font-mono font-bold tracking-widest text-cyan-400/80 uppercase">
                          Regola 01
                        </span>
                        <h2 className="text-2xl lg:text-3xl font-black uppercase tracking-wider text-white">
                          OBIETTIVO
                        </h2>
                      </div>
                    </div>
                    <span className="text-cyan-400 font-mono text-xs px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/30">
                      SCOPRI IL MISTERO
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 1: OBIETTIVO DETTAGLIATO (DX - 7 COLONNE) */}
            <div className="col-span-7 pr-4">
              <div
                className={`transition-all duration-700 transform ${
                  showObiettivoCard
                    ? 'opacity-100 translate-y-0 scale-100'
                    : 'opacity-0 translate-y-8 scale-95'
                }`}
              >
                <div className="p-6 rounded-3xl bg-slate-900/80 border border-cyan-400/35 shadow-2xl backdrop-blur-md flex items-center gap-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-44 h-44 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

                  {/* Icona fumetto hi-tech stilizzata */}
                  <div className="shrink-0 flex flex-col items-center justify-center">
                    <div className="relative w-20 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-green-400 p-0.5 shadow-[0_0_25px_rgba(34,197,94,0.5)] flex items-center justify-center">
                      <div className="w-full h-full rounded-[14px] bg-slate-950/80 flex items-center justify-center gap-1.5">
                        <div className="w-2.5 h-1.5 rounded bg-emerald-400 animate-pulse" />
                        <div className="w-4 h-1.5 rounded bg-emerald-400 animate-pulse delay-75" />
                        <div className="w-2.5 h-1.5 rounded bg-emerald-400 animate-pulse delay-150" />
                      </div>
                      {/* Becco del fumetto */}
                      <div className="absolute -bottom-1.5 left-4 w-3 h-3 bg-emerald-400 rotate-45" />
                    </div>
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-md bg-cyan-500/20 border border-cyan-400/40 text-[10px] font-black uppercase text-cyan-300">
                        🎵 5 Strumenti Audio
                      </span>
                      <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-400/40 text-[10px] font-black uppercase text-emerald-300">
                        🖼️ Griglia a Tasselli
                      </span>
                      <span className="px-2.5 py-0.5 rounded-md bg-purple-500/20 border border-purple-400/40 text-[10px] font-black uppercase text-purple-300">
                        👤 Personaggio Misterioso
                      </span>
                    </div>
                    <p className="text-base lg:text-lg font-medium text-slate-200 leading-snug">
                      L'obiettivo è indovinare il <strong className="text-cyan-300 font-bold">nome</strong>,{' '}
                      <strong className="text-emerald-300 font-bold">titolo della canzone</strong> o{' '}
                      <strong className="text-amber-300 font-bold">immagine</strong> che gli indizi progressivi celano.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGA 2: PUNTEGGIO */}
          <div className="w-full grid grid-cols-12 gap-8 items-center">
            {/* 2. PILL PUNTEGGIO (SX - 5 COLONNE) */}
            <div className="col-span-5 pl-4">
              <div
                className={`transition-all duration-700 transform delay-100 ${
                  showPunteggioPill
                    ? 'opacity-100 translate-x-0 scale-100'
                    : 'opacity-0 -translate-x-12 scale-95'
                }`}
              >
                <div className="relative group p-1 rounded-3xl bg-gradient-to-r from-amber-500/40 via-yellow-500/20 to-transparent">
                  <div className="px-8 py-5 rounded-[22px] bg-slate-950/85 border border-amber-400/50 shadow-[0_0_30px_rgba(245,158,11,0.3)] backdrop-blur-md flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-2xl shadow-inner">
                        💰
                      </div>
                      <div>
                        <span className="text-[10px] font-mono font-bold tracking-widest text-amber-400/80 uppercase">
                          Regola 02
                        </span>
                        <h2 className="text-2xl lg:text-3xl font-black uppercase tracking-wider text-white">
                          PUNTEGGIO
                        </h2>
                      </div>
                    </div>
                    <span className="text-amber-400 font-mono text-xs px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-400/30">
                      PREMIO DI ROUND
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 2: PUNTEGGIO (+3.000) (DX - 7 COLONNE) */}
            <div className="col-span-7 pr-4">
              <div
                className={`transition-all duration-700 transform ${
                  showPunteggioCard
                    ? 'opacity-100 translate-y-0 scale-100'
                    : 'opacity-0 translate-y-8 scale-95'
                }`}
              >
                <div className="p-6 rounded-3xl bg-slate-900/80 border border-amber-400/35 shadow-2xl backdrop-blur-md flex items-center justify-between gap-6 relative overflow-hidden">
                  <div className="absolute -bottom-10 right-10 w-44 h-44 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

                  <div className="flex items-center gap-5">
                    {/* Bollino medaglione dorato con checkmark verde */}
                    <div className="relative shrink-0 w-16 h-16 rounded-full bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-200 p-1 shadow-[0_0_30px_rgba(245,158,11,0.6)] flex items-center justify-center">
                      <div className="w-full h-full rounded-full bg-slate-950/80 flex items-center justify-center">
                        <span className="text-2xl font-black text-emerald-400">✓</span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[11px] font-mono font-bold tracking-widest text-amber-400/90 uppercase block">
                        Ricompensa Esatta
                      </span>
                      <p className="text-sm lg:text-base font-semibold text-slate-300">
                        Premio assegnato alla squadra che indovina per prima
                      </p>
                    </div>
                  </div>

                  {/* Badge enorme del punteggio 3.000 */}
                  <div className="shrink-0 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/30 to-amber-500/20 border-2 border-amber-400/70 shadow-[0_0_35px_rgba(245,158,11,0.5)] flex items-center gap-2.5">
                    <span className="text-3xl lg:text-4xl font-black tracking-wider text-amber-300 font-mono drop-shadow">
                      +3.000
                    </span>
                    <span className="text-xs font-black uppercase tracking-widest text-amber-200/80">
                      Punti
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGA 3: PRENOTAZIONE */}
          <div className="w-full grid grid-cols-12 gap-8 items-center">
            {/* 3. PILL PRENOTAZIONE (SX - 5 COLONNE) */}
            <div className="col-span-5 pl-4">
              <div
                className={`transition-all duration-700 transform delay-200 ${
                  showPrenotazionePill
                    ? 'opacity-100 translate-x-0 scale-100'
                    : 'opacity-0 -translate-x-12 scale-95'
                }`}
              >
                <div className="relative group p-1 rounded-3xl bg-gradient-to-r from-rose-500/40 via-purple-500/20 to-transparent">
                  <div className="px-8 py-5 rounded-[22px] bg-slate-950/85 border border-rose-400/50 shadow-[0_0_30px_rgba(244,63,94,0.3)] backdrop-blur-md flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-400/50 flex items-center justify-center text-2xl shadow-inner">
                        🚨
                      </div>
                      <div>
                        <span className="text-[10px] font-mono font-bold tracking-widest text-rose-400/80 uppercase">
                          Regola 03
                        </span>
                        <h2 className="text-2xl lg:text-3xl font-black uppercase tracking-wider text-white">
                          PRENOTAZIONE
                        </h2>
                      </div>
                    </div>
                    <span className="text-rose-400 font-mono text-xs px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-400/30 font-bold">
                      ONE SHOT
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 3: PRENOTAZIONE (ONE SHOT & RADAR TARGET) (DX - 7 COLONNE) */}
            <div className="col-span-7 pr-4">
              <div
                className={`transition-all duration-700 transform ${
                  showPrenotazioneCard
                    ? 'opacity-100 translate-y-0 scale-100'
                    : 'opacity-0 translate-y-8 scale-95'
                }`}
              >
                <div className="p-6 rounded-3xl bg-slate-900/80 border border-rose-400/35 shadow-2xl backdrop-blur-md flex items-center gap-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-44 h-44 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />

                  {/* Mirino radar crosshairs stilizzato in SVG */}
                  <div className="shrink-0 relative w-16 h-16 rounded-2xl bg-rose-950/60 border border-yellow-400/60 p-2 shadow-[0_0_25px_rgba(234,179,8,0.4)] flex items-center justify-center">
                    <svg viewBox="0 0 100 100" className="w-full h-full text-yellow-400">
                      <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.4" />
                      <circle cx="50" cy="50" r="26" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.8" />
                      <circle cx="50" cy="50" r="12" stroke="currentColor" strokeWidth="4" fill="none" />
                      <line x1="50" y1="2" x2="50" y2="98" stroke="currentColor" strokeWidth="4" />
                      <line x1="2" y1="50" x2="98" y2="50" stroke="currentColor" strokeWidth="4" />
                    </svg>
                    {/* Punto rosso pulsante al centro */}
                    <div className="absolute w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  </div>

                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-rose-500/25 border border-rose-400/50 text-[10px] font-black uppercase text-rose-300 tracking-wider">
                        ⚠️ 1 Tentativo per Squadra
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-yellow-500/25 border border-yellow-400/50 text-[10px] font-black uppercase text-yellow-300 tracking-wider">
                        Round Locked
                      </span>
                    </div>
                    <p className="text-base lg:text-lg font-medium text-slate-200 leading-snug">
                      La prenotazione sarà <strong className="text-yellow-300 font-black">ONE SHOT</strong>:{' '}
                      se una squadra <strong className="text-rose-400 font-bold">sbaglia il nome</strong>,{' '}
                      <span className="underline decoration-rose-500 decoration-2 underline-offset-4 text-white">
                        non potrà più riprenotarsi
                      </span>{' '}
                      per tutto quel round!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* ========================================================================= */}
        {/* BANNER INFERIORE: "MANO SUL PULSANTE - PRIMA DOMANDA!"                     */}
        {/* Cliccabile nel monitor Relatore per avviare la transizione alla Domanda 1 */}
        {/* ========================================================================= */}
        <div className="w-full max-w-[1680px] shrink-0 mt-1 mb-2">
          <div
            className={`transition-all duration-700 transform ${
              showPulsanteCallout
                ? 'opacity-100 translate-y-0 scale-100'
                : 'opacity-0 translate-y-6 scale-95 pointer-events-none'
            }`}
          >
            <div
              onClick={isPresenterMode ? handleAdvanceToQ1 : undefined}
              className={`relative p-1 rounded-2xl bg-gradient-to-r from-cyan-500/50 via-amber-500/60 to-cyan-500/50 shadow-[0_0_40px_rgba(245,158,11,0.45)] transition-all duration-300 ${
                isPresenterMode ? 'cursor-pointer hover:scale-[1.01] active:scale-[0.99] group' : ''
              }`}
              title={isPresenterMode ? 'Clicca per avviare la Domanda 1' : undefined}
            >
              <div className="px-8 py-3.5 rounded-[14px] bg-slate-950/90 border border-white/20 backdrop-blur-md flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl animate-bounce">⚡</span>
                  <span className="text-xl lg:text-2xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 drop-shadow">
                    MANO SUL PULSANTE... PRIMA DOMANDA AL VIA!
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold tracking-wider text-slate-400 group-hover:text-amber-300 uppercase transition-colors">
                    {isPresenterMode ? 'Clicca per iniziare la Domanda 1' : 'Avanti per iniziare'}
                  </span>
                  <span className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-400/60 text-amber-300 flex items-center justify-center font-bold text-sm animate-pulse group-hover:bg-amber-500 group-hover:text-black transition-all">
                    →
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* PANNELLO DI CONTROLLO PRESENTER & TIMELINE SCRUBBER                      */}
        {/* Visibile sempre e solo nel monitor Relatore                              */}
        {/* ========================================================================= */}
        {isPresenterMode && interactive && (
          <footer className="w-full max-w-[1680px] shrink-0 transition-opacity duration-300 opacity-100 z-40">
            <div className="p-3 rounded-2xl bg-slate-950/90 border border-white/10 shadow-2xl backdrop-blur-md flex items-center justify-between gap-6">
              {/* Pulsanti di Controllo Principali */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Play / Pausa */}
                <button
                  type="button"
                  onClick={togglePlay}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs tracking-wider uppercase shadow-lg transition-transform hover:scale-105 active:scale-95 flex items-center gap-2 cursor-pointer"
                  title="Riproduci / Metti in pausa (Barra Spazio o P)"
                >
                  <span>{isPlaying ? '⏸️ Pausa' : '▶️ Avvia Spiegazione'}</span>
                </button>

                {/* Riavvia dall'inizio */}
                <button
                  type="button"
                  onClick={restartPlayback}
                  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs tracking-wider uppercase transition-colors cursor-pointer"
                  title="Ricomincia dall'inizio"
                >
                  🔄 Riavvia
                </button>

                {/* Svela tutto */}
                <button
                  type="button"
                  onClick={revealEverything}
                  className="px-3.5 py-2 rounded-xl bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-400/40 text-cyan-300 font-bold text-xs tracking-wider uppercase transition-colors cursor-pointer"
                  title="Svela tutto subito (Tasto S o Invio)"
                >
                  👁️ Svela Tutto
                </button>

                {/* Reset */}
                <button
                  type="button"
                  onClick={resetAllState}
                  className="px-3 py-2 rounded-xl bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-300 font-bold text-xs tracking-wider uppercase transition-colors cursor-pointer"
                  title="Reset stato completo (Tasto R)"
                >
                  Reset
                </button>
              </div>

              {/* Timeline Progress Bar Interattiva */}
              <div className="flex-1 flex items-center gap-3">
                <span className="text-[11px] font-mono text-slate-400 shrink-0">
                  {formatTime(currentTime)}
                </span>
                <div
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const clickX = e.clientX - rect.left;
                    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
                    seekTo(ratio * duration);
                  }}
                  className="relative flex-1 h-2 rounded-full bg-slate-800/80 cursor-pointer overflow-hidden border border-white/10 group"
                  title="Clicca per spostarti sulla timeline"
                >
                  <div
                    className="h-full bg-gradient-to-r from-cyan-400 via-amber-400 to-yellow-400 transition-all duration-100 relative"
                    style={{ width: `${progressPercent}%` }}
                  >
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white shadow-md" />
                  </div>
                </div>
                <span className="text-[11px] font-mono text-slate-400 shrink-0">
                  {formatTime(duration)}
                </span>
              </div>

              {/* Salti Rapidi alle Regole & Mute */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setManualStep(1);
                    seekTo(2.6);
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                    manualStep === 1 || (currentTime >= 2.6 && currentTime < 7.5)
                      ? 'bg-cyan-500 text-slate-950 font-black'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300'
                  }`}
                >
                  1. Obiettivo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setManualStep(2);
                    seekTo(7.5);
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                    manualStep === 2 || (currentTime >= 7.5 && currentTime < 11.2)
                      ? 'bg-amber-500 text-slate-950 font-black'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300'
                  }`}
                >
                  2. Punteggio
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setManualStep(3);
                    seekTo(11.2);
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                    manualStep === 3 || (currentTime >= 11.2 && currentTime < 18.5)
                      ? 'bg-rose-500 text-white font-black'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300'
                  }`}
                >
                  3. Prenotazione
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setManualStep(4);
                    seekTo(18.5);
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                    manualStep === 4 || currentTime >= 18.5
                      ? 'bg-emerald-500 text-slate-950 font-black'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300'
                  }`}
                >
                  4. Via!
                </button>

                {/* Toggle Audio Mute */}
                <button
                  type="button"
                  onClick={() => setIsMuted((prev) => !prev)}
                  className={`ml-2 p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                    isMuted ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white'
                  }`}
                  title={isMuted ? 'Audio Disattivato (M per attivare)' : 'Audio Attivo (M per silenziare)'}
                >
                  {isMuted ? '🔇' : '🔊'}
                </button>
              </div>
            </div>
          </footer>
        )}
      </div>

      {/* Icona Play centrale quando in pausa all'inizio (visibile SOLO nel monitor Relatore) */}
      {isPresenterMode && !isPlaying && manualStep === 0 && !isAllRevealed && interactive && !isTransitioningToQ1 && (
        <div
          onClick={togglePlay}
          className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] cursor-pointer transition-all duration-300 group"
        >
          <div className="w-28 h-28 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-black flex items-center justify-center pl-2 text-5xl shadow-[0_0_50px_rgba(245,158,11,0.7)] group-hover:scale-110 active:scale-95 transition-transform mb-4">
            ▶
          </div>
          <span className="text-base font-black tracking-widest uppercase text-amber-300 bg-black/70 px-6 py-2 rounded-full border border-amber-400/40 shadow-xl">
            Avvia Spiegazione con Voce Narrante (Spazio)
          </span>
        </div>
      )}

      {/* OVERLAY DI TRANSIZIONE CINEMATICA VERSO LA DOMANDA 1 */}
      {isTransitioningToQ1 && (
        <div className="absolute inset-0 z-50 pointer-events-none flex flex-col items-center justify-center bg-black/75 backdrop-blur-md animate-fade-in transition-all duration-500">
          <div className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden">
            {/* Raggio laser dorato orizzontale */}
            <div className="w-full h-[3px] bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_40px_#f59e0b] animate-pulse" />
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-amber-500/15 to-cyan-500/10" />
            <div className="flex items-center gap-4 px-8 py-4 rounded-3xl bg-slate-950/90 border border-amber-400/60 shadow-[0_0_50px_rgba(245,158,11,0.6)] animate-zoom-in">
              <span className="text-3xl animate-bounce">⚡</span>
              <span className="text-2xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 font-serif">
                PREPARARSI... DOMANDA 1 AL VIA!
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
