import React, { useEffect, useState, useRef } from 'react';
import type { WordType } from '../lib/passwordUtils';
import { templeSoundFX } from '../lib/templeSoundFX';

export interface ActiveRevealData {
  index: number;
  word: string;
  type: WordType;
  team: number;
  timestamp: number;
}

interface TempleWordSuspenseOverlayProps {
  activeReveal: ActiveRevealData | null;
  teamNames: string[];
  canPlayAudio: boolean;
  onComplete: () => void;
}

export const TempleWordSuspenseOverlay: React.FC<TempleWordSuspenseOverlayProps> = ({
  activeReveal,
  teamNames,
  canPlayAudio,
  onComplete,
}) => {
  const [phase, setPhase] = useState<'tension' | 'reveal' | 'settle'>('tension');
  const hasTriggeredAudioRef = useRef(false);

  const teamIdx = activeReveal ? activeReveal.team - 1 : 0;
  const currentTeamName = teamNames[teamIdx] || `SQUADRA ${activeReveal?.team || 1}`;

  // Colori squadra
  const getTeamNameColor = (teamNum: number) => {
    if (teamNum === 1) return 'text-red-400';
    if (teamNum === 2) return 'text-sky-400';
    return 'text-emerald-400';
  };

  const getTeamGlowColor = (type: WordType) => {
    if (type === 'team1') return 'from-red-600/60 via-red-500/30 to-amber-700/40 border-red-400 shadow-[0_0_80px_rgba(239,68,68,0.7)]';
    if (type === 'team2') return 'from-blue-600/60 via-cyan-500/30 to-sky-700/40 border-cyan-400 shadow-[0_0_80px_rgba(56,189,248,0.7)]';
    if (type === 'team3') return 'from-emerald-600/60 via-green-500/30 to-teal-700/40 border-emerald-400 shadow-[0_0_80px_rgba(52,211,153,0.7)]';
    if (type === 'bomb') return 'from-stone-950 via-red-950/80 to-stone-950 border-red-600 shadow-[0_0_90px_rgba(220,38,38,0.9)]';
    return 'from-stone-800 via-stone-700/60 to-stone-900 border-stone-500 shadow-[0_0_40px_rgba(168,162,158,0.3)]';
  };

  const getTeamOwnerName = (type: WordType) => {
    if (type === 'team1') return teamNames[0] || 'SQUADRA 1';
    if (type === 'team2') return teamNames[1] || 'SQUADRA 2';
    if (type === 'team3') return teamNames[2] || 'SQUADRA 3';
    return '';
  };

  useEffect(() => {
    if (!activeReveal) {
      setPhase('tension');
      hasTriggeredAudioRef.current = false;
      return;
    }

    setPhase('tension');

    if (canPlayAudio && !hasTriggeredAudioRef.current) {
      hasTriggeredAudioRef.current = true;
      templeSoundFX.resume();
      templeSoundFX.playStoneStep();
      templeSoundFX.playSuspenseTension();
    }

    // Cronometro della sequenza (3.8 secondi totali)
    // 0s -> 1.7s : Tensione / Suspense
    // 1.7s -> 3.3s : Rivelazione e verdetto
    // 3.3s -> 3.8s : Rientro morbido al tabellone
    const tReveal = setTimeout(() => {
      setPhase('reveal');
      if (canPlayAudio) {
        if (activeReveal.type === 'bomb') {
          templeSoundFX.playBombExplosion();
        } else if (activeReveal.type === 'neutral') {
          templeSoundFX.playNeutralThud();
        } else {
          templeSoundFX.playTeamTileReveal();
        }
      }
    }, 1700);

    const tSettle = setTimeout(() => {
      setPhase('settle');
    }, 3300);

    const tComplete = setTimeout(() => {
      onComplete();
    }, 3800);

    return () => {
      clearTimeout(tReveal);
      clearTimeout(tSettle);
      clearTimeout(tComplete);
    };
  }, [activeReveal?.timestamp, canPlayAudio, onComplete]);

  if (!activeReveal) return null;

  const isTension = phase === 'tension';
  const isReveal = phase === 'reveal';
  const isSettle = phase === 'settle';
  const isBomb = activeReveal.type === 'bomb';

  return (
    <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center select-none overflow-hidden transition-all duration-500 ${
      isSettle ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
    }`}>
      {/* Sfondo scuro atmosferico con particelle e fumo del tempio */}
      <div className={`absolute inset-0 transition-colors duration-700 ${
        isReveal && isBomb
          ? 'bg-gradient-to-b from-red-950/90 via-black/95 to-red-950/90'
          : 'bg-black/85 backdrop-blur-md'
      }`} />

      {/* Luce sismica / flash al momento della rivelazione */}
      {isReveal && (
        <div className={`absolute inset-0 pointer-events-none transition-opacity duration-700 animate-pulse ${
          isBomb 
            ? 'bg-red-600/25' 
            : activeReveal.type === 'neutral' 
              ? 'bg-stone-500/10' 
              : activeReveal.type === 'team1' 
                ? 'bg-red-500/20' 
                : activeReveal.type === 'team2' 
                  ? 'bg-blue-500/20' 
                  : 'bg-emerald-500/20'
        }`} />
      )}

      {/* Particelle dorate o brace ardente */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className={`absolute top-1/4 left-1/3 w-96 h-96 rounded-full blur-[120px] transition-all duration-700 ${
          isReveal && isBomb ? 'bg-red-600/40' : 'bg-amber-500/20'
        }`} />
        <div className={`absolute bottom-1/4 right-1/3 w-96 h-96 rounded-full blur-[120px] transition-all duration-700 ${
          isReveal && isBomb ? 'bg-orange-600/30' : 'bg-yellow-600/20'
        }`} />
      </div>

      {/* HEADER SUPERIORE: Badge del Tempio e Chiamata Squadra */}
      <div className={`relative z-10 flex flex-col items-center mb-6 transition-all duration-500 transform ${
        isTension ? 'translate-y-0 opacity-100' : 'translate-y-0 opacity-100'
      }`}>
        <div className="inline-flex items-center gap-2.5 px-6 py-2 rounded-full bg-stone-900/90 border border-amber-500/50 shadow-[0_0_25px_rgba(245,158,11,0.35)] backdrop-blur-md mb-2">
          <span className="text-amber-400 text-sm animate-spin">✦</span>
          <span className="text-xs font-serif font-black tracking-[0.25em] uppercase text-amber-200">
            {isTension ? 'IL TEMPIO ESAMINA LA MATTONELLA' : isBomb ? 'TRAPPOLA MORTALE ATTIVATA!' : 'VERDETTO DEL TEMPIO'}
          </span>
          <span className="text-amber-400 text-sm animate-spin">✦</span>
        </div>

        <p className="text-lg md:text-xl font-bold tracking-wide text-stone-300">
          Scelta da:{' '}
          <span className={`font-black uppercase tracking-wider ${getTeamNameColor(activeReveal.team)}`}>
            {currentTeamName}
          </span>
        </p>
      </div>

      {/* ========================================================================= */}
      {/* LA MATTONELLA CENTRALE DEL TEMPIO (3D STONE SLAB)                         */}
      {/* ========================================================================= */}
      <div className="relative z-10 flex items-center justify-center p-4">
        {/* Cerchi concentrici runici / anelli di luce mistica */}
        {isTension && (
          <div className="absolute w-[680px] h-[480px] rounded-[40px] border border-amber-400/30 animate-ping opacity-25 pointer-events-none" />
        )}

        {isReveal && !isBomb && activeReveal.type !== 'neutral' && (
          <div className={`absolute w-[720px] h-[520px] rounded-[40px] border-2 animate-pulse opacity-40 pointer-events-none ${
            activeReveal.type === 'team1' ? 'border-red-400' : activeReveal.type === 'team2' ? 'border-sky-400' : 'border-emerald-400'
          }`} />
        )}

        {/* CONTENITORE PRINCIPALE DELLA MATTONELLA */}
        <div
          className={`relative w-[620px] min-h-[340px] p-2.5 rounded-3xl transition-all duration-500 transform ${
            isTension 
              ? 'scale-105 shadow-[0_0_50px_rgba(245,158,11,0.5)] animate-[pulse_1s_ease-in-out_infinite]' 
              : isReveal && isBomb 
                ? 'scale-110 shadow-[0_0_90px_rgba(220,38,38,0.9)] animate-[bounce_0.2s_ease-in-out_infinite]' 
                : isReveal 
                  ? 'scale-110 shadow-[0_0_80px_rgba(245,158,11,0.8)]' 
                  : 'scale-90 opacity-40'
          }`}
          style={{ perspective: '1200px' }}
        >
          {/* Cornice esterna in pietra scolpita con bordo inciso */}
          <div className={`relative w-full h-full rounded-[22px] p-6 border-4 flex flex-col items-center justify-center text-center transition-all duration-700 overflow-hidden ${
            isTension
              ? 'bg-gradient-to-b from-[#3a2f23] via-[#241c14] to-[#17120c] border-amber-500/70 shadow-[inset_0_0_30px_rgba(245,158,11,0.25)]'
              : isReveal
                ? `bg-gradient-to-b ${getTeamGlowColor(activeReveal.type)} shadow-[inset_0_0_50px_rgba(0,0,0,0.6)]`
                : 'bg-stone-900 border-stone-700'
          }`}>
            
            {/* Texture di pietre incise / glifi geometrici sui 4 angoli */}
            <div className="absolute top-3 left-3 text-amber-500/40 text-lg font-serif select-none">𓃭</div>
            <div className="absolute top-3 right-3 text-amber-500/40 text-lg font-serif select-none">𓃭</div>
            <div className="absolute bottom-3 left-3 text-amber-500/40 text-lg font-serif select-none">𓆣</div>
            <div className="absolute bottom-3 right-3 text-amber-500/40 text-lg font-serif select-none">𓆣</div>

            {/* Linee di fuga incise tipo lastra di pietra del pavimento */}
            <div className="absolute inset-0 border border-amber-400/20 rounded-[18px] pointer-events-none m-2" />

            {/* Raggi luminosi dalle crepe durante la tensione */}
            {isTension && (
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(251,191,36,0.25)_0%,transparent_70%)] animate-pulse" />
            )}

            {/* STATO 1: SUSPENSE & TENSIONE (Rune palpitanti) */}
            {isTension && (
              <div className="relative z-10 flex flex-col items-center justify-center animate-pulse">
                <span className="text-amber-400/80 text-xs font-serif uppercase tracking-[0.3em] mb-3">
                  ✦ Mattonella Sigillata ✦
                </span>
                <h2 className="text-4xl md:text-5xl font-black font-serif tracking-widest uppercase text-transparent bg-clip-text bg-gradient-to-b from-amber-100 via-amber-200 to-amber-500 drop-shadow-[0_4px_12px_rgba(245,158,11,0.6)]">
                  {activeReveal.word}
                </h2>
                <div className="mt-5 flex items-center gap-2 text-amber-300/80 font-mono text-xs">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  <span>LA PIETRA STA REAGENDO AL CONTATTO...</span>
                </div>
              </div>
            )}

            {/* STATO 2: RIVELAZIONE — PAROLA DI SQUADRA */}
            {isReveal && activeReveal.type !== 'bomb' && activeReveal.type !== 'neutral' && (
              <div className="relative z-10 flex flex-col items-center justify-center animate-in zoom-in-95 duration-300">
                <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-white/20 border border-white/40 text-white font-black text-xs uppercase tracking-widest mb-3 shadow-lg">
                  <span>✨</span>
                  <span>{getTeamOwnerName(activeReveal.type)}</span>
                  <span>✨</span>
                </div>

                <h2 className="text-4xl md:text-5xl font-black font-serif tracking-wider uppercase text-white drop-shadow-[0_6px_20px_rgba(0,0,0,0.8)]">
                  {activeReveal.word}
                </h2>

                <div className="mt-4 px-6 py-2 rounded-xl bg-black/40 border border-white/20 backdrop-blur-md">
                  <span className="text-sm font-black uppercase tracking-widest text-amber-300 drop-shadow">
                    ✦ PUNTO ASSEGNATO A {getTeamOwnerName(activeReveal.type)}! ✦
                  </span>
                </div>
              </div>
            )}

            {/* STATO 2: RIVELAZIONE — PAROLA NEUTRA */}
            {isReveal && activeReveal.type === 'neutral' && (
              <div className="relative z-10 flex flex-col items-center justify-center animate-in zoom-in-95 duration-300">
                <span className="text-stone-400 text-xs font-serif uppercase tracking-[0.25em] mb-3">
                  Lastra Inerte del Tempio
                </span>

                <h2 className="text-4xl md:text-5xl font-black font-serif tracking-wider uppercase text-stone-300/80 drop-shadow">
                  {activeReveal.word}
                </h2>

                <div className="mt-4 px-5 py-1.5 rounded-xl bg-stone-950/70 border border-stone-600">
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-400">
                    Nessuna Squadra — La Manche Continua
                  </span>
                </div>
              </div>
            )}

            {/* STATO 2: RIVELAZIONE — PAROLA BOMBA (ESPLOSIONE TRAPPOLA!) */}
            {isReveal && isBomb && (
              <div className="relative z-10 flex flex-col items-center justify-center animate-in zoom-in-110 duration-200">
                {/* Icona bomba fiammeggiante gigante */}
                <div className="text-6xl md:text-7xl mb-2 animate-bounce drop-shadow-[0_0_35px_rgba(239,68,68,1)]">
                  💣💥☠️
                </div>

                <div className="px-4 py-1 rounded-full bg-red-600 text-white font-black text-xs uppercase tracking-[0.25em] mb-2 shadow-[0_0_20px_rgba(220,38,38,0.8)] animate-pulse">
                  TRAPPOLA DEL TEMPIO ATTIVATA!
                </div>

                <h2 className="text-4xl md:text-5xl font-black font-serif tracking-wider uppercase text-red-100 drop-shadow-[0_4px_16px_rgba(220,38,38,0.9)]">
                  {activeReveal.word}
                </h2>

                <div className="mt-3 px-6 py-2 rounded-xl bg-red-950/90 border-2 border-red-500 shadow-xl max-w-lg">
                  <span className="text-sm font-black uppercase tracking-wider text-yellow-300 block">
                    {currentTeamName} HA PRESO LA BOMBA!
                  </span>
                  <span className="text-[11px] font-bold text-red-200 uppercase tracking-widest block mt-0.5">
                    ESCLUSA DALLA MANCHE • 3° POSTO
                  </span>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* FOOTER DI STATO */}
      <div className="relative z-10 mt-6 text-center">
        <span className="text-xs font-mono font-semibold tracking-widest uppercase text-stone-400/80">
          {isTension ? 'Attendi il verdetto...' : 'Ritorno al tabellone del tempio...'}
        </span>
      </div>
    </div>
  );
};
