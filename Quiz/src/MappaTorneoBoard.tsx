import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useGameData, GameDataProvider } from './context/GameDataContext';
import { useSyncedState } from './hooks/useSyncedState';
import VideoBoard from './VideoBoard';
import { assetUrl } from './lib/assetUrl';

export interface MappaTorneoData {
  boxNum?: number;
  videoUrl?: string;
  src?: string;
  titolo?: string;
  sottotitolo?: string;
  slideId?: string;
  notePresentatore?: string;
}

interface MappaTorneoBoardProps {
  interactive?: boolean;
  revealAll?: boolean;
}

interface ZoneInfo {
  id: number;
  x: number; // percentage in 1920 width
  y: number; // percentage in 1080 height
  title: string;
  boxLabel: string;
  phaseNumber: number;
  phaseLabel: string;
  subtitle: string;
  description: string;
  badgeEmoji: string;
  accentColor: string;
  bgGradient: string;
}

const ZONES: ZoneInfo[] = [
  {
    id: 1,
    x: 22,
    y: 62,
    boxLabel: 'BOX 1',
    title: 'IL MIO NOME È NESSUNO',
    phaseNumber: 1,
    phaseLabel: 'FASE 1: I PRODROMI DELLO SCONTRO',
    subtitle: 'Musica & Immagini',
    description: 'Ascolta i 5 frammenti strumentali o scopri la griglia a tasselli per indovinare il personaggio misterioso.',
    badgeEmoji: '🎵',
    accentColor: '#f59e0b',
    bgGradient: 'from-amber-500 to-orange-600',
  },
  {
    id: 2,
    x: 33,
    y: 30,
    boxLabel: 'BOX 2',
    title: 'CLASSIFICHE',
    phaseNumber: 1,
    phaseLabel: 'FASE 1: I PRODROMI DELLO SCONTRO',
    subtitle: 'Classifica & Classifica Musicale',
    description: 'Rivelazione progressiva di 10 indizi e scomposizione di 7 tracce audio per comporre il brano perfetto.',
    badgeEmoji: '📊',
    accentColor: '#3b82f6',
    bgGradient: 'from-blue-500 to-indigo-600',
  },
  {
    id: 3,
    x: 48,
    y: 74,
    boxLabel: 'BOX 3',
    title: 'PASSWORD & BUSSOLOTTI',
    phaseNumber: 2,
    phaseLabel: 'FASE 2: LA CORSA AGLI EQUIPAGGIAMENTI',
    subtitle: 'Sfida a Squadre & Bussolotti',
    description: 'Conquista le parole della griglia a turni e tenta la fortuna con i Bussolotti per accumulare bonus preziosi.',
    badgeEmoji: '🗝️',
    accentColor: '#10b981',
    bgGradient: 'from-emerald-500 to-teal-600',
  },
  {
    id: 4,
    x: 67,
    y: 32,
    boxLabel: 'BOX 4',
    title: 'FRASE A TEMPO',
    phaseNumber: 2,
    phaseLabel: 'FASE 2: LA CORSA AGLI EQUIPAGGIAMENTI',
    subtitle: 'Corsa contro il Cronometro',
    description: 'Il tempo stringe! Indovina la frase nascosta entro 30 secondi per guadagnare punti decrescenti.',
    badgeEmoji: '⏱️',
    accentColor: '#8b5cf6',
    bgGradient: 'from-purple-500 to-violet-600',
  },
  {
    id: 5,
    x: 78,
    y: 62,
    boxLabel: 'BOX 5',
    title: 'TERMOPILI — SCONTRO FINALE',
    phaseNumber: 3,
    phaseLabel: 'FASE FINALE: TERMOPILI',
    subtitle: 'La Resa dei Conti tra Prescelti',
    description: 'Scontro finale! Le squadre schierano 6, 5, 4 o 3 prescelti in base al delta punti per decretare il vincitore.',
    badgeEmoji: '⚔️',
    accentColor: '#ef4444',
    bgGradient: 'from-rose-500 to-red-700',
  },
];

export default function MappaTorneoBoard({ interactive = true, revealAll = false }: MappaTorneoBoardProps) {
  const data = useGameData<MappaTorneoData>();
  const activeBox = data?.boxNum && data.boxNum >= 1 && data.boxNum <= 5 ? data.boxNum : 1;
  const slideId = data?.slideId || `box${activeBox}_mappa_spiegazione`;
  const rawVideoUrl = data?.videoUrl || data?.src || '';
  const hasVideo = Boolean(rawVideoUrl);

  // Sincronizzazione dello zoom cinematico tra finestre (Relatore <-> Schermo Pubblico <-> iPad)
  const [isZoomed, setIsZoomed] = useSyncedState<boolean>(`playstate_${slideId}_is_zoomed`, false);
  const [showVideoOverlay, setShowVideoOverlay] = useState<boolean>(isZoomed);
  const zoomTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Trova la zona corrente attiva
  const targetZone = useMemo(() => {
    return ZONES.find((z) => z.id === activeBox) || ZONES[0];
  }, [activeBox]);

  // Gestione del timing per dissolvenza video durante lo zoom
  useEffect(() => {
    if (isZoomed) {
      if (zoomTimerRef.current) clearTimeout(zoomTimerRef.current);
      zoomTimerRef.current = setTimeout(() => {
        setShowVideoOverlay(true);
      }, 700);
    } else {
      setShowVideoOverlay(false);
      if (zoomTimerRef.current) clearTimeout(zoomTimerRef.current);
    }
    return () => {
      if (zoomTimerRef.current) clearTimeout(zoomTimerRef.current);
    };
  }, [isZoomed]);

  const handleToggleZoom = useCallback(() => {
    setIsZoomed(!isZoomed);
  }, [isZoomed, setIsZoomed]);

  const handleReturnToMap = useCallback(() => {
    setIsZoomed(false);
  }, [setIsZoomed]);

  // Gestione scorciatoie tastiera globali
  useEffect(() => {
    if (!interactive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      if (e.key === 'Enter' || e.key === ' ' || e.key === 'v' || e.key === 'V') {
        e.preventDefault();
        handleToggleZoom();
      } else if (e.key === 'm' || e.key === 'M' || e.key === 'Escape') {
        if (isZoomed) {
          e.preventDefault();
          handleReturnToMap();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [interactive, isZoomed, handleToggleZoom, handleReturnToMap]);

  return (
    <div className="relative w-[1920px] h-[1080px] bg-[#07090e] text-white overflow-hidden font-sans select-none">
      {/* STILI ANIMAZIONI E KEYFRAMES CUSTOM */}
      <style>{`
        @keyframes floatToken {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-16px); }
        }
        @keyframes cloudDriftSlow {
          0% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(15px, -8px) scale(1.03); }
          100% { transform: translate(0, 0) scale(1); }
        }
        @keyframes pulseRing {
          0% { transform: scale(0.65); opacity: 0.9; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes magicAuraGlow {
          0%, 100% { filter: drop-shadow(0 0 25px rgba(245, 158, 11, 0.7)) drop-shadow(0 0 60px rgba(168, 85, 247, 0.5)); transform: scale(1); }
          50% { filter: drop-shadow(0 0 45px rgba(245, 158, 11, 0.95)) drop-shadow(0 0 90px rgba(168, 85, 247, 0.75)); transform: scale(1.05); }
        }
        @keyframes dashTrail {
          from { stroke-dashoffset: 60; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes unlockFlash {
          0% { opacity: 0.9; transform: scale(0.5); }
          50% { opacity: 1; transform: scale(1.25); }
          100% { opacity: 0; transform: scale(2); }
        }
        .animate-token {
          animation: floatToken 2.8s ease-in-out infinite;
        }
        .animate-aura {
          animation: magicAuraGlow 3.5s ease-in-out infinite;
        }
        .animate-pulse-ring {
          animation: pulseRing 2s cubic-bezier(0.2, 0.8, 0.2, 1) infinite;
        }
        .animate-path-dash {
          animation: dashTrail 1.8s linear infinite;
        }
      `}</style>

      {/* CONTENITORE MAPPA ISOLA CON ZOOM DINAMICO */}
      <div
        className="absolute inset-0 w-full h-full origin-center"
        style={{
          transformOrigin: isZoomed ? `${targetZone.x}% ${targetZone.y}%` : '50% 50%',
          transform: isZoomed ? 'scale(2.75)' : 'scale(1)',
          transition: 'transform 1.25s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        {/* SFONDO ISOLA ISOMETRICA 3D */}
        <img
          src={assetUrl('/Mappa/imperio_island_map.jpg')}
          alt="Mappa Isola Imperio VIII"
          className="w-full h-full object-cover pointer-events-none"
        />

        {/* EFFETTO ILLUMINAZIONE AMBIENTALE */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/35 pointer-events-none" />

        {/* SENTIERO CURVO TRA LE 5 ZONE (SVG) */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-10"
          viewBox="0 0 1920 1080"
          fill="none"
        >
          <defs>
            <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="50%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
            <filter id="glowEffect" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* S1: Zona 1 -> Zona 2 */}
          <path
            d="M 422 670 C 460 520, 560 410, 634 324"
            stroke={activeBox >= 2 ? '#fbbf24' : 'rgba(255,255,255,0.25)'}
            strokeWidth={activeBox >= 2 ? '7' : '4'}
            strokeDasharray={activeBox >= 2 ? '14 10' : '6 8'}
            strokeLinecap="round"
            className={activeBox >= 2 ? 'animate-path-dash' : ''}
            filter={activeBox >= 2 ? 'url(#glowEffect)' : undefined}
          />

          {/* S2: Zona 2 -> Zona 3 (curva attorno alla lampada verso sud) */}
          <path
            d="M 634 324 C 690 480, 770 730, 922 799"
            stroke={activeBox >= 3 ? '#fbbf24' : 'rgba(255,255,255,0.25)'}
            strokeWidth={activeBox >= 3 ? '7' : '4'}
            strokeDasharray={activeBox >= 3 ? '14 10' : '6 8'}
            strokeLinecap="round"
            className={activeBox >= 3 ? 'animate-path-dash' : ''}
            filter={activeBox >= 3 ? 'url(#glowEffect)' : undefined}
          />

          {/* S3: Zona 3 -> Zona 4 (risale verso nord-est) */}
          <path
            d="M 922 799 C 1070 760, 1180 500, 1286 346"
            stroke={activeBox >= 4 ? '#fbbf24' : 'rgba(255,255,255,0.25)'}
            strokeWidth={activeBox >= 4 ? '7' : '4'}
            strokeDasharray={activeBox >= 4 ? '14 10' : '6 8'}
            strokeLinecap="round"
            className={activeBox >= 4 ? 'animate-path-dash' : ''}
            filter={activeBox >= 4 ? 'url(#glowEffect)' : undefined}
          />

          {/* S4: Zona 4 -> Zona 5 (scende all'arena Termopili) */}
          <path
            d="M 1286 346 C 1370 440, 1450 560, 1498 670"
            stroke={activeBox >= 5 ? '#fbbf24' : 'rgba(255,255,255,0.25)'}
            strokeWidth={activeBox >= 5 ? '7' : '4'}
            strokeDasharray={activeBox >= 5 ? '14 10' : '6 8'}
            strokeLinecap="round"
            className={activeBox >= 5 ? 'animate-path-dash' : ''}
            filter={activeBox >= 5 ? 'url(#glowEffect)' : undefined}
          />
        </svg>

        {/* ELEMENTO CENTRALE: LAMPADA MAGICA DI ALADINO (MILLE E UNA NADIA) */}
        <div
          className="absolute z-20 pointer-events-none transform -translate-x-1/2 -translate-y-1/2"
          style={{ left: '50%', top: '44%' }}
        >
          {/* Alone mistico pulsante viola & dorato */}
          <div className="absolute -inset-14 rounded-full bg-gradient-to-r from-amber-500/30 via-purple-600/35 to-amber-400/30 blur-2xl animate-aura pointer-events-none" />

          {/* Badge fluttuante decorativo */}
          <div className="relative flex flex-col items-center">
            <div className="px-4 py-1.5 rounded-full bg-gradient-to-r from-purple-950/90 via-slate-900/90 to-amber-950/90 border border-amber-400/70 shadow-2xl backdrop-blur-md flex items-center gap-2">
              <span className="text-xl">🪔</span>
              <div className="flex flex-col items-center">
                <span className="text-[11px] font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 uppercase">
                  Mille e una Nadia
                </span>
                <span className="text-[9px] font-semibold text-purple-200/80 -mt-0.5 tracking-wider">
                  Sfida della Lampada
                </span>
              </div>
              <span className="text-amber-400 text-xs animate-pulse">✨</span>
            </div>
          </div>
        </div>

        {/* RENDERING DELLE 5 ZONE CON FOG-OF-WAR E PIN */}
        {ZONES.map((zone) => {
          const isCompleted = zone.id < activeBox;
          const isCurrent = zone.id === activeBox;
          const isLocked = zone.id > activeBox;

          return (
            <div
              key={zone.id}
              className="absolute z-20 transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
              style={{ left: `${zone.x}%`, top: `${zone.y}%` }}
            >
              {/* NEBBIA DI GUERRA / NUVOLE PER ZONE FUTURE (LOCKED) */}
              {isLocked && (
                <div className="absolute -inset-24 flex items-center justify-center pointer-events-none">
                  {/* Nuvola stilizzata con sfumature radiali */}
                  <div
                    className="w-56 h-40 rounded-full bg-slate-900/85 backdrop-blur-md border border-white/10 shadow-2xl flex flex-col items-center justify-center p-4 transition-all duration-700"
                    style={{
                      boxShadow: '0 0 45px rgba(15, 23, 42, 0.95)',
                      animation: 'cloudDriftSlow 7s ease-in-out infinite',
                    }}
                  >
                    <div className="w-12 h-12 rounded-full bg-slate-800/90 border border-white/20 flex items-center justify-center shadow-inner mb-1">
                      <span className="text-2xl opacity-75">🔒</span>
                    </div>
                    <span className="text-[11px] font-black tracking-wider text-slate-300 uppercase">
                      Area Bloccata
                    </span>
                    <span className="text-[9px] font-bold text-slate-400">
                      {zone.boxLabel}
                    </span>
                  </div>
                </div>
              )}

              {/* ONDE RADAR & EFFETTO DI SBLOCCO SULLA ZONA CORRENTE */}
              {isCurrent && (
                <>
                  <div className="absolute -inset-10 rounded-full border-2 border-amber-400/80 animate-pulse-ring pointer-events-none" />
                  <div
                    className="absolute -inset-16 rounded-full border border-yellow-300/40 animate-pulse-ring pointer-events-none"
                    style={{ animationDelay: '0.8s' }}
                  />
                  <div className="absolute -inset-8 rounded-full bg-amber-400/25 blur-xl pointer-events-none animate-pulse" />
                </>
              )}

              {/* ZONA COMPLETATA (COMPLETED CHECKMARK) */}
              {isCompleted && (
                <div className="flex flex-col items-center group cursor-pointer">
                  <div className="w-11 h-11 rounded-full bg-emerald-700/90 border-2 border-emerald-400 text-white flex items-center justify-center font-black shadow-lg backdrop-blur-sm transition-transform hover:scale-110">
                    <span className="text-lg">✓</span>
                  </div>
                  <div className="mt-1 px-2.5 py-0.5 rounded-full bg-slate-950/85 border border-emerald-500/50 backdrop-blur-sm text-[10px] font-bold text-emerald-300 tracking-wider">
                    {zone.boxLabel}
                  </div>
                </div>
              )}

              {/* ZONA ATTIVA (PIN + BADGE SBLOCCO) */}
              {isCurrent && (
                <div className="flex flex-col items-center">
                  {/* Pin checkpoint 3D */}
                  <div
                    className="relative w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-300 p-0.5 shadow-2xl flex items-center justify-center cursor-pointer transition-transform hover:scale-110 active:scale-95"
                    style={{
                      boxShadow: '0 0 35px rgba(245, 158, 11, 0.8), 0 8px 16px rgba(0,0,0,0.5)',
                    }}
                    onClick={interactive ? handleToggleZoom : undefined}
                    title="Clicca per avviare il video spiegazione"
                  >
                    <div className="w-full h-full rounded-2xl bg-slate-950/85 flex flex-col items-center justify-center">
                      <span className="text-xs font-black text-amber-300 tracking-wider leading-none">
                        {zone.boxLabel}
                      </span>
                      <span className="text-base leading-none mt-0.5">{zone.badgeEmoji}</span>
                    </div>
                  </div>

                  {/* Badge Nome Gioco e Sblocco sotto il Pin */}
                  <div className="mt-2 flex flex-col items-center pointer-events-none">
                    <div className="px-3.5 py-1 rounded-xl bg-slate-950/90 border border-amber-400/80 shadow-2xl backdrop-blur-md flex items-center gap-1.5">
                      <span className="text-amber-400 text-xs animate-bounce">✨</span>
                      <span className="text-[11px] font-black text-white tracking-wide uppercase whitespace-nowrap">
                        {zone.title}
                      </span>
                    </div>
                    <div className="mt-0.5 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-[9px] font-black text-amber-300 tracking-wider uppercase">
                      Nuova Area Sbloccata!
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* SEGNALINO DEL GIOCATORE ("OMINO / TOKEN 3D") SULLA ZONA CORRENTE */}
        <div
          className="absolute z-30 pointer-events-none transform -translate-x-1/2 -translate-y-full transition-all duration-1000 ease-out"
          style={{
            left: `${targetZone.x}%`,
            top: `${targetZone.y - 1}%`,
          }}
        >
          {/* Ombra 3D a terra e anello di base */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-24 h-8 bg-black/60 rounded-full blur-md" />
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-16 h-5 rounded-full border-2 border-amber-400/80 shadow-[0_0_15px_rgba(245,158,11,0.8)]" />

          {/* Omino fluttuante */}
          <div className="relative flex flex-col items-center animate-token">
            {/* Targhetta "TU SEI QUI" */}
            <div className="mb-1 px-3 py-0.5 rounded-full bg-gradient-to-r from-red-600 via-amber-500 to-red-600 border border-white/60 shadow-xl flex items-center gap-1">
              <span className="text-[9px] font-black tracking-widest text-white uppercase drop-shadow">
                📍 Tu Sei Qui
              </span>
            </div>

            {/* Immagine 3D del personaggio token */}
            <img
              src={assetUrl('/Mappa/player_token.png')}
              alt="Segnalino Giocatore"
              className="w-24 h-32 object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.8)]"
            />
          </div>
        </div>
      </div>

      {/* =========================================================================
          HUD SUPERIORE (INTESTAZIONE GENERALE & INFORMAZIONI FASE / BOX)
          ========================================================================= */}
      <div className={`absolute top-0 inset-x-0 z-40 p-6 flex items-start justify-between pointer-events-none transition-opacity duration-500 ${isZoomed ? 'opacity-0' : 'opacity-100'}`}>
        {/* Titolo Principale a Sinistra */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-red-600 p-0.5 shadow-2xl flex items-center justify-center">
            <div className="w-full h-full rounded-2xl bg-slate-950/90 flex items-center justify-center font-serif text-amber-400 font-black text-2xl tracking-tighter">
              VIII
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black tracking-wider text-white uppercase drop-shadow">
                Imperio VIII
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 border border-amber-400/40 text-amber-300 font-bold uppercase tracking-wider">
                Mappa dell'Isola
              </span>
            </div>
            <div className="text-xs font-semibold text-white/60 tracking-wide mt-0.5">
              Il Viaggio attraverso le 3 Fasi del Torneo
            </div>
          </div>
        </div>

        {/* Scheda Fase e Box Attivo al Centro / Destra */}
        <div className="flex items-center gap-3">
          {/* Indicatore Fasi (1, 2, 3) */}
          <div className="px-4 py-2 rounded-2xl bg-slate-950/80 border border-white/10 shadow-2xl backdrop-blur-md flex items-center gap-3">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">
                {targetZone.phaseLabel}
              </span>
              <span className="text-sm font-black text-white uppercase tracking-wide">
                {targetZone.title}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-xl shadow-lg">
              {targetZone.badgeEmoji}
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          HUD INFERIORE (DESCRIZIONE GIOCO & PULSANTE AVVIO VIDEO SPIEGAZIONE)
          ========================================================================= */}
      <div className={`absolute bottom-0 inset-x-0 z-40 p-6 flex items-end justify-between pointer-events-auto transition-opacity duration-500 ${isZoomed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        {/* Card Dettagli Regole del Gioco */}
        <div className="max-w-xl p-5 rounded-2xl bg-slate-950/85 border border-amber-500/30 shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-[11px] font-black text-amber-300 uppercase tracking-wider">
              {targetZone.boxLabel}
            </span>
            <span className="text-xs font-bold text-white/50 uppercase tracking-wider">
              {targetZone.subtitle}
            </span>
          </div>
          <p className="text-sm font-medium text-slate-200 leading-relaxed">
            {targetZone.description}
          </p>
        </div>

        {/* Pulsante Call-to-Action per Avviare il Video della Spiegazione */}
        <div className="flex flex-col items-end gap-2">
          {interactive && (
            <button
              type="button"
              onClick={handleToggleZoom}
              className="group relative px-8 py-4 rounded-2xl bg-gradient-to-r from-[#d24726] via-amber-500 to-[#d24726] bg-[length:200%_auto] hover:bg-right transition-all duration-500 text-white font-black text-base tracking-wider uppercase shadow-[0_0_35px_rgba(210,71,38,0.7)] flex items-center gap-3 cursor-pointer hover:scale-105 active:scale-95"
            >
              <span className="text-xl group-hover:scale-125 transition-transform duration-300">🎬</span>
              <span>Avvia Video Spiegazione ▶</span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-black/30 border border-white/20 text-amber-200">
                INVIO
              </span>
            </button>
          )}
          <span className="text-[11px] font-semibold text-white/50 tracking-wider">
            Premi INVIO o Spazio per avviare la spiegazione
          </span>
        </div>
      </div>

      {/* =========================================================================
          MODALITA VIDEO SPIEGAZIONE A SCHERMO INTERO (DOPO LA TRANSIZIONE DI ZOOM)
          ========================================================================= */}
      {showVideoOverlay && (
        <div className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center animate-fade-in">
          {hasVideo ? (
            <div className="relative w-full h-full flex items-center justify-center">
              {/* Istanza di VideoBoard isolata per il video spiegazione del Box corrente */}
              <GameDataProvider
                data={{
                  src: rawVideoUrl,
                  videoUrl: rawVideoUrl,
                  titolo: `VIDEO SPIEGAZIONE — ${targetZone.boxLabel}: ${targetZone.title}`,
                  sottotitolo: targetZone.subtitle,
                  slideId,
                  notePresentatore: data?.notePresentatore || '',
                }}
              >
                <VideoBoard interactive={interactive} revealAll={revealAll} />
              </GameDataProvider>

              {/* Pulsante per Tornare alla Mappa in Alto a Destra */}
              {interactive && (
                <button
                  type="button"
                  onClick={handleReturnToMap}
                  className="absolute top-6 right-6 z-50 px-5 py-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-white/20 text-white font-bold text-xs tracking-wider uppercase shadow-2xl backdrop-blur-md flex items-center gap-2 cursor-pointer transition-all hover:scale-105"
                  title="Torna alla Mappa dell'Isola (M o ESC)"
                >
                  <span>🗺️ Torna alla Mappa</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 font-mono text-amber-300">
                    M
                  </span>
                </button>
              )}
            </div>
          ) : (
            /* Nessun video caricato per questo box */
            <div className="max-w-xl p-8 rounded-3xl bg-slate-900/95 border border-white/15 shadow-2xl text-center flex flex-col items-center">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-400 flex items-center justify-center text-3xl mb-4">
                🎬
              </div>
              <h2 className="text-xl font-black text-white uppercase tracking-wider mb-2">
                Nessun Video Caricato
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed mb-6">
                Non è stato ancora caricato alcun video di spiegazione per{' '}
                <strong className="text-amber-300">{targetZone.boxLabel} — {targetZone.title}</strong>.<br />
                Puoi caricarlo dalla schermata <em>Setup Quiz</em>, oppure tornare alla mappa.
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleReturnToMap}
                  className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                >
                  🗺️ Torna alla Mappa
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
