import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSyncedState } from './hooks/useSyncedState';
import { useGameData } from './context/GameDataContext';
import { assetUrl } from './lib/assetUrl';

interface SpiegazioneBox2Data {
  src?: string;
  sfondo?: string;
  sfondoSpiegazione?: string;
  audioUrl?: string;
  audioSpiegazione?: string;
  titolo?: string;
  titoloGioco?: string;
  sottotitolo?: string;
  slideId?: string;
  notePresentatore?: string;
}

interface SpiegazioneBox2BoardProps {
  interactive?: boolean;
  revealAll?: boolean;
  isPresenter?: boolean;
  onReturnToMap?: () => void;
}

// Generatore procedurale Web Audio API ad altissima fedeltà per effetti speciali sci-fi / cristalli
class Box2SoundFX {
  private ctx: AudioContext | null = null;

  private init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public resume() {
    this.init();
  }

  // 1. Accensione console olografica (Holo Power Up / Cyan Glow)
  public playHoloPowerUp() {
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(540, now + 0.45);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400, now);
      filter.frequency.exponentialRampToValueAtTime(3200, now + 0.45);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.55);
    } catch {}
  }

  // 2. Chime vittoria / Premio 5.000 punti
  public playJackpot5000() {
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.08);

        gain.gain.setValueAtTime(0.01, now + i * 0.08);
        gain.gain.linearRampToValueAtTime(0.2, now + i * 0.08 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.6);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.65);
      });
    } catch {}
  }

  // 3. Pop fumetto verde / Domanda categoria
  public playCategoryCardPop() {
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(950, now + 0.14);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.22);
    } catch {}
  }

  // 4. Triplo chime per i tre punteggi (Blu 1k, Verde 2k, Giallo 3k)
  public playScoreTier(tier: 1 | 2 | 3) {
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const freqs = { 1: 440, 2: 587.33, 3: 739.99 };

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freqs[tier], now);
      osc.frequency.exponentialRampToValueAtTime(freqs[tier] * 1.25, now + 0.18);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.22, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } catch {}
  }

  // 5. Freccia risposta e avanzamento turno (Whoosh sci-fi dinamico)
  public playAnswerAdvanceWhoosh() {
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const bufferSize = this.ctx.sampleRate * 0.3;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(450, now);
      filter.frequency.exponentialRampToValueAtTime(2400, now + 0.2);
      filter.Q.setValueAtTime(3, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(now);
    } catch {}
  }

  // 6. Fanfara finale / Conclusione spiegazione
  public playReadyTrophy() {
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      [440, 554.37, 659.25, 880].forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);

        gain.gain.setValueAtTime(0.01, now + idx * 0.1);
        gain.gain.linearRampToValueAtTime(0.18, now + idx * 0.1 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.7);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.75);
      });
    } catch {}
  }
}

const soundFX = new Box2SoundFX();

// Cues per gli effetti sonori in base alla traccia vocale (33.04s)
const SFX_CUES = [
  { time: 0.6, key: 'holo', action: () => soundFX.playHoloPowerUp() },
  { time: 3.8, key: 'grandprize', action: () => soundFX.playJackpot5000() },
  { time: 8.8, key: 'catpop', action: () => soundFX.playCategoryCardPop() },
  { time: 16.6, key: 'tier1', action: () => soundFX.playScoreTier(1) },
  { time: 18.2, key: 'tier2', action: () => soundFX.playScoreTier(2) },
  { time: 20.0, key: 'tier3', action: () => soundFX.playScoreTier(3) },
  { time: 24.6, key: 'whoosh', action: () => soundFX.playAnswerAdvanceWhoosh() },
  { time: 32.2, key: 'ready', action: () => soundFX.playReadyTrophy() },
];

export default function SpiegazioneBox2Board({
  interactive = true,
  revealAll = false,
  isPresenter = false,
  onReturnToMap,
}: SpiegazioneBox2BoardProps) {
  const data = useGameData<SpiegazioneBox2Data>();

  // ID univoco slide per isolamento dello stato tra schermate
  const slideId = data?.slideId || 'spiegazione_box2_cristalli';

  // Titoli modificabili dinamicamente da Setup (come per Box 1, 3 e 4)
  const titoloGioco = data?.titoloGioco || data?.titolo || 'CLASSIFICHE';
  const sottotitoloGioco = data?.sottotitolo || 'CLASSIFICA & CLASSIFICA MUSICALE • TOP 10';

  // Sfondo ufficiale per Box 2 (Cristalli e Aurora)
  const customSfondo = data?.sfondoSpiegazione || data?.sfondo || '/Icone/sfondi/sfondo_box2_cristalli.jpg';

  // File audio ufficiale di spiegazione
  const audioSource = data?.audioSpiegazione || data?.audioUrl || '/Audio/Spiegazioni/Spiegazione_box2.mp3';

  // Riconoscimento della modalità multi-finestra Electron/Web
  const isMultiWindowRelatore = useMemo(() => {
    if (typeof window === 'undefined') return false;
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
    revealAll ? 5 : 0
  );
  const [isAllRevealed, setIsAllRevealed] = useSyncedState<boolean>(
    `playstate_${slideId}_revealed`,
    revealAll
  );
  const [seekTrigger, setSeekTrigger] = useSyncedState<{ time: number; timestamp: number } | null>(
    `playstate_${slideId}_seek`,
    null
  );
  // Transizione verso la Domanda 1 (Manche 1)
  const [isTransitioningToQ1, setIsTransitioningToQ1] = useSyncedState<boolean>(
    'playstate_box2_transition',
    false
  );

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(33.04);
  const [isMuted, setIsMuted] = useState(isMultiWindowRelatore);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playedSoundsRef = useRef<Set<string>>(new Set());
  const isSeekingRef = useRef<boolean>(false);

  // Inizializzazione audio
  useEffect(() => {
    if (!audioRef.current) {
      const audio = new Audio(assetUrl(audioSource));
      audio.preload = 'auto';
      audioRef.current = audio;

      audio.onloadedmetadata = () => {
        if (audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
          setDuration(audio.duration);
        }
      };
    }
  }, [audioSource]);

  // Gestione muto per finestra Relatore (evita eco con lo schermo pubblico)
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
    }
  }, [isMuted]);

  // Sincronizzazione stato di play/pause dell'audio
  useEffect(() => {
    if (!interactive) return;
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      soundFX.resume();
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [isPlaying, interactive]);

  // Sincronizzazione riavvolgimento / seek tra finestre
  useEffect(() => {
    if (!seekTrigger || !audioRef.current) return;
    const audio = audioRef.current;
    isSeekingRef.current = true;
    try {
      audio.currentTime = seekTrigger.time;
    } catch {}
    setCurrentTime(seekTrigger.time);
    setTimeout(() => {
      isSeekingRef.current = false;
    }, 120);
  }, [seekTrigger]);

  // Aggiornamento tempo audio
  const handleTimeUpdate = () => {
    if (isSeekingRef.current) return;
    if (audioRef.current) {
      const t = audioRef.current.currentTime;
      if (!isNaN(t)) {
        setCurrentTime(t);
      }
      if (
        audioRef.current.duration &&
        !isNaN(audioRef.current.duration) &&
        audioRef.current.duration > 0
      ) {
        setDuration(audioRef.current.duration);
      }
      if (t >= 32.5) {
        setIsPlaying(false);
        setIsAllRevealed(true);
      }
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setIsAllRevealed(true);
  };

  // Visibilità dinamica sincronizzata delle 3 regole cardinali (OBIETTIVO, PUNTEGGIO, RISPOSTA)
  // Step 1: OBIETTIVO (0.0s - 8.5s)
  const showObiettivoPill = isAllRevealed || currentTime >= 0.5 || manualStep >= 1;
  const showGrandPrizeBadge = isAllRevealed || (isPlaying && currentTime >= 3.6) || manualStep >= 1;
  const showCategoryListCard = isAllRevealed || (isPlaying && currentTime >= 8.2) || manualStep >= 2;

  // Step 2: PUNTEGGIO (16.5s - 24.5s)
  const showPunteggioPill = isAllRevealed || (isPlaying && currentTime >= 16.2) || manualStep >= 3;
  const showScoreBlue = isAllRevealed || (isPlaying && currentTime >= 16.8) || manualStep >= 3;
  const showScoreGreen = isAllRevealed || (isPlaying && currentTime >= 18.2) || manualStep >= 3;
  const showScoreYellow = isAllRevealed || (isPlaying && currentTime >= 20.0) || manualStep >= 3;

  // Step 3: RISPOSTA (24.5s - 32.5s)
  const showRispostaPill = isAllRevealed || (isPlaying && currentTime >= 24.2) || manualStep >= 4;
  const showBracketsAndArrow = isAllRevealed || (isPlaying && currentTime >= 24.6) || manualStep >= 4;

  const showCalloutBanner = isAllRevealed || (isPlaying && currentTime >= 32.2) || manualStep >= 5;

  // Riproduzione procedurale sincronizzata degli effetti sonori durante la voce narrante
  const canPlaySFX = !isMuted && interactive;

  useEffect(() => {
    if (!canPlaySFX || !isPlaying || isAllRevealed) return;

    SFX_CUES.forEach((cue) => {
      if (currentTime >= cue.time && !playedSoundsRef.current.has(cue.key)) {
        playedSoundsRef.current.add(cue.key);
        cue.action();
      }
    });
  }, [currentTime, isPlaying, isAllRevealed, canPlaySFX]);

  // Se l'utente torna indietro, resettiamo i suoni futuri
  useEffect(() => {
    if (currentTime < 1.0) {
      playedSoundsRef.current.clear();
    }
  }, [currentTime]);

  // Azioni di controllo
  const togglePlay = useCallback(() => {
    if (!interactive) return;
    soundFX.resume();
    setIsPlaying(!isPlaying);
  }, [interactive, isPlaying, setIsPlaying]);

  const seekTo = useCallback(
    (seconds: number) => {
      if (!interactive) return;
      soundFX.resume();
      if (audioRef.current) {
        try {
          audioRef.current.currentTime = seconds;
        } catch {}
      }
      setCurrentTime(seconds);
      setSeekTrigger({ time: seconds, timestamp: Date.now() });
    },
    [interactive, setSeekTrigger]
  );

  const jumpToCue = useCallback(
    (seconds: number, targetStep: number) => {
      if (!interactive) return;
      soundFX.resume();
      seekTo(seconds);
      setManualStep(targetStep);
      setIsAllRevealed(targetStep >= 5);
      setIsPlaying(true);
    },
    [interactive, setIsPlaying, setIsAllRevealed, setManualStep, seekTo]
  );

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
    setManualStep(5);
    if (canPlaySFX) {
      soundFX.playReadyTrophy();
    }
  }, [interactive, setIsAllRevealed, setManualStep, setIsPlaying, canPlaySFX]);

  // Avanzamento animato alla Domanda 1 (Manche 1)
  const handleAdvanceToQ1 = useCallback(() => {
    if (!interactive) return;
    soundFX.resume();
    soundFX.playAnswerAdvanceWhoosh();
    setIsTransitioningToQ1(true);
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('imperio-advance-to-q1'));
    }, 450);
  }, [interactive, setIsTransitioningToQ1]);

  // Ritorno alla mappa dell'isola
  const returnToMap = useCallback(() => {
    if (onReturnToMap) {
      onReturnToMap();
    } else {
      window.dispatchEvent(new CustomEvent('imperio-return-to-map'));
    }
  }, [onReturnToMap]);

  // Step avanti / indietro manuali
  const nextStep = useCallback(() => {
    if (!interactive) return;
    soundFX.resume();
    if (manualStep < 5) {
      const n = manualStep + 1;
      setManualStep(n);
      if (n === 1) seekTo(0.5);
      else if (n === 2) seekTo(8.5);
      else if (n === 3) seekTo(16.5);
      else if (n === 4) seekTo(24.5);
      else if (n === 5) {
        seekTo(32.5);
        revealEverything();
      }
    } else {
      handleAdvanceToQ1();
    }
  }, [interactive, manualStep, setManualStep, seekTo, revealEverything, handleAdvanceToQ1]);

  const prevStep = useCallback(() => {
    if (!interactive) return;
    soundFX.resume();
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);

    if (isAllRevealed) {
      setIsAllRevealed(false);
      const target = manualStep > 0 ? manualStep - 1 : 4;
      setManualStep(target);
      if (target === 0) seekTo(0);
      else if (target === 1) seekTo(0.5);
      else if (target === 2) seekTo(8.5);
      else if (target === 3) seekTo(16.5);
      else if (target === 4) seekTo(24.5);
      return;
    }
    if (manualStep > 0) {
      const p = manualStep - 1;
      setManualStep(p);
      if (p === 0) seekTo(0);
      else if (p === 1) seekTo(0.5);
      else if (p === 2) seekTo(8.5);
      else if (p === 3) seekTo(16.5);
      else if (p === 4) seekTo(24.5);
    }
  }, [interactive, isAllRevealed, manualStep, setIsAllRevealed, setManualStep, seekTo, setIsPlaying]);

  // Scorciatoie da tastiera
  useEffect(() => {
    if (!interactive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (e.code === 'Space' || e.key.toLowerCase() === 'p') {
        e.preventDefault();
        e.stopPropagation();
        togglePlay();
      } else if (e.key.toLowerCase() === 's' || e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        revealEverything();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        e.stopPropagation();
        nextStep();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        e.stopPropagation();
        prevStep();
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
  }, [interactive, togglePlay, revealEverything, nextStep, prevStep, resetAllState, returnToMap]);

  const progressPercent = Math.min(100, Math.max(0, (currentTime / duration) * 100));

  const formatTime = (secs: number) => {
    const s = Math.floor(secs);
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative w-[1920px] h-[1080px] overflow-hidden select-none bg-[#020914] text-white flex flex-col items-center justify-between font-sans px-12 py-7">
      {/* Audio Element Nascosto */}
      <audio
        ref={audioRef}
        src={assetUrl(audioSource)}
        preload="auto"
        muted={isMuted}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleAudioEnded}
      />

      {/* ========================================================================= */}
      {/* SFONDO AMBIENTALE VISIBILE BOX 2 (MONTAGNA DEI CRISTALLI ED EQUALIZZATORI) */}
      {/* ========================================================================= */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {customSfondo ? (
          <>
            <img
              src={assetUrl(customSfondo)}
              alt="Sfondo Spiegazione Box 2"
              className="absolute inset-0 w-full h-full object-cover"
            />
            {/* Gradiente morbido e trasparente per rendere lo sfondo chiaramente visibile */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#020b16]/65 via-[#020b16]/35 to-[#020b16]/70" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#020b16] via-[#04162e] to-[#01060e]" />
        )}

        {/* Luci volumetriche ambientali (Cyan, Electric Blue, Amber) */}
        <div className="absolute -top-32 left-[15%] w-[650px] h-[650px] bg-cyan-500/15 rounded-full blur-[160px]" />
        <div className="absolute -top-24 right-[15%] w-[650px] h-[650px] bg-blue-500/15 rounded-full blur-[160px]" />
        <div className="absolute -bottom-36 left-1/2 -translate-x-1/2 w-[850px] h-[450px] bg-teal-600/12 rounded-full blur-[170px]" />

        {/* Griglia Blueprint tecnologica ciano */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(0, 229, 255, 0.08) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(0, 229, 255, 0.08) 1px, transparent 1px)
            `,
            backgroundSize: '44px 44px',
          }}
        />

        {/* Cornice olografica centrale con angolari futuristici */}
        <svg className="absolute inset-0 w-full h-full text-cyan-400/25" fill="none">
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
        {/* HEADER: BADGE E TITOLO DEL GIOCO MODIFICABILE DINAMICAMENTE DA SETUP */}
        <header className="relative w-full flex flex-col items-center shrink-0 pt-0.5">
          <div className="flex items-center gap-3 px-5 py-1.5 rounded-full bg-slate-900/80 border border-cyan-400/35 backdrop-blur-md shadow-[0_0_25px_rgba(0,229,255,0.25)] mb-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
            <span className="text-xs font-mono font-black uppercase tracking-[0.25em] text-cyan-300">
              IMPERIO VIII • GIOCO 2
            </span>
            <span className="text-white/30 text-xs">|</span>
            <span className="text-xs font-mono font-bold tracking-wider text-amber-300">
              TOP 10 • CLASSIFICA & CLASSIFICA MUSICALE
            </span>
          </div>

          <h1 className="text-4xl lg:text-5xl font-black tracking-tight uppercase text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 via-teal-300 to-amber-300 drop-shadow-[0_4px_24px_rgba(0,229,255,0.5)] text-center font-serif">
            {titoloGioco}
          </h1>
          <p className="text-[11px] lg:text-xs font-semibold tracking-[0.3em] uppercase text-slate-300/80 mt-1">
            {sottotitoloGioco}
          </p>
        </header>

        {/* ========================================================================= */}
        {/* AREA CENTRALE: LE 3 REGOLE CARDINALI (OBIETTIVO, PUNTEGGI, RISPOSTA)      */}
        {/* Allineate a 3 righe compatte con layout trasparente (Sx 5 col vs Dx 7 col)*/}
        {/* ========================================================================= */}
        <main className="w-full flex-1 flex flex-col justify-center gap-4 max-w-[1780px] my-auto py-1">
          {/* RIGA 1: OBIETTIVO */}
          <div className="w-full grid grid-cols-12 gap-6 items-center">
            {/* 1. PILL OBIETTIVO (SX - 5 COLONNE) */}
            <div className="col-span-5 pl-4">
              <div
                className={`transition-all duration-700 transform ${
                  showObiettivoPill
                    ? 'opacity-100 translate-x-0 scale-100'
                    : 'opacity-0 -translate-x-12 scale-95'
                }`}
              >
                <div className="relative group p-0.5 rounded-2xl bg-gradient-to-r from-cyan-500/40 via-teal-500/20 to-transparent">
                  <div className="px-6 py-4 rounded-[18px] bg-slate-950/80 border border-cyan-400/50 shadow-[0_0_25px_rgba(0,229,255,0.25)] backdrop-blur-md flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-2xl shadow-inner">
                        🎯
                      </div>
                      <div>
                        <span className="text-[9px] font-mono font-bold tracking-widest text-cyan-400/80 uppercase">
                          Regola 01
                        </span>
                        <h2 className="text-xl lg:text-2xl font-black uppercase tracking-wider text-white">
                          OBIETTIVO
                        </h2>
                      </div>
                    </div>
                    <span className="text-cyan-400 font-mono text-[11px] px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/30 font-bold">
                      INDOVINA LA SOLUZIONE
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 1: OBIETTIVO DETTAGLIATO (DX - 7 COLONNE) */}
            <div className="col-span-7 pr-4">
              <div
                className={`transition-all duration-700 transform ${
                  showCategoryListCard || showGrandPrizeBadge
                    ? 'opacity-100 translate-y-0 scale-100'
                    : 'opacity-0 translate-y-6 scale-95'
                }`}
              >
                <div className="p-4 px-6 rounded-2xl bg-slate-900/75 border border-cyan-400/35 shadow-xl backdrop-blur-md flex items-center gap-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-36 h-36 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

                  {/* Fumetto Verde messaggi categoria + Badge 5.000 pt */}
                  <div className="shrink-0 flex items-center gap-4">
                    {/* Fumetto Verde Categoria */}
                    <div
                      className={`relative w-20 h-15 rounded-2xl flex flex-col items-center justify-center gap-1.5 p-2 shadow-[0_0_25px_rgba(0,230,118,0.4)] border-2 border-emerald-300/80 transition-all duration-500 ${
                        showCategoryListCard ? 'opacity-100 scale-100' : 'opacity-30 scale-90'
                      }`}
                      style={{
                        background: 'linear-gradient(135deg, #00E676 0%, #00B0FF 100%)',
                      }}
                    >
                      <div className="w-12 h-1.5 bg-white/90 rounded-full shadow-sm" />
                      <div className="w-10 h-1.5 bg-white/90 rounded-full shadow-sm" />
                      <div className="w-7 h-1.5 bg-white/90 rounded-full shadow-sm" />
                      <div className="absolute -bottom-2 left-3 w-3 h-3 bg-[#00B0FF] rotate-45 border-r border-b border-emerald-300/60" />
                    </div>

                    {/* Badge 5.000 Punti (Circolare Marrone con Spunta Verde) */}
                    <div
                      className={`flex flex-col items-center gap-1 transition-all duration-500 ${
                        showGrandPrizeBadge ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
                      }`}
                    >
                      <div
                        className="w-11 h-11 rounded-full border-2 border-white shadow-[0_0_20px_rgba(255,145,0,0.5)] flex items-center justify-center"
                        style={{
                          background: 'linear-gradient(135deg, #A04000 0%, #D35400 100%)',
                        }}
                      >
                        <svg className="w-6 h-6 text-[#00E676] filter drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div className="px-3 py-0.5 rounded-full border border-white/80 bg-cyan-950/90 shadow-md">
                        <span className="text-xs font-black tracking-wider text-amber-300">
                          5.000 PT
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-400/40 text-[9px] font-black uppercase text-emerald-300">
                        📋 10 Indizi Categoria
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-400/40 text-[9px] font-black uppercase text-amber-300">
                        🏆 Premio 5.000 Punti
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 border border-cyan-400/40 text-[9px] font-black uppercase text-cyan-300">
                        🎵 Canzone / 🖼️ Immagine
                      </span>
                    </div>
                    <p className="text-sm lg:text-base font-medium text-slate-200 leading-snug">
                      Indovinare la <strong className="text-cyan-300 font-bold">canzone</strong> o l'<strong className="text-amber-300 font-bold">immagine misteriosa</strong>! Il compito di sbloccare gli indizi spetta a voi rispondendo alla domanda categoria.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGA 2: PUNTEGGI SCALARI (BLU 1K, VERDE 2K, GIALLO 3K) */}
          <div className="w-full grid grid-cols-12 gap-6 items-center">
            {/* 2. PILL PUNTEGGIO (SX - 5 COLONNE) */}
            <div className="col-span-5 pl-4">
              <div
                className={`transition-all duration-700 transform delay-75 ${
                  showPunteggioPill
                    ? 'opacity-100 translate-x-0 scale-100'
                    : 'opacity-0 -translate-x-12 scale-95'
                }`}
              >
                <div className="relative group p-0.5 rounded-2xl bg-gradient-to-r from-blue-500/40 via-cyan-500/20 to-transparent">
                  <div className="px-6 py-4 rounded-[18px] bg-slate-950/80 border border-cyan-400/50 shadow-[0_0_25px_rgba(0,229,255,0.25)] backdrop-blur-md flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-400/50 flex items-center justify-center text-2xl shadow-inner">
                        💎
                      </div>
                      <div>
                        <span className="text-[9px] font-mono font-bold tracking-widest text-cyan-400/80 uppercase">
                          Regola 02
                        </span>
                        <h2 className="text-xl lg:text-2xl font-black uppercase tracking-wider text-white">
                          PUNTEGGI
                        </h2>
                      </div>
                    </div>
                    <span className="text-cyan-400 font-mono text-[11px] px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/30 font-bold">
                      1K / 2K / 3K PT
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 2: DETTAGLIO PUNTEGGI CON LE 3 TESSERE (DX - 7 COLONNE) */}
            <div className="col-span-7 pr-4">
              <div
                className={`transition-all duration-700 transform delay-75 ${
                  showScoreBlue || showScoreGreen || showScoreYellow
                    ? 'opacity-100 translate-y-0 scale-100'
                    : 'opacity-0 translate-y-6 scale-95'
                }`}
              >
                <div className="p-4 px-6 rounded-2xl bg-slate-900/75 border border-blue-400/35 shadow-xl backdrop-blur-md flex items-center gap-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-36 h-36 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

                  {/* Le 3 Tessere Colorate */}
                  <div className="shrink-0 flex items-center gap-3">
                    {/* Livello Blu 1.000 */}
                    <div
                      className={`flex flex-col items-center gap-1.5 transition-all duration-500 ${
                        showScoreBlue ? 'opacity-100 scale-100' : 'opacity-0 scale-85'
                      }`}
                    >
                      <div
                        className="w-13 h-12 rounded-xl border-2 border-blue-300 shadow-[0_0_15px_rgba(0,163,255,0.6)] flex items-center justify-center"
                        style={{
                          background: 'linear-gradient(135deg, #00A3FF 0%, #0066FF 100%)',
                        }}
                      >
                        <span className="text-white text-[10px] font-black uppercase tracking-wider">
                          BLU
                        </span>
                      </div>
                      <div className="px-2.5 py-0.5 rounded-full border border-white/70 bg-cyan-950/90 shadow-sm">
                        <span className="text-[11px] font-black tracking-wide text-white">
                          1.000
                        </span>
                      </div>
                    </div>

                    {/* Livello Verde 2.000 */}
                    <div
                      className={`flex flex-col items-center gap-1.5 transition-all duration-500 delay-75 ${
                        showScoreGreen ? 'opacity-100 scale-100' : 'opacity-0 scale-85'
                      }`}
                    >
                      <div
                        className="w-13 h-12 rounded-xl border-2 border-emerald-300 shadow-[0_0_15px_rgba(0,200,83,0.6)] flex items-center justify-center"
                        style={{
                          background: 'linear-gradient(135deg, #00C853 0%, #009624 100%)',
                        }}
                      >
                        <span className="text-white text-[10px] font-black uppercase tracking-wider">
                          VERDE
                        </span>
                      </div>
                      <div className="px-2.5 py-0.5 rounded-full border border-white/70 bg-cyan-950/90 shadow-sm">
                        <span className="text-[11px] font-black tracking-wide text-white">
                          2.000
                        </span>
                      </div>
                    </div>

                    {/* Livello Giallo 3.000 */}
                    <div
                      className={`flex flex-col items-center gap-1.5 transition-all duration-500 delay-150 ${
                        showScoreYellow ? 'opacity-100 scale-100' : 'opacity-0 scale-85'
                      }`}
                    >
                      <div
                        className="w-13 h-12 rounded-xl border-2 border-amber-300 shadow-[0_0_15px_rgba(255,179,0,0.6)] flex items-center justify-center"
                        style={{
                          background: 'linear-gradient(135deg, #FFB300 0%, #FF8F00 100%)',
                        }}
                      >
                        <span className="text-black text-[10px] font-black uppercase tracking-wider">
                          GIALLO
                        </span>
                      </div>
                      <div className="px-2.5 py-0.5 rounded-full border border-white/70 bg-cyan-950/90 shadow-sm">
                        <span className="text-[11px] font-black tracking-wide text-white">
                          3.000
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md bg-blue-500/20 border border-blue-400/40 text-[9px] font-black uppercase text-blue-300">
                        🔵 Indizi 1-5 (Facili)
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-400/40 text-[9px] font-black uppercase text-emerald-300">
                        🟢 Indizi 6-8 (Medi)
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-400/40 text-[9px] font-black uppercase text-amber-300">
                        🟡 Indizi 9-10 (Decisivi)
                      </span>
                    </div>
                    <p className="text-sm lg:text-base font-medium text-slate-200 leading-snug">
                      Punteggi crescenti in base alla difficoltà: <strong className="text-blue-300 font-bold">1.000 pt</strong> per le risposte blu,{' '}
                      <strong className="text-emerald-300 font-bold">2.000 pt</strong> verdi e <strong className="text-amber-300 font-bold">3.000 pt</strong> gialle!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGA 3: RISPOSTA E TENTATIVO FINALE */}
          <div className="w-full grid grid-cols-12 gap-6 items-center">
            {/* 3. PILL RISPOSTA (SX - 5 COLONNE) */}
            <div className="col-span-5 pl-4">
              <div
                className={`transition-all duration-700 transform delay-150 ${
                  showRispostaPill
                    ? 'opacity-100 translate-x-0 scale-100'
                    : 'opacity-0 -translate-x-12 scale-95'
                }`}
              >
                <div className="relative group p-0.5 rounded-2xl bg-gradient-to-r from-amber-500/40 via-yellow-500/20 to-transparent">
                  <div className="px-6 py-4 rounded-[18px] bg-slate-950/80 border border-amber-400/50 shadow-[0_0_25px_rgba(245,158,11,0.25)] backdrop-blur-md flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-2xl shadow-inner">
                        ⚡
                      </div>
                      <div>
                        <span className="text-[9px] font-mono font-bold tracking-widest text-amber-400/80 uppercase">
                          Regola 03
                        </span>
                        <h2 className="text-xl lg:text-2xl font-black uppercase tracking-wider text-white">
                          RISPOSTA
                        </h2>
                      </div>
                    </div>
                    <span className="text-amber-300 font-mono text-[11px] px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-400/30 font-bold">
                      AD OGNI TURNO
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 3: GRAFFA E FRECCIA TENTATIVO RISPOSTA (DX - 7 COLONNE) */}
            <div className="col-span-7 pr-4">
              <div
                className={`transition-all duration-700 transform delay-150 ${
                  showBracketsAndArrow
                    ? 'opacity-100 translate-y-0 scale-100'
                    : 'opacity-0 translate-y-6 scale-95'
                }`}
              >
                <div className="p-4 px-6 rounded-2xl bg-slate-900/75 border border-amber-400/35 shadow-xl backdrop-blur-md flex items-center gap-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

                  {/* Circolare Giallo con Freccia Verso Destra */}
                  <div className="shrink-0 flex items-center justify-center">
                    <div className="w-13 h-13 rounded-full border-3 border-amber-300 shadow-[0_0_25px_rgba(255,235,59,0.7)] flex items-center justify-center bg-[#071321] transition-transform hover:scale-110">
                      <svg className="w-7 h-7 text-amber-300 filter drop-shadow-[0_0_8px_#FFEE58]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </div>
                  </div>

                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-400/40 text-[9px] font-black uppercase text-amber-300">
                        ➔ Risposta Finale Immediata
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 border border-cyan-400/40 text-[9px] font-black uppercase text-cyan-300">
                        🔄 Dinamica Continua
                      </span>
                    </div>
                    <p className="text-sm lg:text-base font-medium text-slate-200 leading-snug">
                      Il <strong className="text-amber-300 font-bold">tentativo di risposta finale</strong> è consentito <strong className="text-cyan-300 font-bold">ogni qualvolta</strong> viene data una risposta corretta alla domanda categoria!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* ------------------------------------------------------------- */}
        {/* FOOTER CALLOUT BANNER (SVELATO AL TERMINE O MANUALE)           */}
        {/* ------------------------------------------------------------- */}
        <div
          className={`relative z-10 w-full transition-all duration-700 mt-1 flex items-center justify-between px-8 py-2.5 rounded-2xl border border-cyan-400/40 ${
            showCalloutBanner
              ? 'opacity-100 translate-y-0 bg-gradient-to-r from-cyan-950/80 via-blue-900/60 to-cyan-950/80 shadow-[0_0_35px_rgba(0,229,255,0.3)]'
              : 'opacity-0 translate-y-4 pointer-events-none'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚡</span>
            <div className="flex flex-col">
              <span className="text-xs font-black text-cyan-200 uppercase tracking-widest">
                Regola Aurea Top 10
              </span>
              <span className="text-xs text-slate-300">
                Puntate alle risposte ad alto valore per ottenere prima gli indizi decisivi e sbloccare il tentativo di vittoria!
              </span>
            </div>
          </div>

          {interactive && (
            <button
              type="button"
              onClick={handleAdvanceToQ1}
              className="px-6 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-xs tracking-widest uppercase shadow-[0_0_20px_rgba(0,229,255,0.6)] cursor-pointer transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
            >
              <span>Inizia Manche 1</span>
              <span>➔</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PANNELLO DI REGIA RELATORE (VISIBILE ESCLUSIVAMENTE SULLA FINESTRA PRESENTER) */}
      {/* ========================================================================= */}
      {interactive && isMultiWindowRelatore && (
        <div
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 w-[1400px] bg-slate-950/95 border-2 border-cyan-500/40 rounded-2xl p-4 shadow-[0_0_50px_rgba(0,0,0,0.9)] backdrop-blur-2xl flex flex-col gap-3"
          style={{ fontFamily: "'Montserrat', sans-serif" }}
        >
          {/* Riga 1: Header regia, pulsanti di trasporto e status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#00E5FF]" />
              <span className="text-xs font-black tracking-widest uppercase text-cyan-300">
                REGIA SPIEGAZIONE BOX 2 • TOP 10 & CLASSIFICHE
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/10 text-slate-300">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            {/* Controlli Principali: Play/Pause, Step Prev/Next, Riavvia, Svela, Mappa */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={togglePlay}
                className={`px-4 py-1.5 rounded-lg font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                  isPlaying
                    ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-[0_0_15px_rgba(245,158,11,0.5)]'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                }`}
                title="Spazio / P"
              >
                <span>{isPlaying ? '⏸ Pausa' : '▶ Avvia Audio'}</span>
              </button>

              <button
                type="button"
                onClick={prevStep}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/15 text-white font-bold text-xs uppercase tracking-wider cursor-pointer transition-all hover:scale-105"
                title="Freccia Sinistra"
              >
                ◀ Fase Prec.
              </button>

              <button
                type="button"
                onClick={nextStep}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/15 text-white font-bold text-xs uppercase tracking-wider cursor-pointer transition-all hover:scale-105"
                title="Freccia Destra"
              >
                Fase Succ. ▶
              </button>

              <button
                type="button"
                onClick={resetAllState}
                className="px-3 py-1.5 rounded-lg bg-red-950/80 hover:bg-red-900 border border-red-500/30 text-red-300 font-bold text-xs uppercase tracking-wider cursor-pointer transition-all"
                title="Tasto R"
              >
                🔄 Riavvia
              </button>

              <button
                type="button"
                onClick={revealEverything}
                className="px-3 py-1.5 rounded-lg bg-cyan-950 hover:bg-cyan-900 border border-cyan-400/40 text-cyan-200 font-bold text-xs uppercase tracking-wider cursor-pointer transition-all"
                title="Tasto S / Invio"
              >
                ⚡ Svela Tutto
              </button>

              <button
                type="button"
                onClick={() => setIsMuted(!isMuted)}
                className={`px-3 py-1.5 rounded-lg border font-bold text-xs cursor-pointer transition-all ${
                  isMuted
                    ? 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                    : 'bg-slate-800 border-white/15 text-slate-300'
                }`}
                title="Muta audio solo su questa finestra relatore"
              >
                {isMuted ? '🔇 Audio Relatore Muto' : '🔊 Audio Relatore Attivo'}
              </button>

              <button
                type="button"
                onClick={returnToMap}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-white/20 text-white font-bold text-xs uppercase tracking-wider cursor-pointer transition-all hover:scale-105"
                title="Tasto ESC o M"
              >
                🗺️ Mappa
              </button>
            </div>
          </div>

          {/* Riga 2: Barra di avanzamento / Scrubber interattivo */}
          <div className="relative w-full h-3 bg-slate-800 rounded-full overflow-hidden cursor-pointer group">
            <div
              className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-400 transition-all duration-100"
              style={{ width: `${progressPercent}%` }}
            />
            {/* Marker dei cues sulla timeline */}
            {[
              { pos: (0.5 / duration) * 100, label: 'Obiettivo' },
              { pos: (8.5 / duration) * 100, label: 'Categoria' },
              { pos: (16.5 / duration) * 100, label: 'Punteggi' },
              { pos: (24.5 / duration) * 100, label: 'Risposta' },
              { pos: (32.2 / duration) * 100, label: 'Fine' },
            ].map((m, idx) => (
              <div
                key={idx}
                className="absolute top-0 bottom-0 w-0.5 bg-white/70 pointer-events-none group-hover:bg-yellow-300"
                style={{ left: `${m.pos}%` }}
                title={m.label}
              />
            ))}
            <input
              type="range"
              min="0"
              max={duration || 33.04}
              step="0.1"
              value={currentTime}
              onChange={(e) => seekTo(parseFloat(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>

          {/* Riga 3: Cues rapidi con tasti diretti */}
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-bold uppercase text-[10px]">Cues Rapidi:</span>
              <button
                type="button"
                onClick={() => jumpToCue(0.5, 1)}
                className={`px-2.5 py-1 rounded border transition-all cursor-pointer ${
                  manualStep === 1
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold'
                    : 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-300'
                }`}
              >
                00:00 • 01. Obiettivo (5.000 pt)
              </button>
              <button
                type="button"
                onClick={() => jumpToCue(8.5, 2)}
                className={`px-2.5 py-1 rounded border transition-all cursor-pointer ${
                  manualStep === 2
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold'
                    : 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-300'
                }`}
              >
                00:08 • 02. Domanda Categoria & Indizi
              </button>
              <button
                type="button"
                onClick={() => jumpToCue(16.5, 3)}
                className={`px-2.5 py-1 rounded border transition-all cursor-pointer ${
                  manualStep === 3
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold'
                    : 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-300'
                }`}
              >
                00:16 • 03. Nuovi Punteggi (1k/2k/3k)
              </button>
              <button
                type="button"
                onClick={() => jumpToCue(24.5, 4)}
                className={`px-2.5 py-1 rounded border transition-all cursor-pointer ${
                  manualStep === 4
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold'
                    : 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-300'
                }`}
              >
                00:24 • 04. Tentativo Risposta
              </button>
            </div>

            <div className="flex items-center gap-3 text-slate-400">
              <span>Scorciatoie: <strong className="text-white">Spazio</strong> Play • <strong className="text-white">← / →</strong> Fasi • <strong className="text-white">R</strong> Riavvia • <strong className="text-white">ESC</strong> Mappa</span>
            </div>
          </div>
        </div>
      )}

      {/* Transizione cinematica verso la Domanda 1 */}
      {isTransitioningToQ1 && (
        <div className="absolute inset-0 z-50 bg-black animate-fade-in pointer-events-none flex items-center justify-center">
          <div className="text-center space-y-3 animate-pulse">
            <span className="text-4xl">⚡</span>
            <h2 className="text-2xl font-black text-cyan-300 tracking-widest uppercase">
              CARICAMENTO MANCHE 1...
            </h2>
          </div>
        </div>
      )}
    </div>
  );
}
