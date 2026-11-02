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

// Cue temporali sincronizzati con la voce narrante ufficiale aggiornata (75.73s totali):
// --- SLIDE 1: REGOLE DELLO SCONTRO ---
// 0.0s - 2.4s: "Ecco a voi il gioco finale."
// 2.4s - 11.2s: "Chi detiene la mano di gioco lancia il dado per capire quale squadra sfidare, e sceglie una fra le domande numerate fino a 15." (Regola 01)
// 11.2s - 19.9s: "In caso di risposta esatta si elimina il primo componente della squadra sfidata, in caso di risposta errata si elimina se stessi." (Regola 02)
// 20.0s - 27.3s: "Si potranno consultare solo i prescelti in posizione due e il tre, e solo in quattro, cinque e sei." (Regola 03)
// 27.5s - 33.0s: "Il capitano può intervenire per decidere di giocare un jolly, tramite la pulsantiera." (Regola 04)
// --- TRANSIZIONE A SLIDE 2: I 4 BONUS & JOLLY ---
// 33.0s - 41.2s: "Attraverso quest'ultima le squadre possono attivare strategicamente uno dei seguenti quattro Jolly a disposizione:"
// 41.2s - 47.0s: "Dado: permette di rilanciare il dado per cambiare la squadra da sfidare." (Bonus 1)
// 47.0s - 60.0s: "Switch: permette di sostituire la domanda appena scelta con una nuova..." (Bonus 2)
// 60.0s - 67.5s: "Arco: obbliga la squadra sfidata a rispondere alla domanda..." (Bonus 3)
// 67.5s - 75.4s: "Scudo: può essere attivato in qualsiasi fase del gioco per proteggere e salvare un prescelto..." (Bonus 4)
// 75.4s - 75.7s: Fanfara finale & Tutto Pronto!
const SFX_CUES = [
  // Slide 1: Regole dello Scontro
  { id: 'b5_intro', time: 0.1, play: () => soundFX.playBoxActivation() },
  { id: 'b5_pill_regola1', time: 2.4, play: () => soundFX.playBoxActivation() },
  { id: 'b5_card_regola1', time: 3.0, play: () => soundFX.playDiceRoll() },
  { id: 'b5_pill_regola2', time: 11.2, play: () => soundFX.playBoxActivation() },
  { id: 'b5_card_regola2', time: 11.8, play: () => soundFX.playShieldClang() },
  { id: 'b5_pill_regola3', time: 20.0, play: () => soundFX.playBoxActivation() },
  { id: 'b5_card_regola3', time: 20.6, play: () => soundFX.playArrowTin() },
  { id: 'b5_pill_regola4', time: 27.5, play: () => soundFX.playBoxActivation() },
  { id: 'b5_card_regola4', time: 28.0, play: () => soundFX.playFanfare() },
  // Slide 2: I 4 Bonus & Jolly
  { id: 'b5_slide2_transition', time: 33.0, play: () => soundFX.playBoxActivation() },
  { id: 'b5_bonus_dado', time: 41.2, play: () => soundFX.playDiceRoll() },
  { id: 'b5_bonus_switch', time: 47.0, play: () => soundFX.playSwitchSound() },
  { id: 'b5_bonus_arco', time: 60.0, play: () => soundFX.playArrowWhoosh() },
  { id: 'b5_bonus_scudo', time: 67.5, play: () => soundFX.playShieldClang() },
  { id: 'b5_finish', time: 75.4, play: () => soundFX.playFanfare() },
];

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
  const [seekTrigger, setSeekTrigger] = useSyncedState<{ time: number; timestamp: number } | null>(
    `playstate_${slideId}_seek`,
    null
  );

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(75.73);
  const [isMuted, setIsMuted] = useState(isMultiWindowRelatore);

  // Calcolo derivato deterministico di activeSlide per evitare conflitti o rimbalzi IPC multi-finestra
  // Slide 0 = Slide 1 (Regole dello Scontro), Slide 1 = Slide 2 (I 4 Bonus & Jolly)
  const activeSlide = manualStep >= 5 || currentTime >= 33.0 ? 1 : 0;

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playedSoundsRef = useRef<Set<string>>(new Set());
  const isSeekingRef = useRef<boolean>(false);
  const lastSeekTimestampRef = useRef<number>(0);

  const formatTime = (secs: number) => {
    const s = Math.floor(secs);
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
  };

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
      soundFX.resume();
      audio.play().catch((err) => {
        console.warn('Audio non riprodotto (potrebbe non essere ancora caricato):', err);
      });
    } else {
      audio.pause();
    }
  }, [isPlaying, interactive]);

  // Fallback timer per garantire che currentTime avanzi sempre a 60fps / 100ms se l'audio non è avviabile
  useEffect(() => {
    if (!interactive || !isPlaying) return;

    const interval = setInterval(() => {
      if (audioRef.current && !audioRef.current.paused && !isNaN(audioRef.current.currentTime)) {
        return;
      }
      setCurrentTime((prev) => {
        const next = Math.round((prev + 0.1) * 10) / 10;
        if (next >= duration) {
          setIsPlaying(false);
          setIsAllRevealed(true);
          return duration;
        }
        return next;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, interactive, duration, setIsPlaying, setIsAllRevealed]);

  // Step corrispondente al timestamp esatto della narrazione
  const getStepFromTime = (t: number) => {
    if (t >= 75.4) return 10;
    if (t >= 67.5) return 9;
    if (t >= 60.0) return 8;
    if (t >= 47.0) return 7;
    if (t >= 41.2) return 6;
    if (t >= 33.0) return 5;
    if (t >= 27.5) return 4;
    if (t >= 20.0) return 3;
    if (t >= 11.2) return 2;
    if (t >= 2.4) return 1;
    return 0;
  };

  // Funzione di Seek temporale
  const seekTo = useCallback(
    (targetTime: number) => {
      const clamped = Math.max(0, Math.min(duration, targetTime));
      const now = Date.now();
      lastSeekTimestampRef.current = now;
      isSeekingRef.current = true;
      setCurrentTime(clamped);
      const step = getStepFromTime(clamped);
      setManualStep((prev) => (prev !== step ? step : prev));
      if (audioRef.current) {
        try {
          audioRef.current.currentTime = clamped;
        } catch {}
      }
      if (clamped <= 0.5) {
        playedSoundsRef.current.clear();
      } else {
        const newPlayed = new Set<string>();
        SFX_CUES.forEach((cue) => {
          if (clamped >= cue.time) {
            newPlayed.add(cue.id);
          }
        });
        playedSoundsRef.current = newPlayed;
      }
      setTimeout(() => {
        isSeekingRef.current = false;
      }, 150);
      setSeekTrigger({ time: clamped, timestamp: now });
    },
    [duration, setManualStep, setSeekTrigger]
  );

  // Ricezione del comando di seek sincronizzato da qualsiasi finestra
  useEffect(() => {
    if (!seekTrigger || isNaN(seekTrigger.time)) return;
    if (seekTrigger.timestamp && seekTrigger.timestamp === lastSeekTimestampRef.current) {
      return;
    }
    lastSeekTimestampRef.current = seekTrigger.timestamp || 0;

    const target = Math.max(0, Math.min(duration, seekTrigger.time));
    isSeekingRef.current = true;
    setCurrentTime(target);
    const step = getStepFromTime(target);
    setManualStep((prev) => (prev !== step ? step : prev));
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
        if (target >= cue.time) {
          newPlayed.add(cue.id);
        }
      });
      playedSoundsRef.current = newPlayed;
    }

    const timer = setTimeout(() => {
      isSeekingRef.current = false;
    }, 150);
    return () => clearTimeout(timer);
  }, [seekTrigger, duration, setManualStep]);

  // Esecuzione effetti sonori sincronizzati ai cue della narrazione
  useEffect(() => {
    if (!interactive || !isPlaying) return;
    const canPlaySFX = !isMultiWindowRelatore;
    if (!canPlaySFX) return;

    SFX_CUES.forEach((cue) => {
      if (currentTime >= cue.time && !playedSoundsRef.current.has(cue.id)) {
        playedSoundsRef.current.add(cue.id);
        cue.play();
      }
    });
  }, [currentTime, isPlaying, interactive, isMultiWindowRelatore]);

  const handleTimeUpdate = () => {
    if (isSeekingRef.current) return;
    if (audioRef.current) {
      const t = audioRef.current.currentTime;
      if (!isNaN(t)) {
        setCurrentTime(t);
        // Avanzamento automatico e incrementale dello step sincronizzato via IPC
        if (isPlaying) {
          const step = getStepFromTime(t);
          setManualStep((prev) => (prev !== step ? step : prev));
          if (t >= 75.4) {
            setIsPlaying(false);
            setIsAllRevealed(true);
          }
        }
      }
      if (audioRef.current.duration && !isNaN(audioRef.current.duration) && audioRef.current.duration > 0) {
        setDuration(audioRef.current.duration);
      }
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setIsAllRevealed(true);
  };

  // Visibilità dinamica sincronizzata per le 4 regole di Slide 1
  const showRegola1Pill = isAllRevealed || currentTime >= 2.4;
  const showRegola1Card = isAllRevealed || currentTime >= 3.0;

  const showRegola2Pill = isAllRevealed || currentTime >= 11.2;
  const showRegola2Card = isAllRevealed || currentTime >= 11.8;

  const showRegola3Pill = isAllRevealed || currentTime >= 20.0;
  const showRegola3Card = isAllRevealed || currentTime >= 20.6;

  const showRegola4Pill = isAllRevealed || currentTime >= 27.5;
  const showRegola4Card = isAllRevealed || currentTime >= 28.0;

  // Visibilità dinamica sincronizzata per i 4 bonus di Slide 2
  // Ciascun bonus compare SOLO al suo esatto secondo durante la narrazione
  // Questo impedisce categoricamente che Dado o Switch appaiano all'inizio della sezione Jolly (33.0s - 41.2s)
  const showBonusDado = isAllRevealed || currentTime >= 41.2;
  const showBonusSwitch = isAllRevealed || currentTime >= 47.0;
  const showBonusArco = isAllRevealed || currentTime >= 60.0;
  const showBonusScudo = isAllRevealed || currentTime >= 67.5;
  const showFinaleBanner = isAllRevealed || currentTime >= 75.4;

  // Evidenziazione attiva della scheda di cui la narratrice sta parlando
  const isSpeakingDado = isPlaying && currentTime >= 41.2 && currentTime < 47.0;
  const isSpeakingSwitch = isPlaying && currentTime >= 47.0 && currentTime < 60.0;
  const isSpeakingArco = isPlaying && currentTime >= 60.0 && currentTime < 67.5;
  const isSpeakingScudo = isPlaying && currentTime >= 67.5 && currentTime < 75.4;

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
        const next = manualStep + 1;
        setManualStep(next);
        if (next === 1) seekTo(2.4);
        else if (next === 2) seekTo(11.2);
        else if (next === 3) seekTo(20.0);
        else if (next === 4) seekTo(27.5);
      } else {
        // Passaggio a Slide 2 (I 4 Bonus)
        soundFX.playFanfare();
        setManualStep(5);
        seekTo(33.0);
      }
    } else {
      if (manualStep < 6) {
        soundFX.playDiceRoll();
        setManualStep(6);
        seekTo(41.2);
      } else if (manualStep === 6) {
        soundFX.playSwitchSound();
        setManualStep(7);
        seekTo(47.0);
      } else if (manualStep === 7) {
        soundFX.playArrowWhoosh();
        setManualStep(8);
        seekTo(60.0);
      } else if (manualStep === 8) {
        soundFX.playShieldClang();
        setManualStep(9);
        seekTo(67.5);
      } else if (manualStep === 9) {
        soundFX.playFanfare();
        setManualStep(10);
        seekTo(75.4);
        setIsAllRevealed(true);
      } else {
        handleStartFinale();
      }
    }
  }, [interactive, activeSlide, manualStep, setManualStep, setIsAllRevealed, handleStartFinale, seekTo]);

  // Step indietro manuale (protetto: a step 0 non esce dalla mappa)
  const prevStep = useCallback(() => {
    if (!interactive) return;
    soundFX.resume();

    if (activeSlide === 1) {
      if (manualStep > 9) {
        setManualStep(9);
        seekTo(67.5);
      } else if (manualStep === 9) {
        setManualStep(8);
        seekTo(60.0);
      } else if (manualStep === 8) {
        setManualStep(7);
        seekTo(47.0);
      } else if (manualStep === 7) {
        setManualStep(6);
        seekTo(41.2);
      } else if (manualStep === 6) {
        setManualStep(5);
        seekTo(33.0);
      } else {
        // Ritorna a Slide 1 all'ultimo step
        setManualStep(4);
        seekTo(27.5);
      }
    } else {
      if (manualStep > 0) {
        const prev = manualStep - 1;
        setManualStep(prev);
        if (prev === 0) seekTo(0);
        else if (prev === 1) seekTo(2.4);
        else if (prev === 2) seekTo(11.2);
        else if (prev === 3) seekTo(20.0);
      }
    }
  }, [interactive, activeSlide, manualStep, setManualStep, seekTo]);

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

  // Riavvia dall'inizio
  const restartPlayback = useCallback(() => {
    if (!interactive) return;
    soundFX.resume();
    seekTo(0);
    setManualStep(0);
    setIsAllRevealed(false);
    playedSoundsRef.current.clear();
    setIsPlaying(true);
  }, [interactive, seekTo, setManualStep, setIsAllRevealed, setIsPlaying]);

  // Reset completo
  const resetAllState = useCallback(() => {
    if (!interactive) return;
    soundFX.resume();
    setManualStep(0);
    setIsAllRevealed(false);
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    playedSoundsRef.current.clear();
    seekTo(0);
  }, [interactive, setManualStep, setIsAllRevealed, setIsPlaying, seekTo]);

  // Toggle play/pause
  const togglePlay = useCallback(() => {
    if (!interactive) return;
    soundFX.resume();
    if (currentTime >= 75.0 || isAllRevealed || manualStep >= 10) {
      playedSoundsRef.current.clear();
      seekTo(0);
      setManualStep(0);
      setIsAllRevealed(false);
      setIsPlaying(true);
      return;
    }
    setIsPlaying(!isPlaying);
  }, [interactive, currentTime, isAllRevealed, manualStep, isPlaying, seekTo, setManualStep, setIsAllRevealed, setIsPlaying]);

  // Gestione tastiera sul relatore
  useEffect(() => {
    if (!interactive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;

      if (e.code === 'Space' || e.key === ' ' || e.key.toLowerCase() === 'p') {
        e.preventDefault();
        e.stopPropagation();
        togglePlay();
      } else if (e.key.toLowerCase() === 's' || e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        revealEverything();
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        e.stopPropagation();
        nextStep();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
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
    <div className="relative w-[1920px] h-[1080px] overflow-hidden select-none bg-[#090308] text-white flex flex-col items-center justify-between font-sans px-12 py-7 pb-28">
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
      {/* ========================================================================= */}
      <header className="relative z-10 w-full flex flex-col items-center justify-center shrink-0 mb-3 text-center">
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
        /* Griglia 2x2 perfettamente allineata con box di dimensione identica       */
        /* ========================================================================= */
        <main className="relative z-10 w-full flex-1 flex flex-col justify-center items-center gap-6 max-w-[1720px] mx-auto my-auto py-2">
          <div className="grid grid-cols-2 gap-6 w-full">
            {/* 1. BONUS DADO */}
            <div
              className={`h-[200px] transition-all duration-700 transform ${
                showBonusDado
                  ? 'opacity-100 translate-y-0 scale-100'
                  : 'opacity-0 translate-y-10 scale-95 pointer-events-none'
              }`}
            >
              <div
                className={`h-full w-full relative group p-0.5 rounded-3xl transition-all duration-500 flex flex-col ${
                  isSpeakingDado
                    ? 'bg-gradient-to-br from-amber-400 via-yellow-300 to-amber-500 shadow-[0_0_45px_rgba(245,158,11,0.6)] scale-[1.02]'
                    : 'bg-gradient-to-br from-amber-500/50 via-yellow-500/20 to-transparent shadow-[0_0_30px_rgba(245,158,11,0.2)]'
                }`}
              >
                <div className="h-full w-full p-6 rounded-[22px] bg-slate-950/85 border border-amber-400/40 backdrop-blur-md flex items-center gap-6">
                  <div className="shrink-0 relative w-24 h-24 flex items-center justify-center">
                    <div className="w-full h-full rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600 p-1 shadow-[0_0_30px_rgba(245,158,11,0.5)] flex items-center justify-center">
                      <div className="w-full h-full rounded-[14px] bg-slate-950/85 flex items-center justify-center text-5xl">
                        🎲
                      </div>
                    </div>
                    <span className="absolute -top-2 -right-2 px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 font-black text-[10px] uppercase font-mono shadow-md">
                      BONUS
                    </span>
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col justify-center gap-2">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-2xl lg:text-3xl font-black uppercase tracking-wider text-amber-300 font-serif shrink-0">
                        DADO
                      </h3>
                      <span className="text-[11px] font-mono font-bold text-amber-400/80 uppercase px-3 py-1 rounded-full bg-amber-500/10 border border-amber-400/30 whitespace-nowrap shrink-0">
                        RILANCIO DELLA SORTE
                      </span>
                    </div>
                    <p className="text-[14px] lg:text-[15px] text-slate-200 leading-relaxed font-medium">
                      Permette di <strong className="text-amber-300 font-bold">rilanciare il dado</strong> per cambiare la squadra da sfidare.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. BONUS SWITCH */}
            <div
              className={`h-[200px] transition-all duration-700 transform ${
                showBonusSwitch
                  ? 'opacity-100 translate-y-0 scale-100'
                  : 'opacity-0 translate-y-10 scale-95 pointer-events-none'
              }`}
            >
              <div
                className={`h-full w-full relative group p-0.5 rounded-3xl transition-all duration-500 flex flex-col ${
                  isSpeakingSwitch
                    ? 'bg-gradient-to-br from-cyan-400 via-sky-300 to-blue-500 shadow-[0_0_45px_rgba(6,182,212,0.6)] scale-[1.02]'
                    : 'bg-gradient-to-br from-cyan-500/50 via-sky-500/20 to-transparent shadow-[0_0_30px_rgba(6,182,212,0.2)]'
                }`}
              >
                <div className="h-full w-full p-6 rounded-[22px] bg-slate-950/85 border border-cyan-400/40 backdrop-blur-md flex items-center gap-6">
                  <div className="shrink-0 relative w-24 h-24 flex items-center justify-center">
                    <div className="w-full h-full rounded-2xl bg-gradient-to-br from-cyan-400 via-sky-500 to-blue-600 p-1 shadow-[0_0_30px_rgba(6,182,212,0.5)] flex items-center justify-center">
                      <div className="w-full h-full rounded-[14px] bg-slate-950/85 flex items-center justify-center text-5xl">
                        🔄
                      </div>
                    </div>
                    <span className="absolute -top-2 -right-2 px-2 py-0.5 rounded-md bg-cyan-400 text-slate-950 font-black text-[10px] uppercase font-mono shadow-md">
                      BONUS
                    </span>
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col justify-center gap-2">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-2xl lg:text-3xl font-black uppercase tracking-wider text-cyan-300 font-serif shrink-0">
                        SWITCH
                      </h3>
                      <span className="text-[11px] font-mono font-bold text-cyan-400/80 uppercase px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/30 whitespace-nowrap shrink-0">
                        CAMBIO DOMANDA
                      </span>
                    </div>
                    <p className="text-[14px] lg:text-[15px] text-slate-200 leading-relaxed font-medium">
                      Permette di <strong className="text-cyan-300 font-bold">sostituire la domanda</strong> appena scelta con una nuova. La domanda scartata resterà comunque disponibile per le altre squadre che vorranno sceglierla in seguito.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. BONUS ARCO */}
            <div
              className={`h-[200px] transition-all duration-700 transform ${
                showBonusArco
                  ? 'opacity-100 translate-y-0 scale-100'
                  : 'opacity-0 translate-y-10 scale-95 pointer-events-none'
              }`}
            >
              <div
                className={`h-full w-full relative group p-0.5 rounded-3xl transition-all duration-500 flex flex-col ${
                  isSpeakingArco
                    ? 'bg-gradient-to-br from-rose-400 via-pink-400 to-red-500 shadow-[0_0_45px_rgba(244,63,94,0.6)] scale-[1.02]'
                    : 'bg-gradient-to-br from-rose-500/50 via-red-500/20 to-transparent shadow-[0_0_30px_rgba(244,63,94,0.2)]'
                }`}
              >
                <div className="h-full w-full p-6 rounded-[22px] bg-slate-950/85 border border-rose-400/40 backdrop-blur-md flex items-center gap-6">
                  <div className="shrink-0 relative w-24 h-24 flex items-center justify-center">
                    <div className="w-full h-full rounded-2xl bg-gradient-to-br from-rose-400 via-red-500 to-rose-700 p-1 shadow-[0_0_30px_rgba(244,63,94,0.5)] flex items-center justify-center">
                      <div className="w-full h-full rounded-[14px] bg-slate-950/85 flex items-center justify-center text-5xl">
                        🏹
                      </div>
                    </div>
                    <span className="absolute -top-2 -right-2 px-2 py-0.5 rounded-md bg-rose-500 text-white font-black text-[10px] uppercase font-mono shadow-md">
                      BONUS
                    </span>
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col justify-center gap-2">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-2xl lg:text-3xl font-black uppercase tracking-wider text-rose-300 font-serif shrink-0">
                        ARCO
                      </h3>
                      <span className="text-[11px] font-mono font-bold text-rose-400/80 uppercase px-3 py-1 rounded-full bg-rose-500/10 border border-rose-400/30 whitespace-nowrap shrink-0">
                        RISPOSTA COATTA
                      </span>
                    </div>
                    <p className="text-[14px] lg:text-[15px] text-slate-200 leading-relaxed font-medium">
                      <strong className="text-rose-400 font-bold">Obbliga la squadra sfidata a rispondere</strong> alla domanda al posto della squadra che ha giocato il jolly.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. BONUS SCUDO */}
            <div
              className={`h-[200px] transition-all duration-700 transform ${
                showBonusScudo
                  ? 'opacity-100 translate-y-0 scale-100'
                  : 'opacity-0 translate-y-10 scale-95 pointer-events-none'
              }`}
            >
              <div
                className={`h-full w-full relative group p-0.5 rounded-3xl transition-all duration-500 flex flex-col ${
                  isSpeakingScudo
                    ? 'bg-gradient-to-br from-emerald-400 via-teal-300 to-green-500 shadow-[0_0_45px_rgba(16,185,129,0.6)] scale-[1.02]'
                    : 'bg-gradient-to-br from-emerald-500/50 via-teal-500/20 to-transparent shadow-[0_0_30px_rgba(16,185,129,0.2)]'
                }`}
              >
                <div className="h-full w-full p-6 rounded-[22px] bg-slate-950/85 border border-emerald-400/40 backdrop-blur-md flex items-center gap-6">
                  <div className="shrink-0 relative w-24 h-24 flex items-center justify-center">
                    <div className="w-full h-full rounded-2xl bg-gradient-to-br from-emerald-400 via-teal-500 to-emerald-700 p-1 shadow-[0_0_30px_rgba(16,185,129,0.5)] flex items-center justify-center">
                      <div className="w-full h-full rounded-[14px] bg-slate-950/85 flex items-center justify-center text-5xl">
                        🛡️
                      </div>
                    </div>
                    <span className="absolute -top-2 -right-2 px-2 py-0.5 rounded-md bg-emerald-500 text-slate-950 font-black text-[10px] uppercase font-mono shadow-md">
                      BONUS
                    </span>
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col justify-center gap-2">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-2xl lg:text-3xl font-black uppercase tracking-wider text-emerald-300 font-serif shrink-0">
                        SCUDO
                      </h3>
                      <span className="text-[11px] font-mono font-bold text-emerald-400/80 uppercase px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-400/30 whitespace-nowrap shrink-0">
                        SALVATAGGIO PRESCELTO
                      </span>
                    </div>
                    <p className="text-[14px] lg:text-[15px] text-slate-200 leading-relaxed font-medium">
                      Può essere attivato in qualsiasi fase del gioco per <strong className="text-emerald-300 font-bold">proteggere e salvare un prescelto</strong> dall'eliminazione.
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
        <footer className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-[1780px] p-3 px-6 rounded-2xl bg-slate-950/95 border-2 border-red-500/40 shadow-[0_0_50px_rgba(0,0,0,0.9)] backdrop-blur-2xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 shrink-0">
            {/* Play / Pausa Audio */}
            <button
              type="button"
              onClick={togglePlay}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase transition-all tracking-wider flex items-center gap-2 shadow-md cursor-pointer ${
                isPlaying
                  ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-amber-500/30'
                  : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-600/30'
              }`}
              title="Avvia o metti in pausa l'audio (Spazio o P)"
            >
              <span>{isPlaying ? '⏸ Pausa' : '▶ Avvia Audio'}</span>
            </button>

            {/* Riavvia Audio */}
            <button
              type="button"
              onClick={restartPlayback}
              className="px-2.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all cursor-pointer"
              title="Riavvia la spiegazione audio dall'inizio"
            >
              🔄
            </button>
          </div>

          {/* Timeline Scrubber globale (sincronizzato su entrambe le schede per l'intera durata di 75s) */}
          <div className="flex-1 flex items-center gap-3 max-w-[480px]">
            <span className="text-[11px] font-mono text-slate-400 shrink-0">
              {formatTime(currentTime)}
            </span>
            <div
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const ratio = Math.max(0, Math.min(1, clickX / rect.width));
                const target = ratio * duration;
                seekTo(target);
              }}
              className="relative flex-1 h-2 rounded-full bg-slate-800/80 cursor-pointer overflow-hidden border border-white/10 group"
              title="Clicca per spostarti sulla timeline audio"
            >
              <div
                className="h-full bg-gradient-to-r from-red-500 via-amber-400 to-yellow-400 transition-all duration-100 relative"
                style={{ width: `${Math.min(100, Math.max(0, (currentTime / duration) * 100))}%` }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white shadow-md" />
              </div>
            </div>
            <span className="text-[11px] font-mono text-slate-400 shrink-0">
              {formatTime(duration)}
            </span>
          </div>

          {/* Indicatori Step Sincronizzati */}
          <div className="flex items-center gap-1.5">
            {activeSlide === 0 ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setManualStep(1);
                    seekTo(2.4);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    manualStep === 1 || (currentTime >= 2.4 && currentTime < 11.2)
                      ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                      : manualStep >= 1
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-400/50'
                      : 'bg-white/5 text-slate-400'
                  }`}
                  title="Vai a Regola 1 (2.4s)"
                >
                  1. Dado
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setManualStep(2);
                    seekTo(11.2);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    manualStep === 2 || (currentTime >= 11.2 && currentTime < 20.0)
                      ? 'bg-red-500 text-white font-black shadow-md'
                      : manualStep >= 2
                      ? 'bg-red-500/20 text-red-300 border border-red-400/50'
                      : 'bg-white/5 text-slate-400'
                  }`}
                  title="Vai a Regola 2 (11.2s)"
                >
                  2. Eliminazione
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setManualStep(3);
                    seekTo(20.0);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    manualStep === 3 || (currentTime >= 20.0 && currentTime < 27.5)
                      ? 'bg-cyan-500 text-slate-950 font-black shadow-md'
                      : manualStep >= 3
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50'
                      : 'bg-white/5 text-slate-400'
                  }`}
                  title="Vai a Regola 3 (20.0s)"
                >
                  3. Consultazione
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setManualStep(4);
                    seekTo(27.5);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    manualStep === 4 || (currentTime >= 27.5 && currentTime < 33.0)
                      ? 'bg-purple-500 text-white font-black shadow-md'
                      : manualStep >= 4
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-400/50'
                      : 'bg-white/5 text-slate-400'
                  }`}
                  title="Vai a Regola 4 (27.5s)"
                >
                  4. Capitano
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setManualStep(5);
                    seekTo(33.0);
                    soundFX.playBoxActivation();
                  }}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-400/40 transition-all cursor-pointer flex items-center gap-1"
                  title="Vai alla sezione Bonus (33.0s)"
                >
                  <span>🛡️ Bonus</span>
                  <span>→</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setManualStep(4);
                    seekTo(27.5);
                    soundFX.playBoxActivation();
                  }}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-400/40 transition-all cursor-pointer flex items-center gap-1"
                  title="Torna alla sezione Regole (27.5s)"
                >
                  <span>←</span>
                  <span>⚔️ Regole</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setManualStep(6);
                    seekTo(41.2);
                    soundFX.playDiceRoll();
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    manualStep === 6 || isSpeakingDado || (currentTime >= 41.2 && currentTime < 47.0)
                      ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                      : manualStep >= 6
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-400/50'
                      : 'bg-white/5 text-slate-400'
                  }`}
                  title="Vai a Bonus Dado (41.2s)"
                >
                  🎲 Dado
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setManualStep(7);
                    seekTo(47.0);
                    soundFX.playSwitchSound();
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    manualStep === 7 || isSpeakingSwitch || (currentTime >= 47.0 && currentTime < 60.0)
                      ? 'bg-cyan-500 text-slate-950 font-black shadow-md'
                      : manualStep >= 7
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50'
                      : 'bg-white/5 text-slate-400'
                  }`}
                  title="Vai a Bonus Switch (47.0s)"
                >
                  🔄 Switch
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setManualStep(8);
                    seekTo(60.0);
                    soundFX.playArrowWhoosh();
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    manualStep === 8 || isSpeakingArco || (currentTime >= 60.0 && currentTime < 67.5)
                      ? 'bg-rose-500 text-white font-black shadow-md'
                      : manualStep >= 8
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-400/50'
                      : 'bg-white/5 text-slate-400'
                  }`}
                  title="Vai a Bonus Arco (60.0s)"
                >
                  🏹 Arco
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setManualStep(9);
                    seekTo(67.5);
                    soundFX.playShieldClang();
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    manualStep === 9 || isSpeakingScudo || (currentTime >= 67.5 && currentTime < 75.4)
                      ? 'bg-emerald-500 text-slate-950 font-black shadow-md'
                      : manualStep >= 9
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/50'
                      : 'bg-white/5 text-slate-400'
                  }`}
                  title="Vai a Bonus Scudo (67.5s)"
                >
                  🛡️ Scudo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setManualStep(10);
                    seekTo(75.4);
                    soundFX.playFanfare();
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    manualStep === 10 || currentTime >= 75.4
                      ? 'bg-red-500 text-white font-black shadow-md'
                      : 'bg-white/5 text-slate-400'
                  }`}
                  title="Vai a Conclusione (75.4s)"
                >
                  ⚔️ Finale
                </button>
              </>
            )}
          </div>

          {/* Azioni Regia rapide */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={prevStep}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all cursor-pointer"
              title="Passo precedente (Freccia Sinistra)"
            >
              ← Indietro
            </button>
            <button
              type="button"
              onClick={nextStep}
              className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
              title="Passo successivo (Freccia Destra)"
            >
              Avanza →
            </button>
            <button
              type="button"
              onClick={revealEverything}
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-all cursor-pointer"
              title="Svela tutto subito (Tasto S o Invio)"
            >
              Svela Tutto
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
              {isMuted ? '🔇 Audio Muto' : '🔊 Audio Attivo'}
            </button>
            <button
              type="button"
              onClick={resetAllState}
              className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white text-xs font-mono cursor-pointer"
              title="Resetta spiegazione (Tasto R)"
            >
              R
            </button>
            <button
              type="button"
              onClick={returnToMap}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/20 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
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

      {/* Icona Play centrale quando in pausa all'inizio (visibile SOLO nel monitor Relatore) */}
      {isPresenterMode && !isPlaying && manualStep === 0 && !isAllRevealed && interactive && (
        <div
          onClick={togglePlay}
          className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/50 backdrop-blur-[2px] cursor-pointer transition-all duration-300 group"
        >
          <div className="w-28 h-28 rounded-full bg-gradient-to-br from-red-500 via-rose-600 to-amber-500 text-white flex items-center justify-center pl-2 text-5xl shadow-[0_0_50px_rgba(239,68,68,0.8)] group-hover:scale-110 active:scale-95 transition-transform mb-4">
            ▶
          </div>
          <span className="text-base font-black tracking-widest uppercase text-red-300 bg-black/80 px-6 py-2 rounded-full border border-red-500/40 shadow-xl">
            Avvia Spiegazione con Voce Narrante (Spazio)
          </span>
          <span className="text-xs text-white/70 mt-1 font-mono">
            (oppure premi la Barra Spazio sulla tastiera)
          </span>
        </div>
      )}
    </div>
  );
}
