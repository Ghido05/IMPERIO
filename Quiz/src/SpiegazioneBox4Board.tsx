import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useGameData } from './context/GameDataContext';
import { assetUrl } from './lib/assetUrl';
import { useSyncedState } from './hooks/useSyncedState';

interface SpiegazioneBox4Data {
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

interface SpiegazioneBox4BoardProps {
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
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(620, now + 0.18);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(500, now);
    filter.frequency.exponentialRampToValueAtTime(3600, now + 0.18);

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
   * Chime scintillante per il punteggio e il Bussolotto col premio
   */
  playRewardChime() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = Math.max(ctx.currentTime, 0.05);

    const notes = [1174.66, 1479.98, 1760.0, 2349.32]; // D6, F#6, A6, D7
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
   * Colpo deciso di martelletto / asta al ribasso
   */
  playAuctionGavel() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = Math.max(ctx.currentTime, 0.05);

    [0, 0.12].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(520, now + offset);
      osc.frequency.exponentialRampToValueAtTime(260, now + offset + 0.07);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2200, now + offset);
      filter.frequency.exponentialRampToValueAtTime(400, now + offset + 0.07);

      gain.gain.setValueAtTime(0.001, now + offset);
      gain.gain.linearRampToValueAtTime(0.35, now + offset + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.14);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + offset);
      osc.stop(now + offset + 0.16);
    });
  }

  /**
   * Doppio segnale di attenzione per errore e regalo del premio agli avversari
   */
  playDoubleMalusWarning() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = Math.max(ctx.currentTime, 0.05);

    [0, 0.2].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now + offset);
      osc.frequency.exponentialRampToValueAtTime(140, now + offset + 0.16);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200, now + offset);
      filter.frequency.exponentialRampToValueAtTime(350, now + offset + 0.16);

      gain.gain.setValueAtTime(0.001, now + offset);
      gain.gain.linearRampToValueAtTime(0.32, now + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.2);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + offset);
      osc.stop(now + offset + 0.22);
    });
  }

  /**
   * Fanfara trionfale di chiusura slide
   */
  playTrophyVictory() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = Math.max(ctx.currentTime, 0.05);

    const chord = [587.33, 739.99, 880.0, 1174.66]; // D5, F#5, A5, D6
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

// Cue temporali deterministici sincronizzati con la voce narrante (27.82s totali)
// "Obiettivo del gioco indovinare la frase misteriosa," (0.0s - 4.5s)
// "come ricompensa l'assegnazione del bussolotto col premio corrispondente." (4.5s - 9.5s)
// "Tramite un'asta al ribasso sul numero di consonanti da chiamare sarà possibile aggiudicarsi il diritto di dare la risposta." (9.5s - 18.0s)
// "Se indovinate otterrete il bussolotto col premio," (18.0s - 22.0s)
// "in caso di risposta errata verrà dato ad entrambe le squadre avversarie!" (22.0s - 27.5s)
const SFX_CUES = [
  { id: 'b4_pill_obiettivo', time: 0.8, play: () => soundFX.playBoxActivation() },
  { id: 'b4_card_obiettivo', time: 1.6, play: () => soundFX.playArrowTin() },
  { id: 'b4_pill_ricompensa', time: 4.5, play: () => soundFX.playBoxActivation() },
  { id: 'b4_card_ricompensa', time: 5.2, play: () => soundFX.playRewardChime() },
  { id: 'b4_pill_asta', time: 9.5, play: () => soundFX.playBoxActivation() },
  { id: 'b4_card_asta', time: 10.5, play: () => soundFX.playAuctionGavel() },
  { id: 'b4_pill_esito', time: 18.0, play: () => soundFX.playBoxActivation() },
  { id: 'b4_card_esito_win', time: 18.8, play: () => soundFX.playRewardChime() },
  { id: 'b4_card_esito_malus', time: 22.2, play: () => soundFX.playDoubleMalusWarning() },
  { id: 'b4_finish_victory', time: 26.2, play: () => soundFX.playTrophyVictory() },
];

export default function SpiegazioneBox4Board({
  interactive = true,
  revealAll = false,
  isPresenter,
  onReturnToMap,
}: SpiegazioneBox4BoardProps) {
  const data = useGameData<SpiegazioneBox4Data>();
  const slideId = data?.slideId || 'box4_spiegazione';
  const rawSfondo = data?.sfondo || data?.sfondoSpiegazione;
  const customSfondo =
    rawSfondo && !/\.(m4a|mp3|wav|ogg|aac)($|\?)/i.test(rawSfondo)
      ? rawSfondo
      : '/Icone/sfondi/sfondo_box4_orologi_tempo.jpg';

  // Configurazione setup con fallback su localStorage
  const setupConfig = useMemo(() => {
    try {
      const raw = localStorage.getItem('imperio_quiz_setup_config_v1');
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }
    return null;
  }, []);

  const rawTitle =
    data?.titoloGioco ||
    (data?.titolo ? data.titolo.replace(/^SPIEGAZIONE\s*[-—:]*\s*/i, '') : '') ||
    setupConfig?.gioco4?.titolo ||
    'FRASE A TEMPO';
  const titoloGioco = rawTitle.replace(/^SPIEGAZIONE\s*[-—:]*\s*/i, '').trim().toUpperCase();
  const sottotitoloGioco =
    data?.sottotitolo ||
    setupConfig?.gioco4?.sottotitolo ||
    'Frase Misteriosa, Asta al Ribasso & Sfida del Bussolotto';

  // File audio spiegazione (Spiegazione_box4.mp3)
  const audioSrc = useMemo(() => {
    const rawUrl = data?.audioUrl || data?.audioSpiegazione || '/Audio/Spiegazioni/Spiegazione_box4.mp3';
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
  // Transizione cinematica sincronizzata verso la Domanda 1 (Frase 1)
  const [isTransitioningToQ1, setIsTransitioningToQ1] = useSyncedState<boolean>(
    'playstate_box4_transition',
    false
  );

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(27.82);
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
      if (
        audioRef.current.duration &&
        !isNaN(audioRef.current.duration) &&
        audioRef.current.duration > 0
      ) {
        setDuration(audioRef.current.duration);
      }
      if (t >= 27.5) {
        setIsPlaying(false);
        setIsAllRevealed(true);
      }
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setIsAllRevealed(true);
  };

  // Visibilità dinamica sincronizzata per le 4 regole
  const showObiettivoPill = isAllRevealed || (isPlaying && currentTime >= 0.8) || manualStep >= 1;
  const showObiettivoCard = isAllRevealed || (isPlaying && currentTime >= 1.6) || manualStep >= 1;

  const showRicompensaPill = isAllRevealed || (isPlaying && currentTime >= 4.5) || manualStep >= 2;
  const showRicompensaCard = isAllRevealed || (isPlaying && currentTime >= 5.2) || manualStep >= 2;

  const showAstaPill = isAllRevealed || (isPlaying && currentTime >= 9.5) || manualStep >= 3;
  const showAstaCard = isAllRevealed || (isPlaying && currentTime >= 10.5) || manualStep >= 3;

  const showEsitoPill = isAllRevealed || (isPlaying && currentTime >= 18.0) || manualStep >= 4;
  const showEsitoCard = isAllRevealed || (isPlaying && currentTime >= 18.8) || manualStep >= 4;
  const showMalusHighlight = isAllRevealed || (isPlaying && currentTime >= 22.2) || manualStep >= 4;

  const showCalloutBanner = isAllRevealed || (isPlaying && currentTime >= 26.2) || manualStep >= 5;

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
    if (currentTime >= 27.5 || isAllRevealed) {
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
    setManualStep(5);
    if (canPlaySFX) {
      soundFX.playTrophyVictory();
    }
  }, [interactive, setIsAllRevealed, setManualStep, setIsPlaying, canPlaySFX]);

  // Avanzamento animato alla Domanda 1 (Frase 1)
  const handleAdvanceToQ1 = useCallback(() => {
    if (!interactive) return;
    soundFX.resume();
    soundFX.playAuctionGavel();
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
      if (n === 1) seekTo(1.6);
      else if (n === 2) seekTo(4.8);
      else if (n === 3) seekTo(9.8);
      else if (n === 4) seekTo(18.2);
      else if (n === 5) {
        seekTo(26.2);
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
      else if (target === 1) seekTo(1.6);
      else if (target === 2) seekTo(4.8);
      else if (target === 3) seekTo(9.8);
      else if (target === 4) seekTo(18.2);
      return;
    }
    if (manualStep > 0) {
      const p = manualStep - 1;
      setManualStep(p);
      if (p === 0) seekTo(0);
      else if (p === 1) seekTo(1.6);
      else if (p === 2) seekTo(4.8);
      else if (p === 3) seekTo(9.8);
      else if (p === 4) seekTo(18.2);
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
    <div className="relative w-[1920px] h-[1080px] overflow-hidden select-none bg-[#090614] text-white flex flex-col items-center justify-between font-sans px-12 py-7">
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
        {customSfondo ? (
          <>
            <img
              src={assetUrl(customSfondo)}
              alt="Sfondo Spiegazione Box 4"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#090614]/80 via-[#090614]/55 to-[#090614]/85" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#090614] via-[#160c2b] to-[#06040d]" />
        )}

        {/* Luci volumetriche ambientali (Purple, Violet, Amber, Rose per errore) */}
        <div className="absolute -top-32 left-[15%] w-[650px] h-[650px] bg-purple-500/14 rounded-full blur-[160px]" />
        <div className="absolute -top-24 right-[15%] w-[650px] h-[650px] bg-amber-500/12 rounded-full blur-[160px]" />
        <div className="absolute -bottom-36 left-1/2 -translate-x-1/2 w-[850px] h-[450px] bg-violet-600/15 rounded-full blur-[170px]" />
        {showMalusHighlight && (
          <div className="absolute bottom-20 right-[12%] w-[520px] h-[520px] bg-rose-600/18 rounded-full blur-[140px] animate-pulse" />
        )}

        {/* Griglia Blueprint tecnologica viola */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(168, 85, 247, 0.09) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(168, 85, 247, 0.09) 1px, transparent 1px)
            `,
            backgroundSize: '44px 44px',
          }}
        />

        {/* Cornice olografica centrale con angolari futuristici */}
        <svg className="absolute inset-0 w-full h-full text-purple-400/25" fill="none">
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
        <header className="relative w-full flex flex-col items-center shrink-0 pt-0.5">
          <div className="flex items-center gap-3 px-5 py-1.5 rounded-full bg-slate-900/80 border border-purple-400/35 backdrop-blur-md shadow-[0_0_25px_rgba(168,85,247,0.25)] mb-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-ping" />
            <span className="text-xs font-mono font-black uppercase tracking-[0.25em] text-purple-300">
              IMPERIO VIII • GIOCO 4
            </span>
            <span className="text-white/30 text-xs">|</span>
            <span className="text-xs font-mono font-bold tracking-wider text-amber-300">
              ASTA AL RIBASSO & BUSSOLOTTO CON PREMIO
            </span>
          </div>

          <h1 className="text-4xl lg:text-5xl font-black tracking-tight uppercase text-transparent bg-clip-text bg-gradient-to-r from-purple-200 via-fuchsia-300 to-amber-300 drop-shadow-[0_4px_24px_rgba(168,85,247,0.5)] text-center font-serif">
            {titoloGioco}
          </h1>
          <p className="text-[11px] lg:text-xs font-semibold tracking-[0.3em] uppercase text-slate-300/80 mt-1">
            {sottotitoloGioco}
          </p>
        </header>

        {/* ========================================================================= */}
        {/* AREA CENTRALE: LE 4 REGOLE PRINCIPALI DEL GIOCO                           */}
        {/* Allineate a 4 righe compatte (Sx 5 col vs Dx 7 col)                       */}
        {/* ========================================================================= */}
        <main className="w-full flex-1 flex flex-col justify-center gap-3.5 max-w-[1780px] my-auto py-1">
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
                <div className="relative group p-0.5 rounded-2xl bg-gradient-to-r from-purple-500/40 via-violet-500/20 to-transparent">
                  <div className="px-6 py-3.5 rounded-[18px] bg-slate-950/85 border border-purple-400/50 shadow-[0_0_25px_rgba(168,85,247,0.25)] backdrop-blur-md flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-xl bg-purple-500/20 border border-purple-400/50 flex items-center justify-center text-xl shadow-inner">
                        🧩
                      </div>
                      <div>
                        <span className="text-[9px] font-mono font-bold tracking-widest text-purple-400/80 uppercase">
                          Regola 01
                        </span>
                        <h2 className="text-xl lg:text-2xl font-black uppercase tracking-wider text-white">
                          OBIETTIVO
                        </h2>
                      </div>
                    </div>
                    <span className="text-purple-300 font-mono text-[11px] px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-400/30 font-bold">
                      FRASE MISTERIOSA
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
                    : 'opacity-0 translate-y-6 scale-95'
                }`}
              >
                <div className="p-4 px-6 rounded-2xl bg-slate-900/80 border border-purple-400/35 shadow-xl backdrop-blur-md flex items-center gap-5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-36 h-36 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

                  <div className="shrink-0 flex items-center justify-center">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-700 p-0.5 shadow-[0_0_20px_rgba(168,85,247,0.4)] flex items-center justify-center">
                      <div className="w-full h-full rounded-[10px] bg-slate-950/80 flex items-center justify-center text-2xl">
                        🔤
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 space-y-1">
                    <p className="text-sm lg:text-base font-medium text-slate-200 leading-snug">
                      L'obiettivo del gioco è <strong className="text-purple-300 font-bold">indovinare la frase misteriosa</strong> prima che il tabellone sveli tutte le sue caselle!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGA 2: LA RICOMPENSA */}
          <div className="w-full grid grid-cols-12 gap-6 items-center">
            {/* 2. PILL RICOMPENSA (SX - 5 COLONNE) */}
            <div className="col-span-5 pl-4">
              <div
                className={`transition-all duration-700 transform delay-75 ${
                  showRicompensaPill
                    ? 'opacity-100 translate-x-0 scale-100'
                    : 'opacity-0 -translate-x-12 scale-95'
                }`}
              >
                <div className="relative group p-0.5 rounded-2xl bg-gradient-to-r from-amber-500/40 via-yellow-500/20 to-transparent">
                  <div className="px-6 py-3.5 rounded-[18px] bg-slate-950/85 border border-amber-400/50 shadow-[0_0_25px_rgba(245,158,11,0.25)] backdrop-blur-md flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-xl shadow-inner">
                        🏆
                      </div>
                      <div>
                        <span className="text-[9px] font-mono font-bold tracking-widest text-amber-400/80 uppercase">
                          Regola 02
                        </span>
                        <h2 className="text-xl lg:text-2xl font-black uppercase tracking-wider text-white">
                          RICOMPENSA
                        </h2>
                      </div>
                    </div>
                    <span className="text-amber-400 font-mono text-[11px] px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-400/30 font-bold">
                      BUSSOLOTTO DEL ROUND
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 2: DETTAGLIO RICOMPENSA (DX - 7 COLONNE) */}
            <div className="col-span-7 pr-4">
              <div
                className={`transition-all duration-700 transform ${
                  showRicompensaCard
                    ? 'opacity-100 translate-y-0 scale-100'
                    : 'opacity-0 translate-y-6 scale-95'
                }`}
              >
                <div className="p-4 px-6 rounded-2xl bg-slate-900/80 border border-amber-400/35 shadow-xl backdrop-blur-md flex items-center justify-between gap-5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

                  <div className="flex items-center gap-4 flex-1">
                    <div className="shrink-0 flex items-center justify-center">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-600 p-0.5 shadow-[0_0_20px_rgba(245,158,11,0.4)] flex items-center justify-center">
                        <div className="w-full h-full rounded-[10px] bg-slate-950/80 flex items-center justify-center text-2xl">
                          🏺
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm lg:text-base font-medium text-slate-200 leading-snug">
                        Come ricompensa c'è l'<strong className="text-amber-300 font-bold">assegnazione del Bussolotto</strong> con il{' '}
                        <strong className="text-yellow-300 font-bold">premio corrispondente</strong> alla manche!
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-400/50 shadow-md flex flex-col items-center justify-center">
                    <span className="text-base font-black text-amber-300 font-mono">BUSSOLOTTO</span>
                    <span className="text-[9px] font-bold text-amber-200/70 uppercase">Premio Manche</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGA 3: ASTA AL RIBASSO */}
          <div className="w-full grid grid-cols-12 gap-6 items-center">
            {/* 3. PILL ASTA (SX - 5 COLONNE) */}
            <div className="col-span-5 pl-4">
              <div
                className={`transition-all duration-700 transform delay-150 ${
                  showAstaPill
                    ? 'opacity-100 translate-x-0 scale-100'
                    : 'opacity-0 -translate-x-12 scale-95'
                }`}
              >
                <div className="relative group p-0.5 rounded-2xl bg-gradient-to-r from-cyan-500/40 via-sky-500/20 to-transparent">
                  <div className="px-6 py-3.5 rounded-[18px] bg-slate-950/85 border border-cyan-400/50 shadow-[0_0_25px_rgba(6,182,212,0.25)] backdrop-blur-md flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-xl bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-xl shadow-inner">
                        ⚖️
                      </div>
                      <div>
                        <span className="text-[9px] font-mono font-bold tracking-widest text-cyan-400/80 uppercase">
                          Regola 03
                        </span>
                        <h2 className="text-xl lg:text-2xl font-black uppercase tracking-wider text-white">
                          ASTA AL RIBASSO
                        </h2>
                      </div>
                    </div>
                    <span className="text-cyan-300 font-mono text-[11px] px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-400/30 font-bold">
                      CONSONANTI
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 3: DETTAGLIO ASTA (DX - 7 COLONNE) */}
            <div className="col-span-7 pr-4">
              <div
                className={`transition-all duration-700 transform ${
                  showAstaCard
                    ? 'opacity-100 translate-y-0 scale-100'
                    : 'opacity-0 translate-y-6 scale-95'
                }`}
              >
                <div className="p-4 px-6 rounded-2xl bg-slate-900/80 border border-cyan-400/35 shadow-xl backdrop-blur-md flex items-center gap-5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-36 h-36 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

                  <div className="shrink-0 flex items-center justify-center">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-700 p-0.5 shadow-[0_0_20px_rgba(6,182,212,0.4)] flex items-center justify-center">
                      <div className="w-full h-full rounded-[10px] bg-slate-950/80 flex items-center justify-center text-2xl">
                        📉
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 space-y-1">
                    <p className="text-sm lg:text-base font-medium text-slate-200 leading-snug">
                      Tramite un'<strong className="text-cyan-300 font-bold">asta al ribasso</strong> sul numero di consonanti da chiamare sarà possibile{' '}
                      <strong className="text-white underline decoration-cyan-400 decoration-2 underline-offset-4">
                        aggiudicarsi il diritto di dare la risposta
                      </strong>
                      !
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGA 4: ESITO - VITTORIA O REGALO AGLI AVVERSARI */}
          <div className="w-full grid grid-cols-12 gap-6 items-center">
            {/* 4. PILL ESITO (SX - 5 COLONNE) */}
            <div className="col-span-5 pl-4">
              <div
                className={`transition-all duration-700 transform delay-200 ${
                  showEsitoPill
                    ? 'opacity-100 translate-x-0 scale-100'
                    : 'opacity-0 -translate-x-12 scale-95'
                }`}
              >
                <div className="relative group p-0.5 rounded-2xl bg-gradient-to-r from-emerald-500/50 via-rose-500/30 to-transparent">
                  <div className="px-6 py-3.5 rounded-[18px] bg-slate-950/85 border border-emerald-400/50 shadow-[0_0_25px_rgba(16,185,129,0.25)] backdrop-blur-md flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500/20 to-rose-500/20 border border-white/20 flex items-center justify-center text-xl shadow-inner">
                        ⚖️
                      </div>
                      <div>
                        <span className="text-[9px] font-mono font-bold tracking-widest text-emerald-400/80 uppercase">
                          Regola 04
                        </span>
                        <h2 className="text-xl lg:text-2xl font-black uppercase tracking-wider text-white">
                          ESITO RISPOSTA
                        </h2>
                      </div>
                    </div>
                    <span className="text-emerald-300 font-mono text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/40 font-bold">
                      PREMIO O MALUS
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 4: DETTAGLIO ESITO (DX - 7 COLONNE) */}
            <div className="col-span-7 pr-4">
              <div
                className={`transition-all duration-700 transform ${
                  showEsitoCard
                    ? 'opacity-100 translate-y-0 scale-100'
                    : 'opacity-0 translate-y-6 scale-95'
                }`}
              >
                <div className="p-4 px-6 rounded-2xl bg-slate-900/85 border border-white/15 shadow-xl backdrop-blur-md flex items-center gap-5 relative overflow-hidden">
                  <div className="shrink-0 flex items-center justify-center">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-rose-600 p-0.5 shadow-[0_0_25px_rgba(244,63,94,0.35)] flex items-center justify-center">
                      <div className="w-full h-full rounded-[10px] bg-slate-950/80 flex items-center justify-center text-2xl">
                        🎯
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 space-y-1.5">
                    {/* Caso Esatto */}
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/25 border border-emerald-400/50 text-[10px] font-black uppercase text-emerald-300">
                        ✅ Risposta Esatta
                      </span>
                      <span className="text-xs lg:text-sm text-slate-200">
                        Otterrete il <strong className="text-emerald-300 font-bold">bussolotto col premio</strong>!
                      </span>
                    </div>

                    {/* Caso Errato */}
                    <div
                      className={`flex items-center gap-2 p-1 px-2.5 rounded-lg border transition-all duration-500 ${
                        showMalusHighlight
                          ? 'bg-rose-950/50 border-rose-500/60 shadow-[0_0_20px_rgba(244,63,94,0.35)] scale-[1.01]'
                          : 'bg-transparent border-transparent'
                      }`}
                    >
                      <span className="px-2 py-0.5 rounded-md bg-rose-500/25 border border-rose-400/50 text-[10px] font-black uppercase text-rose-300">
                        ❌ Risposta Errata
                      </span>
                      <span className="text-xs lg:text-sm text-slate-200">
                        Verrà dato ad <strong className="text-rose-400 font-black uppercase underline decoration-rose-400 decoration-2 underline-offset-4">entrambe le squadre avversarie</strong>!
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* ========================================================================= */}
        {/* BANNER INFERIORE: "PRONTI ALL'ASTA - PRIMA FRASE AL VIA!"                  */}
        {/* Cliccabile nel monitor Relatore per avviare la transizione alla Frase 1   */}
        {/* ========================================================================= */}
        <div className="w-full max-w-[1680px] shrink-0 mt-0 mb-1">
          <div
            className={`transition-all duration-700 transform ${
              showCalloutBanner
                ? 'opacity-100 translate-y-0 scale-100'
                : 'opacity-0 translate-y-6 scale-95 pointer-events-none'
            }`}
          >
            <div
              onClick={isPresenterMode ? handleAdvanceToQ1 : undefined}
              className={`relative p-1 rounded-2xl bg-gradient-to-r from-purple-500/50 via-amber-500/60 to-purple-500/50 shadow-[0_0_40px_rgba(168,85,247,0.35)] transition-all duration-300 ${
                isPresenterMode ? 'cursor-pointer hover:scale-[1.01] active:scale-[0.99] group' : ''
              }`}
              title={isPresenterMode ? 'Clicca per avviare la Prima Frase (Frase 1)' : undefined}
            >
              <div className="px-8 py-3 rounded-[14px] bg-slate-950/90 border border-white/20 backdrop-blur-md flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl animate-bounce">⚡</span>
                  <span className="text-xl lg:text-2xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-pink-200 to-amber-300 drop-shadow">
                    PRONTI ALL'ASTA... PRIMA FRASE AL VIA!
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold tracking-wider text-slate-400 group-hover:text-purple-300 uppercase transition-colors">
                    {isPresenterMode ? 'Clicca per iniziare la Frase 1' : 'Avanti per iniziare'}
                  </span>
                  <span className="w-7 h-7 rounded-lg bg-purple-500/20 border border-purple-400/60 text-purple-300 flex items-center justify-center font-bold text-sm animate-pulse group-hover:bg-purple-500 group-hover:text-black transition-all">
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
            <div className="p-2.5 px-4 rounded-2xl bg-slate-950/90 border border-white/10 shadow-2xl backdrop-blur-md flex items-center justify-between gap-6">
              {/* Pulsanti di Controllo Principali */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Play / Pausa */}
                <button
                  type="button"
                  onClick={togglePlay}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-400 hover:to-violet-400 text-white font-black text-xs tracking-wider uppercase shadow-lg transition-transform hover:scale-105 active:scale-95 flex items-center gap-2 cursor-pointer"
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
                  className="px-3.5 py-2 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-400/40 text-purple-300 font-bold text-xs tracking-wider uppercase transition-colors cursor-pointer"
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
                    className="h-full bg-gradient-to-r from-purple-400 via-violet-400 to-amber-400 transition-all duration-100 relative"
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
                    seekTo(1.6);
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                    manualStep === 1 || (currentTime >= 1.6 && currentTime < 4.5)
                      ? 'bg-purple-500 text-white font-black'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300'
                  }`}
                >
                  1. Obiettivo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setManualStep(2);
                    seekTo(4.8);
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                    manualStep === 2 || (currentTime >= 4.5 && currentTime < 9.5)
                      ? 'bg-amber-500 text-slate-950 font-black'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300'
                  }`}
                >
                  2. Premio
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setManualStep(3);
                    seekTo(9.8);
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                    manualStep === 3 || (currentTime >= 9.5 && currentTime < 18.0)
                      ? 'bg-cyan-500 text-slate-950 font-black'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300'
                  }`}
                >
                  3. Asta
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setManualStep(4);
                    seekTo(18.2);
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                    manualStep === 4 || (currentTime >= 18.0 && currentTime < 26.2)
                      ? 'bg-emerald-500 text-slate-950 font-black'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300'
                  }`}
                >
                  4. Esito
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setManualStep(5);
                    seekTo(26.2);
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                    manualStep === 5 || currentTime >= 26.2
                      ? 'bg-purple-500 text-white font-black'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300'
                  }`}
                >
                  5. Via!
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
          <div className="w-28 h-28 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center pl-2 text-5xl shadow-[0_0_50px_rgba(168,85,247,0.7)] group-hover:scale-110 active:scale-95 transition-transform mb-4">
            ▶
          </div>
          <span className="text-base font-black tracking-widest uppercase text-purple-300 bg-black/70 px-6 py-2 rounded-full border border-purple-400/40 shadow-xl">
            Avvia Spiegazione con Voce Narrante (Spazio)
          </span>
        </div>
      )}

      {/* OVERLAY DI TRANSIZIONE CINEMATICA VERSO LA DOMANDA 1 */}
      {isTransitioningToQ1 && (
        <div className="absolute inset-0 z-50 pointer-events-none flex flex-col items-center justify-center bg-black/75 backdrop-blur-md animate-fade-in transition-all duration-500">
          <div className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden">
            {/* Raggio laser viola/fucsia orizzontale */}
            <div className="w-full h-[3px] bg-gradient-to-r from-transparent via-purple-400 to-transparent shadow-[0_0_40px_#a855f7] animate-pulse" />
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-amber-500/15 to-purple-500/10" />
            <div className="flex items-center gap-4 px-8 py-4 rounded-3xl bg-slate-950/90 border border-purple-400/60 shadow-[0_0_50px_rgba(168,85,247,0.6)] animate-zoom-in">
              <span className="text-3xl animate-bounce">⚡</span>
              <span className="text-2xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-pink-200 to-amber-300 font-serif">
                PREPARARSI... PRIMA FRASE AL VIA!
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
