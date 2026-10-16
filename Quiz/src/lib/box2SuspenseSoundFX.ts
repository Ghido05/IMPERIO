// =========================================================================
// MOTORE AUDIO PROCEDURALE PER EFFETTO SUSPENCE - GIOCO 2 (CLASSIFICHE)
// Campanelli sintetici a scala armonica ascendente/discendente e chimes
// Zero dipendenze esterne, latenza zero e massima fedeltà sonora!
// =========================================================================

class Box2SuspenseSoundFXEngine {
  private ctx: AudioContext | null = null;

  public resume() {
    this.getContext();
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
   * Suono campanello brillante quando si sale o si scende di un gradino.
   * La frequenza varia in base al gradino corrente (1..totalSteps) e alla direzione.
   */
  playStepBell(stepIndex: number, totalSteps: number, direction: 'up' | 'down') {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = Math.max(ctx.currentTime, 0.05);

    // Scala musicale di campanelli (frequenze armoniche brillanti)
    // Dal gradino 1 (~523Hz, C5) al gradino 10 (~1568Hz, G6)
    const normalized = Math.max(0, Math.min(1, (stepIndex - 1) / Math.max(1, totalSteps - 1)));
    const baseFreq = 523.25 * Math.pow(2, normalized * 1.6); // Da C5 a oltre C6+
    const overtoneFreq = baseFreq * 2.76; // Armonico metallico tipico dei campanelli/tubular chimes

    // Oscillatore Fondamentale (onda sinusoidale pura e squillante)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';

    // Piccolo micro-glissato in base alla direzione per dare sensazione di salita o discesa
    if (direction === 'up') {
      osc1.frequency.setValueAtTime(baseFreq * 0.96, now);
      osc1.frequency.exponentialRampToValueAtTime(baseFreq, now + 0.04);
    } else {
      osc1.frequency.setValueAtTime(baseFreq * 1.04, now);
      osc1.frequency.exponentialRampToValueAtTime(baseFreq, now + 0.04);
    }

    gain1.gain.setValueAtTime(0.001, now);
    gain1.gain.linearRampToValueAtTime(0.28, now + 0.008);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.3);

    // Secondo Oscillatore (armonico perlescente / metallico della campana)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(overtoneFreq, now);

    gain2.gain.setValueAtTime(0.001, now);
    gain2.gain.linearRampToValueAtTime(0.12, now + 0.006);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now);
    osc2.stop(now + 0.24);
  }

  /**
   * Breve rimbombo / tick di tensione quando il cursore atterra sul gradino bersaglio prima di rivelarlo
   */
  playLockTick() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = Math.max(ctx.currentTime, 0.05);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.18);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.frequency.exponentialRampToValueAtTime(180, now + 0.18);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.24);
  }

  /**
   * Fanfara trionfale di campane e bagliore sonoro celestiale al momento della rivelazione
   */
  playVictoryReveal() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = Math.max(ctx.currentTime, 0.05);

    // 1. Accordo di campane scintillanti (Arpeggio Do Maggiore brillante / cristalli)
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98];
    notes.forEach((freq, idx) => {
      const startTime = now + idx * 0.055;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(0.22, startTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 1.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 1.25);
    });

    // 2. Whoosh energetico di apertura e riverbero caldo
    const bufferSize = ctx.sampleRate * 0.45;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.35));
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(600, now);
    filter.frequency.exponentialRampToValueAtTime(3200, now + 0.25);
    filter.Q.setValueAtTime(2.5, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.001, now);
    noiseGain.gain.linearRampToValueAtTime(0.25, now + 0.04);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    noise.start(now);
  }
}

export const box2SuspenseSoundFX = new Box2SuspenseSoundFXEngine();
