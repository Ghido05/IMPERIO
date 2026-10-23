import React from 'react';

export type CrystalTier = 'yellow' | 'green' | 'blue';

interface CrystalRankingBoxProps {
  tier: CrystalTier;
  top: string;
  height: string;
  className?: string;
}

export const CrystalRankingBox: React.FC<CrystalRankingBoxProps> = ({
  tier,
  top,
  height,
  className = ''
}) => {
  // Configurazioni sfaccettature e colori per ciascun livello minerale
  const configs = {
    yellow: {
      borderGradient: 'linear-gradient(135deg, #fffbeb 0%, #fde047 30%, #ca8a04 70%, #fef08a 100%)',
      bodyGradient: 'linear-gradient(145deg, rgba(254, 240, 138, 0.96) 0%, rgba(234, 179, 8, 0.90) 35%, rgba(161, 98, 7, 0.88) 75%, rgba(202, 138, 4, 0.94) 100%)',
      facetSheen: 'linear-gradient(115deg, rgba(255,255,255,0.65) 0%, rgba(255,255,255,0.2) 28%, transparent 55%)',
      glowShadow: 'drop-shadow(0 0 20px rgba(234, 179, 8, 0.45)) drop-shadow(0 8px 24px rgba(0, 0, 0, 0.5))',
      innerLine: 'rgba(255, 255, 255, 0.45)',
      darkShade: 'rgba(113, 63, 4, 0.25)',
    },
    green: {
      borderGradient: 'linear-gradient(135deg, #f0fdf4 0%, #86efac 30%, #15803d 70%, #bbf7d0 100%)',
      bodyGradient: 'linear-gradient(145deg, rgba(134, 239, 172, 0.96) 0%, rgba(34, 197, 94, 0.90) 35%, rgba(21, 128, 61, 0.88) 75%, rgba(22, 163, 74, 0.94) 100%)',
      facetSheen: 'linear-gradient(115deg, rgba(255,255,255,0.65) 0%, rgba(255,255,255,0.2) 28%, transparent 55%)',
      glowShadow: 'drop-shadow(0 0 20px rgba(34, 197, 94, 0.45)) drop-shadow(0 8px 24px rgba(0, 0, 0, 0.5))',
      innerLine: 'rgba(255, 255, 255, 0.45)',
      darkShade: 'rgba(15, 81, 40, 0.25)',
    },
    blue: {
      borderGradient: 'linear-gradient(135deg, #f0f9ff 0%, #7dd3fc 30%, #0369a1 70%, #bae6fd 100%)',
      bodyGradient: 'linear-gradient(145deg, rgba(125, 211, 252, 0.96) 0%, rgba(14, 165, 233, 0.90) 35%, rgba(3, 105, 161, 0.88) 75%, rgba(2, 132, 199, 0.94) 100%)',
      facetSheen: 'linear-gradient(115deg, rgba(255,255,255,0.65) 0%, rgba(255,255,255,0.2) 28%, transparent 55%)',
      glowShadow: 'drop-shadow(0 0 20px rgba(14, 165, 233, 0.45)) drop-shadow(0 8px 24px rgba(0, 0, 0, 0.5))',
      innerLine: 'rgba(255, 255, 255, 0.45)',
      darkShade: 'rgba(8, 47, 73, 0.25)',
    }
  }[tier];

  // Clip path ottagonale sfaccettato da cristallo (angoli tagliati a 45 gradi)
  const crystalClip = 'polygon(14px 0, calc(100% - 14px) 0, 100% 14px, 100% calc(100% - 14px), calc(100% - 14px) 100%, 14px 100%, 0 calc(100% - 14px), 0 14px)';

  return (
    <div
      className={`absolute left-[53.073%] w-[33.229%] transition-all duration-700 pointer-events-none select-none ${className}`}
      style={{
        top,
        height,
        filter: configs.glowShadow,
      }}
    >
      {/* Guscio esterno con taglio a gemma / cristallo */}
      <div
        className="w-full h-full p-[2.5px] transition-transform"
        style={{
          clipPath: crystalClip,
          background: configs.borderGradient,
        }}
      >
        {/* Corpo principale del cristallo translucido sfaccettato */}
        <div
          className="relative w-full h-full overflow-hidden"
          style={{
            clipPath: crystalClip,
            background: configs.bodyGradient,
          }}
        >
          {/* Sfaccettatura superiore di luce brillante (Specular Glint) */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: configs.facetSheen,
            }}
          />

          {/* Linee di sfaccettatura interne (Facets geometrici 3D) */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40" preserveAspectRatio="none">
            {/* Sfaccettatura diagonale dall'angolo in alto a sinistra */}
            <line x1="0" y1="0" x2="14" y2="14" stroke="#ffffff" strokeWidth="1.5" />
            {/* Sfaccettatura diagonale dall'angolo in alto a destra */}
            <line x1="100%" y1="0" x2="calc(100% - 14px)" y2="14" stroke="#ffffff" strokeWidth="1.5" />
            {/* Sfaccettatura diagonale dall'angolo in basso a destra */}
            <line x1="100%" y1="100%" x2="calc(100% - 14px)" y2="calc(100% - 14px)" stroke={configs.darkShade} strokeWidth="1.5" />
            {/* Sfaccettatura diagonale dall'angolo in basso a sinistra */}
            <line x1="0" y1="100%" x2="14" y2="calc(100% - 14px)" stroke={configs.darkShade} strokeWidth="1.5" />
            {/* Bordo di sfaccettatura perimetrale interno */}
            <polyline
              points="14,14 calc(100% - 14px),14 calc(100% - 14px),calc(100% - 14px) 14,calc(100% - 14px) 14,14"
              fill="none"
              stroke="#ffffff"
              strokeWidth="0.75"
              strokeDasharray="4 2"
              opacity="0.3"
            />
          </svg>

          {/* Riflesso prismatico radiale centrale */}
          <div
            className="absolute inset-0 pointer-events-none opacity-30"
            style={{
              background: 'radial-gradient(ellipse at 40% 30%, rgba(255,255,255,0.7) 0%, transparent 60%)',
            }}
          />
        </div>
      </div>
    </div>
  );
};

interface CrystalNumberMarkerProps {
  value: number;
  top: string;
  isRevealed: boolean;
  tier: CrystalTier;
  onClick: (e: React.MouseEvent) => void;
  onContextMenu: (e: React.MouseEvent) => void;
  title?: string;
  canClick?: boolean;
}

export const CrystalNumberMarker: React.FC<CrystalNumberMarkerProps> = ({
  value,
  top,
  isRevealed,
  tier,
  onClick,
  onContextMenu,
  title,
  canClick = true
}) => {
  // Taglio diamante ottagonale per i cristalli numerici
  const diamondClip = 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)';

  const tierStyles = {
    yellow: {
      borderRevealed: 'linear-gradient(135deg, #fffbeb 0%, #fde047 35%, #ca8a04 70%, #fef08a 100%)',
      bodyRevealed: 'linear-gradient(145deg, #fef08a 0%, #eab308 40%, #ca8a04 80%, #a16207 100%)',
      glowRevealed: 'drop-shadow(0 0 14px rgba(234, 179, 8, 0.8)) drop-shadow(0 0 25px rgba(250, 204, 21, 0.5))',
      textColor: 'text-neutral-950',
      textShadow: 'drop-shadow(0 1px 1px rgba(255, 255, 255, 0.6))',
      borderUnrevealed: 'linear-gradient(135deg, #fef08a 0%, #854d0e 50%, #ca8a04 100%)',
      bodyUnrevealed: 'linear-gradient(145deg, #2a2212 0%, #17120a 50%, #2f2310 100%)',
      glowUnrevealed: 'drop-shadow(0 0 8px rgba(202, 138, 4, 0.35))',
      unrevealedTextColor: 'text-amber-300',
    },
    green: {
      borderRevealed: 'linear-gradient(135deg, #f0fdf4 0%, #86efac 35%, #15803d 70%, #bbf7d0 100%)',
      bodyRevealed: 'linear-gradient(145deg, #86efac 0%, #22c55e 40%, #15803d 80%, #14532d 100%)',
      glowRevealed: 'drop-shadow(0 0 14px rgba(34, 197, 94, 0.8)) drop-shadow(0 0 25px rgba(74, 222, 128, 0.5))',
      textColor: 'text-neutral-950',
      textShadow: 'drop-shadow(0 1px 1px rgba(255, 255, 255, 0.6))',
      borderUnrevealed: 'linear-gradient(135deg, #86efac 0%, #166534 50%, #22c55e 100%)',
      bodyUnrevealed: 'linear-gradient(145deg, #132418 0%, #0a170e 50%, #172b1d 100%)',
      glowUnrevealed: 'drop-shadow(0 0 8px rgba(34, 197, 94, 0.35))',
      unrevealedTextColor: 'text-emerald-300',
    },
    blue: {
      borderRevealed: 'linear-gradient(135deg, #f0f9ff 0%, #7dd3fc 35%, #0369a1 70%, #bae6fd 100%)',
      bodyRevealed: 'linear-gradient(145deg, #7dd3fc 0%, #0ea5e9 40%, #0369a1 80%, #0c4a6e 100%)',
      glowRevealed: 'drop-shadow(0 0 14px rgba(14, 165, 233, 0.8)) drop-shadow(0 0 25px rgba(56, 189, 248, 0.5))',
      textColor: 'text-white',
      textShadow: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.7))',
      borderUnrevealed: 'linear-gradient(135deg, #7dd3fc 0%, #075985 50%, #0ea5e9 100%)',
      bodyUnrevealed: 'linear-gradient(145deg, #0e202e 0%, #07131e 50%, #12283a 100%)',
      glowUnrevealed: 'drop-shadow(0 0 8px rgba(14, 165, 233, 0.35))',
      unrevealedTextColor: 'text-cyan-300',
    }
  }[tier];

  return (
    <div
      onClick={onClick}
      onContextMenu={onContextMenu}
      title={title}
      className={`absolute left-[87.708%] w-[3.177%] h-[4.352%] flex items-center justify-center transition-all duration-300 select-none ${
        canClick && !isRevealed ? 'cursor-pointer hover:scale-115 active:scale-95' : ''
      } ${isRevealed ? 'scale-105' : ''}`}
      style={{
        top,
        filter: isRevealed ? tierStyles.glowRevealed : tierStyles.glowUnrevealed,
      }}
    >
      {/* Taglio a gemma ottagonale perimetrale con bordo riflettente */}
      <div
        className="w-full h-full p-[2px] transition-all flex items-center justify-center"
        style={{
          clipPath: diamondClip,
          background: isRevealed ? tierStyles.borderRevealed : tierStyles.borderUnrevealed,
        }}
      >
        {/* Corpo interno della gemma */}
        <div
          className="relative w-full h-full flex items-center justify-center overflow-hidden"
          style={{
            clipPath: diamondClip,
            background: isRevealed ? tierStyles.bodyRevealed : tierStyles.bodyUnrevealed,
          }}
        >
          {/* Sfaccettatura superiore lucida a diamante */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.65) 0%, rgba(255,255,255,0.15) 30%, transparent 60%)',
            }}
          />

          {/* Linee di sfaccettatura diagonale diamante 3D */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40" preserveAspectRatio="none">
            <line x1="30%" y1="0%" x2="0%" y2="30%" stroke="#ffffff" strokeWidth="1" />
            <line x1="70%" y1="0%" x2="100%" y2="30%" stroke="#ffffff" strokeWidth="1" />
            <line x1="100%" y1="70%" x2="70%" y2="100%" stroke="rgba(0,0,0,0.4)" strokeWidth="1" />
            <line x1="0%" y1="70%" x2="30%" y2="100%" stroke="rgba(0,0,0,0.4)" strokeWidth="1" />
          </svg>

          {/* Valore numerico intagliato al centro */}
          <span
            className={`relative z-10 font-black text-[clamp(12px,1.56vw,30px)] leading-none tabular-nums ${
              isRevealed ? tierStyles.textColor : tierStyles.unrevealedTextColor
            }`}
            style={{
              filter: isRevealed ? tierStyles.textShadow : 'drop-shadow(0 0 3px rgba(255,255,255,0.3))',
            }}
          >
            {value}
          </span>
        </div>
      </div>
    </div>
  );
};
