// =========================================================================
// MOTORE EFFETTI SONORI TEMPIO INDINA JONES (Web Audio API nativo a latenza zero)
// Nessun file esterno richiesto: funziona ovunque in totale affidabilità!
// =========================================================================

class TempleSoundFXEngine {
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
   * Scatto di ingranaggi e cigolio di pietra antica quando si calpesta la mattonella
   */
  playStoneStep() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = Math.max(ctx.currentTime, 0.05);

    // Rumore sordo di impatto lapideo (basso filtrato)
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(130, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.22);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, now);
    filter.frequency.exponentialRampToValueAtTime(120, now + 0.22);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.35, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.26);

    // Scatto metallico/pietra ad incastro
    const clickOsc = ctx.createOscillator();
    const clickGain = ctx.createGain();
    clickOsc.type = 'sine';
    clickOsc.frequency.setValueAtTime(820, now + 0.04);
    clickOsc.frequency.exponentialRampToValueAtTime(420, now + 0.1);

    clickGain.gain.setValueAtTime(0.001, now + 0.04);
    clickGain.gain.linearRampToValueAtTime(0.18, now + 0.05);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

    clickOsc.connect(clickGain);
    clickGain.connect(ctx.destination);

    clickOsc.start(now + 0.04);
    clickOsc.stop(now + 0.13);
  }

  /**
   * Tensione crescente della suspense (0s - 1.8s): battito profondo e ronzio mistico
   */
  playSuspenseTension() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = Math.max(ctx.currentTime, 0.05);

    // 1. Droning mistico che sale di frequenza
    const drone = ctx.createOscillator();
    const droneGain = ctx.createGain();
    const droneFilter = ctx.createBiquadFilter();

    drone.type = 'sawtooth';
    drone.frequency.setValueAtTime(75, now);
    drone.frequency.exponentialRampToValueAtTime(260, now + 1.7);

    droneFilter.type = 'lowpass';
    droneFilter.frequency.setValueAtTime(280, now);
    droneFilter.frequency.linearRampToValueAtTime(950, now + 1.7);

    droneGain.gain.setValueAtTime(0.001, now);
    droneGain.gain.linearRampToValueAtTime(0.22, now + 0.4);
    droneGain.gain.linearRampToValueAtTime(0.38, now + 1.6);
    droneGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);

    drone.connect(droneFilter);
    droneFilter.connect(droneGain);
    droneGain.connect(ctx.destination);

    drone.start(now);
    drone.stop(now + 1.85);

    // 2. Battiti cardiaci / impulsi del tempio a ritmo accelerato
    const beats = [0.0, 0.45, 0.85, 1.2, 1.45, 1.65];
    beats.forEach((offset, idx) => {
      const bOsc = ctx.createOscillator();
      const bGain = ctx.createGain();
      bOsc.type = 'sine';
      bOsc.frequency.setValueAtTime(90 + idx * 10, now + offset);
      bOsc.frequency.exponentialRampToValueAtTime(45, now + offset + 0.1);

      bGain.gain.setValueAtTime(0.001, now + offset);
      bGain.gain.linearRampToValueAtTime(0.28, now + offset + 0.015);
      bGain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.15);

      bOsc.connect(bGain);
      bGain.connect(ctx.destination);

      bOsc.start(now + offset);
      bOsc.stop(now + offset + 0.16);
    });
  }

  /**
   * Fanfara radiosa e vittoria quando la mattonella è della squadra
   */
  playTeamTileReveal() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = Math.max(ctx.currentTime, 0.05);

    // Gong / campana mistica di apertura
    const bellOsc = ctx.createOscillator();
    const bellGain = ctx.createGain();
    bellOsc.type = 'sine';
    bellOsc.frequency.setValueAtTime(523.25, now); // C5
    bellGain.gain.setValueAtTime(0.001, now);
    bellGain.gain.linearRampToValueAtTime(0.35, now + 0.01);
    bellGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
    bellOsc.connect(bellGain);
    bellGain.connect(ctx.destination);
    bellOsc.start(now);
    bellOsc.stop(now + 0.95);

    // Arpeggio dorato ascendente (C5, E5, G5, C6, E6)
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + 0.1 + idx * 0.07);

      gain.gain.setValueAtTime(0.001, now + 0.1 + idx * 0.07);
      gain.gain.linearRampToValueAtTime(0.3, now + 0.1 + idx * 0.07 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1 + idx * 0.07 + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + 0.1 + idx * 0.07);
      osc.stop(now + 0.1 + idx * 0.07 + 0.65);
    });
  }

  /**
   * Tonfo sordo di pietra inerte per le parole neutre
   */
  playNeutralThud() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = Math.max(ctx.currentTime, 0.05);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(95, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.35);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(320, now);
    filter.frequency.exponentialRampToValueAtTime(60, now + 0.35);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.28, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.45);
  }

  /**
   * Boato ed esplosione della BOMBA (terremoto + detonazione + allarme profondo)
   */
  playBombExplosion() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = Math.max(ctx.currentTime, 0.05);

    // 1. Rumore bianco filtrato (esplosione/detonazione sismica)
    try {
      const bufferSize = ctx.sampleRate * 1.4;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'lowpass';
      noiseFilter.frequency.setValueAtTime(800, now);
      noiseFilter.frequency.exponentialRampToValueAtTime(80, now + 1.2);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.001, now);
      noiseGain.gain.linearRampToValueAtTime(0.65, now + 0.03);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.3);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(ctx.destination);

      noise.start(now);
      noise.stop(now + 1.35);
    } catch {}

    // 2. Sub-bass boom da cinema
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(140, now);
    subOsc.frequency.exponentialRampToValueAtTime(28, now + 0.9);

    subGain.gain.setValueAtTime(0.001, now);
    subGain.gain.linearRampToValueAtTime(0.7, now + 0.02);
    subGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);

    subOsc.connect(subGain);
    subGain.connect(ctx.destination);

    subOsc.start(now);
    subOsc.stop(now + 1.15);

    // 3. Allarme a doppio colpo cupo
    [0.35, 0.7].forEach((offset) => {
      const aOsc = ctx.createOscillator();
      const aGain = ctx.createGain();
      aOsc.type = 'sawtooth';
      aOsc.frequency.setValueAtTime(180, now + offset);
      aOsc.frequency.exponentialRampToValueAtTime(85, now + offset + 0.25);

      aGain.gain.setValueAtTime(0.001, now + offset);
      aGain.gain.linearRampToValueAtTime(0.25, now + offset + 0.02);
      aGain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.28);

      aOsc.connect(aGain);
      aGain.connect(ctx.destination);

      aOsc.start(now + offset);
      aOsc.stop(now + offset + 0.3);
    });
  }
}

export const templeSoundFX = new TempleSoundFXEngine();
