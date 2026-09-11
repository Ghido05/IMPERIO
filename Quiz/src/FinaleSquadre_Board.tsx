import { useEffect, useMemo, useState } from 'react';
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
  bgGradient: string;
  borderActive: string;
  badgeBg: string;
}

const TEAMS_CONFIG: Record<TeamId, TeamVisualMeta> = {
  1: {
    id: 1,
    defaultName: 'SQUADRA 1',
    colorName: 'Rosso',
    colorHex: '#ef4444',
    colorNeon: '#ff3344',
    colorGlow: 'rgba(239, 68, 68, 0.65)',
    bgGradient: 'linear-gradient(180deg, rgba(239,68,68,0.22) 0%, rgba(185,28,28,0.08) 100%)',
    borderActive: 'border-red-500 shadow-[0_0_40px_rgba(239,68,68,0.45)]',
    badgeBg: 'bg-red-500/20 text-red-300 border-red-500/40',
  },
  2: {
    id: 2,
    defaultName: 'SQUADRA 2',
    colorName: 'Blu',
    colorHex: '#3b82f6',
    colorNeon: '#00b4d8',
    colorGlow: 'rgba(59, 130, 246, 0.65)',
    bgGradient: 'linear-gradient(180deg, rgba(59,130,246,0.22) 0%, rgba(29,78,216,0.08) 100%)',
    borderActive: 'border-blue-500 shadow-[0_0_40px_rgba(59,130,246,0.45)]',
    badgeBg: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  },
  3: {
    id: 3,
    defaultName: 'SQUADRA 3',
    colorName: 'Verde',
    colorHex: '#10b981',
    colorNeon: '#05f190',
    colorGlow: 'rgba(16, 185, 129, 0.65)',
    bgGradient: 'linear-gradient(180deg, rgba(16,185,129,0.22) 0%, rgba(4,120,87,0.08) 100%)',
    borderActive: 'border-emerald-500 shadow-[0_0_40px_rgba(16,185,129,0.45)]',
    badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  },
};

const DICE_FACES: DiceFace[] = ['right', 'left', 'both', 'self'];

// 4 Standard Bonuses metadata
const BONUS_CONFIGS = [
  { key: 'dado', label: 'Dado', sublabel: 'Rilancia', symbol: '🎲' },
  { key: 'switch', label: 'Switch', sublabel: 'Cambio', symbol: '🔄' },
  { key: 'arco', label: 'Arco', sublabel: 'Attacco', symbol: '🏹' },
  { key: 'scudo', label: 'Scudo', sublabel: 'Difesa', symbol: '🛡️' },
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
        gain.gain.setValueAtTime(0.1, now + i * 0.12);
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
        gain.gain.setValueAtTime(0.22, now + idx * 0.08);
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
        gain.gain.setValueAtTime(0.2, now + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.28);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.3);
      });
    } else if (type === 'eliminate') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.35);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.42);
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

// Stylized Omino Pawn component inspired by omini.jpg
function OminoFigure({
  color,
  neonColor,
  active,
  onClick,
}: {
  color: string;
  neonColor: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`cursor-pointer select-none transition-all duration-500 transform ${
        active
          ? 'opacity-100 scale-100 hover:scale-115 hover:-translate-y-1'
          : 'opacity-0 scale-50 pointer-events-none'
      }`}
      style={{
        filter: active ? `drop-shadow(0 0 10px ${neonColor}) drop-shadow(0 0 4px ${color})` : 'none',
      }}
      title={active ? 'Clicca per eliminare' : ''}
    >
      <svg
        width="44"
        height="64"
        viewBox="0 0 40 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="overflow-visible"
      >
        <defs>
          <linearGradient id={`omino-grad-${color.replace('#', '')}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
            <stop offset="35%" stopColor={color} />
            <stop offset="100%" stopColor={color} stopOpacity="0.9" />
          </linearGradient>
        </defs>

        {/* Head */}
        <circle
          cx="20"
          cy="11"
          r="8.5"
          fill={`url(#omino-grad-${color.replace('#', '')})`}
          stroke="#111111"
          strokeWidth="2.2"
        />

        {/* Body, Torso, Arms and Separated Legs */}
        <path
          d="M 12 24 C 14 22, 26 22, 28 24 C 31 26, 33 32, 33 40 C 33 42, 31 43, 29 42 C 28 40, 28 34, 27 32 L 26 48 L 26 62 C 26 63.8, 22 63.8, 22 62 L 21 46 L 19 46 L 18 62 C 18 63.8, 14 63.8, 14 62 L 14 48 L 13 32 C 12 34, 12 40, 11 42 C 9 43, 7 42, 7 40 C 7 32, 9 26, 12 24 Z"
          fill={`url(#omino-grad-${color.replace('#', '')})`}
          stroke="#111111"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />

        {/* Subtle Specular Chest Glow */}
        <ellipse cx="20" cy="29" rx="3.5" ry="6" fill="#ffffff" opacity="0.35" />
      </svg>
    </div>
  );
}

// 3D Isometric Floating Cube Pedestal with omino on top
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
  return (
    <div
      onClick={onToggle}
      className={`relative flex flex-col items-center cursor-pointer group transition-all duration-300 ${
        isAssigned ? 'opacity-100' : 'opacity-20 pointer-events-none'
      }`}
      style={{ width: '84px' }}
      title={`Cubo #${number} — Clicca per cambiare stato omino`}
    >
      {/* Omino standing on top face */}
      <div className="h-[66px] flex items-end justify-center mb-[-12px] z-20 relative">
        <OminoFigure
          color={color}
          neonColor={neonColor}
          active={hasOmino && isAssigned}
          onClick={onToggle}
        />
      </div>

      {/* 3D Isometric / Oblique Cube */}
      <div className="relative w-[78px] h-[66px] z-10">
        <svg
          width="78"
          height="66"
          viewBox="0 0 78 66"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="overflow-visible"
        >
          <defs>
            <filter id={`cube-glow-${number}-${color.replace('#', '')}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor={hasOmino ? neonColor : 'rgba(255,255,255,0.1)'} floodOpacity="0.8" />
            </filter>
            <linearGradient id={`cube-top-grad-${color.replace('#', '')}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity={hasOmino ? '0.75' : '0.15'} />
              <stop offset="100%" stopColor="#ffffff" stopOpacity={hasOmino ? '0.35' : '0.05'} />
            </linearGradient>
            <linearGradient id={`cube-front-grad-${color.replace('#', '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity={hasOmino ? '0.85' : '0.2'} />
              <stop offset="100%" stopColor="#000000" stopOpacity={hasOmino ? '0.85' : '0.6'} />
            </linearGradient>
            <linearGradient id={`cube-side-grad-${color.replace('#', '')}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={color} stopOpacity={hasOmino ? '0.6' : '0.15'} />
              <stop offset="100%" stopColor="#000000" stopOpacity={hasOmino ? '0.9' : '0.7'} />
            </linearGradient>
          </defs>

          {/* Water reflection / glow at bottom */}
          {hasOmino && (
            <ellipse
              cx="39"
              cy="62"
              rx="34"
              ry="7"
              fill={color}
              opacity="0.35"
              className="animate-pulse"
            />
          )}

          {/* Top Face (Oblique diamond receding backwards) */}
          <polygon
            points="14,14 64,14 74,3 24,3"
            fill={`url(#cube-top-grad-${color.replace('#', '')})`}
            stroke={hasOmino ? neonColor : 'rgba(255,255,255,0.2)'}
            strokeWidth={hasOmino ? '1.8' : '1'}
          />

          {/* Right/Side Face */}
          <polygon
            points="64,14 74,3 74,48 64,59"
            fill={`url(#cube-side-grad-${color.replace('#', '')})`}
            stroke={hasOmino ? neonColor : 'rgba(255,255,255,0.2)'}
            strokeWidth={hasOmino ? '1.8' : '1'}
          />

          {/* Front Face (Square facing the camera with the number) */}
          <polygon
            points="4,14 64,14 64,59 4,59"
            fill={`url(#cube-front-grad-${color.replace('#', '')})`}
            stroke={hasOmino ? neonColor : 'rgba(255,255,255,0.25)'}
            strokeWidth={hasOmino ? '2.2' : '1'}
            filter={hasOmino ? `url(#cube-glow-${number}-${color.replace('#', '')})` : undefined}
          />

          {/* Inner Front Bevel Highlight */}
          {hasOmino && (
            <line
              x1="6"
              y1="16"
              x2="62"
              y2="16"
              stroke="#ffffff"
              strokeWidth="1"
              strokeOpacity="0.6"
            />
          )}

          {/* Bold White Number */}
          <text
            x="34"
            y="44"
            textAnchor="middle"
            fill="#ffffff"
            fontSize="26"
            fontWeight="900"
            fontFamily="system-ui, -apple-system, sans-serif"
            opacity={hasOmino ? '1' : '0.3'}
            style={{
              filter: hasOmino ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))' : 'none',
            }}
          >
            {number}
          </text>
        </svg>
      </div>
    </div>
  );
}

// Suspended Cybernetic Bonus Monitor inspired by omini.jpg
function CyberBonusMonitor({
  label,
  sublabel,
  symbol,
  active,
  teamColor,
  teamNeon,
  onToggle,
}: {
  label: string;
  sublabel: string;
  symbol: string;
  active: boolean;
  teamColor: string;
  teamNeon: string;
  onToggle: () => void;
}) {
  return (
    <div className="flex flex-col items-center">
      {/* Hanging industrial conduit / cable coming from ceiling */}
      <div className="w-1.5 h-6 bg-gradient-to-b from-black/80 via-slate-500 to-slate-400 relative">
        <div className="absolute top-0 -left-1 w-3.5 h-1.5 bg-slate-600 rounded-sm" />
        <div className="absolute bottom-0 -left-0.5 w-2.5 h-1.5 bg-slate-700 rounded-sm" />
      </div>

      {/* Futuristic Monitor Bezel */}
      <button
        type="button"
        onClick={onToggle}
        className={`group relative w-16 sm:w-20 h-16 sm:h-20 rounded-xl border-2 transition-all duration-300 flex flex-col items-center justify-center cursor-pointer overflow-hidden ${
          active
            ? 'bg-slate-950/90 hover:scale-105'
            : 'bg-black/85 border-white/10 opacity-35 grayscale hover:opacity-50'
        }`}
        style={{
          borderColor: active ? teamNeon : 'rgba(255,255,255,0.12)',
          boxShadow: active
            ? `0 0 16px ${teamColor}80, inset 0 0 12px ${teamNeon}40`
            : 'none',
        }}
        title={`Bonus ${label} (${sublabel}): ${active ? 'Disponibile (clicca per spendere)' : 'Utilizzato (clicca per ripristinare)'}`}
      >
        {/* Holographic scanline overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-25"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 229, 255, 0.2) 2px, rgba(0, 229, 255, 0.2) 4px)',
          }}
        />

        {/* Screen Corner UI Brackets */}
        <div className="absolute top-1 left-1 w-1.5 h-1.5 border-t border-l border-cyan-300/70" />
        <div className="absolute top-1 right-1 w-1.5 h-1.5 border-t border-r border-cyan-300/70" />
        <div className="absolute bottom-1 left-1 w-1.5 h-1.5 border-b border-l border-cyan-300/70" />
        <div className="absolute bottom-1 right-1 w-1.5 h-1.5 border-b border-r border-cyan-300/70" />

        {/* Status LED Dot */}
        <div
          className={`absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full ${
            active ? 'bg-cyan-400 shadow-[0_0_6px_#00e5ff] animate-pulse' : 'bg-red-500/50'
          }`}
        />

        {/* Neon Cyber Icon */}
        <span
          className="text-2xl sm:text-3xl leading-none select-none drop-shadow-[0_0_10px_rgba(0,229,255,0.6)]"
          role="img"
          aria-label={label}
        >
          {symbol}
        </span>

        {/* Mini Label */}
        <span
          className={`text-[9px] font-black uppercase tracking-wider mt-1 ${
            active ? 'text-cyan-300' : 'text-slate-500'
          }`}
        >
          {label}
        </span>

        {/* Used Badge */}
        {!active && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[1px]">
            <span className="text-[9px] font-black uppercase tracking-widest text-red-400 border border-red-500/40 px-1 py-0.5 rounded bg-red-950/60">
              USATO
            </span>
          </div>
        )}
      </button>
    </div>
  );
}

// 3D Realistic & Holographic Rolling Dice
function HolographicDice3D({
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
      right: { x: 0, y: 0, z: 0 }, // Front face
      left: { x: 0, y: 180, z: 0 }, // Back face
      both: { x: 0, y: 90, z: 0 }, // Right face
      self: { x: 0, y: -90, z: 0 }, // Left face
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
    <div className="flex flex-col items-center justify-center gap-3">
      {/* 3D Cube Viewport */}
      <div
        onClick={onRoll}
        className="relative w-44 h-44 cursor-pointer select-none group [perspective:1200px]"
        title="Clicca per lanciare il dado"
      >
        {/* Glow backdrop */}
        <div className="absolute inset-0 rounded-full bg-cyan-500/15 blur-2xl group-hover:bg-cyan-500/25 transition-all pointer-events-none" />

        {/* 3D Cube Container */}
        <div
          className="relative w-full h-full [transform-style:preserve-3d] transition-transform duration-[1200ms] ease-out"
          style={{
            transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) rotateZ(${rotation.z}deg)`,
          }}
        >
          {/* Face: RIGHT (Front - translateZ(55px)) */}
          <div className="absolute inset-2 rounded-2xl border-2 border-cyan-400/80 bg-gradient-to-br from-slate-900 via-slate-950 to-cyan-950 flex flex-col items-center justify-center text-center p-2 shadow-[inset_0_0_20px_rgba(0,229,255,0.4),0_10px_25px_rgba(0,0,0,0.5)] [transform:translateZ(55px)]">
            <span className="text-3xl text-cyan-400 drop-shadow-[0_0_10px_#00e5ff]">➔</span>
            <span className="text-lg font-black tracking-widest text-white mt-1">DESTRA</span>
            <span className="text-[9px] uppercase tracking-wider text-cyan-300/80 font-bold">BERSAGLIO</span>
          </div>

          {/* Face: LEFT (Back - rotateY(180deg) translateZ(55px)) */}
          <div className="absolute inset-2 rounded-2xl border-2 border-blue-400/80 bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950 flex flex-col items-center justify-center text-center p-2 shadow-[inset_0_0_20px_rgba(59,130,246,0.4),0_10px_25px_rgba(0,0,0,0.5)] [transform:rotateY(180deg)_translateZ(55px)]">
            <span className="text-3xl text-blue-400 drop-shadow-[0_0_10px_#3b82f6]">⬅</span>
            <span className="text-lg font-black tracking-widest text-white mt-1">SINISTRA</span>
            <span className="text-[9px] uppercase tracking-wider text-blue-300/80 font-bold">BERSAGLIO</span>
          </div>

          {/* Face: BOTH (Right - rotateY(90deg) translateZ(55px)) */}
          <div className="absolute inset-2 rounded-2xl border-2 border-amber-400/80 bg-gradient-to-br from-slate-900 via-slate-950 to-amber-950 flex flex-col items-center justify-center text-center p-2 shadow-[inset_0_0_20px_rgba(245,158,11,0.4),0_10px_25px_rgba(0,0,0,0.5)] [transform:rotateY(90deg)_translateZ(55px)]">
            <span className="text-2xl text-amber-400 drop-shadow-[0_0_10px_#f59e0b]">⮂ ⮃</span>
            <span className="text-base font-black tracking-wider text-white mt-1">ENTRAMBE</span>
            <span className="text-[9px] uppercase tracking-wider text-amber-300/80 font-bold">DOPPIA SFIDA</span>
          </div>

          {/* Face: SELF (Left - rotateY(-90deg) translateZ(55px)) */}
          <div className="absolute inset-2 rounded-2xl border-2 border-red-400/80 bg-gradient-to-br from-slate-900 via-slate-950 to-red-950 flex flex-col items-center justify-center text-center p-2 shadow-[inset_0_0_20px_rgba(239,68,68,0.4),0_10px_25px_rgba(0,0,0,0.5)] [transform:rotateY(-90deg)_translateZ(55px)]">
            <span className="text-3xl text-red-400 drop-shadow-[0_0_10px_#ef4444]">🎯</span>
            <span className="text-base font-black tracking-wider text-white mt-1">SE STESSA</span>
            <span className="text-[9px] uppercase tracking-wider text-red-300/80 font-bold">AUTOSFIDA</span>
          </div>

          {/* Top Face */}
          <div className="absolute inset-2 rounded-2xl border border-white/20 bg-slate-900/90 [transform:rotateX(90deg)_translateZ(55px)]" />
          {/* Bottom Face */}
          <div className="absolute inset-2 rounded-2xl border border-white/20 bg-slate-950 [transform:rotateX(-90deg)_translateZ(55px)]" />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onRoll}
          disabled={rolling}
          className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer shadow-lg flex items-center gap-2 ${
            rolling
              ? 'bg-slate-700 text-slate-300 cursor-not-allowed opacity-75'
              : 'bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-cyan-500/25 hover:scale-105 active:scale-95 border border-cyan-300/40'
          }`}
        >
          <span>🎲</span>
          <span>{rolling ? 'Lancio in corso...' : 'Lancia Dado'}</span>
        </button>

        {canRollBonus && (
          <button
            type="button"
            onClick={onUseBonusRoll}
            disabled={rolling}
            className="px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black shadow-lg shadow-amber-500/30 hover:scale-105 active:scale-95 border border-amber-300 transition-all flex items-center gap-1.5 cursor-pointer animate-pulse"
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

  // Background image (from setup, slide data, or default canyon background)
  const bgImage =
    gameData?.sfondo ||
    setupConfig?.gioco5?.sfondoGenerale ||
    '/sfondo_finale_default.jpg';

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
    // Consume active team's dice bonus (index 0)
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
      // Eliminate next highest active cube index
      const remainingCubes = [1, 2, 3, 4, 5, 6]
        .slice(0, maxCount)
        .filter((c) => !currentList.includes(c));
      if (remainingCubes.length === 0) return prev;
      const toEliminate = remainingCubes[remainingCubes.length - 1];
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
        // Restore
        return {
          ...prev,
          [teamId]: currentList.filter((n) => n !== cubeNum),
        };
      } else {
        // Eliminate
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

  // Cube layout rows matching omini.jpg pyramid
  const pyramidRows = [
    { cubes: [4, 6, 5] }, // Back row
    { cubes: [2, 3] },    // Middle row
    { cubes: [1] },       // Front row
  ];

  return (
    <div className="relative w-full h-full overflow-hidden text-white font-sans bg-black select-none">
      {/* 16:9 Cinema Background Arena */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-700"
        style={{ backgroundImage: `url("${assetUrl(bgImage)}")` }}
      >
        {/* Ambient Overlay Gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#050b14] via-transparent to-black/60" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_30%,_rgba(0,0,0,0.75)_100%)]" />
      </div>

      {/* Water reflection ripples effect overlay */}
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[#02060d]/90 via-[#051329]/40 to-transparent pointer-events-none" />

      {/* Main Interactive Stage Container */}
      <div className="relative z-10 w-full h-full flex flex-col justify-between p-4 sm:p-6">
        {/* Top Header & Turn Indicator */}
        <header className="flex items-center justify-between gap-4 shrink-0 bg-black/40 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/10 shadow-2xl">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded bg-red-600/30 text-red-300 border border-red-500/40">
                BOX 5
              </span>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white drop-shadow-md">
                {gameData?.title || setupConfig?.gioco5?.titolo || 'Sfida Finale a Squadre'}
              </h1>
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5">
              {gameData?.subtitle || setupConfig?.gioco5?.sottotitolo || 'Il dado decide la sfida — Elimina gli omini avversari'}
            </p>
          </div>

          {/* Turn selector badges */}
          <div className="flex items-center gap-2 bg-white/5 p-1.5 rounded-xl border border-white/10">
            <span className="text-[10px] uppercase font-bold text-slate-400 px-2 tracking-wider">
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
                  className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? `${meta.borderActive} bg-white text-black scale-105`
                      : 'bg-white/5 text-white/70 hover:bg-white/10 border border-white/10'
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
          </div>
        </header>

        {/* ============================================================ */}
        {/* CENTER ARENA: The 3 Teams Stage (Left, Center, Right in order) */}
        {/* ============================================================ */}
        <div className="flex-1 grid grid-cols-3 gap-4 lg:gap-6 my-3 min-h-0 items-end">
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
                className={`relative flex flex-col justify-between h-full rounded-3xl p-4 transition-all duration-500 border backdrop-blur-md overflow-hidden ${
                  isActive
                    ? 'border-white/40 bg-slate-950/60 shadow-[0_0_50px_rgba(255,255,255,0.15)] ring-2 ring-white/20'
                    : isTarget
                    ? 'border-red-500/80 bg-red-950/40 shadow-[0_0_40px_rgba(239,68,68,0.35)] animate-pulse'
                    : 'border-white/10 bg-black/45'
                }`}
                style={{
                  boxShadow: isActive
                    ? `0 20px 60px rgba(0,0,0,0.6), inset 0 0 30px ${meta.colorGlow}`
                    : undefined,
                }}
              >
                {/* Active / Target Stage Banners */}
                {isActive && (
                  <div className="absolute top-2 right-3 z-30">
                    <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-full bg-white text-black shadow-lg shadow-white/30 flex items-center gap-1.5 animate-pulse">
                      <span className="w-2 h-2 rounded-full bg-red-600" />
                      AL COMANDO
                    </span>
                  </div>
                )}
                {isTarget && !isActive && (
                  <div className="absolute top-2 right-3 z-30">
                    <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-full bg-red-600 text-white shadow-lg shadow-red-600/40 flex items-center gap-1.5 animate-bounce">
                      <span>🎯</span>
                      BERSAGLIO
                    </span>
                  </div>
                )}

                {/* Top Section: Hanging Cyber Bonus Monitors (Dado, Switch, Arco, Scudo) */}
                <div className="flex flex-col items-center">
                  <div className="grid grid-cols-4 gap-1.5 sm:gap-2 w-full justify-items-center">
                    {BONUS_CONFIGS.map((bConfig, bIdx) => (
                      <CyberBonusMonitor
                        key={bConfig.key}
                        label={bConfig.label}
                        sublabel={bConfig.sublabel}
                        symbol={bConfig.symbol}
                        active={Boolean(teamBonuses[bIdx])}
                        teamColor={meta.colorHex}
                        teamNeon={meta.colorNeon}
                        onToggle={() => toggleBonus(teamId - 1, bIdx)}
                      />
                    ))}
                  </div>

                  {/* Team Title & Status Header */}
                  <div className="mt-3 flex items-center justify-between w-full border-t border-white/10 pt-2.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3.5 h-3.5 rounded-full shadow-[0_0_12px]"
                        style={{
                          backgroundColor: meta.colorHex,
                          boxShadow: `0 0 12px ${meta.colorNeon}`,
                        }}
                      />
                      <h2 className="text-lg sm:text-xl font-black tracking-wide text-white uppercase truncate max-w-[140px] sm:max-w-[200px]">
                        {teamNames[teamId - 1] || meta.defaultName}
                      </h2>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-white/90 bg-white/10 px-2.5 py-1 rounded-lg border border-white/15">
                        {remainingCount} / {teamMembersCount}
                      </span>
                      {/* Quick manual +/- buttons */}
                      <button
                        type="button"
                        onClick={() => eliminateMember(teamId)}
                        disabled={remainingCount <= 0}
                        className="w-6 h-6 rounded bg-red-600/30 hover:bg-red-600/60 text-red-300 font-black text-xs flex items-center justify-center border border-red-500/40 disabled:opacity-20 cursor-pointer"
                        title="Elimina 1 omino"
                      >
                        -
                      </button>
                      <button
                        type="button"
                        onClick={() => restoreMember(teamId)}
                        disabled={teamEliminatedList.length <= 0}
                        className="w-6 h-6 rounded bg-emerald-600/30 hover:bg-emerald-600/60 text-emerald-300 font-black text-xs flex items-center justify-center border border-emerald-500/40 disabled:opacity-20 cursor-pointer"
                        title="Ripristina 1 omino"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Bottom Section: 3D Pyramid of Cubes & Omini (inspired by omini.jpg) */}
                <div className="flex flex-col items-center justify-end flex-1 min-h-[220px] pb-2 pt-4 relative">
                  {pyramidRows.map((row, rowIdx) => {
                    const zIndexClass = rowIdx === 0 ? 'z-10' : rowIdx === 1 ? 'z-20 -mt-6' : 'z-30 -mt-6';
                    return (
                      <div
                        key={rowIdx}
                        className={`flex justify-center items-end gap-2 sm:gap-3 ${zIndexClass}`}
                      >
                        {row.cubes.map((cubeNum) => {
                          const isAssigned = cubeNum <= teamMembersCount;
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
        {/* BOTTOM COMMAND HUD: Dice 3D, Resolution Actions, Question Matrix */}
        {/* ============================================================ */}
        <footer className="bg-slate-950/80 backdrop-blur-xl border border-white/15 rounded-3xl p-4 shadow-2xl shrink-0 grid grid-cols-1 lg:grid-cols-[260px_1fr_320px] gap-4 items-center">
          {/* Left: 3D Holographic Dice Console */}
          <div className="flex justify-center lg:justify-start border-b lg:border-b-0 lg:border-r border-white/10 pb-3 lg:pb-0 lg:pr-4">
            <HolographicDice3D
              rolling={rolling}
              targetFace={dieTargetFace}
              onRoll={rollDice}
              canRollBonus={hasDiceBonusAvailable}
              onUseBonusRoll={handleUseBonusRoll}
            />
          </div>

          {/* Center: Target Announcement & Challenge Resolution */}
          <div className="flex flex-col items-center justify-center gap-3 px-2">
            {/* Holographic Target Banner */}
            <div className="w-full max-w-xl bg-black/60 border border-cyan-500/30 rounded-2xl p-3 text-center shadow-inner flex flex-col items-center justify-center">
              <div className="text-[10px] uppercase font-black tracking-widest text-cyan-400/80 mb-1">
                Centrale di Sfida
              </div>
              {selectedDieFace ? (
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <span className="px-3 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 font-black text-sm uppercase tracking-wider border border-cyan-400/30">
                    🎲 Dado: {selectedDieFace === 'right' ? 'DESTRA ➔' : selectedDieFace === 'left' ? '⬅ SINISTRA' : selectedDieFace === 'both' ? '⮂ ENTRAMBE' : '🎯 SE STESSA'}
                  </span>
                  <span className="text-slate-400">➔</span>
                  <span className="px-3 py-1 rounded-lg bg-red-500/20 text-red-300 font-black text-sm uppercase tracking-wider border border-red-400/30 animate-pulse">
                    🎯 Bersaglio:{' '}
                    {targetTeam === 'both'
                      ? 'Entrambe le altre squadre'
                      : targetTeam
                      ? teamNames[targetTeam - 1]
                      : 'Nessuno'}
                  </span>
                </div>
              ) : (
                <div className="text-xs text-slate-400 italic">
                  Lancia il dado per determinare quale squadra sarà il bersaglio della sfida!
                </div>
              )}
            </div>

            {/* Outcome Buttons (Corretto, Sbagliato, Prossimo Turno) */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => handleOutcome(true)}
                disabled={!selectedDieFace}
                className="px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 hover:scale-105 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-2 cursor-pointer border border-emerald-400/40"
              >
                <span>✅</span>
                <span>Risposta Esatta</span>
              </button>

              <button
                type="button"
                onClick={() => handleOutcome(false)}
                disabled={!selectedDieFace}
                className="px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 hover:scale-105 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-2 cursor-pointer border border-rose-400/40"
              >
                <span>❌</span>
                <span>Risposta Errata</span>
              </button>

              <button
                type="button"
                onClick={handleNextTurn}
                className="px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest bg-slate-800 hover:bg-slate-700 text-white/90 border border-white/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>Passa Turno</span>
                <span>➜</span>
              </button>
            </div>
          </div>

          {/* Right: Question Matrix 1..15 */}
          <div className="border-t lg:border-t-0 lg:border-l border-white/10 pt-3 lg:pt-0 lg:pl-4 flex flex-col justify-center">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">
                Domande ({questionNumbers.length - eliminatedQuestions.length} rimaste)
              </span>
              <button
                type="button"
                onClick={() => setEliminatedQuestions([])}
                className="text-[9px] uppercase font-bold text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded border border-white/10 transition-colors cursor-pointer"
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
                        ? 'bg-black/60 text-white/20 border border-white/5 line-through'
                        : 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-400/30 hover:scale-105'
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
