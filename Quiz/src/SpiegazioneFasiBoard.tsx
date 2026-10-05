import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useGameData } from './context/GameDataContext';
import { assetUrl } from './lib/assetUrl';
import { useSyncedState } from './hooks/useSyncedState';

interface SpiegazioneData {
  src?: string;
  videoUrl?: string;
  sfondo?: string;
  sfondoSpiegazione?: string;
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
  isPresenter?: boolean;
}

// =========================================================================
// MOTORE EFFETTI SONORI PROCEDURALI (Web Audio API nativo a bassissima latenza)
// =========================================================================
class SoundFXEngine {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Rintocco cristallino "Tin" per la comparsa delle singole frecce e righe delta
   */
  playArrowTin() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.28, now);
    masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    masterGain.connect(ctx.destination);

    // Armoniche di campanella metallica brillante (D7 + D8)
    const harmonics = [2349.32, 4698.64, 7047.96];
    const amplitudes = [0.65, 0.28, 0.1];

    harmonics.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      oscGain.gain.setValueAtTime(amplitudes[idx], now);
      oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.26 - idx * 0.05);

      osc.connect(oscGain);
      oscGain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.35);
    });
  }

  /**
   * Suono olografico moderno per l'attivazione dei box di intestazione fase / pill header
   */
  playBoxActivation() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(560, now + 0.16);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, now);
    filter.frequency.exponentialRampToValueAtTime(3200, now + 0.16);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.28);
  }

  /**
   * Rintocco morbido e luccicante per i pod Monete, Bonus e Avatar Prescelti
   */
  playRewardChime() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const notes = [1318.51, 1760.0, 2093.0]; // E6, A6, C7
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.07);

      gain.gain.setValueAtTime(0.001, now + i * 0.07);
      gain.gain.linearRampToValueAtTime(0.18, now + i * 0.07 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.07 + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.07);
      osc.stop(now + i * 0.07 + 0.38);
    });
  }

  /**
   * Suono profondo ed energico per l'innalzamento dei blocchi del podio
   */
  playPodiumRise() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(90, now);
    osc.frequency.exponentialRampToValueAtTime(175, now + 0.25);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(180, now);
    filter.frequency.exponentialRampToValueAtTime(750, now + 0.25);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.24, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.42);
  }

  /**
   * Accordo trionfale per la rivelazione del Trofeo / Fase finale
   */
  playTrophyVictory() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Accordo C Maggiore epico brillante (C5, E5, G5, C6)
    const chord = [523.25, 659.25, 783.99, 1046.5];
    chord.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);

      gain.gain.setValueAtTime(0.001, now + idx * 0.05);
      gain.gain.linearRampToValueAtTime(0.18, now + idx * 0.05 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.05 + 0.65);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.7);
    });
  }
}

const soundFX = new SoundFXEngine();

export default function SpiegazioneFasiBoard({
  interactive = true,
  revealAll = false,
  isPresenter,
}: SpiegazioneFasiBoardProps) {
  const data = useGameData<SpiegazioneData>();
  const slideId = data?.slideId || 'box0_spiegazione';
  const customSfondo = data?.sfondo || data?.sfondoSpiegazione;

  // File audio pulito solo voce (con supporto per '#4 Spiegazione.mp3' e fallback nativo su m4a)
  const audioSrc = useMemo(() => {
    const rawUrl = data?.audioUrl || '/Audio/#4 Spiegazione.mp3';
    const encodedUrl = rawUrl.replace(/#/g, '%23');
    return assetUrl(encodedUrl);
  }, [data?.audioUrl]);

  const fase1Title = data?.fase1Titolo || 'PRODROMI DELLO SCONTRO';
  const fase2Title = data?.fase2Titolo || 'CORSA AGLI EQUIPAGGIAMENTI';
  const fase3Title = data?.fase3Titolo || 'TERMOPILI APOCALITTICHE';

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
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    const isSandbox = params.get('sandbox') === 'true';
    return (mode === 'presenter' || isPresenter === true) && !isSandbox;
  }, [isPresenter]);

  // Sincronizzazione degli stati tra finestre tramite IPC
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

  // Scena attiva condivisa tra tutte le finestre ('fasi' per Parte 1, 'termopili' per Parte 2)
  const [activeScene, setActiveScene] = useSyncedState<'fasi' | 'termopili'>(
    `playstate_${slideId}_scene`,
    'fasi'
  );

  // Sincronizzazione del seek temporale tra tutte le finestre
  const [seekTrigger, setSeekTrigger] = useSyncedState<{ time: number; timestamp: number } | null>(
    `playstate_${slideId}_seek`,
    null
  );

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(49.58);
  const [isMuted, setIsMuted] = useState(isMultiWindowRelatore);
  const [showControls, setShowControls] = useState(true);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hideControlsTimer = useRef<NodeJS.Timeout | null>(null);
  const playedSoundsRef = useRef<Set<string>>(new Set());

  // Pulizia e stop immediato dell'audio all'unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    };
  }, []);

  // Sincronizza audio play/pause con lo stato condiviso isPlaying
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

  // Commutazione automatica della scena in base al timestamp durante la riproduzione
  useEffect(() => {
    if (isPlaying) {
      if (currentTime >= 29.5 && activeScene !== 'termopili') {
        setActiveScene('termopili');
      } else if (currentTime < 29.5 && activeScene !== 'fasi') {
        setActiveScene('fasi');
      }
    }
  }, [currentTime, isPlaying, activeScene, setActiveScene]);

  // Ricezione del comando di seek sincronizzato da qualsiasi finestra
  useEffect(() => {
    if (!seekTrigger) return;
    const target = seekTrigger.time;
    setCurrentTime(target);
    if (audioRef.current) {
      audioRef.current.currentTime = target;
    }
    // Allinea la scena attiva al punto di seek
    if (target >= 29.5) {
      setActiveScene('termopili');
    } else {
      setActiveScene('fasi');
    }

    // Resetta i suoni futuri rispetto al nuovo tempo
    const newPlayed = new Set<string>();
    playedSoundsRef.current.forEach((key) => {
      if (
        (key === 'fase1_box' && target >= 2.6) ||
        (key === 'fase1_a1' && target >= 6.4) ||
        (key === 'fase1_a2' && target >= 7.8) ||
        (key === 'fase1_bottom' && target >= 9.2) ||
        (key === 'fase2_box' && target >= 11.0) ||
        (key === 'fase2_a1' && target >= 14.6) ||
        (key === 'fase2_a2' && target >= 15.6) ||
        (key === 'fase2_coins' && target >= 17.3) ||
        (key === 'fase2_bonus' && target >= 19.5) ||
        (key === 'fase3_box' && target >= 22.7) ||
        (key === 'fase3_a1' && target >= 24.8) ||
        (key === 'fase3_trophy' && target >= 27.0) ||
        (key === 'term_header' && target >= 29.8) ||
        (key === 'term_p1' && target >= 32.8) ||
        (key === 'term_p1_avatars' && target >= 34.0) ||
        (key === 'term_p2' && target >= 37.8) ||
        (key === 'term_delta_1' && target >= 41.0) ||
        (key === 'term_delta_2' && target >= 42.6) ||
        (key === 'term_delta_3' && target >= 44.2) ||
        (key === 'term_p3' && target >= 47.4) ||
        (key === 'term_p3_avatars' && target >= 48.0)
      ) {
        newPlayed.add(key);
      }
    });
    playedSoundsRef.current = newPlayed;
  }, [seekTrigger, setActiveScene]);

  // Aggiornamento tempo audio
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const t = audioRef.current.currentTime;
      setCurrentTime(t);
      if (audioRef.current.duration && !isNaN(audioRef.current.duration)) {
        setDuration(audioRef.current.duration);
      }
      if (t >= 49.3) {
        setIsPlaying(false);
        setIsAllRevealed(true);
      }
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setIsAllRevealed(true);
  };

  // Visibilità dinamica Parte 1 (Fasi 1, 2, 3 con frecce 2 - 2 - 1)
  const showIntroBoot = !isAllRevealed && ((isPlaying && currentTime <= 2.2) || manualStep === 0);

  const showFase1Card = isAllRevealed || (isPlaying && currentTime >= 2.6) || manualStep >= 1;
  const showFase1Arrow1 = isAllRevealed || (isPlaying && currentTime >= 6.4) || manualStep >= 1;
  const showFase1Arrow2 = isAllRevealed || (isPlaying && currentTime >= 7.8) || manualStep >= 1;
  const showFase1Bottom = isAllRevealed || (isPlaying && currentTime >= 9.2) || manualStep >= 1;

  const showFase2Card = isAllRevealed || (isPlaying && currentTime >= 11.0) || manualStep >= 2;
  const showFase2Arrow1 = isAllRevealed || (isPlaying && currentTime >= 14.6) || manualStep >= 2;
  const showFase2Arrow2 = isAllRevealed || (isPlaying && currentTime >= 15.6) || manualStep >= 2;
  const showFase2Coins = isAllRevealed || (isPlaying && currentTime >= 17.3) || manualStep >= 2;
  const showFase2Bonus = isAllRevealed || (isPlaying && currentTime >= 19.5) || manualStep >= 2;

  const showFase3Card = isAllRevealed || (isPlaying && currentTime >= 22.7) || manualStep >= 3;
  const showFase3Arrow = isAllRevealed || (isPlaying && currentTime >= 24.8) || manualStep >= 3;
  const showFase3Trophy = isAllRevealed || (isPlaying && currentTime >= 27.0) || manualStep >= 3;

  // Visibilità dinamica Parte 2 (Termopili & Regole Podio da pt2.mov)
  const showTermopiliHeader = isAllRevealed || (isPlaying && currentTime >= 29.8) || manualStep >= 4;
  const showPodio1 = isAllRevealed || (isPlaying && currentTime >= 32.8) || manualStep >= 5;
  const showPodio1Avatars = isAllRevealed || (isPlaying && currentTime >= 34.0) || manualStep >= 5;
  const showPodio2 = isAllRevealed || (isPlaying && currentTime >= 37.8) || manualStep >= 6;
  const showDeltaTable = isAllRevealed || (isPlaying && currentTime >= 40.5) || manualStep >= 6;
  const showDeltaRow1 = isAllRevealed || (isPlaying && currentTime >= 41.2) || manualStep >= 6;
  const showDeltaRow2 = isAllRevealed || (isPlaying && currentTime >= 42.8) || manualStep >= 6;
  const showDeltaRow3 = isAllRevealed || (isPlaying && currentTime >= 44.5) || manualStep >= 6;
  const showPodio3 = isAllRevealed || (isPlaying && currentTime >= 47.4) || manualStep >= 7;
  const showPodio3Avatars = isAllRevealed || (isPlaying && currentTime >= 48.0) || manualStep >= 7;

  // Riproduzione procedurale sincronizzata degli effetti sonori personalizzati
  const canPlaySFX = !isMuted && interactive;

  useEffect(() => {
    if (!canPlaySFX || isAllRevealed) return;

    const played = playedSoundsRef.current;

    // Parte 1 (Scena Fasi)
    if (activeScene === 'fasi') {
      if (showFase1Card && !played.has('fase1_box')) {
        played.add('fase1_box');
        soundFX.playBoxActivation();
      }
      if (showFase1Arrow1 && !played.has('fase1_a1')) {
        played.add('fase1_a1');
        soundFX.playArrowTin();
      }
      if (showFase1Arrow2 && !played.has('fase1_a2')) {
        played.add('fase1_a2');
        soundFX.playArrowTin();
      }
      if (showFase1Bottom && !played.has('fase1_bottom')) {
        played.add('fase1_bottom');
        soundFX.playRewardChime();
      }

      if (showFase2Card && !played.has('fase2_box')) {
        played.add('fase2_box');
        soundFX.playBoxActivation();
      }
      if (showFase2Arrow1 && !played.has('fase2_a1')) {
        played.add('fase2_a1');
        soundFX.playArrowTin();
      }
      if (showFase2Arrow2 && !played.has('fase2_a2')) {
        played.add('fase2_a2');
        soundFX.playArrowTin();
      }
      if (showFase2Coins && !played.has('fase2_coins')) {
        played.add('fase2_coins');
        soundFX.playRewardChime();
      }
      if (showFase2Bonus && !played.has('fase2_bonus')) {
        played.add('fase2_bonus');
        soundFX.playRewardChime();
      }

      if (showFase3Card && !played.has('fase3_box')) {
        played.add('fase3_box');
        soundFX.playBoxActivation();
      }
      if (showFase3Arrow && !played.has('fase3_a1')) {
        played.add('fase3_a1');
        soundFX.playArrowTin();
      }
      if (showFase3Trophy && !played.has('fase3_trophy')) {
        played.add('fase3_trophy');
        soundFX.playTrophyVictory();
      }
    }

    // Parte 2 (Scena Termopili)
    if (activeScene === 'termopili') {
      if (showTermopiliHeader && !played.has('term_header')) {
        played.add('term_header');
        soundFX.playBoxActivation();
      }
      if (showPodio1 && !played.has('term_p1')) {
        played.add('term_p1');
        soundFX.playPodiumRise();
      }
      if (showPodio1Avatars && !played.has('term_p1_avatars')) {
        played.add('term_p1_avatars');
        soundFX.playRewardChime();
      }
      if (showPodio2 && !played.has('term_p2')) {
        played.add('term_p2');
        soundFX.playPodiumRise();
      }
      if (showDeltaRow1 && !played.has('term_delta_1')) {
        played.add('term_delta_1');
        soundFX.playArrowTin();
      }
      if (showDeltaRow2 && !played.has('term_delta_2')) {
        played.add('term_delta_2');
        soundFX.playArrowTin();
      }
      if (showDeltaRow3 && !played.has('term_delta_3')) {
        played.add('term_delta_3');
        soundFX.playArrowTin();
      }
      if (showPodio3 && !played.has('term_p3')) {
        played.add('term_p3');
        soundFX.playPodiumRise();
      }
      if (showPodio3Avatars && !played.has('term_p3_avatars')) {
        played.add('term_p3_avatars');
        soundFX.playRewardChime();
      }
    }
  }, [
    canPlaySFX,
    isAllRevealed,
    activeScene,
    showFase1Card,
    showFase1Arrow1,
    showFase1Arrow2,
    showFase1Bottom,
    showFase2Card,
    showFase2Arrow1,
    showFase2Arrow2,
    showFase2Coins,
    showFase2Bonus,
    showFase3Card,
    showFase3Arrow,
    showFase3Trophy,
    showTermopiliHeader,
    showPodio1,
    showPodio1Avatars,
    showPodio2,
    showDeltaRow1,
    showDeltaRow2,
    showDeltaRow3,
    showPodio3,
    showPodio3Avatars,
  ]);

  // Seek sincronizzato
  const seekTo = useCallback(
    (time: number) => {
      const clamped = Math.max(0, Math.min(duration, time));
      setCurrentTime(clamped);
      if (audioRef.current) {
        audioRef.current.currentTime = clamped;
      }
      if (clamped >= 29.5) {
        setActiveScene('termopili');
      } else {
        setActiveScene('fasi');
      }
      setSeekTrigger({ time: clamped, timestamp: Date.now() });
    },
    [duration, setSeekTrigger, setActiveScene]
  );

  // Play / Pausa
  const togglePlay = useCallback(() => {
    if (!interactive) return;
    if (currentTime >= 49.3) {
      seekTo(0);
      setIsAllRevealed(false);
      setManualStep(0);
      setIsPlaying(true);
      return;
    }
    setIsPlaying((prev) => !prev);
  }, [interactive, currentTime, seekTo, setIsAllRevealed, setManualStep, setIsPlaying]);

  // Riavvia dall'inizio
  const restartPlayback = useCallback(() => {
    if (!interactive) return;
    playedSoundsRef.current.clear();
    seekTo(0);
    setActiveScene('fasi');
    setIsAllRevealed(false);
    setManualStep(0);
    setIsPlaying(true);
  }, [interactive, setIsPlaying, setIsAllRevealed, setManualStep, seekTo, setActiveScene]);

  // Reset all
  const resetAllState = useCallback(() => {
    if (!interactive) return;
    playedSoundsRef.current.clear();
    if (audioRef.current) {
      audioRef.current.pause();
    }
    seekTo(0);
    setActiveScene('fasi');
    setIsPlaying(false);
    setIsAllRevealed(false);
    setManualStep(0);
  }, [interactive, setIsPlaying, setIsAllRevealed, setManualStep, seekTo, setActiveScene]);

  // Svela tutto immediatamente e ferma la voce narrante
  const revealEverything = useCallback(() => {
    if (!interactive) return;
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
    setIsAllRevealed(true);
    setManualStep(7);
    if (canPlaySFX) {
      soundFX.playTrophyVictory();
    }
  }, [interactive, setIsAllRevealed, setManualStep, setIsPlaying, canPlaySFX]);

  // Salti alle fasi specifiche con seek sincronizzato
  const jumpToFase1 = useCallback(() => {
    setActiveScene('fasi');
    setManualStep(1);
    seekTo(2.6);
  }, [setManualStep, seekTo, setActiveScene]);

  const jumpToFase2 = useCallback(() => {
    setActiveScene('fasi');
    setManualStep(2);
    seekTo(11.0);
  }, [setManualStep, seekTo, setActiveScene]);

  const jumpToFase3 = useCallback(() => {
    setActiveScene('fasi');
    setManualStep(3);
    seekTo(22.7);
  }, [setManualStep, seekTo, setActiveScene]);

  const jumpToTermopiliIntro = useCallback(() => {
    setActiveScene('termopili');
    setManualStep(4);
    seekTo(29.8);
  }, [setManualStep, seekTo, setActiveScene]);

  const jumpToPodio1 = useCallback(() => {
    setActiveScene('termopili');
    setManualStep(5);
    seekTo(32.8);
  }, [setManualStep, seekTo, setActiveScene]);

  const jumpToPodio2Delta = useCallback(() => {
    setActiveScene('termopili');
    setManualStep(6);
    seekTo(37.8);
  }, [setManualStep, seekTo, setActiveScene]);

  const jumpToPodio3 = useCallback(() => {
    setActiveScene('termopili');
    setManualStep(7);
    seekTo(47.4);
  }, [setManualStep, seekTo, setActiveScene]);

  // Passo successivo
  const nextStep = useCallback(() => {
    if (!interactive) return;
    if (manualStep < 7) {
      const next = manualStep + 1;
      setManualStep(next);
      if (next === 1) jumpToFase1();
      else if (next === 2) jumpToFase2();
      else if (next === 3) jumpToFase3();
      else if (next === 4) jumpToTermopiliIntro();
      else if (next === 5) jumpToPodio1();
      else if (next === 6) jumpToPodio2Delta();
      else if (next === 7) jumpToPodio3();
    } else {
      revealEverything();
    }
  }, [
    interactive,
    manualStep,
    setManualStep,
    jumpToFase1,
    jumpToFase2,
    jumpToFase3,
    jumpToTermopiliIntro,
    jumpToPodio1,
    jumpToPodio2Delta,
    jumpToPodio3,
    revealEverything,
  ]);

  // Passo precedente
  const prevStep = useCallback(() => {
    if (!interactive) return;
    if (manualStep > 0) {
      const prev = manualStep - 1;
      setManualStep(prev);
      if (prev === 0) {
        seekTo(0);
        setActiveScene('fasi');
      } else if (prev === 1) jumpToFase1();
      else if (prev === 2) jumpToFase2();
      else if (prev === 3) jumpToFase3();
      else if (prev === 4) jumpToTermopiliIntro();
      else if (prev === 5) jumpToPodio1();
      else if (prev === 6) jumpToPodio2Delta();
    }
  }, [
    interactive,
    manualStep,
    setManualStep,
    seekTo,
    setActiveScene,
    jumpToFase1,
    jumpToFase2,
    jumpToFase3,
    jumpToTermopiliIntro,
    jumpToPodio1,
    jumpToPodio2Delta,
  ]);

  // Gestione Mute
  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  // Keyboard shortcut listener
  useEffect(() => {
    if (!interactive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignora digitazione se in un input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      if (e.code === 'Space' || e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === '1') {
        e.preventDefault();
        jumpToFase1();
      } else if (e.key === '2') {
        e.preventDefault();
        jumpToFase2();
      } else if (e.key === '3') {
        e.preventDefault();
        jumpToFase3();
      } else if (e.key === '4') {
        e.preventDefault();
        jumpToTermopiliIntro();
      } else if (e.key === '5') {
        e.preventDefault();
        jumpToPodio1();
      } else if (e.key === '6') {
        e.preventDefault();
        jumpToPodio2Delta();
      } else if (e.key === '7') {
        e.preventDefault();
        jumpToPodio3();
      } else if (e.key === 'Tab' || e.key === 't' || e.key === 'T') {
        e.preventDefault();
        setActiveScene((prev) => (prev === 'fasi' ? 'termopili' : 'fasi'));
      } else if (e.key === 'Enter' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        revealEverything();
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        restartPlayback();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        toggleMute();
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        nextStep();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        prevStep();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    interactive,
    togglePlay,
    jumpToFase1,
    jumpToFase2,
    jumpToFase3,
    jumpToTermopiliIntro,
    jumpToPodio1,
    jumpToPodio2Delta,
    jumpToPodio3,
    setActiveScene,
    revealEverything,
    restartPlayback,
    toggleMute,
    nextStep,
    prevStep,
  ]);

  // Gestione comparsa controlli su movimento mouse (solo relatore)
  const handleMouseMove = () => {
    if (!isPresenterMode) return;
    setShowControls(true);
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    hideControlsTimer.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 4500);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      className="relative w-[1920px] h-[1080px] overflow-hidden select-none bg-[#07090f] text-white flex flex-col items-center justify-between font-sans px-12 py-8"
    >
      <style>{`
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
        @keyframes chevron-pop {
          0% {
            opacity: 0;
            transform: translateY(-20px) scale(0.7);
          }
          70% {
            opacity: 1;
            transform: translateY(3px) scale(1.08);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes podium-rise {
          0% {
            opacity: 0;
            transform: translateY(180px) scale(0.95);
          }
          65% {
            opacity: 1;
            transform: translateY(-10px) scale(1.02);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes avatar-pop {
          0% {
            opacity: 0;
            transform: scale(0.4) translateY(25px);
          }
          70% {
            opacity: 1;
            transform: scale(1.15) translateY(-6px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        @keyframes delta-slide-in {
          0% {
            opacity: 0;
            transform: translateX(-35px);
          }
          100% {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes grid-pulse {
          0%, 100% { opacity: 0.12; }
          50% { opacity: 0.24; }
        }
      `}</style>

      {/* Audio Element con voce narrante pulita (#4 Spiegazione.mp3 con fallback a m4a) */}
      {interactive && (
        <audio
          ref={audioRef}
          src={audioSrc}
          muted={isMuted}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleAudioEnded}
          onError={() => {
            console.warn('Fallback caricamento audio a formato compatibile...');
            if (audioRef.current && !audioRef.current.src.includes('spiegazione_fasi_audio.m4a')) {
              audioRef.current.src = assetUrl('/Audio/spiegazione_fasi_audio.m4a');
              audioRef.current.load();
              if (isPlaying) audioRef.current.play().catch(() => {});
            }
          }}
          preload="auto"
        />
      )}

      {/* ========================================================================= */}
      {/* SFONDO E CORNICE OLOGRAFICA HUD                                           */}
      {/* ========================================================================= */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Sfondo personalizzato da setup (se specificato) */}
        {customSfondo && (
          <>
            <img
              src={assetUrl(customSfondo)}
              alt="Sfondo Spiegazione"
              className="absolute inset-0 w-full h-full object-cover"
            />
            {/* Overlay scuro soffuso semitrasparente per dare profondità e massimo risalto alla grafica */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#07090f]/75 via-[#07090f]/45 to-[#07090f]/80" />
          </>
        )}

        {/* Luci volumetriche ambientali */}
        <div
          className={`absolute -top-24 left-[10%] w-[550px] h-[550px] bg-red-600/15 rounded-full blur-[140px] ${
            customSfondo ? 'opacity-40' : 'opacity-100'
          }`}
        />
        <div
          className={`absolute -top-24 left-[50%] -translate-x-1/2 w-[550px] h-[550px] bg-emerald-600/15 rounded-full blur-[140px] ${
            customSfondo ? 'opacity-40' : 'opacity-100'
          }`}
        />
        <div
          className={`absolute -top-24 right-[10%] w-[550px] h-[550px] bg-sky-600/15 rounded-full blur-[140px] ${
            customSfondo ? 'opacity-40' : 'opacity-100'
          }`}
        />
        <div
          className={`absolute -bottom-32 left-[50%] -translate-x-1/2 w-[900px] h-[400px] bg-indigo-900/15 rounded-full blur-[160px] ${
            customSfondo ? 'opacity-40' : 'opacity-100'
          }`}
        />

        {/* Griglia Blueprint tecnologica */}
        <div
          className={`absolute inset-0 ${customSfondo ? 'opacity-35' : 'opacity-100'}`}
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px)
            `,
            backgroundSize: '48px 48px',
            animation: 'grid-pulse 6s ease-in-out infinite',
          }}
        />

        {/* Gradiente radiale centrale solo se non c'è sfondo personalizzato */}
        {!customSfondo && (
          <div className="absolute inset-0 bg-radial from-transparent via-[#07090f]/70 to-[#07090f] opacity-90" />
        )}

        {/* Bracket angolari futuristici */}
        <svg className="absolute inset-0 w-full h-full text-white/10" fill="none">
          <path d="M 40 100 L 40 40 L 100 40" stroke="currentColor" strokeWidth="2" />
          <circle cx="40" cy="40" r="3" fill="currentColor" />
          <path d="M 1880 100 L 1880 40 L 1820 40" stroke="currentColor" strokeWidth="2" />
          <circle cx="1880" cy="40" r="3" fill="currentColor" />
          <path d="M 40 980 L 40 1040 L 100 1040" stroke="currentColor" strokeWidth="2" />
          <circle cx="40" cy="1040" r="3" fill="currentColor" />
          <path d="M 1880 980 L 1880 1040 L 1820 1040" stroke="currentColor" strokeWidth="2" />
          <circle cx="1880" cy="1040" r="3" fill="currentColor" />
        </svg>

        {/* Linea di scansione energetica nei primissimi secondi */}
        {showIntroBoot && (
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-20 flex items-center justify-center pointer-events-none z-30 opacity-80 transition-opacity duration-700">
            <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_25px_#38bdf8]" />
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SCENA 1: LE TRE FASI DEL GIOCO (Parte 1: 0s - 29.5s)                     */}
      {/* ========================================================================= */}
      {activeScene === 'fasi' && (
        <div className="relative z-10 w-full h-full flex flex-col items-center justify-between transition-all duration-700">
          {/* HEADER: TITOLO E INTRODUZIONE REGOLAMENTO */}
          <header className="relative w-full max-w-[1780px] flex flex-col items-center shrink-0 pt-2 pb-3">
            <div className="flex items-center gap-3 px-4 py-1.5 rounded-full bg-white/5 border border-white/15 backdrop-blur-md shadow-lg mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
              <span className="text-xs font-mono font-black uppercase tracking-[0.25em] text-amber-300">
                IMPERIO VIII • REGOLAMENTO UFFICIALE
              </span>
              <span className="text-white/30 text-xs">|</span>
              <span className="text-xs font-mono font-bold tracking-wider text-white/60">
                PARTE 1: ARCHITETTURA DEL TORNEO
              </span>
            </div>

            <h1 className="text-4xl lg:text-5xl font-black tracking-tight uppercase text-transparent bg-clip-text bg-gradient-to-r from-white via-white/95 to-white/70 drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)] text-center">
              LE TRE FASI DEL GIOCO
            </h1>
            <p className="text-sm font-semibold tracking-widest uppercase text-white/50 mt-1">
              Dalla conquista iniziale dei punti fino alla manche decisiva delle Termopili
            </p>
          </header>

          {/* MAIN CONTENT: LE 3 COLONNE (FASI CON FRECCE 2 - 2 - 1) */}
          <main className="relative w-full max-w-[1780px] flex-1 grid grid-cols-3 gap-12 items-stretch min-h-0 my-2">
            {/* COLONNA 1: FASE 1 - PRODROMI DELLO SCONTRO (2 Frecce - Rosso) */}
            <section
              className={`flex flex-col items-center justify-between rounded-3xl p-7 transition-all duration-700 relative overflow-hidden ${
                showFase1Card
                  ? 'bg-gradient-to-b from-red-950/45 via-red-950/20 to-black/65 border border-red-500/35 shadow-[0_8px_35px_rgba(220,38,38,0.22)] backdrop-blur-md'
                  : 'border border-white/5 bg-white/[0.01]'
              }`}
            >
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-80" />

              {/* Header Fase 1 */}
              <div
                className={`w-full transition-all duration-700 ${
                  showFase1Card ? 'opacity-100' : 'opacity-0 -translate-y-8 pointer-events-none'
                }`}
                style={{
                  animation: showFase1Card ? 'card-entry 0.65s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' : 'none',
                }}
              >
                <div className="relative w-full rounded-2xl p-6 bg-gradient-to-br from-red-600 via-rose-700 to-red-800 border-2 border-red-400 text-white shadow-[0_12px_35px_rgba(220,38,38,0.65)] flex flex-col items-center justify-center text-center overflow-hidden min-h-[145px]">
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

              {/* Frecce Fase 1 (Esattamente 2 Frecce con "Tin" procedurale) */}
              <div
                className="my-auto flex flex-col items-center justify-center py-4"
                style={{
                  animation: showFase1Arrow1 ? 'pulse-glow-red 2.4s ease-in-out infinite' : 'none',
                }}
              >
                <svg width="130" height="200" viewBox="0 0 120 200" fill="none" className="overflow-visible">
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

                  {/* Freccia 1 */}
                  <g
                    filter="url(#redGlow)"
                    className={`transition-all duration-500 ${
                      showFase1Arrow1 ? 'opacity-100' : 'opacity-0 translate-y-[-15px]'
                    }`}
                    style={{
                      animation: showFase1Arrow1 ? 'chevron-pop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' : 'none',
                    }}
                  >
                    <path
                      d="M 16 50 L 60 92 L 104 50"
                      stroke="url(#redArrowGrad)"
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

                  {/* Freccia 2 */}
                  <g
                    filter="url(#redGlow)"
                    className={`transition-all duration-500 ${
                      showFase1Arrow2 ? 'opacity-100' : 'opacity-0 translate-y-[-15px]'
                    }`}
                    style={{
                      animation: showFase1Arrow2 ? 'chevron-pop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' : 'none',
                    }}
                  >
                    <path
                      d="M 16 115 L 60 157 L 104 115"
                      stroke="url(#redArrowGrad)"
                      strokeWidth="13"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M 22 115 L 60 151 L 98 115"
                      stroke="#ffffff"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeOpacity="0.75"
                    />
                  </g>
                </svg>

                {/* Micro-label dei giochi svelati */}
                <div className="flex flex-col gap-1 items-center mt-2 font-mono text-[11px] font-bold text-red-300/80">
                  <span className={`transition-opacity duration-500 ${showFase1Arrow1 ? 'opacity-100' : 'opacity-0'}`}>
                    • GIOCO 1: NOME È NESSUNO
                  </span>
                  <span className={`transition-opacity duration-500 ${showFase1Arrow2 ? 'opacity-100' : 'opacity-0'}`}>
                    • GIOCO 2: CLASSIFICA
                  </span>
                </div>
              </div>

              {/* Bottom Badge Fase 1: Punti */}
              <div
                className={`w-full transition-all duration-700 ${
                  showFase1Bottom ? 'opacity-100' : 'opacity-0 translate-y-8 pointer-events-none'
                }`}
                style={{
                  animation: showFase1Bottom ? 'badge-entry 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' : 'none',
                }}
              >
                <div className="w-full h-[96px] rounded-2xl p-4 bg-gradient-to-r from-red-950/80 via-red-900/60 to-red-950/80 border border-red-500/50 flex items-center justify-between shadow-[0_4px_20px_rgba(220,38,38,0.35)]">
                  <div className="flex items-center gap-3.5">
                    <div className="w-13 h-13 rounded-xl bg-red-500/20 border border-red-400/40 flex items-center justify-center text-red-300 font-mono font-black text-2xl shadow-inner">
                      🎯
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-mono font-bold tracking-widest text-red-300 uppercase">
                        OBIETTIVO FASE
                      </span>
                      <span className="text-lg font-black tracking-wide text-white uppercase">
                        PUNTI IN PALIO
                      </span>
                    </div>
                  </div>
                  <div className="px-3.5 py-1.5 rounded-lg bg-red-500/30 border border-red-400/50 text-red-200 font-mono font-black text-xs">
                    STEP 1 & 2
                  </div>
                </div>
              </div>
            </section>

            {/* COLONNA 2: FASE 2 - CORSA AGLI EQUIPAGGIAMENTI (2 Frecce - Verde) */}
            <section
              className={`flex flex-col items-center justify-between rounded-3xl p-7 transition-all duration-700 relative overflow-hidden ${
                showFase2Card
                  ? 'bg-gradient-to-b from-emerald-950/45 via-emerald-950/20 to-black/65 border border-emerald-500/35 shadow-[0_8px_35px_rgba(16,185,129,0.22)] backdrop-blur-md'
                  : 'border border-white/5 bg-white/[0.01]'
              }`}
            >
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-80" />

              {/* Header Fase 2 */}
              <div
                className={`w-full transition-all duration-700 ${
                  showFase2Card ? 'opacity-100' : 'opacity-0 -translate-y-8 pointer-events-none'
                }`}
                style={{
                  animation: showFase2Card ? 'card-entry 0.65s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' : 'none',
                }}
              >
                <div className="relative w-full rounded-2xl p-6 bg-gradient-to-br from-emerald-600 via-teal-700 to-emerald-800 border-2 border-emerald-400 text-white shadow-[0_12px_35px_rgba(16,185,129,0.65)] flex flex-col items-center justify-center text-center overflow-hidden min-h-[145px]">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-white/20 pointer-events-none" />
                  <span className="text-xs font-mono font-black tracking-[0.3em] uppercase text-emerald-200 bg-emerald-950/70 px-3 py-0.5 rounded-full border border-emerald-400/40 mb-1.5 shadow-inner">
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

              {/* Frecce Fase 2 (Esattamente 2 Frecce con "Tin" procedurale) */}
              <div
                className="my-auto flex flex-col items-center justify-center py-4"
                style={{
                  animation: showFase2Arrow1 ? 'pulse-glow-green 2.4s ease-in-out infinite' : 'none',
                }}
              >
                <svg width="130" height="200" viewBox="0 0 120 200" fill="none" className="overflow-visible">
                  <defs>
                    <linearGradient id="emeraldArrowGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#34d399" />
                      <stop offset="100%" stopColor="#059669" />
                    </linearGradient>
                    <filter id="emeraldGlow" x="-30%" y="-30%" width="160%" height="160%">
                      <feGaussianBlur stdDeviation="4" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  {/* Freccia 1 */}
                  <g
                    filter="url(#emeraldGlow)"
                    className={`transition-all duration-500 ${
                      showFase2Arrow1 ? 'opacity-100' : 'opacity-0 translate-y-[-15px]'
                    }`}
                    style={{
                      animation: showFase2Arrow1 ? 'chevron-pop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' : 'none',
                    }}
                  >
                    <path
                      d="M 16 50 L 60 92 L 104 50"
                      stroke="url(#emeraldArrowGrad)"
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

                  {/* Freccia 2 */}
                  <g
                    filter="url(#emeraldGlow)"
                    className={`transition-all duration-500 ${
                      showFase2Arrow2 ? 'opacity-100' : 'opacity-0 translate-y-[-15px]'
                    }`}
                    style={{
                      animation: showFase2Arrow2 ? 'chevron-pop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' : 'none',
                    }}
                  >
                    <path
                      d="M 16 115 L 60 157 L 104 115"
                      stroke="url(#emeraldArrowGrad)"
                      strokeWidth="13"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M 22 115 L 60 151 L 98 115"
                      stroke="#ffffff"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeOpacity="0.75"
                    />
                  </g>
                </svg>

                {/* Micro-label dei giochi svelati */}
                <div className="flex flex-col gap-1 items-center mt-2 font-mono text-[11px] font-bold text-emerald-300/80">
                  <span className={`transition-opacity duration-500 ${showFase2Arrow1 ? 'opacity-100' : 'opacity-0'}`}>
                    • GIOCO 3: PASSWORD
                  </span>
                  <span className={`transition-opacity duration-500 ${showFase2Arrow2 ? 'opacity-100' : 'opacity-0'}`}>
                    • GIOCO 4: FRASE TEMPO
                  </span>
                </div>
              </div>

              {/* Bottom Badge Fase 2: Punti + Bonus */}
              <div
                className={`w-full h-[96px] grid grid-cols-2 gap-3 transition-all duration-700 ${
                  showFase2Coins || showFase2Bonus ? 'opacity-100' : 'opacity-0 translate-y-8 pointer-events-none'
                }`}
              >
                {/* Pod 1: Punti */}
                <div
                  className={`h-full rounded-2xl px-4 py-3 bg-gradient-to-b from-amber-950/75 to-black/85 border border-amber-500/50 flex items-center gap-3 shadow-[0_4px_18px_rgba(245,158,11,0.25)] transition-all duration-500 ${
                    showFase2Coins ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
                  }`}
                  style={{
                    animation: showFase2Coins ? 'badge-entry 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' : 'none',
                  }}
                >
                  <CoinsGraphic className="w-14 h-14 shrink-0 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-[11px] font-mono font-bold tracking-wider text-amber-300 uppercase">
                      MONTEPREMI
                    </span>
                    <span className="text-base font-black tracking-wide text-white uppercase truncate">
                      PUNTI
                    </span>
                  </div>
                </div>

                {/* Pod 2: Bonus Equipaggiamento */}
                <div
                  className={`h-full rounded-2xl px-4 py-3 bg-gradient-to-b from-emerald-950/75 to-black/85 border border-emerald-400/50 flex items-center gap-3 shadow-[0_4px_18px_rgba(52,211,153,0.25)] transition-all duration-500 ${
                    showFase2Bonus ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
                  }`}
                  style={{
                    animation: showFase2Bonus ? 'badge-entry 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s forwards' : 'none',
                  }}
                >
                  <BonusGraphic className="w-14 h-14 shrink-0 drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-[11px] font-mono font-bold tracking-wider text-emerald-300 uppercase">
                      FINALE
                    </span>
                    <span className="text-base font-black tracking-wide text-emerald-200 uppercase truncate">
                      BONUS
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* COLONNA 3: FASE 3 - TERMOPILI APOCALITTICHE (1 Freccia Finale - Blu/Oro) */}
            <section
              className={`flex flex-col items-center justify-between rounded-3xl p-7 transition-all duration-700 relative overflow-hidden ${
                showFase3Card
                  ? 'bg-gradient-to-b from-sky-950/45 via-sky-950/20 to-black/65 border border-sky-500/35 shadow-[0_8px_35px_rgba(56,189,248,0.22)] backdrop-blur-md'
                  : 'border border-white/5 bg-white/[0.01]'
              }`}
            >
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-sky-400 to-transparent opacity-80" />

              {/* Header Fase 3 */}
              <div
                className={`w-full transition-all duration-700 ${
                  showFase3Card ? 'opacity-100' : 'opacity-0 -translate-y-8 pointer-events-none'
                }`}
                style={{
                  animation: showFase3Card ? 'card-entry 0.65s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' : 'none',
                }}
              >
                <div className="relative w-full rounded-2xl p-6 bg-gradient-to-br from-sky-600 via-indigo-700 to-blue-900 border-2 border-sky-300 text-white shadow-[0_12px_35px_rgba(56,189,248,0.65)] flex flex-col items-center justify-center text-center overflow-hidden min-h-[145px]">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-white/20 pointer-events-none" />
                  <span className="text-xs font-mono font-black tracking-[0.3em] uppercase text-sky-200 bg-sky-950/70 px-3 py-0.5 rounded-full border border-sky-400/40 mb-1.5 shadow-inner">
                    FASE 3 • FINALE
                  </span>
                  <h2 className="text-2xl lg:text-[27px] font-black uppercase tracking-wide leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                    {fase3Title}
                  </h2>
                  <span className="text-[11px] font-bold uppercase tracking-widest text-sky-100/80 mt-1.5">
                    Scontro Finale • Decretazione Vincente
                  </span>
                </div>
              </div>

              {/* Freccia Fase 3 (Esattamente 1 Freccia Maestra Finale) */}
              <div
                className="my-auto flex flex-col items-center justify-center py-4"
                style={{
                  animation: showFase3Arrow ? 'pulse-glow-blue 2.4s ease-in-out infinite' : 'none',
                }}
              >
                <svg width="150" height="200" viewBox="0 0 140 200" fill="none" className="overflow-visible">
                  <defs>
                    <linearGradient id="skyArrowGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#38bdf8" />
                      <stop offset="50%" stopColor="#818cf8" />
                      <stop offset="100%" stopColor="#6366f1" />
                    </linearGradient>
                    <filter id="skyGlow" x="-30%" y="-30%" width="160%" height="160%">
                      <feGaussianBlur stdDeviation="5" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  {/* Freccia Singola Massima */}
                  <g
                    filter="url(#skyGlow)"
                    className={`transition-all duration-600 ${
                      showFase3Arrow ? 'opacity-100' : 'opacity-0 translate-y-[-20px]'
                    }`}
                    style={{
                      animation: showFase3Arrow ? 'chevron-pop 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' : 'none',
                    }}
                  >
                    <path
                      d="M 18 75 L 70 130 L 122 75"
                      stroke="url(#skyArrowGrad)"
                      strokeWidth="16"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M 26 75 L 70 122 L 114 75"
                      stroke="#ffffff"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeOpacity="0.85"
                    />
                  </g>
                </svg>

                <div className="flex flex-col items-center mt-2 font-mono text-[11px] font-bold text-sky-300/80">
                  <span className={`transition-opacity duration-500 ${showFase3Arrow ? 'opacity-100' : 'opacity-0'}`}>
                    • MANCHE CONCLUSIVA AD ALTA TENSIONE
                  </span>
                </div>
              </div>

              {/* Bottom Badge Fase 3: Trofeo Vincitore */}
              <div
                className={`w-full transition-all duration-700 ${
                  showFase3Trophy ? 'opacity-100' : 'opacity-0 translate-y-8 pointer-events-none'
                }`}
                style={{
                  animation: showFase3Trophy ? 'badge-entry 0.65s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' : 'none',
                }}
              >
                <div className="w-full h-[96px] rounded-2xl p-4 bg-gradient-to-r from-amber-950/80 via-yellow-900/60 to-amber-950/80 border border-amber-400/60 flex items-center justify-between shadow-[0_4px_25px_rgba(245,158,11,0.45)]">
                  <div className="flex items-center gap-3.5">
                    <TrophyGraphic className="w-13 h-13 shrink-0 drop-shadow-[0_0_15px_rgba(250,204,21,0.6)]" />
                    <div className="flex flex-col">
                      <span className="text-xs font-mono font-bold tracking-widest text-amber-300 uppercase">
                        EPILOGO
                      </span>
                      <span className="text-lg font-black tracking-wide text-yellow-100 uppercase">
                        SQUADRA VINCENTE
                      </span>
                    </div>
                  </div>
                  <div className="px-3.5 py-1.5 rounded-lg bg-amber-500/30 border border-amber-300/60 text-amber-200 font-mono font-black text-xs animate-pulse">
                    VITTORIA
                  </div>
                </div>
              </div>
            </section>
          </main>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SCENA 2: TERMOPILI — IL PODIO DEI PRESCELTI (Parte 2: 30s - 50s da pt2.mov) */}
      {/* ========================================================================= */}
      {activeScene === 'termopili' && (
        <div className="relative z-10 w-full h-full flex flex-col items-center justify-between transition-all duration-700">
          {/* HEADER DELLA PARTE 2: PILL BADGE TERMOPILI & TICKER RIASSUNTIVO */}
          <header className="relative w-full max-w-[1780px] flex flex-col items-center shrink-0 pt-3 pb-2 z-20">
            <div
              className={`transition-all duration-700 flex flex-col items-center ${
                showTermopiliHeader ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-6 pointer-events-none'
              }`}
            >
              {/* Top Tag Ufficiale */}
              <div className="flex items-center gap-2.5 px-4 py-1 rounded-full bg-white/5 border border-emerald-400/30 backdrop-blur-md shadow-md mb-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-[11px] font-mono font-black uppercase tracking-[0.25em] text-emerald-300">
                  IMPERIO VIII • REGOLAMENTO UFFICIALE
                </span>
                <span className="text-white/30 text-xs">|</span>
                <span className="text-[11px] font-mono font-bold tracking-wider text-white/70">
                  PARTE 2: MANCHE FINALE & PRESCELTI
                </span>
              </div>

              {/* Pill Badge Olografico "TERMOPILI" con ali grafiche */}
              <div className="flex items-center gap-5">
                <div className="hidden md:flex items-center gap-2 opacity-60">
                  <div className="w-14 h-[1px] bg-gradient-to-r from-transparent to-emerald-400" />
                  <div className="w-1.5 h-1.5 rotate-45 border border-emerald-400 bg-emerald-950" />
                </div>

                <div className="px-16 py-2.5 rounded-full bg-gradient-to-r from-teal-950/90 via-emerald-900/90 to-teal-950/90 border-2 border-emerald-400 shadow-[0_0_35px_rgba(52,211,153,0.45)] flex items-center justify-center">
                  <span className="text-3xl lg:text-4xl font-black tracking-[0.25em] text-white uppercase drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">
                    TERMOPILI
                  </span>
                </div>

                <div className="hidden md:flex items-center gap-2 opacity-60">
                  <div className="w-1.5 h-1.5 rotate-45 border border-emerald-400 bg-emerald-950" />
                  <div className="w-14 h-[1px] bg-gradient-to-l from-transparent to-emerald-400" />
                </div>
              </div>

              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs font-mono font-bold tracking-[0.3em] uppercase text-emerald-300/80">
                  SCONTRO FINALE • REGOLE DI QUALIFICAZIONE & PRESCELTI
                </span>
              </div>
            </div>
          </header>

          {/* STAGE CONTAINER: FRAME OLOGRAFICO CON PODIO E REGOLE */}
          <main className="relative w-full max-w-[1780px] flex-1 flex flex-col justify-end min-h-0 pb-6 px-6">
            {/* Cornice Rettangolare Tech come nel video pt2.mov */}
            <div className="absolute inset-x-6 inset-y-1 rounded-3xl border border-cyan-400/25 bg-gradient-to-b from-cyan-950/20 via-transparent to-black/45 pointer-events-none" />

            {/* Strip HUD Superiore all'interno della cornice */}
            <div className="relative z-10 w-full flex items-center justify-between px-8 pb-3 text-[10px] font-mono font-bold text-cyan-400/50 uppercase tracking-widest pointer-events-none">
              <span className="flex items-center gap-2">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400/70" />
                TABELLONE QUALIFICAZIONE ALLA FASE DECISIVA
              </span>
              <span className="flex items-center gap-2">
                SCHIERAMENTO PRESCELTI AL TAVOLO DELLE TERMOPILI
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400/70" />
              </span>
            </div>

            {/* PALCO PODIO: 3 COLONNE VERTICALI UNIFICATE (2, 1, 3) */}
            <div className="relative z-10 w-full flex items-end justify-center">
              {/* ========================================================= */}
              {/* COLONNA 2: 2° POSTO (ARGENTO - SINISTRA)                  */}
              {/* ========================================================= */}
              <div className="w-[490px] flex flex-col items-center justify-end">
                {/* ZONA SUPERIORE: TABELLA DELTA (CENTRATA SU PODIO 2) */}
                <div className="w-full max-w-[450px] flex flex-col items-center justify-end h-[530px] pb-5">
                  {/* Titolo Delta con spiegazione chiara */}
                  <div
                    className={`transition-all duration-600 mb-4 flex flex-col items-center text-center ${
                      showDeltaTable ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                    }`}
                  >
                    <div className="px-5 py-1.5 rounded-full bg-slate-800/90 border border-slate-400/60 text-slate-200 font-mono font-black text-xs uppercase tracking-widest shadow-md flex items-center gap-2">
                      <span>📊 CRITERIO DEL DIVARIO PUNTI</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-slate-400/80 mt-1">
                      DISTACCO RISPETTO ALLA 1ª SQUADRA
                    </span>
                  </div>

                  {/* Righe Delta */}
                  <div className="w-full flex flex-col gap-3.5">
                    {/* Riga 1: 6x < 3.000 */}
                    <div
                      className={`flex items-center gap-3 transition-all duration-500 ${
                        showDeltaRow1 ? 'opacity-100' : 'opacity-0 -translate-x-8 pointer-events-none'
                      }`}
                      style={{
                        animation: showDeltaRow1 ? 'delta-slide-in 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' : 'none',
                      }}
                    >
                      <div className="w-24 py-2.5 rounded-2xl bg-gradient-to-r from-blue-700 to-indigo-600 border border-blue-400/80 shadow-[0_0_15px_rgba(59,130,246,0.35)] flex items-center justify-center">
                        <span className="text-2xl font-black text-white">6 x</span>
                      </div>
                      <PersonIcon className="w-20 h-20 shrink-0 drop-shadow-[0_0_12px_rgba(56,189,248,0.6)]" />
                      <div className="flex-1 py-2.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 border border-emerald-400/80 shadow-[0_0_15px_rgba(16,185,129,0.35)] flex items-center justify-center">
                        <span className="text-2xl font-black text-white tracking-wide">&lt; 3.000</span>
                      </div>
                    </div>

                    {/* Riga 2: 5x 3.000 - 15.000 */}
                    <div
                      className={`flex items-center gap-3 transition-all duration-500 ${
                        showDeltaRow2 ? 'opacity-100' : 'opacity-0 -translate-x-8 pointer-events-none'
                      }`}
                      style={{
                        animation: showDeltaRow2 ? 'delta-slide-in 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' : 'none',
                      }}
                    >
                      <div className="w-24 py-2.5 rounded-2xl bg-gradient-to-r from-blue-700 to-indigo-600 border border-blue-400/80 shadow-[0_0_15px_rgba(59,130,246,0.35)] flex items-center justify-center">
                        <span className="text-2xl font-black text-white">5 x</span>
                      </div>
                      <PersonIcon className="w-20 h-20 shrink-0 drop-shadow-[0_0_12px_rgba(56,189,248,0.6)]" />
                      <div className="flex-1 py-1.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 border border-emerald-400/80 shadow-[0_0_15px_rgba(16,185,129,0.35)] flex flex-col items-center justify-center leading-tight">
                        <span className="text-lg font-black text-white">3.000</span>
                        <span className="text-lg font-black text-white">15.000</span>
                      </div>
                    </div>

                    {/* Riga 3: 4x > 15.000 */}
                    <div
                      className={`flex items-center gap-3 transition-all duration-500 ${
                        showDeltaRow3 ? 'opacity-100' : 'opacity-0 -translate-x-8 pointer-events-none'
                      }`}
                      style={{
                        animation: showDeltaRow3 ? 'delta-slide-in 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' : 'none',
                      }}
                    >
                      <div className="w-24 py-2.5 rounded-2xl bg-gradient-to-r from-blue-700 to-indigo-600 border border-blue-400/80 shadow-[0_0_15px_rgba(59,130,246,0.35)] flex items-center justify-center">
                        <span className="text-2xl font-black text-white">4 x</span>
                      </div>
                      <PersonIcon className="w-20 h-20 shrink-0 drop-shadow-[0_0_12px_rgba(56,189,248,0.6)]" />
                      <div className="flex-1 py-2.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 border border-emerald-400/80 shadow-[0_0_15px_rgba(16,185,129,0.35)] flex items-center justify-center">
                        <span className="text-2xl font-black text-white tracking-wide">&gt; 15.000</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ZONA INFERIORE: BLOCCO PODIO 2 (h-[260px]) */}
                <div className="w-full h-[260px] flex items-end">
                  <div
                    className={`w-full transition-all duration-700 flex items-center justify-center rounded-t-3xl border-2 border-slate-400/80 shadow-[0_0_40px_rgba(148,163,184,0.35)] bg-gradient-to-t from-slate-800 via-slate-700 to-slate-600 relative overflow-hidden ${
                      showPodio2 ? 'opacity-100 h-full' : 'opacity-0 h-0 pointer-events-none'
                    }`}
                    style={{
                      animation: showPodio2 ? 'podium-rise 0.65s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' : 'none',
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-b from-white/15 to-transparent pointer-events-none" />
                    <span className="text-[120px] font-black text-white drop-shadow-[0_6px_22px_rgba(0,0,0,0.9)] select-none leading-none">
                      2
                    </span>
                  </div>
                </div>
              </div>

              {/* ========================================================= */}
              {/* COLONNA 1: 1° POSTO (ORO - CENTRO - IL PIÙ ALTO)          */}
              {/* ========================================================= */}
              <div className="w-[540px] flex flex-col items-center justify-end z-20">
                {/* ZONA SUPERIORE: 6 PRESCELTI (2 FILE DA 3 - OMINI GRANDI) */}
                <div className="w-full flex flex-col items-center justify-end h-[420px] pb-5">
                  <div
                    className={`transition-all duration-600 flex flex-col items-center gap-3.5 ${
                      showPodio1Avatars ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6 pointer-events-none'
                    }`}
                  >
                    {/* Badge Titolo Campioni 1° Posto */}
                    <div className="flex flex-col items-center gap-1">
                      <div className="px-6 py-1.5 rounded-full bg-gradient-to-r from-amber-500/25 via-amber-400/35 to-amber-500/25 border border-amber-300 text-amber-200 font-mono font-black text-xs uppercase tracking-widest shadow-[0_0_20px_rgba(245,158,11,0.4)] flex items-center gap-2">
                        <span className="text-base leading-none">👑</span>
                        <span>ACCESSO DIRETTO • 6 PRESCELTI</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-amber-300/70">
                        MASSIMO CONTINGENTE QUALIFICATO AL TAVOLO
                      </span>
                    </div>

                    {/* Fila 1 di 3 omini (grandi e ben distanziati) */}
                    <div className="flex items-center gap-7 pt-1">
                      <PersonIcon className="w-24 h-24 drop-shadow-[0_0_15px_rgba(56,189,248,0.7)]" />
                      <PersonIcon className="w-24 h-24 drop-shadow-[0_0_15px_rgba(56,189,248,0.7)]" />
                      <PersonIcon className="w-24 h-24 drop-shadow-[0_0_15px_rgba(56,189,248,0.7)]" />
                    </div>

                    {/* Fila 2 di 3 omini */}
                    <div className="flex items-center gap-7">
                      <PersonIcon className="w-24 h-24 drop-shadow-[0_0_15px_rgba(56,189,248,0.7)]" />
                      <PersonIcon className="w-24 h-24 drop-shadow-[0_0_15px_rgba(56,189,248,0.7)]" />
                      <PersonIcon className="w-24 h-24 drop-shadow-[0_0_15px_rgba(56,189,248,0.7)]" />
                    </div>
                  </div>
                </div>

                {/* ZONA INFERIORE: BLOCCO PODIO 1 (h-[370px]) */}
                <div className="w-full h-[370px] flex items-end">
                  <div
                    className={`w-full transition-all duration-700 flex items-center justify-center rounded-t-3xl border-2 border-amber-300 shadow-[0_0_60px_rgba(245,158,11,0.6)] bg-gradient-to-t from-amber-800 via-amber-600 to-amber-500 relative overflow-hidden ${
                      showPodio1 ? 'opacity-100 h-full' : 'opacity-0 h-0 pointer-events-none'
                    }`}
                    style={{
                      animation: showPodio1 ? 'podium-rise 0.65s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' : 'none',
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
                    <span className="text-[150px] font-black text-white drop-shadow-[0_6px_28px_rgba(0,0,0,0.9)] select-none leading-none">
                      1
                    </span>
                  </div>
                </div>
              </div>

              {/* ========================================================= */}
              {/* COLONNA 3: 3° POSTO (BRONZO - DESTRA - IL PIÙ BASSO)      */}
              {/* ========================================================= */}
              <div className="w-[490px] flex flex-col items-center justify-end">
                {/* ZONA SUPERIORE: 3 PRESCELTI (CENTRATI DIRETTAMENTE SU PODIO 3) */}
                <div className="w-full flex flex-col items-center justify-end h-[620px] pb-5">
                  <div
                    className={`transition-all duration-600 flex flex-col items-center gap-3.5 ${
                      showPodio3Avatars ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6 pointer-events-none'
                    }`}
                  >
                    {/* Badge Titolo 3° Posto che bilancia lo spazio alto */}
                    <div className="flex flex-col items-center text-center gap-1">
                      <div className="px-5 py-1.5 rounded-full bg-amber-950/60 border border-amber-600/70 text-amber-300 font-mono font-black text-xs uppercase tracking-widest shadow-[0_0_15px_rgba(180,83,9,0.35)] flex items-center gap-2">
                        <span className="text-base leading-none">🥉</span>
                        <span>3 PRESCELTI • CONTINGENTE BASE</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-amber-400/70">
                        QUALIFICAZIONE GARANTITA INDIPENDENTEMENTE DAL DISTACCO
                      </span>
                    </div>

                    {/* 1 Fila da 3 omini (stessa dimensione generosa del 1° posto) */}
                    <div className="flex items-center gap-7 pt-1">
                      <PersonIcon className="w-24 h-24 drop-shadow-[0_0_15px_rgba(56,189,248,0.7)]" />
                      <PersonIcon className="w-24 h-24 drop-shadow-[0_0_15px_rgba(56,189,248,0.7)]" />
                      <PersonIcon className="w-24 h-24 drop-shadow-[0_0_15px_rgba(56,189,248,0.7)]" />
                    </div>
                  </div>
                </div>

                {/* ZONA INFERIORE: BLOCCO PODIO 3 (h-[170px]) */}
                <div className="w-full h-[170px] flex items-end">
                  <div
                    className={`w-full transition-all duration-700 flex items-center justify-center rounded-t-3xl border-2 border-amber-700/80 shadow-[0_0_35px_rgba(180,83,9,0.35)] bg-gradient-to-t from-amber-950 via-amber-900 to-amber-800 relative overflow-hidden ${
                      showPodio3 ? 'opacity-100 h-full' : 'opacity-0 h-0 pointer-events-none'
                    }`}
                    style={{
                      animation: showPodio3 ? 'podium-rise 0.65s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' : 'none',
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
                    <span className="text-[105px] font-black text-white drop-shadow-[0_5px_18px_rgba(0,0,0,0.9)] select-none leading-none">
                      3
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. BARRA DI CONTROLLO RELATORE (Visibile solo nel monitor Relatore)       */}
      {/* ========================================================================= */}
      {isPresenterMode && interactive && (
        <nav
          className={`absolute bottom-5 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${
            showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
          }`}
        >
          <div className="flex flex-col items-center gap-2 px-6 py-3 rounded-2xl bg-black/85 backdrop-blur-xl border border-white/20 shadow-[0_12px_45px_rgba(0,0,0,0.85)] text-white">
            {/* RIGA 1: SELETTORE SCENA (TAB PARTE 1 / PARTE 2) */}
            <div className="flex items-center gap-3 pb-1 border-b border-white/10 w-full justify-center">
              <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-white/40">
                SCENA ATTIVA:
              </span>
              <button
                type="button"
                onClick={() => {
                  setActiveScene('fasi');
                  if (currentTime >= 29.5) seekTo(0);
                }}
                className={`px-4 py-1 rounded-lg text-xs font-black uppercase transition-all cursor-pointer ${
                  activeScene === 'fasi'
                    ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.7)]'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                📋 1. Fasi del Torneo (0s - 29s)
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveScene('termopili');
                  if (currentTime < 29.5) seekTo(29.8);
                }}
                className={`px-4 py-1 rounded-lg text-xs font-black uppercase transition-all cursor-pointer ${
                  activeScene === 'termopili'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.7)]'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                🏆 2. Termopili & Podio (30s - 50s)
              </button>
            </div>

            {/* RIGA 2: CONTROLLI TIMELINE & AUDIO */}
            <div className="flex items-center gap-3">
              {/* Play / Pausa */}
              <button
                type="button"
                onClick={togglePlay}
                className="w-9 h-9 rounded-xl bg-amber-500 hover:bg-amber-400 text-black flex items-center justify-center font-black text-sm shadow-md transition-transform active:scale-95 cursor-pointer"
                title={isPlaying ? 'Pausa (Spazio o K)' : 'Avvia Voce Narrante (Spazio o K)'}
              >
                {isPlaying ? '⏸' : '▶'}
              </button>

              {/* Riavvia */}
              <button
                type="button"
                onClick={restartPlayback}
                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm font-bold border border-white/15 cursor-pointer transition-colors"
                title="Riavvia dall'inizio (R)"
              >
                ↺
              </button>

              {/* Reset Totale */}
              <button
                type="button"
                onClick={resetAllState}
                className="w-9 h-9 rounded-xl bg-red-950/70 hover:bg-red-900 border border-red-500/50 text-red-200 flex items-center justify-center text-xs font-black cursor-pointer transition-colors"
                title="Azzera tutto a schermata pulita"
              >
                ■
              </button>

              {/* Scrubber Temporale */}
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
                    seekTo(ratio * duration);
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

              {/* Salti Rapidi Fasi Torneo (Parte 1) */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={jumpToFase1}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-black uppercase transition-all cursor-pointer ${
                    activeScene === 'fasi' && manualStep === 1
                      ? 'bg-red-600 text-white shadow-[0_0_10px_rgba(239,68,68,0.7)]'
                      : 'bg-white/10 text-white/80 hover:bg-white/20'
                  }`}
                  title="Fase 1 (Tasto 1)"
                >
                  F1
                </button>
                <button
                  type="button"
                  onClick={jumpToFase2}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-black uppercase transition-all cursor-pointer ${
                    activeScene === 'fasi' && manualStep === 2
                      ? 'bg-emerald-600 text-white shadow-[0_0_10px_rgba(16,185,129,0.7)]'
                      : 'bg-white/10 text-white/80 hover:bg-white/20'
                  }`}
                  title="Fase 2 (Tasto 2)"
                >
                  F2
                </button>
                <button
                  type="button"
                  onClick={jumpToFase3}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-black uppercase transition-all cursor-pointer ${
                    activeScene === 'fasi' && manualStep === 3
                      ? 'bg-sky-600 text-white shadow-[0_0_10px_rgba(2,132,199,0.7)]'
                      : 'bg-white/10 text-white/80 hover:bg-white/20'
                  }`}
                  title="Fase 3 (Tasto 3)"
                >
                  F3
                </button>
              </div>

              <div className="h-6 w-[1px] bg-white/20" />

              {/* Salti Rapidi Podio Termopili (Parte 2) */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={jumpToPodio1}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-black uppercase transition-all cursor-pointer ${
                    activeScene === 'termopili' && manualStep === 5
                      ? 'bg-amber-600 text-white shadow-[0_0_10px_rgba(245,158,11,0.7)]'
                      : 'bg-amber-950/60 text-amber-200 hover:bg-amber-900/80 border border-amber-600/40'
                  }`}
                  title="1° Podio Oro: 6 Prescelti (Tasto 5)"
                >
                  1° Oro
                </button>
                <button
                  type="button"
                  onClick={jumpToPodio2Delta}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-black uppercase transition-all cursor-pointer ${
                    activeScene === 'termopili' && manualStep === 6
                      ? 'bg-slate-600 text-white shadow-[0_0_10px_rgba(148,163,184,0.7)]'
                      : 'bg-slate-900/60 text-slate-200 hover:bg-slate-800/80 border border-slate-500/40'
                  }`}
                  title="2° Podio Argento: Delta Regole (Tasto 6)"
                >
                  2° Delta
                </button>
                <button
                  type="button"
                  onClick={jumpToPodio3}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-black uppercase transition-all cursor-pointer ${
                    activeScene === 'termopili' && manualStep === 7
                      ? 'bg-amber-800 text-white shadow-[0_0_10px_rgba(180,83,9,0.7)]'
                      : 'bg-amber-950/60 text-amber-300 hover:bg-amber-900/80 border border-amber-800/40'
                  }`}
                  title="3° Podio Bronzo: 3 Prescelti (Tasto 7)"
                >
                  3° Bronzo
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
                title="Mostra tutti gli elementi svelati (S o Invio)"
              >
                Tutto Svelato
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
 * Avatar Prescelto Olografico (Sagoma testa + spalle con contorno neon e fill scuro)
 * Ispirato al design del video pt2.mov
 */
function PersonIcon({ className = 'w-24 h-24' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      style={{ filter: 'drop-shadow(0 0 10px rgba(56,189,248,0.55))' }}
    >
      {/* Testa Circolare con bordo neon ciano */}
      <circle
        cx="32"
        cy="18"
        r="11"
        fill="#07090f"
        stroke="#38bdf8"
        strokeWidth="3.6"
      />

      {/* Busto Sagomato con spalle arrotondate */}
      <path
        d="M 12 55 C 12 41.5, 19 36, 32 36 C 45 36, 52 41.5, 52 55 C 52 57.5, 49 57.5, 46 57.5 L 18 57.5 C 15 57.5, 12 57.5, 12 55 Z"
        fill="#07090f"
        stroke="#38bdf8"
        strokeWidth="3.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Monete d'Oro cesellate con riflessi dorati 3D
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

      {/* Pila 1 */}
      <g>
        <path d="M 16 46 C 16 54 52 54 52 46 L 52 53 C 52 61 16 61 16 53 Z" fill="url(#goldEdge)" />
        <ellipse cx="34" cy="46" rx="18" ry="7" fill="url(#goldFace)" stroke="url(#goldRim)" strokeWidth="1" />

        <path d="M 16 38 C 16 46 52 46 52 38 L 52 45 C 52 53 16 53 16 45 Z" fill="url(#goldEdge)" />
        <ellipse cx="34" cy="38" rx="18" ry="7" fill="url(#goldFace)" stroke="url(#goldRim)" strokeWidth="1" />

        <path d="M 16 30 C 16 38 52 38 52 30 L 52 37 C 52 45 16 45 16 37 Z" fill="url(#goldEdge)" />
        <ellipse cx="34" cy="30" rx="18" ry="7" fill="url(#goldFace)" stroke="url(#goldRim)" strokeWidth="1" />

        <ellipse cx="34" cy="22" rx="18" ry="7" fill="url(#goldFace)" stroke="url(#goldRim)" strokeWidth="1.2" />
        <ellipse cx="34" cy="22" rx="13" ry="4.8" fill="none" stroke="#854d0e" strokeWidth="0.9" strokeDasharray="2 1.5" />
        <circle cx="34" cy="22" r="2.5" fill="#854d0e" />
      </g>

      {/* Pila 2 */}
      <g>
        <path d="M 46 72 C 46 80 86 80 86 72 L 86 79 C 86 87 46 87 46 79 Z" fill="url(#goldEdge)" />
        <ellipse cx="66" cy="72" rx="20" ry="7.5" fill="url(#goldFace)" stroke="url(#goldRim)" strokeWidth="1" />

        <path d="M 46 64 C 46 72 86 72 86 64 L 86 71 C 86 79 46 79 46 71 Z" fill="url(#goldEdge)" />
        <ellipse cx="66" cy="64" rx="20" ry="7.5" fill="url(#goldFace)" stroke="url(#goldRim)" strokeWidth="1" />

        <path d="M 46 56 C 46 64 86 64 86 56 L 86 63 C 86 71 46 71 46 63 Z" fill="url(#goldEdge)" />
        <ellipse cx="66" cy="56" rx="20" ry="7.5" fill="url(#goldFace)" stroke="url(#goldRim)" strokeWidth="1" />

        <ellipse cx="66" cy="48" rx="20" ry="7.5" fill="url(#goldFace)" stroke="url(#goldRim)" strokeWidth="1.2" />
        <ellipse cx="66" cy="48" rx="14.5" ry="5.2" fill="none" stroke="#854d0e" strokeWidth="1" strokeDasharray="2 1.5" />
        <text x="66" y="51" textAnchor="middle" fill="#854d0e" fontSize="7" fontWeight="900" fontFamily="sans-serif">PT</text>
      </g>
    </svg>
  );
}

/**
 * Icona Bonus Equipaggiamento (Prescelti con Mirino Tattico)
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

      <circle cx="28" cy="40" r="8" fill="#10b981" opacity="0.8" />
      <path d="M 14 66 C 14 55 42 55 42 66 Z" fill="#10b981" opacity="0.8" />

      <circle cx="72" cy="40" r="8" fill="#10b981" opacity="0.8" />
      <path d="M 58 66 C 58 55 86 55 86 66 Z" fill="#10b981" opacity="0.8" />

      <circle cx="50" cy="35" r="10" fill="url(#emeraldBonusGrad)" />
      <path d="M 30 68 C 30 53 70 53 70 68 Z" fill="url(#emeraldBonusGrad)" />

      <circle
        cx="50"
        cy="42"
        r="24"
        stroke="#6ee7b7"
        strokeWidth="3.5"
        strokeDasharray="4 2.5"
      />
      <line x1="22" y1="42" x2="28" y2="42" stroke="#6ee7b7" strokeWidth="3" strokeLinecap="round" />
      <line x1="72" y1="42" x2="78" y2="42" stroke="#6ee7b7" strokeWidth="3" strokeLinecap="round" />
      <line x1="50" y1="14" x2="50" y2="20" stroke="#6ee7b7" strokeWidth="3" strokeLinecap="round" />
      <line x1="50" y1="64" x2="50" y2="70" stroke="#6ee7b7" strokeWidth="3" strokeLinecap="round" />

      <line x1="68" y1="60" x2="85" y2="77" stroke="#34d399" strokeWidth="5" strokeLinecap="round" />
      <circle cx="85" cy="77" r="2.5" fill="#a7f3d0" />
    </svg>
  );
}

/**
 * Trofeo Trionfale delle Termopili
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

      <path
        d="M 28 22 L 72 22 C 72 48, 62 58, 50 58 C 38 58, 28 48, 28 22 Z"
        fill="url(#trophyGold)"
        stroke="#fef08a"
        strokeWidth="1.5"
      />
      <path
        d="M 33 24 L 43 24 C 41 42, 37 46, 35 48 C 33 44, 32 34, 33 24 Z"
        fill="url(#cupShine)"
      />

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

      <path d="M 45 58 L 55 58 L 55 72 L 45 72 Z" fill="url(#trophyGold)" />
      <rect x="42" y="70" width="16" height="4" rx="2" fill="#ca8a04" />

      <path d="M 30 74 L 70 74 L 74 86 L 26 86 Z" fill="url(#trophyGold)" stroke="#ca8a04" strokeWidth="1" />
      <rect x="34" y="76" width="32" height="7" rx="1.5" fill="#78350f" opacity="0.6" />
      <circle cx="50" cy="79.5" r="1.5" fill="#fef08a" />

      <path
        d="M 50 30 L 52 35 L 57 35 L 53 38 L 54.5 43 L 50 40 L 45.5 43 L 47 38 L 43 35 L 48 35 Z"
        fill="#ffffff"
        opacity="0.9"
      />
    </svg>
  );
}
