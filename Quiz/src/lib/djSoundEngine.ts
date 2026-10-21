// DJ Sound Engine & Procedural FX Synthesizer for Imperio Launchpad
// Low latency (<15ms) Web Audio API sound generator + custom audio playback manager.

export type PadColor = 'cyan' | 'magenta' | 'lime' | 'amber' | 'red' | 'purple' | 'blue' | 'white';

export type PlaybackMode = 'oneshot' | 'loop' | 'restart';

export interface DjPadConfig {
  id: string;
  name: string;
  icon: string;
  color: PadColor;
  hotkey: string;
  soundType: 'preset' | 'file';
  presetId?: string;
  fileUrl?: string;
  fileName?: string;
  mode: PlaybackMode;
  volume: number; // 0 to 1
}

export const PAD_COLORS: Record<PadColor, {
  name: string;
  hex: string;
  glow: string;
  border: string;
  bgActive: string;
  text: string;
  dot: string;
}> = {
  cyan: {
    name: 'Neon Cyan',
    hex: '#06b6d4',
    glow: 'rgba(6,182,212,0.65)',
    border: 'border-cyan-400',
    bgActive: 'bg-cyan-500/30',
    text: 'text-cyan-300',
    dot: 'bg-cyan-400',
  },
  magenta: {
    name: 'Electric Magenta',
    hex: '#ec4899',
    glow: 'rgba(236,72,153,0.65)',
    border: 'border-pink-400',
    bgActive: 'bg-pink-500/30',
    text: 'text-pink-300',
    dot: 'bg-pink-400',
  },
  lime: {
    name: 'Acid Lime',
    hex: '#84cc16',
    glow: 'rgba(132,204,22,0.65)',
    border: 'border-lime-400',
    bgActive: 'bg-lime-500/30',
    text: 'text-lime-300',
    dot: 'bg-lime-400',
  },
  amber: {
    name: 'Bright Amber',
    hex: '#f59e0b',
    glow: 'rgba(245,158,11,0.65)',
    border: 'border-amber-400',
    bgActive: 'bg-amber-500/30',
    text: 'text-amber-300',
    dot: 'bg-amber-400',
  },
  red: {
    name: 'Laser Red',
    hex: '#ef4444',
    glow: 'rgba(239,68,68,0.65)',
    border: 'border-red-400',
    bgActive: 'bg-red-500/30',
    text: 'text-red-300',
    dot: 'bg-red-400',
  },
  purple: {
    name: 'Cyber Purple',
    hex: '#8b5cf6',
    glow: 'rgba(139,92,246,0.65)',
    border: 'border-purple-400',
    bgActive: 'bg-purple-500/30',
    text: 'text-purple-300',
    dot: 'bg-purple-400',
  },
  blue: {
    name: 'Sky Blue',
    hex: '#3b82f6',
    glow: 'rgba(59,130,246,0.65)',
    border: 'border-blue-400',
    bgActive: 'bg-blue-500/30',
    text: 'text-blue-300',
    dot: 'bg-blue-400',
  },
  white: {
    name: 'Ice White',
    hex: '#f8fafc',
    glow: 'rgba(248,250,252,0.65)',
    border: 'border-slate-200',
    bgActive: 'bg-white/30',
    text: 'text-white',
    dot: 'bg-white',
  },
};

export interface SoundPresetMeta {
  id: string;
  name: string;
  icon: string;
  category: string;
  description: string;
}

export const SOUND_PRESETS: SoundPresetMeta[] = [
  { id: 'airhorn', name: 'Airhorn DJ', icon: '🎺', category: 'DJ FX', description: 'Classico blast airhorn stile dancehall / club' },
  { id: 'applause', name: 'Applausi & Tifo', icon: '👏', category: 'Pubblico', description: 'Ovazione del pubblico con applausi calorosi' },
  { id: 'drumroll', name: 'Rullo di Tamburi', icon: '🥁', category: 'Suspense', description: 'Rullo di tamburi in crescendo con piatto finale' },
  { id: 'badumtss', name: 'Ba-Dum-Tss', icon: '💥', category: 'Comedy', description: 'Battuta / rimshot da cabaret per battute' },
  { id: 'siren', name: 'Sirena Club', icon: '🚨', category: 'DJ FX', description: 'Allarme rave / sirena da discoteca' },
  { id: 'fail', name: 'Fail Trombone', icon: '📉', category: 'Comedy', description: 'Trombone triste per risposte sbagliate (wah-wah-wah)' },
  { id: 'scratch', name: 'Vinyl Scratch', icon: '💿', category: 'DJ FX', description: 'Scratch rapido su vinile per fermare la musica' },
  { id: 'gong', name: 'Gong Mistico', icon: '🔔', category: 'Effetti', description: 'Rintocco profondo e maestoso di campana tibetana' },
  { id: 'victory', name: 'Fanfara Vittoria', icon: '🏆', category: 'Vittoria', description: 'Stacco trionfale in ottone per momenti epici' },
  { id: 'laser', name: 'Laser Zap', icon: '⚡', category: 'Effetti', description: 'Spaw laser sintetico retro-futuristico' },
  { id: 'suspense', name: 'Drone Tensione', icon: '❓', category: 'Suspense', description: 'Basso cupo e pulsante per creare attesa' },
  { id: 'boom', name: 'Sub Boom 808', icon: '💣', category: 'DJ FX', description: 'Esplosione sub-bass 808 da impianto potente' },
];

export const DEFAULT_LAUNCHPAD_PADS: DjPadConfig[] = [
  { id: 'pad_1', name: 'Airhorn', icon: '🎺', color: 'amber', hotkey: '1', soundType: 'preset', presetId: 'airhorn', mode: 'oneshot', volume: 1.0 },
  { id: 'pad_2', name: 'Applausi', icon: '👏', color: 'lime', hotkey: '2', soundType: 'preset', presetId: 'applause', mode: 'oneshot', volume: 1.0 },
  { id: 'pad_3', name: 'Rullo Tamburi', icon: '🥁', color: 'cyan', hotkey: '3', soundType: 'preset', presetId: 'drumroll', mode: 'oneshot', volume: 1.0 },
  { id: 'pad_4', name: 'Ba-Dum-Tss', icon: '💥', color: 'magenta', hotkey: '4', soundType: 'preset', presetId: 'badumtss', mode: 'oneshot', volume: 1.0 },

  { id: 'pad_5', name: 'Sirena Club', icon: '🚨', color: 'red', hotkey: 'Q', soundType: 'preset', presetId: 'siren', mode: 'oneshot', volume: 1.0 },
  { id: 'pad_6', name: 'Fail Wah-Wah', icon: '📉', color: 'purple', hotkey: 'W', soundType: 'preset', presetId: 'fail', mode: 'oneshot', volume: 1.0 },
  { id: 'pad_7', name: 'Scratch Vinile', icon: '💿', color: 'blue', hotkey: 'E', soundType: 'preset', presetId: 'scratch', mode: 'oneshot', volume: 1.0 },
  { id: 'pad_8', name: 'Gong Mistico', icon: '🔔', color: 'white', hotkey: 'R', soundType: 'preset', presetId: 'gong', mode: 'oneshot', volume: 1.0 },

  { id: 'pad_9', name: 'Vittoria', icon: '🏆', color: 'amber', hotkey: 'A', soundType: 'preset', presetId: 'victory', mode: 'oneshot', volume: 1.0 },
  { id: 'pad_10', name: 'Laser Zap', icon: '⚡', color: 'cyan', hotkey: 'S', soundType: 'preset', presetId: 'laser', mode: 'oneshot', volume: 1.0 },
  { id: 'pad_11', name: 'Tensione', icon: '❓', color: 'magenta', hotkey: 'D', soundType: 'preset', presetId: 'suspense', mode: 'loop', volume: 1.0 },
  { id: 'pad_12', name: 'Sub Boom', icon: '💣', color: 'red', hotkey: 'F', soundType: 'preset', presetId: 'boom', mode: 'oneshot', volume: 1.0 },
];

export class DjSoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private masterVolume: number = 0.9;
  private activeVoices = new Map<string, { stop: () => void }>();
  private activeAudioElements = new Map<string, HTMLAudioElement>();
  private playingPadIds = new Set<string>();
  private listeners: Array<(playingIds: Set<string>) => void> = [];

  constructor() {
    // Lazy initialized on first user interaction
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMasterVolume(vol: number) {
    this.masterVolume = Math.max(0, Math.min(1, vol));
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
    }
    // Also adjust HTMLAudioElements
    this.activeAudioElements.forEach(el => {
      el.volume = this.masterVolume;
    });
  }

  public getMasterVolume(): number {
    return this.masterVolume;
  }

  public subscribe(fn: (playingIds: Set<string>) => void): () => void {
    this.listeners.push(fn);
    fn(new Set(this.playingPadIds));
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  }

  private notify() {
    const copy = new Set(this.playingPadIds);
    this.listeners.forEach(fn => fn(copy));
  }

  private markPlaying(padId: string, isPlaying: boolean) {
    if (isPlaying) {
      this.playingPadIds.add(padId);
    } else {
      this.playingPadIds.delete(padId);
    }
    this.notify();
  }

  public isPadPlaying(padId: string): boolean {
    return this.playingPadIds.has(padId);
  }

  /** Trigger or toggle playback for a specific pad */
  public triggerPad(pad: DjPadConfig) {
    // If pad is currently playing and in loop mode, toggle off
    if (this.isPadPlaying(pad.id)) {
      if (pad.mode === 'loop' || pad.mode === 'restart') {
        this.stopPad(pad.id);
        if (pad.mode === 'loop') return;
      }
    }

    this.stopPad(pad.id);

    const padVol = (pad.volume ?? 1) * this.masterVolume;

    // Custom audio file playback
    if (pad.soundType === 'file' && pad.fileUrl) {
      try {
        const audio = new Audio(pad.fileUrl);
        audio.volume = Math.max(0, Math.min(1, padVol));
        audio.loop = pad.mode === 'loop';

        audio.onplay = () => this.markPlaying(pad.id, true);
        audio.onended = () => {
          this.activeAudioElements.delete(pad.id);
          this.markPlaying(pad.id, false);
        };
        audio.onerror = () => {
          this.activeAudioElements.delete(pad.id);
          this.markPlaying(pad.id, false);
        };

        this.activeAudioElements.set(pad.id, audio);
        audio.play().catch(err => {
          console.warn("[DjSoundEngine] Errore play audio:", err);
          this.markPlaying(pad.id, false);
        });
        return;
      } catch (err) {
        console.warn("[DjSoundEngine] Errore apertura file audio:", err);
      }
    }

    // Procedural synthesizer sound
    const ctx = this.getAudioContext();
    if (!ctx) return;

    this.markPlaying(pad.id, true);

    const presetId = pad.presetId || 'airhorn';
    const voice = this.synthesizePreset(presetId, padVol, pad.mode === 'loop', () => {
      this.activeVoices.delete(pad.id);
      this.markPlaying(pad.id, false);
    });

    if (voice) {
      this.activeVoices.set(pad.id, voice);
    } else {
      this.markPlaying(pad.id, false);
    }
  }

  public stopPad(padId: string) {
    // Stop procedural voice
    const voice = this.activeVoices.get(padId);
    if (voice) {
      try { voice.stop(); } catch {}
      this.activeVoices.delete(padId);
    }

    // Stop audio element
    const audio = this.activeAudioElements.get(padId);
    if (audio) {
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch {}
      this.activeAudioElements.delete(padId);
    }

    this.markPlaying(padId, false);
  }

  /** Stop all sounds instantly (Panic button) */
  public stopAll() {
    this.activeVoices.forEach(v => {
      try { v.stop(); } catch {}
    });
    this.activeVoices.clear();

    this.activeAudioElements.forEach(a => {
      try {
        a.pause();
        a.currentTime = 0;
      } catch {}
    });
    this.activeAudioElements.clear();

    this.playingPadIds.clear();
    this.notify();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PROCEDURAL SOUND SYNTHESIS METHODS
  // ─────────────────────────────────────────────────────────────────────────────

  private synthesizePreset(
    id: string,
    gainLevel: number,
    isLoop: boolean,
    onEnd: () => void
  ): { stop: () => void } | null {
    const ctx = this.getAudioContext();
    if (!ctx) return null;

    switch (id) {
      case 'airhorn':
        return this.synthAirhorn(ctx, gainLevel, onEnd);
      case 'applause':
        return this.synthApplause(ctx, gainLevel, onEnd);
      case 'drumroll':
        return this.synthDrumroll(ctx, gainLevel, onEnd);
      case 'badumtss':
        return this.synthBadumtss(ctx, gainLevel, onEnd);
      case 'siren':
        return this.synthSiren(ctx, gainLevel, isLoop, onEnd);
      case 'fail':
        return this.synthFail(ctx, gainLevel, onEnd);
      case 'scratch':
        return this.synthScratch(ctx, gainLevel, onEnd);
      case 'gong':
        return this.synthGong(ctx, gainLevel, onEnd);
      case 'victory':
        return this.synthVictory(ctx, gainLevel, onEnd);
      case 'laser':
        return this.synthLaser(ctx, gainLevel, onEnd);
      case 'suspense':
        return this.synthSuspense(ctx, gainLevel, isLoop, onEnd);
      case 'boom':
        return this.synthBoom(ctx, gainLevel, onEnd);
      default:
        return this.synthAirhorn(ctx, gainLevel, onEnd);
    }
  }

  /** 1. DJ Airhorn Fanfare (Dut-dut-dut-duuuuuh!) */
  private synthAirhorn(ctx: AudioContext, gainLevel: number, onEnd: () => void) {
    const now = ctx.currentTime;
    const notes = [
      { time: 0.00, dur: 0.12, freq: 466.16 }, // Bb4
      { time: 0.14, dur: 0.12, freq: 466.16 }, // Bb4
      { time: 0.28, dur: 0.12, freq: 466.16 }, // Bb4
      { time: 0.42, dur: 0.55, freq: 466.16 }, // Long blast
    ];

    const outGain = ctx.createGain();
    outGain.gain.setValueAtTime(gainLevel * 0.4, now);
    outGain.connect(this.masterGain || ctx.destination);

    const activeOscs: OscillatorNode[] = [];

    notes.forEach(n => {
      const start = now + n.time;
      const end = start + n.dur;

      // Two detuned saw waves for thick brass timbre
      [-7, 0, 7].forEach(detune => {
        const osc = ctx.createOscillator();
        const noteGain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(n.freq, start);
        osc.detune.setValueAtTime(detune, start);

        noteGain.gain.setValueAtTime(0, start);
        noteGain.gain.linearRampToValueAtTime(0.35, start + 0.02);
        noteGain.gain.setValueAtTime(0.35, end - 0.03);
        noteGain.gain.exponentialRampToValueAtTime(0.001, end);

        osc.connect(noteGain);
        noteGain.connect(outGain);

        osc.start(start);
        osc.stop(end);
        activeOscs.push(osc);
      });
    });

    const totalDur = 1.05;
    const timer = setTimeout(onEnd, totalDur * 1000);

    return {
      stop: () => {
        clearTimeout(timer);
        try {
          activeOscs.forEach(o => o.stop());
          outGain.disconnect();
        } catch {}
      }
    };
  }

  /** 2. Crowd Applause */
  private synthApplause(ctx: AudioContext, gainLevel: number, onEnd: () => void) {
    const duration = 2.4;
    const now = ctx.currentTime;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      // Noise burst modulated with random claps
      const t = i / ctx.sampleRate;
      const envelope = Math.sin((t / duration) * Math.PI);
      const isClap = Math.random() < 0.03 ? Math.random() * 2 - 1 : 0;
      data[i] = (Math.random() * 0.4 - 0.2 + isClap) * envelope;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, now);
    filter.Q.setValueAtTime(1.2, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(gainLevel * 0.65, now);
    gain.connect(this.masterGain || ctx.destination);

    noise.connect(filter);
    filter.connect(gain);

    noise.start(now);
    const timer = setTimeout(onEnd, duration * 1000);

    return {
      stop: () => {
        clearTimeout(timer);
        try { noise.stop(); } catch {}
      }
    };
  }

  /** 3. Drum Roll Crescendo + Crash Cymbal */
  private synthDrumroll(ctx: AudioContext, gainLevel: number, onEnd: () => void) {
    const rollDur = 1.6;
    const totalDur = rollDur + 0.8;
    const now = ctx.currentTime;

    const outGain = ctx.createGain();
    outGain.gain.setValueAtTime(gainLevel * 0.6, now);
    outGain.connect(this.masterGain || ctx.destination);

    // Roll snare hits
    const hitCount = 38;
    for (let i = 0; i < hitCount; i++) {
      const hitTime = now + (i / hitCount) * rollDur;
      const progress = i / hitCount; // crescendo
      const hitVol = 0.05 + progress * 0.35;

      // Filtered noise pop
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, hitTime);
      osc.frequency.exponentialRampToValueAtTime(60, hitTime + 0.04);

      g.gain.setValueAtTime(hitVol, hitTime);
      g.gain.exponentialRampToValueAtTime(0.001, hitTime + 0.04);

      osc.connect(g);
      g.connect(outGain);

      osc.start(hitTime);
      osc.stop(hitTime + 0.05);
    }

    // Final Crash Cymbal
    const crashTime = now + rollDur;
    const bufferSize = Math.floor(ctx.sampleRate * 0.8);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.22));
    }
    const crash = ctx.createBufferSource();
    crash.buffer = buffer;
    const crashFilter = ctx.createBiquadFilter();
    crashFilter.type = 'highpass';
    crashFilter.frequency.setValueAtTime(4500, crashTime);

    const crashGain = ctx.createGain();
    crashGain.gain.setValueAtTime(0.5, crashTime);
    crashGain.gain.exponentialRampToValueAtTime(0.001, crashTime + 0.75);

    crash.connect(crashFilter);
    crashFilter.connect(crashGain);
    crashGain.connect(outGain);

    crash.start(crashTime);

    const timer = setTimeout(onEnd, totalDur * 1000);
    return {
      stop: () => {
        clearTimeout(timer);
        try { outGain.disconnect(); } catch {}
      }
    };
  }

  /** 4. Ba-Dum-Tss Joke Rimshot */
  private synthBadumtss(ctx: AudioContext, gainLevel: number, onEnd: () => void) {
    const now = ctx.currentTime;
    const outGain = ctx.createGain();
    outGain.gain.setValueAtTime(gainLevel * 0.65, now);
    outGain.connect(this.masterGain || ctx.destination);

    // Hit 1: Ba
    this.playSnareHit(ctx, outGain, now, 180, 0.35);
    // Hit 2: Dum
    this.playSnareHit(ctx, outGain, now + 0.16, 220, 0.45);
    // Hit 3: Tss (Hi-hat crash)
    const tssTime = now + 0.36;
    const bufferSize = Math.floor(ctx.sampleRate * 0.5);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.15));
    }
    const tss = ctx.createBufferSource();
    tss.buffer = buffer;
    const tssFilter = ctx.createBiquadFilter();
    tssFilter.type = 'highpass';
    tssFilter.frequency.setValueAtTime(6000, tssTime);

    const tssGain = ctx.createGain();
    tssGain.gain.setValueAtTime(0.55, tssTime);
    tssGain.gain.exponentialRampToValueAtTime(0.001, tssTime + 0.45);

    tss.connect(tssFilter);
    tssFilter.connect(tssGain);
    tssGain.connect(outGain);

    tss.start(tssTime);

    const timer = setTimeout(onEnd, 950);
    return {
      stop: () => {
        clearTimeout(timer);
        try { outGain.disconnect(); } catch {}
      }
    };
  }

  private playSnareHit(ctx: AudioContext, dest: AudioNode, time: number, freq: number, vol: number) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);
    osc.frequency.exponentialRampToValueAtTime(50, time + 0.08);

    g.gain.setValueAtTime(vol, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.09);

    osc.connect(g);
    g.connect(dest);
    osc.start(time);
    osc.stop(time + 0.1);
  }

  /** 5. Rave / Club Siren Alarm */
  private synthSiren(ctx: AudioContext, gainLevel: number, isLoop: boolean, onEnd: () => void) {
    const now = ctx.currentTime;
    const dur = isLoop ? 600 : 2.2;

    const osc = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(750, now);

    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(3.2, now); // Sweep rate
    lfoGain.gain.setValueAtTime(350, now); // Sweep depth

    lfo.connect(osc.frequency);

    gain.gain.setValueAtTime(gainLevel * 0.35, now);
    if (!isLoop) {
      gain.gain.setValueAtTime(gainLevel * 0.35, now + 1.8);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    }
    gain.connect(this.masterGain || ctx.destination);

    osc.connect(gain);

    lfo.start(now);
    osc.start(now);
    if (!isLoop) {
      lfo.stop(now + dur);
      osc.stop(now + dur);
    }

    const timer = setTimeout(onEnd, dur * 1000);
    return {
      stop: () => {
        clearTimeout(timer);
        try {
          osc.stop();
          lfo.stop();
          gain.disconnect();
        } catch {}
      }
    };
  }

  /** 6. Sad Trombone (Fail) */
  private synthFail(ctx: AudioContext, gainLevel: number, onEnd: () => void) {
    const now = ctx.currentTime;
    const steps = [
      { start: 0.0, dur: 0.28, freq: 311.13 }, // Eb4
      { start: 0.3, dur: 0.28, freq: 293.66 }, // D4
      { start: 0.6, dur: 0.28, freq: 277.18 }, // Db4
      { start: 0.9, dur: 0.75, freq: 261.63, dropTo: 220 }, // C4 sliding to A3 with heavy vibrato
    ];

    const outGain = ctx.createGain();
    outGain.gain.setValueAtTime(gainLevel * 0.45, now);
    outGain.connect(this.masterGain || ctx.destination);

    steps.forEach(s => {
      const startTime = now + s.start;
      const endTime = startTime + s.dur;

      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(s.freq, startTime);

      if (s.dropTo) {
        osc.frequency.setValueAtTime(s.freq, startTime + 0.15);
        osc.frequency.exponentialRampToValueAtTime(s.dropTo, endTime);
      }

      g.gain.setValueAtTime(0, startTime);
      g.gain.linearRampToValueAtTime(0.4, startTime + 0.04);
      g.gain.setValueAtTime(0.4, endTime - 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, endTime);

      osc.connect(g);
      g.connect(outGain);

      osc.start(startTime);
      osc.stop(endTime);
    });

    const timer = setTimeout(onEnd, 1800);
    return {
      stop: () => {
        clearTimeout(timer);
        try { outGain.disconnect(); } catch {}
      }
    };
  }

  /** 7. DJ Vinyl Scratch */
  private synthScratch(ctx: AudioContext, gainLevel: number, onEnd: () => void) {
    const now = ctx.currentTime;
    const dur = 0.35;
    const bufferSize = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      const t = i / bufferSize;
      const freqMod = Math.sin(t * Math.PI * 4);
      data[i] = (Math.random() * 2 - 1) * freqMod * (1 - t);
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1800, now);
    filter.frequency.exponentialRampToValueAtTime(400, now + 0.15);
    filter.frequency.exponentialRampToValueAtTime(2200, now + dur);
    filter.Q.setValueAtTime(4, now);

    const g = ctx.createGain();
    g.gain.setValueAtTime(gainLevel * 0.75, now);
    g.connect(this.masterGain || ctx.destination);

    noise.connect(filter);
    filter.connect(g);

    noise.start(now);
    const timer = setTimeout(onEnd, dur * 1000 + 50);
    return {
      stop: () => {
        clearTimeout(timer);
        try { noise.stop(); } catch {}
      }
    };
  }

  /** 8. Deep Resonant Temple Gong */
  private synthGong(ctx: AudioContext, gainLevel: number, onEnd: () => void) {
    const now = ctx.currentTime;
    const dur = 3.2;

    const freqs = [180, 277, 330, 440, 587, 880];
    const outGain = ctx.createGain();
    outGain.gain.setValueAtTime(gainLevel * 0.45, now);
    outGain.connect(this.masterGain || ctx.destination);

    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = i % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      g.gain.setValueAtTime(0.3 / (i + 1), now);
      g.gain.exponentialRampToValueAtTime(0.001, now + dur - (i * 0.2));

      osc.connect(g);
      g.connect(outGain);

      osc.start(now);
      osc.stop(now + dur);
    });

    const timer = setTimeout(onEnd, dur * 1000);
    return {
      stop: () => {
        clearTimeout(timer);
        try { outGain.disconnect(); } catch {}
      }
    };
  }

  /** 9. Triumphant Brass Fanfare */
  private synthVictory(ctx: AudioContext, gainLevel: number, onEnd: () => void) {
    const now = ctx.currentTime;
    const notes = [
      { t: 0.00, f: 523.25, d: 0.14 }, // C5
      { t: 0.15, f: 659.25, d: 0.14 }, // E5
      { t: 0.30, f: 783.99, d: 0.14 }, // G5
      { t: 0.45, f: 1046.50, d: 0.55 }, // High C6
    ];

    const outGain = ctx.createGain();
    outGain.gain.setValueAtTime(gainLevel * 0.45, now);
    outGain.connect(this.masterGain || ctx.destination);

    notes.forEach(n => {
      const start = now + n.t;
      const end = start + n.d;

      [-5, 0, 5].forEach(detune => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(n.f, start);
        osc.detune.setValueAtTime(detune, start);

        g.gain.setValueAtTime(0, start);
        g.gain.linearRampToValueAtTime(0.25, start + 0.03);
        g.gain.setValueAtTime(0.25, end - 0.05);
        g.gain.exponentialRampToValueAtTime(0.001, end);

        osc.connect(g);
        g.connect(outGain);

        osc.start(start);
        osc.stop(end);
      });
    });

    const timer = setTimeout(onEnd, 1100);
    return {
      stop: () => {
        clearTimeout(timer);
        try { outGain.disconnect(); } catch {}
      }
    };
  }

  /** 10. Sci-Fi Laser Zap */
  private synthLaser(ctx: AudioContext, gainLevel: number, onEnd: () => void) {
    const now = ctx.currentTime;
    const dur = 0.28;

    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(2600, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + dur);

    g.gain.setValueAtTime(gainLevel * 0.5, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);

    osc.connect(g);
    g.connect(this.masterGain || ctx.destination);

    osc.start(now);
    osc.stop(now + dur);

    const timer = setTimeout(onEnd, dur * 1000 + 40);
    return {
      stop: () => {
        clearTimeout(timer);
        try { osc.stop(); } catch {}
      }
    };
  }

  /** 11. Low Suspense Drone (Tension) */
  private synthSuspense(ctx: AudioContext, gainLevel: number, isLoop: boolean, onEnd: () => void) {
    const now = ctx.currentTime;
    const dur = isLoop ? 600 : 3.0;

    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const g = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(65.41, now); // C2 low sub

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(68.5, now); // beating tension
    osc2.detune.setValueAtTime(4, now);

    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(gainLevel * 0.45, now + 0.3);
    if (!isLoop) {
      g.gain.setValueAtTime(gainLevel * 0.45, now + dur - 0.5);
      g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    }
    g.connect(this.masterGain || ctx.destination);

    osc.connect(g);
    osc2.connect(g);

    osc.start(now);
    osc2.start(now);
    if (!isLoop) {
      osc.stop(now + dur);
      osc2.stop(now + dur);
    }

    const timer = setTimeout(onEnd, dur * 1000);
    return {
      stop: () => {
        clearTimeout(timer);
        try {
          osc.stop();
          osc2.stop();
          g.disconnect();
        } catch {}
      }
    };
  }

  /** 12. 808 Sub Boom Explosion */
  private synthBoom(ctx: AudioContext, gainLevel: number, onEnd: () => void) {
    const now = ctx.currentTime;
    const dur = 1.4;

    // Sub sine drop
    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(140, now);
    sub.frequency.exponentialRampToValueAtTime(35, now + 0.3);

    subGain.gain.setValueAtTime(gainLevel * 0.75, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    sub.connect(subGain);
    subGain.connect(this.masterGain || ctx.destination);
    sub.start(now);
    sub.stop(now + dur);

    // Noise crackle
    const bufferSize = Math.floor(ctx.sampleRate * 0.3);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.08));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(gainLevel * 0.4, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain || ctx.destination);

    noise.start(now);

    const timer = setTimeout(onEnd, dur * 1000);
    return {
      stop: () => {
        clearTimeout(timer);
        try { sub.stop(); noise.stop(); } catch {}
      }
    };
  }
}

// Global Singleton Instance
export const djSoundEngine = new DjSoundEngine();
