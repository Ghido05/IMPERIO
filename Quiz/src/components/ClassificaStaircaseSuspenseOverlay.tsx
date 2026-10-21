import React, { useEffect, useState, useRef, useMemo } from 'react';
import { assetUrl, assetUrlCss } from '../lib/assetUrl';
import { box2SuspenseSoundFX } from '../lib/box2SuspenseSoundFX';

export interface Box2SuspenseData {
  clueIndex: number; // 1..10 o 1..7
  teamIdx: number; // 0, 1, 2 (Squadra 1, Squadra 2, Squadra 3)
  timestamp: number;
  totalClues: number; // 10 o 7
  points: number; // 1000, 2000, 3000
  clueText: string;
  clueIcon?: string;
  clueFrase?: string;
  isError?: boolean; // True se la risposta è errata
}

interface ClueItem {
  posizione: number;
  testo: string;
  audio?: string;
  icon?: string;
}

interface ClassificaStaircaseSuspenseOverlayProps {
  activeSuspense: Box2SuspenseData | null;
  allElements: ClueItem[];
  revealedState: Record<number, boolean>;
  categoryTitle?: string;
  sfondoUrl?: string;
  canPlayAudio?: boolean;
  onRevealPoint?: (clueNum: number, teamIdx: number, points: number) => void;
  onComplete?: () => void;
}

export const ClassificaStaircaseSuspenseOverlay: React.FC<ClassificaStaircaseSuspenseOverlayProps> = ({
  activeSuspense,
  allElements,
  revealedState,
  categoryTitle = 'CLASSIFICA',
  sfondoUrl = '/Icone/sfondi/sfondo_box2_cristalli.jpg',
  canPlayAudio = true,
  onRevealPoint,
  onComplete,
}) => {
  // Fasi dell'animazione:
  // 'intro': zoom-in della scala 3D (0 -> 400ms)
  // 'bouncing': scansione a scalini con campanelli (400ms -> ~3800ms)
  // 'locked': sosta di batticuore sul gradino bersaglio (~3800ms -> 4200ms)
  // 'revealed': apertura del gradino con la risposta e festa punti (4200ms -> 6200ms)
  // 'error': risposta errata con allerta rossa e suono buzzer
  // 'closing': fade-out finale
  const [phase, setPhase] = useState<'intro' | 'bouncing' | 'locked' | 'revealed' | 'error' | 'closing'>('intro');
  const [currentStep, setCurrentStep] = useState<number>(1);

  const hasTriggeredRevealPointRef = useRef(false);
  const audioUnlockedRef = useRef(false);
  const timerIdsRef = useRef<number[]>([]);

  const totalClues = activeSuspense?.totalClues || 10;
  const targetClue = activeSuspense?.clueIndex || 1;
  const teamIdx = activeSuspense ? activeSuspense.teamIdx : 0;

  // Dati squadra
  const teamName = teamIdx === 0 ? 'SQUADRA 1' : teamIdx === 1 ? 'SQUADRA 2' : 'SQUADRA 3';
  const teamBgBadge = teamIdx === 0 ? 'bg-red-950/80 text-red-300 border-red-500/80 shadow-[0_0_20px_rgba(239,68,68,0.5)]' : teamIdx === 1 ? 'bg-blue-950/80 text-blue-300 border-blue-500/80 shadow-[0_0_20px_rgba(59,130,246,0.5)]' : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/80 shadow-[0_0_20px_rgba(16,185,129,0.5)]';

  // Configurazione palette colori per ogni gradino (identica al tabellone del Box 2)
  const getStepColorConfig = (clueNum: number) => {
    if (totalClues === 10) {
      if (clueNum <= 5) {
        return {
          baseBg: 'from-[#00b3f6] via-[#0088cc] to-[#005c8a]',
          riserBg: 'bg-[#004870]',
          border: 'border-[#38bdf8]',
          glow: 'shadow-[0_0_25px_rgba(0,179,246,0.7)]',
          activeGlow: 'shadow-[0_0_50px_rgba(56,189,248,1)] ring-4 ring-white',
          textClass: 'text-white',
          badgeBg: 'bg-[#002f4a] text-cyan-200 border-cyan-400',
        };
      }
      if (clueNum <= 8) {
        return {
          baseBg: 'from-[#00ff00] via-[#00cc00] to-[#008000]',
          riserBg: 'bg-[#005900]',
          border: 'border-[#4ade80]',
          glow: 'shadow-[0_0_25px_rgba(0,255,0,0.7)]',
          activeGlow: 'shadow-[0_0_50px_rgba(74,222,128,1)] ring-4 ring-white',
          textClass: 'text-[#0a230a]',
          badgeBg: 'bg-[#004500] text-emerald-100 border-emerald-400',
        };
      }
      return {
        baseBg: 'from-[#ffff00] via-[#ffd700] to-[#d4b000]',
        riserBg: 'bg-[#997a00]',
        border: 'border-[#fef08a]',
        glow: 'shadow-[0_0_30px_rgba(255,255,0,0.8)]',
        activeGlow: 'shadow-[0_0_55px_rgba(254,240,138,1)] ring-4 ring-white',
        textClass: 'text-[#2a2200]',
        badgeBg: 'bg-[#5c4a00] text-amber-100 border-amber-300',
      };
    } else {
      // 7 elementi (Classifica musicale)
      if (clueNum <= 4) {
        return {
          baseBg: 'from-[#00b3f6] via-[#0088cc] to-[#005c8a]',
          riserBg: 'bg-[#004870]',
          border: 'border-[#38bdf8]',
          glow: 'shadow-[0_0_25px_rgba(0,179,246,0.7)]',
          activeGlow: 'shadow-[0_0_50px_rgba(56,189,248,1)] ring-4 ring-white',
          textClass: 'text-white',
          badgeBg: 'bg-[#002f4a] text-cyan-200 border-cyan-400',
        };
      }
      if (clueNum <= 6) {
        return {
          baseBg: 'from-[#00ff00] via-[#00cc00] to-[#008000]',
          riserBg: 'bg-[#005900]',
          border: 'border-[#4ade80]',
          glow: 'shadow-[0_0_25px_rgba(0,255,0,0.7)]',
          activeGlow: 'shadow-[0_0_50px_rgba(74,222,128,1)] ring-4 ring-white',
          textClass: 'text-[#0a230a]',
          badgeBg: 'bg-[#004500] text-emerald-100 border-emerald-400',
        };
      }
      return {
        baseBg: 'from-[#ffff00] via-[#ffd700] to-[#d4b000]',
        riserBg: 'bg-[#997a00]',
        border: 'border-[#fef08a]',
        glow: 'shadow-[0_0_30px_rgba(255,255,0,0.8)]',
        activeGlow: 'shadow-[0_0_55px_rgba(254,240,138,1)] ring-4 ring-white',
        textClass: 'text-[#2a2200]',
        badgeBg: 'bg-[#5c4a00] text-amber-100 border-amber-300',
      };
    }
  };

  // Generazione del percorso dinamico di rimbalzo / scansione (3.5 - 4 secondi totali)
  const bounceSequence = useMemo(() => {
    const seq: { step: number; delay: number; direction: 'up' | 'down' }[] = [];

    // 1. Salita iniziale rapida da 1 alla vetta (10 o 7)
    for (let s = 1; s <= totalClues; s++) {
      seq.push({ step: s, delay: 105, direction: 'up' });
    }

    // 2. Discesa rapida fino a 1
    for (let s = totalClues - 1; s >= 1; s--) {
      seq.push({ step: s, delay: 110, direction: 'down' });
    }

    // 3. Risalita oscillante verso il target con decelerazione progressiva
    const target = targetClue;

    // Se il target è 1, facciamo una piccola oscillazione 1 -> 4 -> 1
    if (target === 1) {
      for (let s = 2; s <= 4; s++) seq.push({ step: s, delay: 130 + s * 15, direction: 'up' });
      for (let s = 3; s >= 1; s--) seq.push({ step: s, delay: 180 + (4 - s) * 50, direction: 'down' });
    } else {
      // Risalita graduale verso target
      const remainingSteps: number[] = [];
      for (let s = 2; s <= target; s++) {
        remainingSteps.push(s);
      }

      const count = remainingSteps.length;
      remainingSteps.forEach((s, idx) => {
        // La velocità rallenta ad ogni gradino creando suspence cinematografica
        const delay = 120 + Math.pow(idx / Math.max(1, count - 1), 2) * 380;
        seq.push({ step: s, delay: Math.round(delay), direction: 'up' });
      });
    }

    return seq;
  }, [totalClues, targetClue]);

  // Gestione della sequenza temporizzata e riproduzione campanelli
  useEffect(() => {
    if (!activeSuspense) return;

    // Pulizia di eventuali timer precedenti
    timerIdsRef.current.forEach(id => clearTimeout(id));
    timerIdsRef.current = [];
    hasTriggeredRevealPointRef.current = false;

    setPhase('intro');
    setCurrentStep(1);

    if (canPlayAudio) {
      box2SuspenseSoundFX.resume();
      audioUnlockedRef.current = true;
    }

    // Intro (400ms) poi parte la sequenza
    const introTimer = window.setTimeout(() => {
      setPhase('bouncing');

      let accumulatedTime = 0;

      bounceSequence.forEach((item, index) => {
        accumulatedTime += item.delay;

        const timer = window.setTimeout(() => {
          setCurrentStep(item.step);

          if (canPlayAudio) {
            box2SuspenseSoundFX.playStepBell(item.step, totalClues, item.direction);
          }

          // Se è l'ultimo passo della sequenza di rimbalzo:
          if (index === bounceSequence.length - 1) {
            // Sosta sul gradino bersaglio (locked)
            setPhase('locked');
            if (canPlayAudio) {
              box2SuspenseSoundFX.playLockTick();
            }

            // Dopo 450ms di batticuore sul gradino bersaglio -> Rivelazione Trionfale o Errore!
            const lockTimer = window.setTimeout(() => {
              if (activeSuspense.isError) {
                setPhase('error');
                if (canPlayAudio) {
                  box2SuspenseSoundFX.playErrorReveal();
                }
                // Non chiamiamo onRevealPoint
                const settleTimer = window.setTimeout(() => {
                  setPhase('closing');
                  const closeTimer = window.setTimeout(() => {
                    onComplete?.();
                  }, 400);
                  timerIdsRef.current.push(closeTimer);
                }, 2200);
                timerIdsRef.current.push(settleTimer);
              } else {
                setPhase('revealed');
                if (canPlayAudio) {
                  box2SuspenseSoundFX.playVictoryReveal();
                }

                // Assegnazione punti e reveal sul tabellone
                if (!hasTriggeredRevealPointRef.current) {
                  hasTriggeredRevealPointRef.current = true;
                  onRevealPoint?.(activeSuspense.clueIndex, activeSuspense.teamIdx, activeSuspense.points);
                }

                // Dopo 2.4 secondi di celebrazione della parola -> chiusura sfumata
                const settleTimer = window.setTimeout(() => {
                  setPhase('closing');
                  const closeTimer = window.setTimeout(() => {
                    onComplete?.();
                  }, 400);
                  timerIdsRef.current.push(closeTimer);
                }, 2400);
                timerIdsRef.current.push(settleTimer);
              }
            }, 450);
            timerIdsRef.current.push(lockTimer);
          }
        }, accumulatedTime);

        timerIdsRef.current.push(timer);
      });
    }, 400);

    timerIdsRef.current.push(introTimer);

    return () => {
      timerIdsRef.current.forEach(id => clearTimeout(id));
      timerIdsRef.current = [];
    };
  }, [activeSuspense?.timestamp, activeSuspense?.clueIndex, activeSuspense?.isError, canPlayAudio]);

  // Se l'utente preme Esc o Invio durante la suspence per forzare il reveal immediato
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activeSuspense) return;
      if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
        if (phase === 'intro' || phase === 'bouncing' || phase === 'locked') {
          // Salta istantaneamente a rivelato o errore
          timerIdsRef.current.forEach(id => clearTimeout(id));
          timerIdsRef.current = [];
          setCurrentStep(targetClue);
          if (activeSuspense.isError) {
            setPhase('error');
            if (canPlayAudio) {
              box2SuspenseSoundFX.playErrorReveal();
            }
            const closeTimer = window.setTimeout(() => {
              onComplete?.();
            }, 1800);
            timerIdsRef.current.push(closeTimer);
          } else {
            setPhase('revealed');
            if (canPlayAudio) {
              box2SuspenseSoundFX.playVictoryReveal();
            }
            if (!hasTriggeredRevealPointRef.current) {
              hasTriggeredRevealPointRef.current = true;
              onRevealPoint?.(activeSuspense.clueIndex, activeSuspense.teamIdx, activeSuspense.points);
            }
            const closeTimer = window.setTimeout(() => {
              onComplete?.();
            }, 2000);
            timerIdsRef.current.push(closeTimer);
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSuspense, phase, targetClue, canPlayAudio, onRevealPoint, onComplete]);

  if (!activeSuspense) return null;

  // Lista ordinata dei gradini da 1 a totalClues
  // Nel rendering visuale:
  // Gradino 1 è alla BASE (in basso)
  // Gradino 10 o 7 è in CIMA (in alto)
  const stepsList = Array.from({ length: totalClues }, (_, i) => i + 1);

  return (
    <div 
      className={`absolute inset-0 z-[120] flex flex-col items-center justify-between p-4 md:p-6 overflow-hidden transition-opacity duration-400 select-none ${
        phase === 'closing' ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
      }`}
      style={{
        backgroundImage: assetUrlCss(sfondoUrl),
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* VIGNETTATURA SCURA CINEMATOGRAFICA E NEBULA CRISTALLI */}
      <div className="absolute inset-0 bg-radial from-transparent via-black/60 to-black/90 pointer-events-none" />
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-cyan-500/20 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-purple-600/20 rounded-full blur-[140px] pointer-events-none animate-pulse" />

      {/* HEADER ELEGANTE CON SQUADRA, CATEGORIA E STATO SUSPENCE */}
      <header className="relative z-10 w-full max-w-5xl flex items-center justify-between gap-4 px-6 py-3 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/15 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-3.5 h-3.5 rounded-full bg-cyan-400 shadow-[0_0_12px_#22d3ee] animate-ping" />
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-black tracking-widest text-cyan-300">
              GIOCO 2 • VERIFICA SCALATA
            </span>
            <h2 className="text-sm md:text-base font-black text-white tracking-wide uppercase line-clamp-1">
              {categoryTitle}
            </h2>
          </div>
        </div>

        {/* BADGE SQUADRA ATTIVA */}
        <div className="flex items-center gap-3">
          <div className={`px-4 py-1.5 rounded-xl border text-xs md:text-sm font-black tracking-wider uppercase transition-all duration-300 ${teamBgBadge}`}>
            <span className="opacity-70 mr-1.5">TURNO:</span>
            <span>{teamName}</span>
          </div>

          {activeSuspense.isError ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-500/20 border border-red-500/50 text-red-300 font-black text-xs uppercase tracking-wider animate-pulse">
              <span>0 PT • RISPOSTA ERRATA</span>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-400/10 border border-amber-400/30 text-amber-300 font-bold text-xs uppercase tracking-wider">
              <span>+{activeSuspense.points.toLocaleString('it-IT')} PT</span>
            </div>
          )}
        </div>
      </header>

      {/* CANVAS CENTRALE: LA SCALA IN TRE DIMENSIONI */}
      <div 
        className="relative z-10 w-full max-w-4xl flex-1 flex flex-col items-center justify-center my-2"
        style={{ perspective: '1400px' }}
      >
        <div 
          className="w-full flex flex-col-reverse justify-center items-center gap-1.5 md:gap-2 transition-transform duration-700 ease-out"
          style={{
            transformStyle: 'preserve-3d',
            transform: 'rotateX(20deg) scale(0.96)',
          }}
        >
          {stepsList.map((stepNum) => {
            const config = getStepColorConfig(stepNum);
            const isCurrentBouncing = phase === 'bouncing' && currentStep === stepNum;
            const isLockedTarget = (phase === 'locked' || phase === 'revealed' || phase === 'error') && targetClue === stepNum;
            const isAlreadyRevealed = !isLockedTarget && !!revealedState[stepNum];

            // Troviamo il testo dell'elemento corrispondente
            const itemElement = allElements.find(e => e.posizione === stepNum) || allElements[stepNum - 1];
            const itemText = itemElement?.testo || `Voce ${stepNum}`;

            // Calcolo larghezza prospettica: i gradini in basso (1) sono più larghi e vicini, quelli in cima leggermente rastremati
            // dando un'impressione maestosa di piramide/scala tridimensionale
            const widthPercent = totalClues === 10
              ? 100 - (stepNum - 1) * 2.2
              : 100 - (stepNum - 1) * 3.2;

            // Elevazione Z 3D del gradino
            const zTranslate = (stepNum - 1) * 6;

            return (
              <div
                key={stepNum}
                className={`relative group transition-all duration-200 ease-out ${
                  isLockedTarget
                    ? 'scale-[1.04] z-40'
                    : isCurrentBouncing
                    ? 'scale-[1.02] z-30'
                    : 'scale-100 z-10'
                }`}
                style={{
                  width: `${widthPercent}%`,
                  transform: `translateZ(${zTranslate}px) ${
                    isLockedTarget ? 'translateY(-6px)' : isCurrentBouncing ? 'translateY(-3px)' : 'translateY(0)'
                  }`,
                  transformStyle: 'preserve-3d',
                }}
              >
                {/* PEDANA SUPERIORE 3D DEL GRADINO */}
                <div
                  className={`relative flex items-center justify-between px-3 md:px-5 py-2 md:py-2.5 rounded-xl border-2 transition-all duration-200 overflow-hidden ${
                    isLockedTarget && phase === 'error'
                      ? 'border-red-500 shadow-[0_0_35px_rgba(239,68,68,0.8)] bg-gradient-to-r from-red-950/90 via-red-900/80 to-red-950/90 animate-shake'
                      : config.border
                  } ${
                    isLockedTarget && phase !== 'error'
                      ? `${config.activeGlow} ring-offset-2 ring-offset-black bg-gradient-to-r ${config.baseBg}`
                      : isCurrentBouncing
                      ? `${config.glow} brightness-125 bg-gradient-to-r ${config.baseBg}`
                      : isAlreadyRevealed
                      ? `opacity-75 bg-gradient-to-r ${config.baseBg}`
                      : 'bg-black/70 backdrop-blur-md hover:bg-black/60'
                  }`}
                  style={{
                    boxShadow: isLockedTarget && phase === 'error'
                      ? '0 12px 30px rgba(0,0,0,0.9), 0 0 50px rgba(239,68,68,0.8)'
                      : isLockedTarget
                      ? '0 12px 30px rgba(0,0,0,0.8), 0 0 45px rgba(255,255,255,0.6)'
                      : isCurrentBouncing
                      ? '0 8px 24px rgba(0,0,0,0.7), 0 0 30px rgba(255,255,255,0.4)'
                      : '0 4px 12px rgba(0,0,0,0.5)',
                  }}
                >
                  {/* LUCE DI SCANSIONE RADENTE SUL GRADINO QUANDO ATTIVO */}
                  {(isCurrentBouncing || isLockedTarget) && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12 animate-pulse pointer-events-none" />
                  )}

                  {/* PARTE SINISTRA: BADGE NUMERICO 3D */}
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-7 h-7 md:w-9 md:h-9 rounded-lg flex items-center justify-center font-black text-sm md:text-lg border shadow-inner transition-transform ${
                        isLockedTarget || isCurrentBouncing
                          ? 'scale-110 shadow-[0_0_15px_rgba(255,255,255,0.8)]'
                          : ''
                      } ${isLockedTarget && phase === 'error' ? 'bg-red-600 text-white border-red-400' : config.badgeBg}`}
                    >
                      {stepNum}
                    </div>

                    {/* INDICATORE DELLA SQUADRA ASSEGNATA SUL GRADINO SE GIÀ NOTA */}
                    {isAlreadyRevealed && (
                      <span className="hidden sm:inline-block text-[9px] uppercase font-black px-2 py-0.5 rounded bg-black/40 text-white/70 border border-white/10">
                        Svelato
                      </span>
                    )}
                  </div>

                  {/* PARTE CENTRALE: TESTO RISPOSTA / PLACEHOLDER MISTERIOSO */}
                  <div className="flex-1 mx-4 text-center">
                    {isLockedTarget && phase === 'error' ? (
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-xl md:text-2xl animate-bounce">❌</span>
                        <span className="font-black text-sm md:text-xl lg:text-2xl uppercase tracking-wider text-red-400 drop-shadow-[0_2px_12px_rgba(239,68,68,0.8)]">
                          RISPOSTA ERRATA
                        </span>
                      </div>
                    ) : isLockedTarget && phase === 'revealed' ? (
                      <div className="flex items-center justify-center gap-3 animate-zoom-in">
                        {/* Se classifica musicale, mostra eventuale icona dello strumento */}
                        {activeSuspense.clueIcon && (
                          <div className="w-8 h-8 rounded-full bg-black/50 p-1 border border-white/30 flex items-center justify-center">
                            <img
                              src={assetUrl(activeSuspense.clueIcon)}
                              alt="Strumento"
                              className="w-full h-full object-contain filter invert"
                            />
                          </div>
                        )}

                        <span className={`font-black text-sm md:text-xl lg:text-2xl uppercase tracking-wider drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] ${config.textClass}`}>
                          {activeSuspense.clueText || itemText}
                        </span>
                      </div>
                    ) : isLockedTarget && phase === 'locked' ? (
                      <div className="flex items-center justify-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-white animate-ping" />
                        <span className="font-black text-sm md:text-lg uppercase tracking-widest text-white/90 animate-pulse">
                          VERIFICA IN CORSO...
                        </span>
                      </div>
                    ) : isAlreadyRevealed ? (
                      <span className={`font-extrabold text-xs md:text-base uppercase tracking-tight opacity-90 ${config.textClass}`}>
                        {itemText}
                      </span>
                    ) : (
                      <div className="flex items-center justify-center gap-2 opacity-50">
                        <span className="text-white/40 font-mono tracking-[0.3em] text-xs md:text-sm">
                          — • • • • —
                        </span>
                      </div>
                    )}
                  </div>

                  {/* PARTE DESTRA: PUNTEGGIO DEL GRADINO */}
                  <div className="flex items-center gap-2">
                    {isLockedTarget && phase === 'error' ? (
                      <div className="px-3 py-1 rounded-full bg-red-600/90 text-white font-black text-xs md:text-sm uppercase tracking-wider shadow-xl border border-red-400">
                        0 PT
                      </div>
                    ) : isLockedTarget && phase === 'revealed' ? (
                      <div className="px-3 py-1 rounded-full bg-white text-slate-950 font-black text-xs md:text-sm uppercase tracking-wider shadow-xl animate-bounce">
                        +{activeSuspense.points} PT
                      </div>
                    ) : (
                      <span className="text-[10px] md:text-xs font-bold text-white/60 tracking-wider">
                        {stepNum <= (totalClues === 10 ? 5 : 4) ? '1.000' : stepNum <= (totalClues === 10 ? 8 : 6) ? '2.000' : '3.000'} PT
                      </span>
                    )}
                  </div>
                </div>

                {/* ALZATA FRONTALE 3D DEL GRADINO (Riser tridimensionale) */}
                <div 
                  className={`w-full h-1.5 md:h-2 rounded-b-lg border-x border-b border-black/40 ${config.riserBg}`}
                  style={{
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.6)',
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* FOOTER: STATO E ISTRUZIONI DI SUPPORTO PER IL RELATORE */}
      <footer className="relative z-10 w-full max-w-4xl flex items-center justify-between px-6 py-2 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 text-white/60 text-[11px] font-semibold">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full animate-pulse ${phase === 'error' ? 'bg-red-500' : 'bg-amber-400'}`} />
          <span>
            {phase === 'error'
              ? '❌ RISPOSTA ERRATA! NESSUN PUNTO ASSEGNATO'
              : phase === 'revealed'
              ? 'RISPOSTA ESATTA! ASSEGNAZIONE PUNTEGGIO...'
              : 'SCANSIONE SUSPENCE IN CORSO SUI CRISTALLI...'}
          </span>
        </div>

        <div className="flex items-center gap-2 text-white/40 text-[10px] uppercase tracking-wider">
          <span>Premi [INVIO] o [SPAZIO] per rivelare subito</span>
        </div>
      </footer>
    </div>
  );
};

export default ClassificaStaircaseSuspenseOverlay;
