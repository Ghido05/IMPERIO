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
  phaseLabel: string;
  phaseNumber: number;
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

// Grande banco denso e volumetrico di nuvole realistiche che copre l'intera sezione dell'isola
function HeavyCloudBlanket() {
  return (
    <div className="relative w-[650px] h-[450px] pointer-events-none select-none flex items-center justify-center">
      {/* 1. Strato di nebbia diffusa a terra che oscura completamente i dettagli del terreno */}
      <div className="absolute inset-4 rounded-full bg-slate-950/90 blur-3xl" />
      <div className="absolute inset-10 rounded-full bg-blue-950/70 blur-2xl" />
      <div className="absolute -inset-2 rounded-full bg-slate-900/60 blur-xl" />

      {/* 2. SVG Volumetrico con densi cumuli di nuvole 3D e ombre morbide */}
      <svg
        viewBox="0 0 550 380"
        className="w-full h-full drop-shadow-[0_25px_40px_rgba(0,0,0,0.85)] relative z-10"
        fill="none"
      >
        <defs>
          <radialGradient id="heavyCloudGrad1" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="45%" stopColor="#f1f5f9" />
            <stop offset="75%" stopColor="#cbd5e1" />
            <stop offset="100%" stopColor="#94a3b8" />
          </radialGradient>
          <radialGradient id="heavyCloudGradDark" cx="50%" cy="45%" r="65%">
            <stop offset="0%" stopColor="#e2e8f0" />
            <stop offset="60%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#64748b" />
          </radialGradient>
          <filter id="cloudSoftBlur" x="-15%" y="-15%" width="130%" height="130%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g filter="url(#cloudSoftBlur)">
          {/* Base posteriore più scura per dare profondità volumetrica */}
          <circle cx="150" cy="220" r="95" fill="url(#heavyCloudGradDark)" />
          <circle cx="270" cy="240" r="105" fill="url(#heavyCloudGradDark)" />
          <circle cx="390" cy="220" r="95" fill="url(#heavyCloudGradDark)" />
          <circle cx="470" cy="180" r="75" fill="url(#heavyCloudGradDark)" />
          <circle cx="80" cy="190" r="75" fill="url(#heavyCloudGradDark)" />

          {/* Livello centrale denso e corposo */}
          <circle cx="160" cy="170" r="95" fill="url(#heavyCloudGrad1)" />
          <circle cx="260" cy="150" r="115" fill="url(#heavyCloudGrad1)" />
          <circle cx="360" cy="160" r="105" fill="url(#heavyCloudGrad1)" />
          <circle cx="440" cy="180" r="80" fill="url(#heavyCloudGrad1)" />
          <circle cx="95" cy="185" r="75" fill="url(#heavyCloudGrad1)" />

          {/* Cumuli superiori candidi ed esposti alla luce */}
          <circle cx="210" cy="100" r="85" fill="url(#heavyCloudGrad1)" />
          <circle cx="310" cy="95" r="90" fill="url(#heavyCloudGrad1)" />
          <circle cx="390" cy="120" r="70" fill="url(#heavyCloudGrad1)" />
          <circle cx="130" cy="125" r="70" fill="url(#heavyCloudGrad1)" />

          {/* Sfere di riflesso puro */}
          <circle cx="215" cy="85" r="55" fill="#ffffff" fillOpacity="0.8" />
          <circle cx="310" cy="80" r="60" fill="#ffffff" fillOpacity="0.85" />
          <circle cx="260" cy="130" r="70" fill="#ffffff" fillOpacity="0.65" />
          <circle cx="360" cy="140" r="55" fill="#ffffff" fillOpacity="0.6" />
        </g>
      </svg>
    </div>
  );
}

export default function MappaTorneoBoard({ interactive = true, revealAll = false }: MappaTorneoBoardProps) {
  const data = useGameData<MappaTorneoData>();
  const activeBox = data?.boxNum && data.boxNum >= 1 && data.boxNum <= 5 ? data.boxNum : 1;
  const slideId = data?.slideId || `box${activeBox}_mappa_spiegazione`;
  const rawVideoUrl = data?.videoUrl || data?.src || '';
  const hasVideo = Boolean(rawVideoUrl);

  // Nomi squadre sincronizzati dal setup
  const [teamNames, setTeamNames] = useState<string[]>(() => {
    const saved = localStorage.getItem('imperio_quiz_setup_config_v1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed?.punteggi?.nomiSquadre)) {
          return parsed.punteggi.nomiSquadre;
        }
      } catch {}
    }
    return ['SQUADRA 1', 'SQUADRA 2', 'SQUADRA 3'];
  });

  useEffect(() => {
    const loadNames = () => {
      const saved = localStorage.getItem('imperio_quiz_setup_config_v1');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed?.punteggi?.nomiSquadre)) {
            setTeamNames(parsed.punteggi.nomiSquadre);
          }
        } catch {}
      }
    };
    window.addEventListener('storage', loadNames);
    window.addEventListener('local-storage-update', loadNames);
    return () => {
      window.removeEventListener('storage', loadNames);
      window.removeEventListener('local-storage-update', loadNames);
    };
  }, []);

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
        @keyframes floatTokenTeam1 {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-13px); }
        }
        @keyframes floatTokenTeam2 {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-17px); }
        }
        @keyframes floatTokenTeam3 {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-13px); }
        }
        @keyframes cloudDriftSlow {
          0% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(14px, -8px) scale(1.02); }
          100% { transform: translate(0, 0) scale(1); }
        }
        @keyframes pulseRing {
          0% { transform: scale(0.65); opacity: 0.95; }
          100% { transform: scale(2.3); opacity: 0; }
        }
        @keyframes magicAuraGlow {
          0%, 100% { filter: drop-shadow(0 0 25px rgba(245, 158, 11, 0.75)) drop-shadow(0 0 60px rgba(168, 85, 247, 0.55)); transform: scale(1); }
          50% { filter: drop-shadow(0 0 45px rgba(245, 158, 11, 0.95)) drop-shadow(0 0 90px rgba(168, 85, 247, 0.8)); transform: scale(1.05); }
        }
        @keyframes dashTrail {
          from { stroke-dashoffset: 60; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes questionPulse {
          0%, 100% { transform: scale(1) translateY(0); filter: drop-shadow(0 0 15px rgba(245, 158, 11, 0.7)); }
          50% { transform: scale(1.08) translateY(-8px); filter: drop-shadow(0 0 30px rgba(245, 158, 11, 0.95)); }
        }

        .animate-team-red {
          animation: floatTokenTeam1 2.6s ease-in-out infinite;
        }
        .animate-team-blue {
          animation: floatTokenTeam2 2.9s ease-in-out infinite 0.35s;
        }
        .animate-team-green {
          animation: floatTokenTeam3 2.7s ease-in-out infinite 0.7s;
        }
        .animate-aura {
          animation: magicAuraGlow 3.5s ease-in-out infinite;
        }
        .animate-pulse-ring {
          animation: pulseRing 2.2s cubic-bezier(0.2, 0.8, 0.2, 1) infinite;
        }
        .animate-path-dash {
          animation: dashTrail 1.8s linear infinite;
        }
        .animate-question-token {
          animation: questionPulse 2.5s ease-in-out infinite;
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
            stroke={activeBox >= 2 ? '#fbbf24' : 'rgba(255,255,255,0.22)'}
            strokeWidth={activeBox >= 2 ? '7' : '4'}
            strokeDasharray={activeBox >= 2 ? '14 10' : '6 8'}
            strokeLinecap="round"
            className={activeBox >= 2 ? 'animate-path-dash' : ''}
            filter={activeBox >= 2 ? 'url(#glowEffect)' : undefined}
          />

          {/* S2: Zona 2 -> Zona 3 (curva attorno alla lampada verso sud) */}
          <path
            d="M 634 324 C 690 480, 770 730, 922 799"
            stroke={activeBox >= 3 ? '#fbbf24' : 'rgba(255,255,255,0.22)'}
            strokeWidth={activeBox >= 3 ? '7' : '4'}
            strokeDasharray={activeBox >= 3 ? '14 10' : '6 8'}
            strokeLinecap="round"
            className={activeBox >= 3 ? 'animate-path-dash' : ''}
            filter={activeBox >= 3 ? 'url(#glowEffect)' : undefined}
          />

          {/* S3: Zona 3 -> Zona 4 (risale verso nord-est) */}
          <path
            d="M 922 799 C 1070 760, 1180 500, 1286 346"
            stroke={activeBox >= 4 ? '#fbbf24' : 'rgba(255,255,255,0.22)'}
            strokeWidth={activeBox >= 4 ? '7' : '4'}
            strokeDasharray={activeBox >= 4 ? '14 10' : '6 8'}
            strokeLinecap="round"
            className={activeBox >= 4 ? 'animate-path-dash' : ''}
            filter={activeBox >= 4 ? 'url(#glowEffect)' : undefined}
          />

          {/* S4: Zona 4 -> Zona 5 (scende all'arena Termopili) */}
          <path
            d="M 1286 346 C 1370 440, 1450 560, 1498 670"
            stroke={activeBox >= 5 ? '#fbbf24' : 'rgba(255,255,255,0.22)'}
            strokeWidth={activeBox >= 5 ? '7' : '4'}
            strokeDasharray={activeBox >= 5 ? '14 10' : '6 8'}
            strokeLinecap="round"
            className={activeBox >= 5 ? 'animate-path-dash' : ''}
            filter={activeBox >= 5 ? 'url(#glowEffect)' : undefined}
          />
        </svg>

        {/* ELEMENTO CENTRALE: LAMPADA MAGICA DI ALADINO (VISIBILE SENZA TESTO SPOILER) */}
        <div
          className="absolute z-20 pointer-events-none transform -translate-x-1/2 -translate-y-1/2"
          style={{ left: '50%', top: '44%' }}
        >
          {/* Alone mistico pulsante oro & viola */}
          <div className="absolute -inset-16 rounded-full bg-gradient-to-r from-amber-500/35 via-purple-600/40 to-amber-400/35 blur-2xl animate-aura pointer-events-none" />

          {/* Scintille magiche discrete intorno alla lampada (nessuna scritta) */}
          <div className="relative flex items-center justify-center pointer-events-none">
            <span className="text-amber-300 text-sm animate-ping absolute -top-4 -right-4">✨</span>
            <span className="text-purple-300 text-xs animate-pulse absolute -bottom-3 -left-3">✨</span>
          </div>
        </div>

        {/* RENDERING DELLE 5 ZONE */}
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
              {/* NEBBIA DI GUERRA / GRANDI NUVOLE DENSE SULLE ZONE NON ANCORA SCOPERTE */}
              {isLocked && (
                <div
                  className="absolute -inset-52 flex items-center justify-center pointer-events-none transition-all duration-1000"
                  style={{ animation: 'cloudDriftSlow 9s ease-in-out infinite' }}
                >
                  {/* Grande coltre di nuvole che copre l'intera porzione d'isola */}
                  <HeavyCloudBlanket />

                  {/* Medaglione Punto di Domanda ? in rilievo dorato 3D fluttuante */}
                  <div className="absolute z-30 flex flex-col items-center animate-question-token">
                    <div
                      className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-300 via-amber-500 to-amber-700 p-1 shadow-[0_12px_28px_rgba(0,0,0,0.85)] border border-amber-200/50 flex items-center justify-center"
                    >
                      <div className="w-full h-full rounded-xl bg-slate-950/90 border border-amber-400/40 flex items-center justify-center">
                        <span className="text-3xl font-black text-amber-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                          ?
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ONDE RADAR & EFFETTO SULLA ZONA CORRENTE */}
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

              {/* ZONA COMPLETATA (Solo numero + Checkmark verde, no "BOX") */}
              {isCompleted && (
                <div className="flex flex-col items-center group cursor-pointer">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-400 via-emerald-600 to-emerald-800 p-0.5 shadow-xl border border-emerald-300/40 flex items-center justify-center transition-transform hover:scale-110">
                    <div className="w-full h-full rounded-xl bg-slate-950/85 flex items-center justify-center">
                      <span className="text-lg font-black text-emerald-300">
                        {zone.id}
                      </span>
                    </div>
                  </div>
                  <div className="mt-1 px-2 py-0.5 rounded-full bg-emerald-600 border border-white/30 text-[10px] font-black text-white shadow">
                    ✓
                  </div>
                </div>
              )}

              {/* ZONA ATTIVA (Solo numero stilizzato in medaglione dorato 3D, no "BOX") */}
              {isCurrent && (
                <div className="flex flex-col items-center">
                  <div
                    className="relative w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-300 p-0.5 shadow-[0_0_35px_rgba(245,158,11,0.85),0_8px_16px_rgba(0,0,0,0.6)] flex items-center justify-center cursor-pointer transition-transform hover:scale-110 active:scale-95"
                    onClick={interactive ? handleToggleZoom : undefined}
                    title="Clicca per avviare il video spiegazione"
                  >
                    <div className="w-full h-full rounded-2xl bg-slate-950/85 flex flex-col items-center justify-center">
                      <span className="text-xl font-black text-amber-300 leading-none">
                        {zone.id}
                      </span>
                      <span className="text-xs leading-none mt-0.5">{zone.badgeEmoji}</span>
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

        {/* I 3 PERSONAGGI / SEGNALINI INSIEME SULLA ZONA CORRENTE (COLORI DELLE 3 SQUADRE) */}
        <div
          className="absolute z-30 pointer-events-none transform -translate-x-1/2 -translate-y-full transition-all duration-1000 ease-out"
          style={{
            left: `${targetZone.x}%`,
            top: `${targetZone.y - 1}%`,
          }}
        >
          {/* Ombra collettiva a terra */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-48 h-10 bg-black/75 rounded-full blur-md" />

          {/* Formazione a 3 dei Personaggi delle Squadre */}
          <div className="relative flex items-end justify-center w-56 h-40">
            {/* 1. SQUADRA 1 (ROSSO) - Sinistra */}
            <div className="absolute left-0 bottom-0 flex flex-col items-center z-10 animate-team-red">
              <div className="mb-1 px-2.5 py-0.5 rounded-full bg-red-600/90 border border-white/60 shadow-[0_2px_8px_rgba(0,0,0,0.8)] backdrop-blur-sm">
                <span className="text-[10px] font-black uppercase tracking-wider text-white">
                  {teamNames[0] || 'SQ 1'}
                </span>
              </div>
              <div className="w-12 h-3.5 rounded-full border border-red-500 bg-red-500/30 blur-[1px] -mb-2" />
              <img
                src={assetUrl('/Mappa/player_token_red.png')}
                alt="Squadra 1"
                className="w-20 h-28 object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.9)]"
              />
            </div>

            {/* 2. SQUADRA 2 (BLU) - Centro (Leggermente in avanti e più alto) */}
            <div className="absolute left-1/2 -translate-x-1/2 bottom-3 flex flex-col items-center z-20 animate-team-blue">
              <div className="mb-1 px-3 py-0.5 rounded-full bg-blue-600/90 border-2 border-white shadow-[0_3px_10px_rgba(0,0,0,0.9)] backdrop-blur-sm">
                <span className="text-[11px] font-black uppercase tracking-wider text-white">
                  {teamNames[1] || 'SQ 2'}
                </span>
              </div>
              <div className="w-14 h-4 rounded-full border border-blue-400 bg-blue-500/30 blur-[1px] -mb-2" />
              <img
                src={assetUrl('/Mappa/player_token_blue.png')}
                alt="Squadra 2"
                className="w-22 h-30 object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.95)]"
              />
            </div>

            {/* 3. SQUADRA 3 (VERDE) - Destra */}
            <div className="absolute right-0 bottom-0 flex flex-col items-center z-10 animate-team-green">
              <div className="mb-1 px-2.5 py-0.5 rounded-full bg-emerald-600/90 border border-white/60 shadow-[0_2px_8px_rgba(0,0,0,0.8)] backdrop-blur-sm">
                <span className="text-[10px] font-black uppercase tracking-wider text-white">
                  {teamNames[2] || 'SQ 3'}
                </span>
              </div>
              <div className="w-12 h-3.5 rounded-full border border-emerald-500 bg-emerald-500/30 blur-[1px] -mb-2" />
              <img
                src={assetUrl('/Mappa/player_token_green.png')}
                alt="Squadra 3"
                className="w-20 h-28 object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.9)]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          HUD SUPERIORE (GRAFICA UNREAL ENGINE / ESPORTS: IMPERIO VIII & FASE)
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

        {/* Scheda Fase e Sezione Attiva al Centro / Destra */}
        <div className="flex items-center gap-3">
          <div className="px-5 py-2.5 rounded-2xl bg-slate-950/85 border border-white/15 shadow-2xl backdrop-blur-md flex items-center gap-3.5">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">
                {targetZone.phaseLabel}
              </span>
              <span className="text-sm font-black text-white uppercase tracking-wide">
                {targetZone.title}
              </span>
            </div>
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${targetZone.bgGradient} flex items-center justify-center text-xl shadow-lg border border-white/20`}>
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
        <div className="max-w-xl p-5 rounded-2xl bg-slate-950/90 border border-amber-500/30 shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-[11px] font-black text-amber-300 uppercase tracking-wider">
              Sezione {targetZone.id}
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
                  titolo: `VIDEO SPIEGAZIONE — ${targetZone.title}`,
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
                <strong className="text-amber-300">{targetZone.title}</strong>.<br />
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
