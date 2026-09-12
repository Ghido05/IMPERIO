import { useEffect, useMemo, useRef, useState } from 'react';
import { useGameData } from './context/GameDataContext';
import { useScores } from './context/ScoreContext';
import { useSyncedState } from './hooks/useSyncedState';
import { assetUrl } from './lib/assetUrl';

export type TeamId = 1 | 2 | 3;
export type DiceFace = 'right' | 'left' | 'both' | 'self';

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

const DICE_FACES: DiceFace[] = ['right', 'left', 'both', 'self'];

// 4 Generic Universal Bonuses (adaptable to ANY background theme)
const BONUS_CONFIGS = [
  { key: 'dado', label: 'DADO', sublabel: 'Rilancio', type: 'dice' },
  { key: 'switch', label: 'SWITCH', sublabel: 'Cambio', type: 'switch' },
  { key: 'arco', label: 'ARCO', sublabel: 'Attacco', type: 'bow' },
  { key: 'scudo', label: 'SCUDO', sublabel: 'Difesa', type: 'shield' },
];

// Audio synthesizer for zero-dependency sounds
function playSound(type: 'roll' | 'land' | 'correct' | 'wrong' | 'eliminate') {
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

// 3D Prominent Rolling Dice Console
function ProminentDice3D({
  rolling,
  targetFace,
  onRoll,
  canRollBonus,
  onUseBonusRoll,
}: {
  rolling: boolean;
  targetFace: DiceFace | null;
  onRoll: () => void;
  canRollBonus: boolean;
  onUseBonusRoll: () => void;
}) {
  const [rollCount, setRollCount] = useState(0);
  const [rotation, setRotation] = useState({ x: -20, y: 30, z: -5 });

  const faceAngles: Record<DiceFace, { x: number; y: number; z: number }> = useMemo(
    () => ({
      right: { x: 0, y: 0, z: 0 },
      left: { x: 0, y: 180, z: 0 },
      both: { x: 0, y: 90, z: 0 },
      self: { x: 0, y: -90, z: 0 },
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
          x: angle.x + 360 * 3 * nextCount + 15,
          y: angle.y + 360 * 4 * nextCount + 20,
          z: angle.z + 360 * 2 * nextCount - 10,
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
        onClick={rolling ? undefined : onRoll}
        className="relative w-28 h-28 cursor-pointer select-none group [perspective:1000px] shrink-0 hover:scale-105 active:scale-95 transition-transform"
        title="Clicca direttamente sul dado per lanciarlo!"
      >
        <div className="absolute inset-0 rounded-full bg-cyan-500/25 blur-xl group-hover:bg-cyan-500/45 transition-all pointer-events-none" />

        <div
          className="relative w-full h-full [transform-style:preserve-3d] transition-transform duration-[1200ms] ease-out"
          style={{
            transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) rotateZ(${rotation.z}deg)`,
          }}
        >
          {/* Face: RIGHT */}
          <div className="absolute inset-1.5 rounded-2xl border-2 border-cyan-400 bg-gradient-to-br from-slate-900 via-slate-950 to-cyan-950 flex flex-col items-center justify-center text-center shadow-[inset_0_0_18px_rgba(0,229,255,0.45)] [transform:translateZ(44px)]">
            <span className="text-2xl text-cyan-400 drop-shadow-[0_0_10px_#00e5ff]">➔</span>
            <span className="text-xs font-black tracking-wider text-white mt-0.5">DESTRA</span>
          </div>

          {/* Face: LEFT */}
          <div className="absolute inset-1.5 rounded-2xl border-2 border-blue-400 bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950 flex flex-col items-center justify-center text-center shadow-[inset_0_0_18px_rgba(59,130,246,0.45)] [transform:rotateY(180deg)_translateZ(44px)]">
            <span className="text-2xl text-blue-400 drop-shadow-[0_0_10px_#3b82f6]">⬅</span>
            <span className="text-xs font-black tracking-wider text-white mt-0.5">SINISTRA</span>
          </div>

          {/* Face: BOTH */}
          <div className="absolute inset-1.5 rounded-2xl border-2 border-amber-400 bg-gradient-to-br from-slate-900 via-slate-950 to-amber-950 flex flex-col items-center justify-center text-center shadow-[inset_0_0_18px_rgba(245,158,11,0.45)] [transform:rotateY(90deg)_translateZ(44px)]">
            <span className="text-xl text-amber-400 drop-shadow-[0_0_10px_#f59e0b]">⮂ ⮃</span>
            <span className="text-[11px] font-black tracking-wider text-white mt-0.5">ENTRAMBE</span>
          </div>

          {/* Face: SELF */}
          <div className="absolute inset-1.5 rounded-2xl border-2 border-red-400 bg-gradient-to-br from-slate-900 via-slate-950 to-red-950 flex flex-col items-center justify-center text-center shadow-[inset_0_0_18px_rgba(239,68,68,0.45)] [transform:rotateY(-90deg)_translateZ(44px)]">
            <span className="text-2xl text-red-400 drop-shadow-[0_0_10px_#ef4444]">🎯</span>
            <span className="text-[11px] font-black tracking-wider text-white mt-0.5">SE STESSA</span>
          </div>

          {/* Top/Bottom */}
          <div className="absolute inset-1.5 rounded-2xl border border-white/20 bg-slate-900/90 [transform:rotateX(90deg)_translateZ(44px)]" />
          <div className="absolute inset-1.5 rounded-2xl border border-white/20 bg-slate-950 [transform:rotateX(-90deg)_translateZ(44px)]" />
        </div>
      </div>

      {/* Subtle Hint & Bonus Re-roll */}
      <div className="flex flex-col items-center gap-1.5">
        {rolling ? (
          <span className="text-[10px] font-black uppercase tracking-widest text-cyan-300 animate-pulse flex items-center gap-1.5 bg-cyan-950/70 border border-cyan-400/40 px-3 py-1 rounded-full">
            <span className="animate-spin">🔄</span> ROTAZIONE...
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
            disabled={rolling}
            className="px-3.5 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-wider bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black shadow-lg shadow-amber-500/35 hover:scale-105 active:scale-95 border border-amber-300 transition-all flex items-center gap-1.5 cursor-pointer animate-pulse"
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

  // Synced States across Electron windows
  const [activeTeam, setActiveTeam] = useSyncedState<TeamId>('playstate_finale_active_team', 3);
  const [selectedDieFace, setSelectedDieFace] = useSyncedState<DiceFace | null>(
    'playstate_finale_selected_face',
    null
  );
  const [dieTargetFace, setDieTargetFace] = useSyncedState<DiceFace | null>(
    'playstate_finale_target_face',
    null
  );
  const [targetTeam, setTargetTeam] = useSyncedState<TeamId | 'both' | null>(
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

  // Starting member count per team (based on ranking: 6, 5, 3)
  const startingMembers = useMemo(() => normalizeStartingMembers(scores), [scores]);

  // Dice roll handler
  const rollDice = () => {
    if (rolling) return;
    setRolling(true);
    setSelectedDieFace(null);
    playSound('roll');

    const nextFace = DICE_FACES[Math.floor(Math.random() * DICE_FACES.length)];
    setDieTargetFace(nextFace);

    // Compute target automatically
    let resolvedTarget: TeamId | 'both' = 'both';
    if (nextFace === 'right') {
      resolvedTarget = getNextTeam(activeTeam, 'right');
    } else if (nextFace === 'left') {
      resolvedTarget = getNextTeam(activeTeam, 'left');
    } else if (nextFace === 'self') {
      resolvedTarget = activeTeam;
    } else {
      resolvedTarget = 'both';
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
    if (!selectedDieFace) return;

    if (isCorrect) {
      playSound('correct');
      if (selectedDieFace === 'both') {
        const leftTeam = getNextTeam(activeTeam, 'left');
        const rightTeam = getNextTeam(activeTeam, 'right');
        eliminateMember(leftTeam);
        eliminateMember(rightTeam);
      } else if (targetTeam && targetTeam !== 'both') {
        eliminateMember(targetTeam);
      }
    } else {
      playSound('wrong');
      eliminateMember(activeTeam);
    }
  };

  // Pass turn to next team in rotation
  const handleNextTurn = () => {
    const next = getNextTeam(activeTeam, 'right');
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
            {([1, 2, 3] as TeamId[]).map((tId) => {
              const meta = TEAMS_CONFIG[tId];
              const isActive = activeTeam === tId;
              return (
                <button
                  key={tId}
                  onClick={() => {
                    setActiveTeam(tId);
                    setSelectedDieFace(null);
                    setTargetTeam(null);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-white text-black scale-105 shadow-[0_0_20px_rgba(255,255,255,0.6)]'
                      : 'bg-black/50 text-white/80 hover:bg-white/10 border border-white/15'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: meta.colorHex }}
                  />
                  <span>{teamNames[tId - 1] || `S${tId}`}</span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => {
                setEliminatedMembers({ 1: [], 2: [], 3: [] });
                setSelectedDieFace(null);
                setDieTargetFace(null);
                setTargetTeam(null);
              }}
              className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider text-white/60 hover:text-white bg-white/10 hover:bg-white/20 border border-white/15 transition-all cursor-pointer ml-1.5 shadow-sm"
              title="Azzera lo stato degli omini e il bersaglio per iniziare una nuova manche"
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
              targetTeam === teamId ||
              (targetTeam === 'both' && activeTeam !== teamId);
            const teamMembersCount = startingMembers[teamId];
            const teamEliminatedList = eliminatedMembers[teamId] || [];
            const remainingCount = Math.max(0, teamMembersCount - teamEliminatedList.length);
            const teamBonuses = bonuses[teamId - 1] || [false, false, false, false];

            return (
              <div
                key={teamId}
                className="relative flex flex-col justify-center h-full transition-all duration-500"
                style={{
                  background: isActive ? meta.spotlightGlow : undefined,
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
                  <div className="mt-3 flex items-center justify-between w-full px-2.5 py-1.5 bg-black/45 backdrop-blur-md rounded-xl border border-white/15 shadow-lg">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full shadow-[0_0_10px]"
                        style={{
                          backgroundColor: meta.colorHex,
                          boxShadow: `0 0 10px ${meta.colorNeon}`,
                        }}
                      />
                      <h2
                        className="text-base sm:text-lg font-black tracking-wider text-white uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] truncate max-w-[120px] sm:max-w-[170px]"
                      >
                        {teamNames[teamId - 1] || meta.defaultName}
                      </h2>
                    </div>

                    <div className="flex items-center gap-1.5">
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
                      <span className="text-xs font-black text-white/95 bg-white/15 px-2 py-0.5 rounded-lg border border-white/20">
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
              {selectedDieFace ? (
                <>
                  <span className="px-3 py-1 rounded-lg bg-cyan-500/30 text-cyan-200 font-black text-sm uppercase tracking-wider border border-cyan-400/50 shadow-[0_0_15px_rgba(0,229,255,0.25)]">
                    🎲 Dado: {selectedDieFace === 'right' ? 'DESTRA ➔' : selectedDieFace === 'left' ? '⬅ SINISTRA' : selectedDieFace === 'both' ? '⮂ ENTRAMBE' : '🎯 SE STESSA'}
                  </span>
                  <span className="text-white/50 text-base">➔</span>
                  <span className="px-3 py-1 rounded-lg bg-red-500/30 text-red-200 font-black text-sm uppercase tracking-wider border border-red-400/50 shadow-[0_0_15px_rgba(239,68,68,0.25)] animate-pulse">
                    🎯 Bersaglio:{' '}
                    {targetTeam === 'both'
                      ? 'Entrambe le altre squadre'
                      : targetTeam
                      ? teamNames[targetTeam - 1]
                      : 'Nessuno'}
                  </span>
                </>
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
                disabled={!selectedDieFace}
                className="px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/35 hover:scale-105 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-2 cursor-pointer border border-emerald-400/50"
              >
                <span className="text-sm">✅</span>
                <span>Risposta Esatta</span>
              </button>

              <button
                type="button"
                onClick={() => handleOutcome(false)}
                disabled={!selectedDieFace}
                className="px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/35 hover:scale-105 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-2 cursor-pointer border border-rose-400/50"
              >
                <span className="text-sm">❌</span>
                <span>Risposta Errata</span>
              </button>

              <button
                type="button"
                onClick={handleNextTurn}
                className="px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider bg-white/10 hover:bg-white/20 text-white border border-white/25 hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
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
      </div>
    </div>
  );
}
