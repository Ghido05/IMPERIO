import { useEffect, useMemo, useRef, useState } from 'react';
import { useGameData } from './context/GameDataContext';
import { useScores } from './context/ScoreContext';
import { useSyncedState } from './hooks/useSyncedState';
import { assetUrl } from './lib/assetUrl';

export type TeamId = 1 | 2 | 3;

export type DiceFaceKey =
  | 'zero'    // 1 faccia con numero 0
  | 'right_1' // Faccia 1 freccia destra
  | 'right_2' // Faccia 1 freccia destra (seconda faccia)
  | 'left_1'  // Faccia 1 freccia sinistra
  | 'left_2'  // Faccia 1 freccia sinistra (seconda faccia)
  | 'double'; // 1 faccia con numero 2 e due frecce (una a dx e una a sx, una sopra l'altra)

export type DiceFaceType = 'zero' | 'right' | 'left' | 'double';

export interface DiceFaceMeta {
  key: DiceFaceKey;
  type: DiceFaceType;
  value: number;
  direction?: 'right' | 'left' | 'both';
  labelShort: string;
}

export const DICE_FACES_CONFIG: Record<DiceFaceKey, DiceFaceMeta> = {
  right_1: {
    key: 'right_1',
    type: 'right',
    value: 1,
    direction: 'right',
    labelShort: '1 ➔',
  },
  left_1: {
    key: 'left_1',
    type: 'left',
    value: 1,
    direction: 'left',
    labelShort: '1 ⬅',
  },
  right_2: {
    key: 'right_2',
    type: 'right',
    value: 1,
    direction: 'right',
    labelShort: '1 ➔',
  },
  left_2: {
    key: 'left_2',
    type: 'left',
    value: 1,
    direction: 'left',
    labelShort: '1 ⬅',
  },
  double: {
    key: 'double',
    type: 'double',
    value: 2,
    direction: 'both',
    labelShort: '2 (⇆)',
  },
  zero: {
    key: 'zero',
    type: 'zero',
    value: 0,
    labelShort: '0',
  },
};

export const DICE_FACES: DiceFaceKey[] = [
  'right_1',
  'left_1',
  'right_2',
  'left_2',
  'double',
  'zero',
];

export function normalizeDieFaceKey(raw: any): DiceFaceKey | null {
  if (!raw) return null;
  if (raw in DICE_FACES_CONFIG) return raw as DiceFaceKey;
  if (raw === 'right') return 'right_1';
  if (raw === 'left') return 'left_1';
  if (raw === 'both') return 'double';
  if (raw === 'self') return 'zero';
  return null;
}

interface TeamVisualMeta {
  id: TeamId;
  defaultName: string;
  colorName: string;
  colorHex: string;
  colorNeon: string;
  colorGlow: string;
  spotlightGlow: string;
}

const TEAMS_CONFIG: Record<TeamId, TeamVisualMeta> = {
  1: {
    id: 1,
    defaultName: 'SQUADRA 1',
    colorName: 'Rosso',
    colorHex: '#ef4444',
    colorNeon: '#ff3344',
    colorGlow: 'rgba(239, 68, 68, 0.7)',
    spotlightGlow: 'radial-gradient(ellipse at 50% 50%, rgba(239, 68, 68, 0.35) 0%, rgba(239, 68, 68, 0.1) 45%, transparent 70%)',
  },
  2: {
    id: 2,
    defaultName: 'SQUADRA 2',
    colorName: 'Blu',
    colorHex: '#3b82f6',
    colorNeon: '#00b4d8',
    colorGlow: 'rgba(59, 130, 246, 0.7)',
    spotlightGlow: 'radial-gradient(ellipse at 50% 50%, rgba(0, 180, 216, 0.35) 0%, rgba(59, 130, 246, 0.1) 45%, transparent 70%)',
  },
  3: {
    id: 3,
    defaultName: 'SQUADRA 3',
    colorName: 'Verde',
    colorHex: '#10b981',
    colorNeon: '#05f190',
    colorGlow: 'rgba(16, 185, 129, 0.7)',
    spotlightGlow: 'radial-gradient(ellipse at 50% 50%, rgba(16, 185, 129, 0.35) 0%, rgba(5, 241, 144, 0.1) 45%, transparent 70%)',
  },
};

// 4 Generic Universal Bonuses (adaptable to ANY background theme)
const BONUS_CONFIGS = [
  { key: 'dado', label: 'DADO', sublabel: 'Rilancio', type: 'dice' },
  { key: 'switch', label: 'SWITCH', sublabel: 'Cambio', type: 'switch' },
  { key: 'arco', label: 'ARCO', sublabel: 'Attacco', type: 'bow' },
  { key: 'scudo', label: 'SCUDO', sublabel: 'Difesa', type: 'shield' },
];

// Audio synthesizer for zero-dependency sounds
function playSound(type: 'roll' | 'land' | 'correct' | 'wrong' | 'eliminate' | 'wipeout' | 'victory') {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    if (type === 'roll') {
      for (let i = 0; i < 7; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(220 + Math.random() * 280, now + i * 0.12);
        gain.gain.setValueAtTime(0.09, now + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.12);
        osc.stop(now + i * 0.12 + 0.09);
      }
    } else if (type === 'land') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.2);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.32);
    } else if (type === 'correct') {
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        gain.gain.setValueAtTime(0.2, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.38);
      });
    } else if (type === 'wrong') {
      [280, 220, 160].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);
        gain.gain.setValueAtTime(0.18, now + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.28);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.3);
      });
    } else if (type === 'eliminate') {
      // 1. Descending slide (falling into water)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.28);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.31);

      // 2. Water splash noise burst
      try {
        const bufferSize = Math.floor(ctx.sampleRate * 0.22);
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.28));
        }
        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(850, now + 0.2);
        filter.Q.setValueAtTime(2.2, now + 0.2);

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.26, now + 0.2);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.44);

        whiteNoise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        whiteNoise.start(now + 0.2);
      } catch {}

      // 3. Water bubble "bloop"
      const bubble = ctx.createOscillator();
      const bubbleGain = ctx.createGain();
      bubble.type = 'sine';
      bubble.frequency.setValueAtTime(240, now + 0.26);
      bubble.frequency.exponentialRampToValueAtTime(480, now + 0.42);
      bubbleGain.gain.setValueAtTime(0.2, now + 0.26);
      bubbleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);
      bubble.connect(bubbleGain);
      bubbleGain.connect(ctx.destination);
      bubble.start(now + 0.26);
      bubble.stop(now + 0.49);
    } else if (type === 'wipeout') {
      // Dramatic, cinematic team wipeout sound
      // 1. Deep sub-bass boom
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'triangle';
      subOsc.frequency.setValueAtTime(160, now);
      subOsc.frequency.exponentialRampToValueAtTime(36, now + 0.7);
      subGain.gain.setValueAtTime(0.35, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
      subOsc.connect(subGain);
      subGain.connect(ctx.destination);
      subOsc.start(now);
      subOsc.stop(now + 0.8);

      // 2. Descending cyber glitch power-down
      const buzzOsc = ctx.createOscillator();
      const buzzGain = ctx.createGain();
      buzzOsc.type = 'sawtooth';
      buzzOsc.frequency.setValueAtTime(320, now);
      buzzOsc.frequency.exponentialRampToValueAtTime(55, now + 0.55);
      buzzGain.gain.setValueAtTime(0.2, now);
      buzzGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      buzzOsc.connect(buzzGain);
      buzzGain.connect(ctx.destination);
      buzzOsc.start(now);
      buzzOsc.stop(now + 0.65);

      // 3. Dissonant alert hit
      [440, 466].forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, now + 0.05);
        gain.gain.setValueAtTime(0.08, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + 0.05);
        osc.stop(now + 0.48);
      });
    } else if (type === 'victory') {
      // Grand celebratory victory fanfare arpeggio
      const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);
        gain.gain.setValueAtTime(0.24, now + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.65);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.7);
      });
      // Golden shimmering sparkle
      for (let s = 0; s < 10; s++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200 + Math.random() * 1400, now + 0.8 + s * 0.08);
        gain.gain.setValueAtTime(0.09, now + 0.8 + s * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8 + s * 0.08 + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + 0.8 + s * 0.08);
        osc.stop(now + 0.8 + s * 0.08 + 0.22);
      }
    }
  } catch {}
}

function getNextTeam(team: TeamId, dir: 'left' | 'right'): TeamId {
  if (dir === 'right') return (team === 3 ? 1 : team + 1) as TeamId;
  return (team === 1 ? 3 : team - 1) as TeamId;
}

function normalizeStartingMembers(scores: number[] | null): Record<TeamId, number> {
  const base: Record<TeamId, number> = { 1: 6, 2: 5, 3: 3 };
  if (!scores || scores.length < 3) return base;
  const ranking = scores
    .map((score, index) => ({ teamId: (index + 1) as TeamId, score }))
    .sort((a, b) => b.score - a.score);
  const assigned = [6, 5, 3];
  ranking.forEach((item, idx) => {
    base[item.teamId] = assigned[idx] ?? base[item.teamId];
  });
  return base;
}

// Stylized Omino Pawn component matching omini.jpg with hilarious splash-sink animation
function OminoFigure({
  color,
  neonColor,
  active,
  isDrowning,
  onClick,
}: {
  color: string;
  neonColor: string;
  active: boolean;
  isDrowning?: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`cursor-pointer select-none transform transition-all ${
        isDrowning
          ? 'z-40 pointer-events-none'
          : active
          ? 'opacity-100 scale-100 hover:scale-115 hover:-translate-y-1.5 duration-300'
          : 'opacity-0 scale-50 pointer-events-none duration-500'
      }`}
      style={{
        animation: isDrowning ? 'omino-splash-sink 1.15s cubic-bezier(0.3, 0, 0.2, 1) forwards' : undefined,
        filter: active || isDrowning
          ? `drop-shadow(0 0 10px ${neonColor}) drop-shadow(0 0 4px ${color})`
          : 'none',
      }}
      title={active ? 'Clicca per eliminare omino' : ''}
    >
      <svg
        width="46"
        height="66"
        viewBox="0 0 40 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="overflow-visible"
      >
        <defs>
          <linearGradient id={`omino-grad-${color.replace('#', '')}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
            <stop offset="35%" stopColor={color} />
            <stop offset="100%" stopColor={color} stopOpacity="0.95" />
          </linearGradient>
        </defs>

        {/* Head */}
        <circle
          cx="20"
          cy="11"
          r="8.5"
          fill={`url(#omino-grad-${color.replace('#', '')})`}
          stroke="#000000"
          strokeWidth="2.5"
        />

        {/* Torso, Shoulders, Arms, and Separated Legs (exact omini.jpg silhouette) */}
        <path
          d="M 12 24 C 14 22, 26 22, 28 24 C 31 26, 33 32, 33 40 C 33 42, 31 43, 29 42 C 28 40, 28 34, 27 32 L 26 48 L 26 62 C 26 63.8, 22 63.8, 22 62 L 21 46 L 19 46 L 18 62 C 18 63.8, 14 63.8, 14 62 L 14 48 L 13 32 C 12 34, 12 40, 11 42 C 9 43, 7 42, 7 40 C 7 32, 9 26, 12 24 Z"
          fill={`url(#omino-grad-${color.replace('#', '')})`}
          stroke="#000000"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />

        {/* Chest Specular Glow */}
        <ellipse cx="20" cy="29" rx="3.5" ry="6" fill="#ffffff" opacity="0.4" />
      </svg>
    </div>
  );
}

// 3D Isometric Floating Cube Pedestal with mathematically exact projections & water immersion
function PedestalCube({
  number,
  color,
  neonColor,
  hasOmino,
  isAssigned,
  onToggle,
}: {
  number: number;
  color: string;
  neonColor: string;
  hasOmino: boolean;
  isAssigned: boolean;
  onToggle: () => void;
}) {
  const [isDrowning, setIsDrowning] = useState(false);
  const prevHasOmino = useRef(hasOmino);

  useEffect(() => {
    if (prevHasOmino.current && !hasOmino && isAssigned) {
      setIsDrowning(true);
      const timer = setTimeout(() => {
        setIsDrowning(false);
      }, 1200);
      return () => clearTimeout(timer);
    }
    prevHasOmino.current = hasOmino;
  }, [hasOmino, isAssigned]);

  return (
    <div
      onClick={onToggle}
      className={`relative flex flex-col items-center cursor-pointer group transition-all duration-300 ${
        isAssigned ? 'opacity-100' : 'opacity-20 pointer-events-none'
      }`}
      style={{ width: '88px' }}
      title={`Cubo #${number} — Clicca per cambiare stato omino`}
    >
      {/* Omino standing on top face */}
      <div className="h-[68px] flex items-end justify-center mb-[-14px] z-20 relative">
        <OminoFigure
          color={color}
          neonColor={neonColor}
          active={hasOmino && isAssigned}
          isDrowning={isDrowning}
          onClick={onToggle}
        />

        {/* Water Splash Burst, Comic Text & Air Bubbles upon elimination */}
        {isDrowning && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-end z-30">
            {/* Pop comic text */}
            <span
              className="absolute -top-3 text-[11px] font-black italic tracking-widest text-cyan-200 drop-shadow-[0_0_10px_#00e5ff] uppercase"
              style={{ animation: 'splash-text-pop 1.1s ease-out forwards' }}
            >
              SPLASH!
            </span>

            {/* Splash water droplet crown */}
            <svg
              width="64"
              height="40"
              viewBox="0 0 64 40"
              className="overflow-visible absolute -bottom-1"
              style={{ animation: 'water-splash-burst 1s ease-out forwards' }}
            >
              <circle cx="12" cy="22" r="2.8" fill="#38bdf8" />
              <circle cx="22" cy="10" r="3.2" fill="#e0f2fe" />
              <circle cx="32" cy="6" r="3.5" fill="#e0f2fe" />
              <circle cx="42" cy="10" r="3.2" fill="#e0f2fe" />
              <circle cx="52" cy="22" r="2.8" fill="#38bdf8" />
              <circle cx="18" cy="6" r="2.2" fill="#7dd3fc" />
              <circle cx="46" cy="6" r="2.2" fill="#7dd3fc" />
              <path
                d="M 10 32 Q 18 10 24 24 Q 32 4 40 24 Q 46 10 54 32"
                stroke="#bae6fd"
                strokeWidth="2.4"
                strokeLinecap="round"
                fill="none"
              />
            </svg>

            {/* Rising bubbles */}
            <span
              className="absolute bottom-2 left-1 text-sm select-none"
              style={{ animation: 'float-bubble 1.1s ease-out 0.15s forwards' }}
            >
              🫧
            </span>
            <span
              className="absolute bottom-5 right-1 text-xs select-none"
              style={{ animation: 'float-bubble 1s ease-out 0.3s forwards' }}
            >
              🫧
            </span>
          </div>
        )}
      </div>

      {/* 3D Isometric Cube with Exact Parallel Geometry */}
      <div className="relative w-[84px] h-[70px] z-10">
        <svg
          width="84"
          height="70"
          viewBox="0 0 84 70"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="overflow-visible"
        >
          <defs>
            <filter id={`cube-glow-${number}-${color.replace('#', '')}`} x="-25%" y="-25%" width="150%" height="150%">
              <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor={hasOmino ? neonColor : 'rgba(255,255,255,0.1)'} floodOpacity="0.85" />
            </filter>
            <linearGradient id={`cube-top-grad-${color.replace('#', '')}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity={hasOmino ? '0.75' : '0.12'} />
              <stop offset="100%" stopColor="#ffffff" stopOpacity={hasOmino ? '0.45' : '0.05'} />
            </linearGradient>
            <linearGradient id={`cube-front-grad-${color.replace('#', '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity={hasOmino ? '0.85' : '0.18'} />
              <stop offset="100%" stopColor="#000000" stopOpacity={hasOmino ? '0.88' : '0.65'} />
            </linearGradient>
            <linearGradient id={`cube-side-grad-${color.replace('#', '')}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={color} stopOpacity={hasOmino ? '0.6' : '0.12'} />
              <stop offset="100%" stopColor="#000000" stopOpacity={hasOmino ? '0.92' : '0.75'} />
            </linearGradient>
          </defs>

          {/* Water Lagoon Ripples encircling the cube base (just like omini.jpg!) */}
          <ellipse
            cx="38"
            cy="62"
            rx="40"
            ry="8"
            stroke="rgba(56, 189, 248, 0.45)"
            strokeWidth="1.4"
            fill="rgba(6, 182, 212, 0.12)"
          />
          <ellipse
            cx="38"
            cy="62"
            rx="27"
            ry="5.5"
            stroke="rgba(125, 211, 252, 0.65)"
            strokeWidth="1.2"
            fill="none"
          />

          {/* Drowning water shockwave ping */}
          {isDrowning && (
            <ellipse
              cx="38"
              cy="62"
              rx="26"
              ry="5.5"
              stroke="#38bdf8"
              strokeWidth="2.5"
              fill="rgba(56, 189, 248, 0.3)"
              className="animate-ping"
            />
          )}

          {/* Water reflection & glow ripple under cube */}
          {hasOmino && (
            <ellipse
              cx="35"
              cy="64"
              rx="36"
              ry="7.5"
              fill={color}
              opacity="0.45"
              className="animate-pulse"
            />
          )}

          {/* Top Face: Exactly aligned with Front Face corners (6,16 and 64,16) and parallel depth offset (+14, -12) */}
          <polygon
            points="6,16 64,16 78,4 20,4"
            fill={`url(#cube-top-grad-${color.replace('#', '')})`}
            stroke={hasOmino ? neonColor : 'rgba(255,255,255,0.2)'}
            strokeWidth={hasOmino ? '2' : '1'}
          />

          {/* Right/Side Face: Connected perfectly at 64,16 and 78,4 */}
          <polygon
            points="64,16 78,4 78,50 64,62"
            fill={`url(#cube-side-grad-${color.replace('#', '')})`}
            stroke={hasOmino ? neonColor : 'rgba(255,255,255,0.2)'}
            strokeWidth={hasOmino ? '2' : '1'}
          />

          {/* Front Face: Perfect vertical elevation rectangle from 6,16 to 64,62 */}
          <polygon
            points="6,16 64,16 64,62 6,62"
            fill={`url(#cube-front-grad-${color.replace('#', '')})`}
            stroke={hasOmino ? neonColor : 'rgba(255,255,255,0.25)'}
            strokeWidth={hasOmino ? '2.4' : '1'}
            filter={hasOmino ? `url(#cube-glow-${number}-${color.replace('#', '')})` : undefined}
          />

          {/* Front Edge Bevel Highlight */}
          {hasOmino && (
            <line
              x1="8"
              y1="18"
              x2="62"
              y2="18"
              stroke="#ffffff"
              strokeWidth="1.2"
              strokeOpacity="0.65"
            />
          )}

          {/* Bold White Number Centered on Front Face */}
          <text
            x="35"
            y="47"
            textAnchor="middle"
            fill="#ffffff"
            fontSize="28"
            fontWeight="900"
            fontFamily="system-ui, -apple-system, sans-serif"
            opacity={hasOmino ? '1' : '0.25'}
            style={{
              filter: hasOmino ? 'drop-shadow(0 2px 5px rgba(0,0,0,0.9))' : 'none',
            }}
          >
            {number}
          </text>
        </svg>
      </div>
    </div>
  );
}

// Generic, Universal Suspended Cyber Monitor (Works gracefully on ANY background theme!)
function GenericBonusMonitor({
  label,
  sublabel,
  type,
  active,
  onToggle,
}: {
  label: string;
  sublabel: string;
  type: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex flex-col items-center">
      {/* Hanging metallic cable from top edge */}
      <div className="w-[2px] h-6 bg-gradient-to-b from-white/70 via-slate-400 to-slate-600 relative">
        <div className="absolute top-0 -left-1 w-3 h-1.5 bg-slate-500 rounded-sm" />
        <div className="absolute bottom-0 -left-0.5 w-2 h-1 bg-slate-700 rounded-sm" />
      </div>

      {/* Modern HUD Screen (Theme-neutral, transparent smoked glass) */}
      <button
        type="button"
        onClick={onToggle}
        className={`group relative w-16 sm:w-20 h-16 sm:h-20 rounded-xl border-2 transition-all duration-300 flex flex-col items-center justify-center cursor-pointer overflow-hidden backdrop-blur-md ${
          active
            ? 'bg-black/60 hover:scale-105'
            : 'bg-black/80 border-white/10 opacity-30 grayscale hover:opacity-50'
        }`}
        style={{
          borderColor: active ? '#00e5ff' : 'rgba(255,255,255,0.15)',
          boxShadow: active
            ? '0 0 16px rgba(0, 229, 255, 0.4), inset 0 0 10px rgba(0, 229, 255, 0.2)'
            : 'none',
        }}
        title={`Bonus ${label} (${sublabel}): ${active ? 'Disponibile (clicca per spendere)' : 'Utilizzato (clicca per ripristinare)'}`}
      >
        {/* Holographic HUD Corner Brackets */}
        <div className="absolute top-1 left-1 w-1.5 h-1.5 border-t border-l border-cyan-300/80" />
        <div className="absolute top-1 right-1 w-1.5 h-1.5 border-t border-r border-cyan-300/80" />
        <div className="absolute bottom-1 left-1 w-1.5 h-1.5 border-b border-l border-cyan-300/80" />
        <div className="absolute bottom-1 right-1 w-1.5 h-1.5 border-b border-r border-cyan-300/80" />

        {/* Status LED Dot */}
        <div
          className={`absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full ${
            active ? 'bg-cyan-400 shadow-[0_0_6px_#00e5ff] animate-pulse' : 'bg-red-500/50'
          }`}
        />

        {/* Vector SVG Icons matching omini.jpg */}
        <div className={`transition-transform duration-300 ${active ? 'text-cyan-300 drop-shadow-[0_0_8px_#00e5ff]' : 'text-slate-500'}`}>
          {type === 'dice' && (
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <polygon points="14,3 24,8 14,13 4,8" stroke="currentColor" strokeWidth="1.8" fill="currentColor" fillOpacity="0.25" />
              <circle cx="14" cy="8" r="1.4" fill="currentColor" />
              <polygon points="4,8 14,13 14,24 4,19" stroke="currentColor" strokeWidth="1.8" fill="currentColor" fillOpacity="0.15" />
              <circle cx="7.5" cy="12.5" r="1.2" fill="currentColor" />
              <circle cx="10.5" cy="18.5" r="1.2" fill="currentColor" />
              <polygon points="14,13 24,8 24,19 14,24" stroke="currentColor" strokeWidth="1.8" fill="currentColor" fillOpacity="0.35" />
              <circle cx="17.5" cy="15.5" r="1.2" fill="currentColor" />
              <circle cx="20.5" cy="21.5" r="1.2" fill="currentColor" />
              <circle cx="19" cy="18.5" r="1.2" fill="currentColor" />
            </svg>
          )}

          {type === 'switch' && (
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M 4 20 C 10 20, 12 8, 20 8 L 24 8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              <path d="M 20 4 L 24 8 L 20 12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M 4 8 C 10 8, 12 20, 20 20 L 24 20" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              <path d="M 20 16 L 24 20 L 20 24" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}

          {type === 'bow' && (
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M 7 5 L 14 5 L 21 12 L 21 16 L 14 23 L 7 23" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M 7 5 L 7 23" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2 1" />
              <path d="M 4 14 L 22 14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              <path d="M 18 10 L 23 14 L 18 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}

          {type === 'shield' && (
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M 14 4 L 22 7 L 22 14 C 22 19, 17 23, 14 24 C 11 23, 6 19, 6 14 L 6 7 Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="currentColor" fillOpacity="0.2" />
              <path d="M 10 14 L 13 17 L 18 11" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>

        {/* Clean Label */}
        <span
          className={`text-[9px] font-black uppercase tracking-wider mt-1 ${
            active ? 'text-cyan-300' : 'text-slate-500'
          }`}
        >
          {label}
        </span>

        {/* Used Badge */}
        {!active && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/65 backdrop-blur-[1px]">
            <span className="text-[9px] font-black uppercase tracking-widest text-red-400 border border-red-500/40 px-1 py-0.5 rounded bg-red-950/70">
              USATO
            </span>
          </div>
        )}
      </button>
    </div>
  );
}

// Component to render the symbol for each face: pure numbers and arrows, NO words!
function DiceFaceContent({ faceType }: { faceType: DiceFaceType }) {
  if (faceType === 'zero') {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <span className="text-4xl font-black text-white drop-shadow-[0_0_14px_rgba(52,211,153,0.9)] tracking-tight">
          0
        </span>
      </div>
    );
  }

  if (faceType === 'right') {
    return (
      <div className="flex items-center justify-center gap-2 h-full w-full px-1">
        <span className="text-3xl font-black text-white drop-shadow-[0_0_10px_rgba(0,229,255,0.9)]">
          1
        </span>
        <svg
          width="26"
          height="20"
          viewBox="0 0 26 20"
          fill="none"
          className="text-cyan-400 drop-shadow-[0_0_10px_#00e5ff]"
        >
          <path
            d="M 3 10 L 22 10 M 14 3 L 22 10 L 14 17"
            stroke="currentColor"
            strokeWidth="3.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    );
  }

  if (faceType === 'left') {
    return (
      <div className="flex items-center justify-center gap-2 h-full w-full px-1">
        <svg
          width="26"
          height="20"
          viewBox="0 0 26 20"
          fill="none"
          className="text-blue-400 drop-shadow-[0_0_10px_#3b82f6]"
        >
          <path
            d="M 23 10 L 4 10 M 12 3 L 4 10 L 12 17"
            stroke="currentColor"
            strokeWidth="3.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="text-3xl font-black text-white drop-shadow-[0_0_10px_rgba(59,130,246,0.9)]">
          1
        </span>
      </div>
    );
  }

  // Type: 'double' (Number 2 and two stacked arrows: one pointing right and one pointing left)
  return (
    <div className="flex items-center justify-center gap-2.5 h-full w-full px-1">
      <span className="text-3xl font-black text-white drop-shadow-[0_0_12px_rgba(245,158,11,0.9)]">
        2
      </span>
      <div className="flex flex-col items-center gap-1.5 text-amber-400 drop-shadow-[0_0_10px_#f59e0b]">
        {/* Freccia Destra (->) */}
        <svg width="24" height="10" viewBox="0 0 24 10" fill="none">
          <path
            d="M 3 5 L 20 5 M 14 1.5 L 20 5 L 14 8.5"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {/* Freccia Sinistra (<-) */}
        <svg width="24" height="10" viewBox="0 0 24 10" fill="none">
          <path
            d="M 21 5 L 4 5 M 10 1.5 L 4 5 L 10 8.5"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}

// 3D Prominent Rolling Dice Console (6 3D faces without words)
function ProminentDice3D({
  rolling,
  isResolving = false,
  targetFace,
  onRoll,
  canRollBonus,
  onUseBonusRoll,
}: {
  rolling: boolean;
  isResolving?: boolean;
  targetFace: DiceFaceKey | null;
  onRoll: () => void;
  canRollBonus: boolean;
  onUseBonusRoll: () => void;
}) {
  const [rollCount, setRollCount] = useState(0);
  const [rotation, setRotation] = useState({ x: -20, y: 30, z: -5 });

  const faceAngles: Record<DiceFaceKey, { x: number; y: number; z: number }> = useMemo(
    () => ({
      right_1: { x: 0, y: 0, z: 0 },
      left_1: { x: 0, y: 180, z: 0 },
      right_2: { x: 0, y: -90, z: 0 },
      left_2: { x: 0, y: 90, z: 0 },
      double: { x: -90, y: 0, z: 0 },
      zero: { x: 90, y: 0, z: 0 },
    }),
    []
  );

  useEffect(() => {
    if (rolling && targetFace) {
      const nextCount = rollCount + 1;
      setRollCount(nextCount);
      const angle = faceAngles[targetFace];
      if (angle) {
        setRotation({
          x: angle.x + 360 * 3 * nextCount,
          y: angle.y + 360 * 4 * nextCount,
          z: angle.z + 360 * 2 * nextCount,
        });
      }
    } else if (!rolling && targetFace) {
      const angle = faceAngles[targetFace];
      if (angle) {
        setRotation({
          x: angle.x + 360 * 3 * rollCount,
          y: angle.y + 360 * 4 * rollCount,
          z: angle.z + 360 * 2 * rollCount,
        });
      }
    }
  }, [rolling, targetFace, faceAngles]);

  return (
    <div className="flex flex-col items-center gap-2">
      {/* 3D Cube Viewport (Clickable directly to roll) */}
      <div
        onClick={rolling || isResolving ? undefined : onRoll}
        className={`relative w-28 h-28 select-none group [perspective:1000px] shrink-0 transition-transform ${
          isResolving ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:scale-105 active:scale-95'
        }`}
        title={isResolving ? 'Passaggio turno in corso...' : 'Clicca direttamente sul dado per lanciarlo!'}
      >
        <div className="absolute inset-0 rounded-full bg-cyan-500/25 blur-xl group-hover:bg-cyan-500/45 transition-all pointer-events-none" />

        <div
          className="relative w-full h-full [transform-style:preserve-3d] transition-transform duration-[1200ms] ease-out"
          style={{
            transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) rotateZ(${rotation.z}deg)`,
          }}
        >
          {/* Face 1: RIGHT 1 (Front) -> 1 e freccia a dx */}
          <div className="absolute inset-1.5 rounded-2xl border-2 border-cyan-400 bg-gradient-to-br from-slate-900 via-slate-950 to-cyan-950 flex items-center justify-center shadow-[inset_0_0_18px_rgba(0,229,255,0.45)] [transform:translateZ(44px)]">
            <DiceFaceContent faceType="right" />
          </div>

          {/* Face 2: LEFT 1 (Back) -> 1 e freccia a sx */}
          <div className="absolute inset-1.5 rounded-2xl border-2 border-blue-400 bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950 flex items-center justify-center shadow-[inset_0_0_18px_rgba(59,130,246,0.45)] [transform:rotateY(180deg)_translateZ(44px)]">
            <DiceFaceContent faceType="left" />
          </div>

          {/* Face 3: RIGHT 2 (Right) -> 1 e freccia a dx */}
          <div className="absolute inset-1.5 rounded-2xl border-2 border-cyan-400 bg-gradient-to-br from-slate-900 via-slate-950 to-cyan-950 flex items-center justify-center shadow-[inset_0_0_18px_rgba(0,229,255,0.45)] [transform:rotateY(90deg)_translateZ(44px)]">
            <DiceFaceContent faceType="right" />
          </div>

          {/* Face 4: LEFT 2 (Left) -> 1 e freccia a sx */}
          <div className="absolute inset-1.5 rounded-2xl border-2 border-blue-400 bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950 flex items-center justify-center shadow-[inset_0_0_18px_rgba(59,130,246,0.45)] [transform:rotateY(-90deg)_translateZ(44px)]">
            <DiceFaceContent faceType="left" />
          </div>

          {/* Face 5: DOUBLE (Top) -> 2 con due frecce una sopra l'altra */}
          <div className="absolute inset-1.5 rounded-2xl border-2 border-amber-400 bg-gradient-to-br from-slate-900 via-slate-950 to-amber-950 flex items-center justify-center shadow-[inset_0_0_18px_rgba(245,158,11,0.45)] [transform:rotateX(90deg)_translateZ(44px)]">
            <DiceFaceContent faceType="double" />
          </div>

          {/* Face 6: ZERO (Bottom) -> 0 */}
          <div className="absolute inset-1.5 rounded-2xl border-2 border-emerald-400 bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-950 flex items-center justify-center shadow-[inset_0_0_18px_rgba(52,211,153,0.45)] [transform:rotateX(-90deg)_translateZ(44px)]">
            <DiceFaceContent faceType="zero" />
          </div>
        </div>
      </div>

      {/* Subtle Hint & Bonus Re-roll */}
      <div className="flex flex-col items-center gap-1.5">
        {rolling ? (
          <span className="text-[10px] font-black uppercase tracking-widest text-cyan-300 animate-pulse flex items-center gap-1.5 bg-cyan-950/70 border border-cyan-400/40 px-3 py-1 rounded-full">
            <span className="animate-spin">🔄</span> ROTAZIONE...
          </span>
        ) : isResolving ? (
          <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 animate-pulse flex items-center gap-1.5 bg-amber-950/70 border border-amber-400/40 px-3 py-1 rounded-full">
            <span>⏳</span> PASSAGGIO TURNO...
          </span>
        ) : (
          <button
            type="button"
            onClick={onRoll}
            className="text-[10px] font-black uppercase tracking-wider text-cyan-200 hover:text-white bg-black/60 hover:bg-cyan-600/30 px-3 py-1 rounded-full border border-cyan-400/30 hover:border-cyan-300 transition-all cursor-pointer flex items-center gap-1 shadow-sm"
          >
            <span>🎲</span>
            <span>TOCCA PER LANCIARE</span>
          </button>
        )}

        {canRollBonus && (
          <button
            type="button"
            onClick={onUseBonusRoll}
            disabled={rolling || isResolving}
            className="px-3.5 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-wider bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black shadow-lg shadow-amber-500/35 hover:scale-105 active:scale-95 border border-amber-300 transition-all flex items-center gap-1.5 cursor-pointer animate-pulse disabled:opacity-40 disabled:pointer-events-none"
            title="Spendi il Bonus Dado per rilanciare"
          >
            <span>✨</span>
            <span>Rilancia (Bonus)</span>
          </button>
        )}
      </div>
    </div>
  );
}

export default function FinaleSquadre_Board() {
  const gameData = useGameData() as {
    title?: string;
    subtitle?: string;
    sfondo?: string;
    numeroDomande?: number;
  } | null;

  const { scores, bonuses, toggleBonus } = useScores();

  // Starting member count per team (based on ranking: 6, 5, 3)
  const startingMembers = useMemo(() => normalizeStartingMembers(scores), [scores]);

  // Turn Order: starts with the team with fewest points (3rd place), then 2nd place, then 1st place
  const rankingOrder = useMemo(() => {
    const baseOrder: TeamId[] = [3, 2, 1];
    if (!scores || scores.length < 3) return baseOrder;
    const sorted = scores
      .map((score, index) => ({ teamId: (index + 1) as TeamId, score: Number(score) || 0 }))
      .sort((a, b) => b.score - a.score);
    // sorted[0] is 1st place, sorted[1] is 2nd place, sorted[2] is 3rd place
    const third = sorted[2]?.teamId ?? 3;
    const second = sorted[1]?.teamId ?? 2;
    const first = sorted[0]?.teamId ?? 1;
    return [third, second, first];
  }, [scores]);

  // Synced States across Electron windows (defaults to 3rd place team with fewest points)
  const [activeTeam, setActiveTeam] = useSyncedState<TeamId>('playstate_finale_active_team', rankingOrder[0]);
  const [selectedDieFace, setSelectedDieFace] = useSyncedState<DiceFaceKey | null>(
    'playstate_finale_selected_face',
    null
  );
  const [dieTargetFace, setDieTargetFace] = useSyncedState<DiceFaceKey | null>(
    'playstate_finale_target_face',
    null
  );
  const [targetTeam, setTargetTeam] = useSyncedState<TeamId | 'both' | 'none' | null>(
    'playstate_finale_target_team',
    null
  );
  const [eliminatedQuestions, setEliminatedQuestions] = useSyncedState<number[]>(
    'playstate_finale_eliminated_questions',
    []
  );
  const [eliminatedMembers, setEliminatedMembers] = useSyncedState<Record<TeamId, number[]>>(
    'playstate_finale_eliminated_members',
    { 1: [], 2: [], 3: [] }
  );

  const [rolling, setRolling] = useState(false);
  const [teamNames, setTeamNames] = useState<string[]>(['SQUADRA 1', 'SQUADRA 2', 'SQUADRA 3']);
  const [setupConfig, setSetupConfig] = useState<any>(null);

  // Load team names and setup configuration
  useEffect(() => {
    const saved = localStorage.getItem('imperio_quiz_setup_config_v1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSetupConfig(parsed);
        if (parsed?.punteggi?.nomiSquadre && Array.isArray(parsed.punteggi.nomiSquadre)) {
          setTeamNames([
            parsed.punteggi.nomiSquadre[0] || 'SQUADRA 1',
            parsed.punteggi.nomiSquadre[1] || 'SQUADRA 2',
            parsed.punteggi.nomiSquadre[2] || 'SQUADRA 3',
          ]);
        }
      } catch {}
    }
  }, []);

  // Background image (lagoon water matching omini.jpg, or custom upload)
  const bgImage = useMemo(() => {
    const raw = gameData?.sfondo || setupConfig?.gioco5?.sfondoGenerale;
    if (!raw || raw === '/sfondo_finale_default.jpg' || raw === '/sfondo_finale_acqua.jpg') {
      return '/sfondo_finale_acqua.jpg?v=2';
    }
    return raw;
  }, [gameData?.sfondo, setupConfig?.gioco5?.sfondoGenerale]);

  const totalQuestions = gameData?.numeroDomande || setupConfig?.gioco5?.numeroDomande || 15;
  const questionNumbers = useMemo(
    () => Array.from({ length: totalQuestions }, (_, i) => i + 1),
    [totalQuestions]
  );

  // Transition timer for automatic turn progression after elimination animation
  const [isResolving, setIsResolving] = useState(false);
  const resolveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [manuallySelected, setManuallySelected] = useState(false);
  const prevRankingSigRef = useRef<string>('');

  useEffect(() => {
    return () => {
      if (resolveTimerRef.current) {
        clearTimeout(resolveTimerRef.current);
      }
    };
  }, []);

  // Cleanup legacy dice keys or normalize if needed
  useEffect(() => {
    if (selectedDieFace && !(selectedDieFace in DICE_FACES_CONFIG)) {
      setSelectedDieFace(null);
    }
    if (dieTargetFace && !(dieTargetFace in DICE_FACES_CONFIG)) {
      setDieTargetFace(null);
    }
  }, [selectedDieFace, dieTargetFace, setSelectedDieFace, setDieTargetFace]);

  // Check if any team has suffered eliminations
  const hasEliminatedMembers = useMemo(() => {
    return Object.values(eliminatedMembers).some((list) => list && list.length > 0);
  }, [eliminatedMembers]);

  // Track eliminated teams to trigger wipeout sound on transition
  const prevEliminatedMapRef = useRef<Record<TeamId, boolean>>({ 1: false, 2: false, 3: false });

  useEffect(() => {
    ([1, 2, 3] as TeamId[]).forEach((tId) => {
      const maxCount = startingMembers[tId] ?? 6;
      const elimCount = eliminatedMembers[tId]?.length ?? 0;
      const isEliminated = maxCount > 0 && elimCount >= maxCount;
      const wasEliminated = prevEliminatedMapRef.current[tId];

      if (isEliminated && !wasEliminated) {
        playSound('wipeout');
      }
      prevEliminatedMapRef.current[tId] = isEliminated;
    });
  }, [eliminatedMembers, startingMembers]);

  // Detect winning team (when game has started and exactly 1 team remains with omini)
  const winningTeamId: TeamId | null = useMemo(() => {
    if (!hasEliminatedMembers) return null;
    const alive = ([1, 2, 3] as TeamId[]).filter((tId) => {
      const maxC = startingMembers[tId] ?? 6;
      const elimC = eliminatedMembers[tId]?.length ?? 0;
      return elimC < maxC;
    });
    return alive.length === 1 ? alive[0] : null;
  }, [hasEliminatedMembers, startingMembers, eliminatedMembers]);

  const [dismissTrophy, setDismissTrophy] = useState(false);
  const prevWinnerRef = useRef<TeamId | null>(null);

  // Play fanfare when winner emerges
  useEffect(() => {
    if (winningTeamId && prevWinnerRef.current !== winningTeamId) {
      playSound('victory');
      setDismissTrophy(false);
    }
    prevWinnerRef.current = winningTeamId;
  }, [winningTeamId]);

  // Synchronize active team with 3rd place team (fewest points)
  useEffect(() => {
    const currentSig = rankingOrder.join('-');
    const isFirstRun = prevRankingSigRef.current === '';
    const rankingChanged = !isFirstRun && prevRankingSigRef.current !== currentSig;
    prevRankingSigRef.current = currentSig;

    // 1. If scores/ranking changed in this session, reset manual override and force starting team to 3rd place team
    if (rankingChanged) {
      setManuallySelected(false);
      const startingTeam = rankingOrder[0];
      setActiveTeam(startingTeam);
      setSelectedDieFace(null);
      setDieTargetFace(null);
      setTargetTeam(null);
      return;
    }

    // 2. If no omini have been eliminated yet and host has not manually clicked a team in this session,
    // ensure activeTeam is the 3rd place team (starts first)
    if (!hasEliminatedMembers && !manuallySelected) {
      const startingTeam = rankingOrder[0];
      if (activeTeam !== startingTeam) {
        setActiveTeam(startingTeam);
      }
    }
  }, [rankingOrder, activeTeam, setActiveTeam, hasEliminatedMembers, manuallySelected, setSelectedDieFace, setDieTargetFace, setTargetTeam]);

  // Function to get the next team in rotation (3rd place -> 2nd place -> 1st place -> 3rd place...)
  // Automatically prioritizes teams that still have members alive
  const getNextTurnTeam = (currentTeam: TeamId): TeamId => {
    const currentIndex = rankingOrder.indexOf(currentTeam);
    const validIndex = currentIndex >= 0 ? currentIndex : 0;

    for (let step = 1; step <= rankingOrder.length; step++) {
      const candidate = rankingOrder[(validIndex + step) % rankingOrder.length];
      const maxCount = startingMembers[candidate] ?? 6;
      const eliminated = eliminatedMembers[candidate]?.length ?? 0;
      if (eliminated < maxCount) {
        return candidate;
      }
    }

    return rankingOrder[(validIndex + 1) % rankingOrder.length];
  };

  // Dice roll handler
  const rollDice = () => {
    if (rolling || isResolving) return;
    setRolling(true);
    setSelectedDieFace(null);
    playSound('roll');

    const nextFace = DICE_FACES[Math.floor(Math.random() * DICE_FACES.length)];
    const faceMeta = DICE_FACES_CONFIG[nextFace];
    setDieTargetFace(nextFace);

    // Compute target automatically according to user rules:
    // -> : squadra a destra
    // <- : squadra a sinistra
    // 2 (doppia freccia) : entrambe le altre squadre
    // 0 : nessun bersaglio (rispondere per salvarsi)
    const isTeamAlive = (tId: TeamId) => {
      const maxCount = startingMembers[tId] ?? 6;
      const elim = eliminatedMembers[tId]?.length ?? 0;
      return elim < maxCount;
    };

    const rightTeam = getNextTeam(activeTeam, 'right');
    const leftTeam = getNextTeam(activeTeam, 'left');

    let resolvedTarget: TeamId | 'both' | 'none' = 'none';
    if (faceMeta.type === 'right') {
      resolvedTarget = isTeamAlive(rightTeam) ? rightTeam : (isTeamAlive(leftTeam) ? leftTeam : rightTeam);
    } else if (faceMeta.type === 'left') {
      resolvedTarget = isTeamAlive(leftTeam) ? leftTeam : (isTeamAlive(rightTeam) ? rightTeam : leftTeam);
    } else if (faceMeta.type === 'double') {
      if (isTeamAlive(rightTeam) && isTeamAlive(leftTeam)) {
        resolvedTarget = 'both';
      } else if (isTeamAlive(rightTeam)) {
        resolvedTarget = rightTeam;
      } else if (isTeamAlive(leftTeam)) {
        resolvedTarget = leftTeam;
      } else {
        resolvedTarget = 'both';
      }
    } else {
      resolvedTarget = 'none';
    }

    setTimeout(() => {
      setSelectedDieFace(nextFace);
      setTargetTeam(resolvedTarget);
      setRolling(false);
      playSound('land');
    }, 1200);
  };

  // Re-roll using the Dado bonus
  const handleUseBonusRoll = () => {
    if (isResolving) return;
    const activeTeamIdx = activeTeam - 1;
    toggleBonus(activeTeamIdx, 0);
    rollDice();
  };

  const hasDiceBonusAvailable = Boolean(bonuses[activeTeam - 1]?.[0]);

  // Eliminate one member from a team
  const eliminateMember = (teamId: TeamId) => {
    setEliminatedMembers((prev) => {
      const currentList = prev[teamId] || [];
      const maxCount = startingMembers[teamId];
      if (currentList.length >= maxCount) return prev;
      playSound('eliminate');
      const startCube = 7 - maxCount; // e.g. for maxCount=3: startCube=4; for maxCount=5: startCube=2; for maxCount=6: startCube=1
      const assignedCubes = [1, 2, 3, 4, 5, 6].filter((c) => c >= startCube);
      const remainingCubes = assignedCubes.filter((c) => !currentList.includes(c));
      const toEliminate = remainingCubes[0]; // Elimination strictly begins from lowest assigned up to 6
      if (toEliminate === undefined) return prev;
      return {
        ...prev,
        [teamId]: [...currentList, toEliminate],
      };
    });
  };

  // Restore one member
  const restoreMember = (teamId: TeamId) => {
    setEliminatedMembers((prev) => {
      const currentList = prev[teamId] || [];
      if (currentList.length === 0) return prev;
      const nextList = [...currentList];
      nextList.pop();
      return {
        ...prev,
        [teamId]: nextList,
      };
    });
  };

  // Toggle specific cube omino
  const toggleCubeOmino = (teamId: TeamId, cubeNum: number) => {
    setEliminatedMembers((prev) => {
      const currentList = prev[teamId] || [];
      const exists = currentList.includes(cubeNum);
      if (exists) {
        return {
          ...prev,
          [teamId]: currentList.filter((n) => n !== cubeNum),
        };
      } else {
        playSound('eliminate');
        return {
          ...prev,
          [teamId]: [...currentList, cubeNum],
        };
      }
    });
  };

  // Challenge outcome: Correct or Wrong
  const handleOutcome = (isCorrect: boolean) => {
    if (!selectedDieFace || isResolving) return;
    const faceMeta = DICE_FACES_CONFIG[selectedDieFace];
    if (!faceMeta) return;

    setIsResolving(true);

    if (isCorrect) {
      playSound('correct');
      if (faceMeta.type === 'zero' || targetTeam === 'none') {
        // Se dovesse capitare lo 0 ovviamente non accade niente,
        // semplicemente la squadra che ha lanciato il dado risponde correttamente per salvarsi
        // e in caso di risposta corretta non elimina nessuno delle altre squadre.
      } else if (targetTeam === 'both') {
        // 2 doppia freccia <-> elimina il primo omino disponibile delle altre due squadre
        const rightTeam = getNextTeam(activeTeam, 'right');
        const leftTeam = getNextTeam(activeTeam, 'left');
        eliminateMember(rightTeam);
        setTimeout(() => {
          eliminateMember(leftTeam);
        }, 250);
      } else if (typeof targetTeam === 'number') {
        eliminateMember(targetTeam);
      } else if (faceMeta.type === 'right') {
        eliminateMember(getNextTeam(activeTeam, 'right'));
      } else if (faceMeta.type === 'left') {
        eliminateMember(getNextTeam(activeTeam, 'left'));
      }
    } else {
      // Risposta errata: la squadra che ha lanciato il dado non si salva ed elimina un proprio omino
      playSound('wrong');
      eliminateMember(activeTeam);
    }

    // In automatico dopo che ha dato la risposta, una volta terminata l'animazione dell'eliminazione,
    // il turno deve passare alla squadra successiva nell'ordine: 3ª -> 2ª -> 1ª
    const animationDelay = faceMeta.type === 'double' && isCorrect ? 2000 : 1600;

    resolveTimerRef.current = setTimeout(() => {
      const next = getNextTurnTeam(activeTeam);
      setActiveTeam(next);
      setSelectedDieFace(null);
      setDieTargetFace(null);
      setTargetTeam(null);
      setIsResolving(false);
    }, animationDelay);
  };

  // Pass turn manually to next team in rotation
  const handleNextTurn = () => {
    if (resolveTimerRef.current) {
      clearTimeout(resolveTimerRef.current);
    }
    setIsResolving(false);
    const next = getNextTurnTeam(activeTeam);
    setActiveTeam(next);
    setSelectedDieFace(null);
    setDieTargetFace(null);
    setTargetTeam(null);
  };

  // Toggle question number used
  const toggleQuestionNumber = (num: number) => {
    setEliminatedQuestions((prev) =>
      prev.includes(num) ? prev.filter((n) => n !== num) : [...prev, num].sort((a, b) => a - b)
    );
  };

  // Pyramid layout matching omini.jpg
  const pyramidRows = [
    { cubes: [4, 6, 5] }, // Back row
    { cubes: [2, 3] },    // Middle row
    { cubes: [1] },       // Front row
  ];

  return (
    <div className="relative w-full h-full overflow-hidden text-white font-sans bg-black select-none">
      <style>{`
        @keyframes omino-splash-sink {
          0% {
            transform: translateY(0) scale(1) rotate(0deg);
            opacity: 1;
          }
          18% {
            transform: translateY(-10px) scale(1.08) rotate(14deg);
            opacity: 1;
          }
          42% {
            transform: translateY(18px) scale(0.85) rotate(-18deg);
            opacity: 0.92;
          }
          70% {
            transform: translateY(44px) scale(0.5) rotate(10deg);
            opacity: 0.55;
          }
          100% {
            transform: translateY(75px) scale(0.1) rotate(0deg);
            opacity: 0;
          }
        }
        @keyframes water-splash-burst {
          0% {
            transform: translateY(0) scale(0.3);
            opacity: 1;
          }
          50% {
            transform: translateY(-22px) scale(1.25);
            opacity: 0.95;
          }
          100% {
            transform: translateY(-36px) scale(1.5);
            opacity: 0;
          }
        }
        @keyframes splash-text-pop {
          0% {
            transform: translateY(0) scale(0.6) rotate(-8deg);
            opacity: 0;
          }
          30% {
            transform: translateY(-14px) scale(1.2) rotate(4deg);
            opacity: 1;
          }
          75% {
            transform: translateY(-26px) scale(1) rotate(-2deg);
            opacity: 0.85;
          }
          100% {
            transform: translateY(-38px) scale(0.8) rotate(0deg);
            opacity: 0;
          }
        }
        @keyframes float-bubble {
          0% {
            transform: translateY(0) scale(0.4);
            opacity: 0;
          }
          30% {
            opacity: 0.9;
          }
          100% {
            transform: translateY(-36px) scale(1.1);
            opacity: 0;
          }
        }
        @keyframes team-stamp-slam {
          0% {
            transform: scale(3.4) rotate(-26deg);
            opacity: 0;
            filter: blur(8px);
          }
          55% {
            transform: scale(0.9) rotate(-6deg);
            opacity: 1;
            filter: blur(0);
          }
          75% {
            transform: scale(1.08) rotate(-6deg);
          }
          100% {
            transform: scale(1) rotate(-6deg);
            opacity: 1;
          }
        }
        @keyframes team-shockwave {
          0% {
            transform: scale(0.2);
            opacity: 1;
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.9);
          }
          50% {
            opacity: 0.85;
          }
          100% {
            transform: scale(1.7);
            opacity: 0;
            box-shadow: 0 0 80px 20px rgba(239, 68, 68, 0);
          }
        }
        @keyframes hazard-pulse {
          0%, 100% {
            opacity: 0.22;
            background-position: 0 0;
          }
          50% {
            opacity: 0.45;
            background-position: 30px 30px;
          }
        }
        @keyframes skull-glitch {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 8px rgba(239,68,68,0.8)); }
          25% { transform: scale(1.15) rotate(6deg); filter: drop-shadow(0 0 16px rgba(239,68,68,1)); }
          75% { transform: scale(0.95) rotate(-6deg); filter: drop-shadow(0 0 6px rgba(239,68,68,0.6)); }
        }
        @keyframes trophy-spin-grow {
          0% {
            transform: scale(0.05) rotate(-540deg);
            opacity: 0;
            filter: blur(14px);
          }
          65% {
            transform: scale(1.1) rotate(12deg);
            opacity: 1;
            filter: blur(0);
          }
          85% {
            transform: scale(0.96) rotate(-4deg);
          }
          100% {
            transform: scale(1) rotate(0deg);
            opacity: 1;
          }
        }
        @keyframes trophy-glow-pulse {
          0%, 100% {
            transform: translateY(0);
            filter: drop-shadow(0 0 35px rgba(250, 204, 21, 0.6)) drop-shadow(0 0 70px rgba(250, 204, 21, 0.3));
          }
          50% {
            transform: translateY(-10px);
            filter: drop-shadow(0 0 55px rgba(250, 204, 21, 0.9)) drop-shadow(0 0 95px rgba(250, 204, 21, 0.5));
          }
        }
        @keyframes sunburst-spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
        @keyframes victory-banner-slide {
          0% {
            transform: translateY(35px);
            opacity: 0;
          }
          100% {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>

      {/* 100% UNTOUCHED, FULL-VIEW BACKGROUND (No black overlays or boxes!) */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-700"
        style={{ backgroundImage: `url("${assetUrl(bgImage)}")` }}
      />

      {/* Main Interactive Stage Container */}
      <div className="relative z-10 w-full h-full flex flex-col justify-between p-3 sm:p-5">
        
        {/* Minimalist Floating Top Bar */}
        <header className="flex items-center justify-between gap-4 shrink-0 bg-black/45 backdrop-blur-md px-5 py-2 rounded-2xl border border-white/15 shadow-xl max-w-5xl mx-auto w-full">
          <div className="flex items-center gap-2.5">
            <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded bg-red-600/40 text-red-300 border border-red-500/50">
              BOX 5
            </span>
            <h1 className="text-lg sm:text-xl font-black tracking-tight text-white drop-shadow-md">
              {gameData?.title || setupConfig?.gioco5?.titolo || 'Sfida Finale a Squadre'}
            </h1>
          </div>

          {/* Turn selector badges */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold text-white/60 tracking-wider">
              Turno:
            </span>
            {rankingOrder.map((tId, rankIdx) => {
              const meta = TEAMS_CONFIG[tId];
              const isActive = activeTeam === tId;
              const isEliminated =
                (startingMembers[tId] ?? 6) > 0 &&
                (eliminatedMembers[tId]?.length ?? 0) >= (startingMembers[tId] ?? 6);
              const rankLabel = rankIdx === 0 ? '🥉 3ª' : rankIdx === 1 ? '🥈 2ª' : '🥇 1ª';
              return (
                <button
                  key={tId}
                  disabled={isEliminated}
                  onClick={() => {
                    if (resolveTimerRef.current) clearTimeout(resolveTimerRef.current);
                    setIsResolving(false);
                    setManuallySelected(true);
                    setActiveTeam(tId);
                    setSelectedDieFace(null);
                    setDieTargetFace(null);
                    setTargetTeam(null);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                    isEliminated
                      ? 'opacity-40 line-through cursor-not-allowed bg-red-950/40 text-red-300 border border-red-500/30'
                      : isActive
                      ? 'bg-white text-black scale-105 shadow-[0_0_20px_rgba(255,255,255,0.6)] ring-2 ring-cyan-400 cursor-pointer'
                      : 'bg-black/50 text-white/80 hover:bg-white/10 border border-white/15 cursor-pointer'
                  }`}
                  title={
                    isEliminated
                      ? `${teamNames[tId - 1]} è eliminata`
                      : `Imposta manualmente il turno a ${teamNames[tId - 1]} (${rankLabel})`
                  }
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: isEliminated ? '#ef4444' : meta.colorHex }}
                  />
                  <span className="text-[10px] font-bold opacity-80">{rankLabel}</span>
                  <span>{teamNames[tId - 1] || `S${tId}`}</span>
                  {isEliminated && <span className="text-[10px]">☠️</span>}
                </button>
              );
            })}
            {winningTeamId !== null && (
              <button
                type="button"
                onClick={() => setDismissTrophy(false)}
                className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider text-yellow-300 bg-yellow-500/20 hover:bg-yellow-500/35 border border-yellow-400/50 transition-all cursor-pointer ml-1.5 shadow-sm flex items-center gap-1 animate-pulse"
                title="Riapri la schermata della coppa per la squadra vincitrice"
              >
                <span>🏆</span>
                <span>Coppa</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (resolveTimerRef.current) clearTimeout(resolveTimerRef.current);
                setIsResolving(false);
                setManuallySelected(false);
                setDismissTrophy(false);
                setEliminatedMembers({ 1: [], 2: [], 3: [] });
                setEliminatedQuestions([]);
                setSelectedDieFace(null);
                setDieTargetFace(null);
                setTargetTeam(null);
                setActiveTeam(rankingOrder[0]);
              }}
              className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider text-white/60 hover:text-white bg-white/10 hover:bg-white/20 border border-white/15 transition-all cursor-pointer ml-1.5 shadow-sm"
              title="Azzera lo stato degli omini, domande e dado per iniziare una nuova manche (inizia la 3ª classificata)"
            >
              🔄 Reset Omini
            </button>
          </div>
        </header>

        {/* ============================================================ */}
        {/* THE 3 TEAMS: VERTICALLY CENTERED in the screen, floating freely! */}
        {/* ============================================================ */}
        <div className="flex-1 grid grid-cols-3 gap-4 lg:gap-8 my-2 min-h-0 items-center">
          {([1, 2, 3] as TeamId[]).map((teamId) => {
            const meta = TEAMS_CONFIG[teamId];
            const isActive = activeTeam === teamId;
            const isTarget =
              targetTeam === 'both'
                ? activeTeam !== teamId
                : targetTeam !== 'none' && targetTeam === teamId;
            const teamMembersCount = startingMembers[teamId];
            const teamEliminatedList = eliminatedMembers[teamId] || [];
            const remainingCount = Math.max(0, teamMembersCount - teamEliminatedList.length);
            const isEliminated = teamMembersCount > 0 && remainingCount === 0;

            const aliveTeams = ([1, 2, 3] as TeamId[]).filter((tId) => {
              const maxC = startingMembers[tId] ?? 6;
              const elimC = eliminatedMembers[tId]?.length ?? 0;
              return elimC < maxC;
            });
            const isWinner = aliveTeams.length === 1 && aliveTeams[0] === teamId;
            const teamBonuses = bonuses[teamId - 1] || [false, false, false, false];

            return (
              <div
                key={teamId}
                className={`relative flex flex-col justify-center h-full transition-all duration-700 rounded-3xl p-1 sm:p-2 ${
                  isEliminated
                    ? 'grayscale-[0.85] opacity-60 hover:opacity-90 ring-1 ring-red-500/40 bg-red-950/20 shadow-[0_0_30px_rgba(239,68,68,0.2)]'
                    : isWinner
                    ? 'ring-2 ring-yellow-400/80 bg-yellow-500/5 shadow-[0_0_35px_rgba(234,179,8,0.25)]'
                    : ''
                }`}
                style={{
                  background: isActive && !isEliminated ? meta.spotlightGlow : undefined,
                }}
              >
                {/* Top Section: Hanging Generic Cyber Bonus Monitors */}
                <div className="flex flex-col items-center">
                  <div className="grid grid-cols-4 gap-1.5 sm:gap-2 w-full justify-items-center">
                    {BONUS_CONFIGS.map((bConfig, bIdx) => (
                      <GenericBonusMonitor
                        key={bConfig.key}
                        label={bConfig.label}
                        sublabel={bConfig.sublabel}
                        type={bConfig.type}
                        active={Boolean(teamBonuses[bIdx])}
                        onToggle={() => toggleBonus(teamId - 1, bIdx)}
                      />
                    ))}
                  </div>

                  {/* Sleek Floating Team Banner */}
                  <div
                    className={`mt-3 flex items-center justify-between w-full px-2.5 py-1.5 backdrop-blur-md rounded-xl border shadow-lg transition-all ${
                      isEliminated
                        ? 'bg-red-950/70 border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.4)]'
                        : isWinner
                        ? 'bg-yellow-950/60 border-yellow-400/70 shadow-[0_0_25px_rgba(234,179,8,0.4)]'
                        : 'bg-black/45 border-white/15'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full shadow-[0_0_10px]"
                        style={{
                          backgroundColor: isEliminated ? '#ef4444' : meta.colorHex,
                          boxShadow: isEliminated ? '0 0 10px #ef4444' : `0 0 10px ${meta.colorNeon}`,
                        }}
                      />
                      <h2
                        className={`text-base sm:text-lg font-black tracking-wider uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] truncate max-w-[120px] sm:max-w-[170px] ${
                          isEliminated
                            ? 'text-red-300 line-through decoration-red-500/80 decoration-2'
                            : 'text-white'
                        }`}
                      >
                        {teamNames[teamId - 1] || meta.defaultName}
                      </h2>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isEliminated ? (
                        <span
                          className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-full bg-red-600 text-white border border-red-400/60 shadow-[0_0_14px_rgba(239,68,68,0.8)] flex items-center gap-1 animate-pulse"
                          title="Tutti gli omini sono stati eliminati!"
                        >
                          <span>☠️</span>
                          <span>ELIMINATA</span>
                        </span>
                      ) : isWinner ? (
                        <span
                          className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-full bg-amber-500 text-black border border-yellow-300 shadow-[0_0_15px_rgba(234,179,8,0.9)] flex items-center gap-1 font-black animate-bounce"
                          title="Squadra vincitrice della sfida finale!"
                        >
                          <span>👑</span>
                          <span>VITTORIA!</span>
                        </span>
                      ) : (
                        <>
                          {teamId === rankingOrder[0] ? (
                            <span
                              className="px-1.5 py-0.5 text-[9px] font-black rounded bg-amber-600/40 text-amber-200 border border-amber-500/50 shadow-sm"
                              title="3ª classificata: inizia per prima!"
                            >
                              🥉 3ª (Inizia)
                            </span>
                          ) : teamId === rankingOrder[1] ? (
                            <span
                              className="px-1.5 py-0.5 text-[9px] font-black rounded bg-slate-400/30 text-slate-200 border border-slate-300/40 shadow-sm"
                              title="2ª classificata"
                            >
                              🥈 2ª
                            </span>
                          ) : (
                            <span
                              className="px-1.5 py-0.5 text-[9px] font-black rounded bg-yellow-500/30 text-yellow-100 border border-yellow-400/50 shadow-sm"
                              title="1ª classificata"
                            >
                              🥇 1ª
                            </span>
                          )}
                          {isActive && (
                            <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-full bg-white text-black animate-pulse shadow-md">
                              TURNO
                            </span>
                          )}
                          {isTarget && !isActive && (
                            <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-full bg-red-600 text-white animate-bounce shadow-md">
                              TARGET
                            </span>
                          )}
                        </>
                      )}

                      <span
                        className={`text-xs font-black px-2 py-0.5 rounded-lg border ${
                          isEliminated
                            ? 'bg-red-950/80 text-red-300 border-red-500/60 shadow-[0_0_8px_rgba(239,68,68,0.4)]'
                            : 'bg-white/15 text-white/95 border-white/20'
                        }`}
                      >
                        {remainingCount}/{teamMembersCount}
                      </span>
                      {/* Discrete +/- buttons */}
                      <button
                        type="button"
                        onClick={() => eliminateMember(teamId)}
                        disabled={remainingCount <= 0}
                        className="w-5 h-5 rounded bg-red-600/40 hover:bg-red-600/70 text-red-200 font-black text-xs flex items-center justify-center border border-red-500/40 disabled:opacity-20 cursor-pointer"
                        title="Elimina 1 omino"
                      >
                        -
                      </button>
                      <button
                        type="button"
                        onClick={() => restoreMember(teamId)}
                        disabled={teamEliminatedList.length <= 0}
                        className="w-5 h-5 rounded bg-emerald-600/40 hover:bg-emerald-600/70 text-emerald-200 font-black text-xs flex items-center justify-center border border-emerald-500/40 disabled:opacity-20 cursor-pointer"
                        title="Ripristina 1 omino"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Center: 3D Cubes & Omini (Centered in the vertical space, floating freely over the landscape) */}
                <div className="flex flex-col items-center justify-center flex-1 my-auto py-2 relative">
                  {/* Complete Team Elimination Dramatic Overlay */}
                  {isEliminated && (
                    <div className="absolute inset-0 z-40 pointer-events-none flex flex-col items-center justify-center overflow-hidden rounded-3xl">
                      {/* Hazard animated diagonal stripes */}
                      <div
                        className="absolute inset-0 opacity-25"
                        style={{
                          backgroundImage:
                            'repeating-linear-gradient(45deg, rgba(239, 68, 68, 0.45) 0, rgba(239, 68, 68, 0.45) 15px, transparent 15px, transparent 30px)',
                          animation: 'hazard-pulse 3s infinite linear',
                        }}
                      />

                      {/* Expanding shockwave ring on wipeout */}
                      <div
                        className="absolute w-52 h-52 rounded-full border-4 border-red-500/80 pointer-events-none"
                        style={{
                          animation: 'team-shockwave 1.4s ease-out forwards',
                        }}
                      />

                      {/* Cyber red laser cross */}
                      <div className="absolute w-full h-[2px] bg-red-500/40 blur-xs rotate-12" />
                      <div className="absolute w-full h-[2px] bg-red-500/40 blur-xs -rotate-12" />

                      {/* Massive Dramatic "ELIMINATA" Stamp Badge */}
                      <div
                        className="relative flex flex-col items-center gap-1.5 px-6 py-3.5 rounded-2xl bg-black/92 border-3 border-red-500 shadow-[0_0_45px_rgba(239,68,68,0.9)] backdrop-blur-xl"
                        style={{
                          animation: 'team-stamp-slam 0.65s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
                        }}
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className="text-3xl"
                            style={{ animation: 'skull-glitch 2s infinite ease-in-out' }}
                          >
                            ☠️
                          </span>
                          <div className="flex flex-col items-center">
                            <span className="text-2xl sm:text-3xl font-black uppercase tracking-widest text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.95)]">
                              ELIMINATA
                            </span>
                            <span className="text-[10px] font-black uppercase tracking-wider text-red-300/95 bg-red-950/90 px-2.5 py-0.5 rounded border border-red-500/40 -mt-0.5 text-center">
                              Tutta la squadra {meta.colorName} è affondata
                            </span>
                          </div>
                          <span
                            className="text-3xl"
                            style={{ animation: 'skull-glitch 2s infinite ease-in-out' }}
                          >
                            ☠️
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Victory Celebration Overlay for Sole Survivor */}
                  {isWinner && (
                    <div className="absolute inset-0 z-40 pointer-events-none flex flex-col items-center justify-center overflow-hidden rounded-3xl">
                      <div
                        className="relative flex flex-col items-center gap-1 px-6 py-3 rounded-2xl bg-black/85 border-2 border-yellow-400 shadow-[0_0_35px_rgba(234,179,8,0.85)] backdrop-blur-xl animate-bounce"
                      >
                        <span className="text-3xl">👑</span>
                        <span className="text-xl sm:text-2xl font-black uppercase tracking-widest text-yellow-300 drop-shadow-[0_0_12px_rgba(234,179,8,0.95)]">
                          VINCITRICE!
                        </span>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-yellow-100 bg-yellow-900/70 px-2 py-0.5 rounded border border-yellow-400/50">
                          ULTIMA SQUADRA IN GIOCO
                        </span>
                      </div>
                    </div>
                  )}
                  {pyramidRows.map((row, rowIdx) => {
                    const zIndexClass = rowIdx === 0 ? 'z-10' : rowIdx === 1 ? 'z-20 -mt-6' : 'z-30 -mt-6';
                    return (
                      <div
                        key={rowIdx}
                        className={`flex justify-center items-end gap-2 sm:gap-3.5 ${zIndexClass}`}
                      >
                        {row.cubes.map((cubeNum) => {
                          const isAssigned = cubeNum > (6 - teamMembersCount);
                          const hasOmino = isAssigned && !teamEliminatedList.includes(cubeNum);

                          return (
                            <PedestalCube
                              key={cubeNum}
                              number={cubeNum}
                              color={meta.colorHex}
                              neonColor={meta.colorNeon}
                              hasOmino={hasOmino}
                              isAssigned={isAssigned}
                              onToggle={() => {
                                if (isAssigned) {
                                  toggleCubeOmino(teamId, cubeNum);
                                }
                              }}
                            />
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* ============================================================ */}
        {/* ENLARGED & PROMINENT FLOATING DOCK: 3D Dice, Challenge Resolution, Question Matrix */}
        {/* ============================================================ */}
        <footer className="bg-black/75 backdrop-blur-2xl border-2 border-white/25 rounded-3xl p-4 sm:p-5 shadow-[0_25px_70px_rgba(0,0,0,0.85)] shrink-0 max-w-6xl mx-auto w-full grid grid-cols-1 md:grid-cols-[230px_1fr_290px] gap-4 items-center">
          {/* Left: Prominent 3D Dice Console */}
          <div className="flex justify-center md:justify-start border-b md:border-b-0 md:border-r border-white/15 pb-3 md:pb-0 md:pr-4">
            <ProminentDice3D
              rolling={rolling}
              isResolving={isResolving}
              targetFace={dieTargetFace}
              onRoll={rollDice}
              canRollBonus={hasDiceBonusAvailable}
              onUseBonusRoll={handleUseBonusRoll}
            />
          </div>

          {/* Center: Target Announcement & Resolution Actions */}
          <div className="flex flex-col items-center justify-center gap-3 px-2">
            {/* Target Banner (Enlarged and high-contrast) */}
            <div className="w-full bg-black/60 border border-cyan-400/50 rounded-2xl px-4 py-2 text-center flex flex-wrap items-center justify-center gap-3 shadow-inner">
              {selectedDieFace && DICE_FACES_CONFIG[selectedDieFace] ? (
                (() => {
                  const meta = DICE_FACES_CONFIG[selectedDieFace];
                  return (
                    <>
                      <span className="px-3 py-1 rounded-lg bg-cyan-500/30 text-cyan-200 font-black text-sm uppercase tracking-wider border border-cyan-400/50 shadow-[0_0_15px_rgba(0,229,255,0.25)] flex items-center gap-2">
                        <span>🎲 Dado:</span>
                        <span className="text-base text-white">{meta.labelShort}</span>
                      </span>
                      <span className="text-white/50 text-base">➔</span>
                      {meta.type === 'zero' ? (
                        <span className="px-3 py-1 rounded-lg bg-emerald-500/30 text-emerald-200 font-black text-sm uppercase tracking-wider border border-emerald-400/50 shadow-[0_0_15px_rgba(16,185,129,0.25)] flex items-center gap-1.5">
                          <span>🛡️ Salvezza:</span>
                          <span>Nessun bersaglio (Rispondi esatto per salvarti)</span>
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-lg bg-red-500/30 text-red-200 font-black text-sm uppercase tracking-wider border border-red-400/50 shadow-[0_0_15px_rgba(239,68,68,0.25)] animate-pulse flex items-center gap-1.5">
                          <span>🎯 Bersaglio:</span>
                          <span>
                            {targetTeam === 'both'
                              ? 'Entrambe le altre squadre (1 omino a testa)'
                              : typeof targetTeam === 'number'
                              ? `${teamNames[targetTeam - 1]} (1 omino)`
                              : 'Nessuno'}
                          </span>
                        </span>
                      )}

                      {/* Transizione automatica in corso dopo l'animazione */}
                      {isResolving && (
                        <span className="px-3 py-1 rounded-lg bg-amber-500/30 text-amber-200 font-black text-xs uppercase tracking-wider border border-amber-400/50 shadow-[0_0_15px_rgba(245,158,11,0.3)] animate-pulse flex items-center gap-1.5">
                          <span>⏳</span>
                          <span>Eliminazione... passaggio turno</span>
                        </span>
                      )}
                    </>
                  );
                })()
              ) : (
                <div className="text-sm font-semibold text-white/70 italic">
                  Lancia il dado per determinare il bersaglio della sfida!
                </div>
              )}
            </div>

            {/* Prominent Outcome Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => handleOutcome(true)}
                disabled={!selectedDieFace || isResolving}
                className="px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/35 hover:scale-105 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-2 cursor-pointer border border-emerald-400/50"
              >
                <span className="text-sm">✅</span>
                <span>Risposta Esatta</span>
              </button>

              <button
                type="button"
                onClick={() => handleOutcome(false)}
                disabled={!selectedDieFace || isResolving}
                className="px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/35 hover:scale-105 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-2 cursor-pointer border border-rose-400/50"
              >
                <span className="text-sm">❌</span>
                <span>Risposta Errata</span>
              </button>

              <button
                type="button"
                onClick={handleNextTurn}
                className="px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider bg-white/10 hover:bg-white/20 text-white border border-white/25 hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                title="Passa subito il turno alla squadra successiva nell'ordine di classifica"
              >
                <span>Passa Turno</span>
                <span>➜</span>
              </button>
            </div>
          </div>

          {/* Right: Question Matrix 1..15 (Prominent and clear) */}
          <div className="border-t md:border-t-0 md:border-l border-white/15 pt-3 md:pt-0 md:pl-4 flex flex-col justify-center">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase font-black tracking-wider text-white/80">
                Domande ({questionNumbers.length - eliminatedQuestions.length} rimaste)
              </span>
              <button
                type="button"
                onClick={() => setEliminatedQuestions([])}
                className="text-[10px] uppercase font-bold text-white/60 hover:text-white bg-white/10 px-2 py-0.5 rounded border border-white/15 transition-colors cursor-pointer"
              >
                Reset
              </button>
            </div>

            <div className="grid grid-cols-5 gap-1.5">
              {questionNumbers.map((qNum) => {
                const isEliminated = eliminatedQuestions.includes(qNum);
                return (
                  <button
                    key={qNum}
                    type="button"
                    onClick={() => toggleQuestionNumber(qNum)}
                    className={`h-8 rounded-lg font-black text-xs transition-all cursor-pointer flex items-center justify-center ${
                      isEliminated
                        ? 'bg-black/60 text-white/25 border border-white/10 line-through'
                        : 'bg-cyan-500/25 hover:bg-cyan-500/45 text-cyan-100 border border-cyan-400/40 hover:scale-105 shadow-sm'
                    }`}
                  >
                    {qNum}
                  </button>
                );
              })}
            </div>
          </div>
        </footer>

        {/* Grand Victory Trophy Modal Overlay */}
        {winningTeamId !== null && !dismissTrophy && (() => {
          const winningMeta = TEAMS_CONFIG[winningTeamId];
          const winningName = teamNames[winningTeamId - 1] || winningMeta.defaultName;

          return (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md transition-all duration-700 select-none">
              {/* Sunburst glowing background rotating */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
                <div
                  className="w-[1100px] h-[1100px] rounded-full opacity-40"
                  style={{
                    background: `radial-gradient(circle, ${winningMeta.colorHex}45 0%, ${winningMeta.colorHex}15 45%, transparent 70%)`,
                  }}
                />
                <div
                  className="absolute w-[900px] h-[900px] opacity-25"
                  style={{
                    background:
                      'conic-gradient(from 0deg, transparent 0deg, rgba(255,215,0,0.3) 15deg, transparent 30deg, rgba(255,215,0,0.3) 45deg, transparent 60deg, rgba(255,215,0,0.3) 75deg, transparent 90deg, rgba(255,215,0,0.3) 105deg, transparent 120deg, rgba(255,215,0,0.3) 135deg, transparent 150deg, rgba(255,215,0,0.3) 165deg, transparent 180deg, rgba(255,215,0,0.3) 195deg, transparent 210deg, rgba(255,215,0,0.3) 225deg, transparent 240deg, rgba(255,215,0,0.3) 255deg, transparent 270deg, rgba(255,215,0,0.3) 285deg, transparent 300deg, rgba(255,215,0,0.3) 315deg, transparent 330deg, rgba(255,215,0,0.3) 345deg, transparent 360deg)',
                    animation: 'sunburst-spin 25s infinite linear',
                  }}
                />
              </div>

              {/* Trophy Container: Spins and scales up from small in center */}
              <div
                className="relative flex flex-col items-center justify-center z-10 max-w-2xl px-6"
                style={{
                  animation: 'trophy-spin-grow 1.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                }}
              >
                {/* Top celebratory header */}
                <div
                  className="flex flex-col items-center mb-1 text-center"
                  style={{ animation: 'victory-banner-slide 0.8s ease-out 0.9s both' }}
                >
                  <span className="text-xs sm:text-sm font-black tracking-[0.3em] uppercase text-yellow-300 drop-shadow-[0_0_12px_rgba(250,204,21,0.8)] bg-black/60 px-5 py-1.5 rounded-full border border-yellow-400/40">
                    🏆 SQUADRA VINCITRICE 🏆
                  </span>
                </div>

                {/* 3D Golden Trophy */}
                <div
                  className="relative flex flex-col items-center justify-center my-1"
                  style={{ animation: 'trophy-glow-pulse 3s infinite ease-in-out 1.6s' }}
                >
                  {/* Trophy image */}
                  <img
                    src={assetUrl('/Icone/finale/trofeo_vittoria.png')}
                    alt="Coppa della Vittoria"
                    className="w-[340px] sm:w-[420px] md:w-[460px] h-auto object-contain pointer-events-none drop-shadow-[0_15px_35px_rgba(0,0,0,0.8)]"
                  />
                </div>

                {/* Big Team Name and Color Announcement Below */}
                <div
                  className="flex flex-col items-center mt-2 text-center"
                  style={{ animation: 'victory-banner-slide 0.8s ease-out 1.1s both' }}
                >
                  <h2
                    className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-widest drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]"
                    style={{
                      color: winningMeta.colorHex,
                      textShadow: `0 0 25px ${winningMeta.colorNeon}, 0 0 40px ${winningMeta.colorHex}`,
                    }}
                  >
                    {winningName}
                  </h2>
                  <span className="text-xs sm:text-sm font-bold uppercase tracking-[0.25em] text-white/80 mt-1.5">
                    HA TRIONFATO NELLA SFIDA FINALE!
                  </span>
                </div>

                {/* Discrete button to minimize/close trophy overlay */}
                <button
                  type="button"
                  onClick={() => setDismissTrophy(true)}
                  className="mt-6 px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all cursor-pointer shadow-lg hover:scale-105"
                  title="Chiudi per vedere il tabellone completo"
                >
                  Chiudi / Mostra Tabellone ✕
                </button>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
