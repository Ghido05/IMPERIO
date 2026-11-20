interface BuzzerStatusBadgeProps {
  isActive: boolean;
  variant?: 'viewport' | 'stage';
  className?: string;
}

const VARIANT_CLASSES = {
  viewport: {
    container: 'gap-3 px-4 py-2 border-2 shadow-2xl',
    dotWrapper: 'w-5 h-5',
    dotCore: 'w-5 h-5',
    text: 'text-sm',
  },
  stage: {
    container: 'gap-3.5 px-6 py-3 border-2 shadow-2xl',
    dotWrapper: 'w-7 h-7',
    dotCore: 'w-7 h-7',
    text: 'text-2xl',
  },
} as const;

/**
 * Indicatore ad alta visibilità dello stato della pulsantiera (Attiva / Bloccata).
 */
export default function BuzzerStatusBadge({
  isActive,
  variant = 'viewport',
  className = '',
}: BuzzerStatusBadgeProps) {
  const size = VARIANT_CLASSES[variant];

  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-none select-none flex items-center rounded-full backdrop-blur-md transition-all duration-300 ${size.container} ${
        isActive
          ? 'bg-emerald-950/90 border-emerald-400/85 shadow-[0_0_28px_rgba(16,185,129,0.55)]'
          : 'bg-red-950/90 border-red-500/80 shadow-[0_0_24px_rgba(239,68,68,0.45)]'
      } ${className}`}
      title={isActive ? 'Pulsantiera attiva' : 'Pulsantiera bloccata / non attiva'}
    >
      <span className={`relative flex items-center justify-center shrink-0 ${size.dotWrapper}`}>
        {isActive && (
          <span className="absolute inset-0 rounded-full bg-emerald-400 opacity-75 animate-ping" />
        )}
        <span
          className={`relative rounded-full transition-all duration-300 ${size.dotCore} ${
            isActive
              ? 'bg-emerald-400 shadow-[0_0_18px_#34d399]'
              : 'bg-red-500 shadow-[0_0_16px_#ef4444]'
          }`}
        />
      </span>
      <span
        className={`font-black uppercase tracking-wider whitespace-nowrap leading-none ${size.text} ${
          isActive ? 'text-emerald-100' : 'text-red-100'
        }`}
      >
        {isActive ? 'Pulsantiera Attiva' : 'Pulsantiera Bloccata'}
      </span>
    </div>
  );
}
