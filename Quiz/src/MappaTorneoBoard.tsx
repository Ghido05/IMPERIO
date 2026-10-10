import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useGameData, GameDataProvider } from './context/GameDataContext';
import { useSyncedState } from './hooks/useSyncedState';
import VideoBoard from './VideoBoard';
import SpiegazioneBox1Board from './SpiegazioneBox1Board';
import { assetUrl } from './lib/assetUrl';

export interface MappaTorneoData {
  boxNum?: number;
  videoUrl?: string;
  src?: string;
  titolo?: string;
  sottotitolo?: string;
  slideId?: string;
  notePresentatore?: string;
  sfondoSpiegazione?: string;
  audioSpiegazione?: string;
}

interface MappaTorneoBoardProps {
  interactive?: boolean;
  revealAll?: boolean;
  isPresenter?: boolean;
}

interface ZoneInfo {
  id: number;
  x: number; // percentage in 1920 width
  y: number; // percentage in 1080 height
  zoomX: number; // focal point X for cinematic camera zoom
  zoomY: number; // focal point Y for cinematic camera zoom
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
    zoomX: 22,
    zoomY: 54,
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
    x: 34.5,
    y: 28.5,
    zoomX: 34.5,
    zoomY: 21,
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
    zoomX: 48,
    zoomY: 65,
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
    x: 63.5,
    y: 33.5,
    zoomX: 63.5,
    zoomY: 25.5,
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
    zoomX: 78,
    zoomY: 55,
    title: 'TERMOPILI — SCONTRO FINALE',
    phaseNumber: 3,
    phaseLabel: 'FASE FINALE: TERMOPILI',
    subtitle: 'L\'Arena d\'Acqua & La Scalinata del Trono',
    description: 'Scontro finale sull\'arena d\'acqua! I prescelti si sfidano sui cubi sospesi: chi sbaglia fa splash! Chi conquisterà la scalinata verso il trono?',
    badgeEmoji: '⚔️',
    accentColor: '#ef4444',
    bgGradient: 'from-rose-500 to-red-700',
  },
];

// Curve Bézier cubiche esatte corrispondenti ai tracciati SVG tra le sezioni
interface BezierCurve {
  p0: { x: number; y: number };
  p1: { x: number; y: number };
  p2: { x: number; y: number };
  p3: { x: number; y: number };
}

const SEGMENT_CURVES: Record<number, BezierCurve> = {
  // S1: Zona 1 (422, 670) -> Zona 2 (662, 308)
  2: {
    p0: { x: 422, y: 670 },
    p1: { x: 470, y: 510 },
    p2: { x: 580, y: 400 },
    p3: { x: 662, y: 308 },
  },
  // S2: Zona 2 (662, 308) -> Zona 3 (922, 799)
  3: {
    p0: { x: 662, y: 308 },
    p1: { x: 710, y: 470 },
    p2: { x: 770, y: 720 },
    p3: { x: 922, y: 799 },
  },
  // S3: Zona 3 (922, 799) -> Zona 4 (1219, 362)
  4: {
    p0: { x: 922, y: 799 },
    p1: { x: 1050, y: 750 },
    p2: { x: 1140, y: 500 },
    p3: { x: 1219, y: 362 },
  },
  // S4: Zona 4 (1219, 362) -> Zona 5 (1498, 670)
  5: {
    p0: { x: 1219, y: 362 },
    p1: { x: 1320, y: 440 },
    p2: { x: 1440, y: 550 },
    p3: { x: 1498, y: 670 },
  },
};

function getPointOnCubicBezier(curve: BezierCurve, t: number): { x: number; y: number } {
  const clampedT = Math.max(0, Math.min(1, t));
  const u = 1 - clampedT;
  const tt = clampedT * clampedT;
  const uu = u * u;
  const uuu = uu * u;
  const ttt = tt * clampedT;

  const px = uuu * curve.p0.x + 3 * uu * clampedT * curve.p1.x + 3 * u * tt * curve.p2.x + ttt * curve.p3.x;
  const py = uuu * curve.p0.y + 3 * uu * clampedT * curve.p1.y + 3 * u * tt * curve.p2.y + ttt * curve.p3.y;

  return {
    x: px / 19.2, // Converti coordinate 1920 in percentuale
    y: py / 10.8, // Converti coordinate 1080 in percentuale
  };
}

function easeInOutCubic(x: number): number {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

// Grande banco volumetrico di nuvole realistiche 3D
function HeavyCloudBlanket({ isDissolving = false }: { isDissolving?: boolean }) {
  return (
    <div
      className={`relative w-[880px] h-[580px] pointer-events-none select-none flex items-center justify-center transition-all duration-1000 ${
        isDissolving ? 'opacity-0 scale-125' : 'opacity-100 scale-100'
      }`}
    >
      {/* Ombra di contatto morbida e racchiusa sotto il centro della nuvola */}
      <div className="absolute w-[520px] h-[240px] rounded-full bg-black/25 blur-2xl transform scale-y-60 pointer-events-none" />

      {/* SVG Volumetrico ad alta densità con cumuli bianchi espansi e sfumature di luce */}
      <svg
        viewBox="0 0 720 480"
        className="w-full h-full drop-shadow-[0_20px_35px_rgba(0,0,0,0.55)] relative z-10"
        fill="none"
      >
        <defs>
          <radialGradient id="cloudGradBright" cx="35%" cy="30%" r="68%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="50%" stopColor="#f8fafc" />
            <stop offset="80%" stopColor="#e2e8f0" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </radialGradient>
          <radialGradient id="cloudGradBase" cx="45%" cy="40%" r="65%">
            <stop offset="0%" stopColor="#f1f5f9" />
            <stop offset="65%" stopColor="#cbd5e1" />
            <stop offset="100%" stopColor="#94a3b8" />
          </radialGradient>
          <filter id="cloudSoftBlurWide" x="-15%" y="-15%" width="130%" height="130%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g filter="url(#cloudSoftBlurWide)">
          {/* 1. Base posteriore densa che estende la copertura verso l'esterno */}
          <circle cx="150" cy="270" r="115" fill="url(#cloudGradBase)" />
          <circle cx="290" cy="290" r="130" fill="url(#cloudGradBase)" />
          <circle cx="440" cy="280" r="125" fill="url(#cloudGradBase)" />
          <circle cx="560" cy="250" r="110" fill="url(#cloudGradBase)" />
          <circle cx="630" cy="210" r="85" fill="url(#cloudGradBase)" />
          <circle cx="85" cy="240" r="85" fill="url(#cloudGradBase)" />

          {/* 2. Livello centrale volumetrico ad alta opacità */}
          <circle cx="180" cy="200" r="115" fill="url(#cloudGradBright)" />
          <circle cx="310" cy="180" r="135" fill="url(#cloudGradBright)" />
          <circle cx="450" cy="190" r="130" fill="url(#cloudGradBright)" />
          <circle cx="550" cy="190" r="105" fill="url(#cloudGradBright)" />
          <circle cx="100" cy="190" r="95" fill="url(#cloudGradBright)" />

          {/* 3. Cumuli superiori bianchi e illuminati */}
          <circle cx="230" cy="120" r="105" fill="url(#cloudGradBright)" />
          <circle cx="360" cy="110" r="115" fill="url(#cloudGradBright)" />
          <circle cx="480" cy="130" r="100" fill="url(#cloudGradBright)" />
          <circle cx="140" cy="140" r="85" fill="url(#cloudGradBright)" />

          {/* 4. Punti luce e riflessi puri a specchio */}
          <circle cx="240" cy="100" r="70" fill="#ffffff" fillOpacity="0.85" />
          <circle cx="360" cy="90" r="80" fill="#ffffff" fillOpacity="0.9" />
          <circle cx="470" cy="115" r="65" fill="#ffffff" fillOpacity="0.8" />
          <circle cx="310" cy="160" r="90" fill="#ffffff" fillOpacity="0.7" />
          <circle cx="450" cy="170" r="80" fill="#ffffff" fillOpacity="0.7" />
          <circle cx="180" cy="180" r="75" fill="#ffffff" fillOpacity="0.75" />
        </g>
      </svg>
    </div>
  );
}

export default function MappaTorneoBoard({ interactive = true, revealAll = false, isPresenter }: MappaTorneoBoardProps) {
  const data = useGameData<MappaTorneoData>();
  const activeBox = data?.boxNum && data.boxNum >= 1 && data.boxNum <= 5 ? data.boxNum : 1;
  const slideId = data?.slideId || `box${activeBox}_mappa_spiegazione`;
  const rawVideoUrl = data?.videoUrl || data?.src || '';
  const hasVideo = Boolean(rawVideoUrl);

  // Identificazione modalità Relatore vs Schermo Pubblico
  const isPresenterMode = useMemo(() => {
    if (isPresenter !== undefined) return isPresenter;
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    if (params.get('sandbox') === 'true') return true;
    if (
      params.get('mode') === 'games' ||
      params.get('mode') === 'scores' ||
      params.get('project') === 'true'
    ) {
      return false;
    }
    return true;
  }, [isPresenter]);

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

  // STATO SINCRONIZZATO: Passo di sblocco della sezione corrente
  // 0 = Personaggi alla sezione precedente, nuova sezione coperta da nuvole con "?"
  // 1 = Personaggi avanzati alla nuova sezione, nuvole dissolte e sezione scoperta!
  const [unlockedStep, setUnlockedStep] = useSyncedState<number>(
    `playstate_${slideId}_unlocked_step`,
    activeBox === 1 ? 1 : 0
  );

  // Progresso continuo da 0.0 a 1.0 per l'animazione di marcia lungo il sentiero
  const [animProgress, setAnimProgress] = useState<number>(() => (activeBox === 1 || unlockedStep === 1 ? 1 : 0));
  const animFrameRef = useRef<number | null>(null);

  // Sincronizzazione dello zoom cinematico tra finestre (Relatore <-> Schermo Pubblico <-> iPad)
  const [isZoomed, setIsZoomed] = useSyncedState<boolean>(`playstate_${slideId}_is_zoomed`, false);
  const [showVideoOverlay, setShowVideoOverlay] = useState<boolean>(isZoomed);
  const zoomTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Transizione cinematica di ingresso dell'isola di gioco (all'inizio del Box 1 dalla spiegazione)
  const [isIslandIntro, setIsIslandIntro] = useState<boolean>(activeBox === 1);

  useEffect(() => {
    if (activeBox === 1) {
      setIsIslandIntro(true);
      const timer = setTimeout(() => {
        setIsIslandIntro(false);
      }, 2600);
      return () => clearTimeout(timer);
    }
  }, [activeBox]);

  // Configurazione setup con fallback su localStorage
  const setupConfig = useMemo(() => {
    try {
      const raw = localStorage.getItem('imperio_quiz_setup_config_v1');
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }
    return null;
  }, []);

  const dynamicZones = useMemo(() => {
    return ZONES.map((z) => {
      let customTitle = z.title;
      let customSubtitle = z.subtitle;
      if (z.id === 1 && setupConfig?.gioco1?.titolo) {
        customTitle = setupConfig.gioco1.titolo.toUpperCase();
        if (setupConfig.gioco1.sottotitolo) customSubtitle = setupConfig.gioco1.sottotitolo;
      } else if (z.id === 2 && setupConfig?.gioco2?.titolo) {
        customTitle = setupConfig.gioco2.titolo.toUpperCase();
        if (setupConfig.gioco2.sottotitolo) customSubtitle = setupConfig.gioco2.sottotitolo;
      } else if (z.id === 3 && setupConfig?.gioco3?.titolo) {
        customTitle = setupConfig.gioco3.titolo.toUpperCase();
        if (setupConfig.gioco3.sottotitolo) customSubtitle = setupConfig.gioco3.sottotitolo;
      } else if (z.id === 4 && setupConfig?.gioco4?.titolo) {
        customTitle = setupConfig.gioco4.titolo.toUpperCase();
        if (setupConfig.gioco4.sottotitolo) customSubtitle = setupConfig.gioco4.sottotitolo;
      } else if (z.id === 5 && setupConfig?.gioco5?.titolo) {
        customTitle = setupConfig.gioco5.titolo.toUpperCase();
        if (setupConfig.gioco5.sottotitolo) customSubtitle = setupConfig.gioco5.sottotitolo;
      }
      return { ...z, title: customTitle, subtitle: customSubtitle };
    });
  }, [setupConfig]);

  // Trova la zona corrente attiva
  const targetZone = useMemo(() => {
    return dynamicZones.find((z) => z.id === activeBox) || dynamicZones[0];
  }, [dynamicZones, activeBox]);

  // Gestione dell'animazione di marcia dei personaggi lungo la curva Bézier
  useEffect(() => {
    if (activeBox === 1) {
      setAnimProgress(1);
      return;
    }

    const targetProgress = unlockedStep === 1 ? 1 : 0;
    const startProgress = animProgress;
    if (Math.abs(startProgress - targetProgress) < 0.01) {
      setAnimProgress(targetProgress);
      return;
    }

    const duration = unlockedStep === 1 ? 2200 : 1400; // 2.2s marcia in avanti, 1.4s ritorno
    const startTime = performance.now();

    const animateLoop = (now: number) => {
      const elapsed = now - startTime;
      const rawT = Math.min(1, elapsed / duration);
      const easedT = easeInOutCubic(rawT);
      const current = startProgress + (targetProgress - startProgress) * easedT;
      setAnimProgress(current);

      if (rawT < 1) {
        animFrameRef.current = requestAnimationFrame(animateLoop);
      } else {
        setAnimProgress(targetProgress);
      }
    };

    animFrameRef.current = requestAnimationFrame(animateLoop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [unlockedStep, activeBox]);

  // Calcola la posizione attuale (x, y) dei 3 personaggi in percentuale (1920x1080)
  const currentTokenPos = useMemo(() => {
    if (activeBox === 1) {
      return { x: dynamicZones[0].x, y: dynamicZones[0].y };
    }
    const curve = SEGMENT_CURVES[activeBox];
    if (!curve) {
      return { x: targetZone.x, y: targetZone.y };
    }
    return getPointOnCubicBezier(curve, animProgress);
  }, [activeBox, animProgress, targetZone, dynamicZones]);

  // La sezione è considerata visivamente scoperta quando i personaggi hanno quasi completato la marcia
  const isSectionRevealed = activeBox === 1 || animProgress >= 0.85;

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
    if (activeBox > 1 && unlockedStep === 0) {
      setUnlockedStep(1);
    } else {
      setIsZoomed(!isZoomed);
    }
  }, [activeBox, unlockedStep, setUnlockedStep, isZoomed, setIsZoomed]);

  const handleReturnToMap = useCallback(() => {
    setIsZoomed(false);
  }, [setIsZoomed]);

  // Gestione scorciatoie da tastiera
  useEffect(() => {
    if (!interactive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      if (e.key === 'ArrowRight') {
        if (!isZoomed) {
          if (activeBox > 1 && unlockedStep === 0) {
            e.preventDefault();
            setUnlockedStep(1);
          } else if (unlockedStep === 1 && animProgress >= 0.95) {
            e.preventDefault();
            setIsZoomed(true);
          }
        }
      } else if (e.key === 'ArrowLeft') {
        if (isZoomed) {
          e.preventDefault();
          setIsZoomed(false);
        } else if (activeBox > 1 && unlockedStep === 1) {
          e.preventDefault();
          setUnlockedStep(0);
        }
      } else if (e.key === 'Enter' || e.key === ' ' || e.key === 'v' || e.key === 'V') {
        if (!isZoomed) {
          e.preventDefault();
          if (activeBox > 1 && unlockedStep === 0) {
            setUnlockedStep(1);
          } else {
            handleToggleZoom();
          }
        }
      } else if (e.key === 'm' || e.key === 'M' || e.key === 'Escape') {
        if (isZoomed) {
          e.preventDefault();
          handleReturnToMap();
        }
      } else if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        setIsIslandIntro(true);
        setTimeout(() => setIsIslandIntro(false), 2600);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [interactive, isZoomed, activeBox, unlockedStep, setUnlockedStep, animProgress, setIsZoomed, handleToggleZoom, handleReturnToMap]);

  // Listener per eventi di ritorno alla mappa da componenti figli
  useEffect(() => {
    const onReturn = () => {
      handleReturnToMap();
    };
    window.addEventListener('imperio-return-to-map', onReturn);
    return () => window.removeEventListener('imperio-return-to-map', onReturn);
  }, [handleReturnToMap]);

  return (
    <div className="relative w-[1920px] h-[1080px] bg-[#07090e] text-white overflow-hidden font-sans select-none">
      {/* IMPORT DEI FONT (CINZEL PER IMPERIO VIII & LILITA ONE PER IL TITOLO SEZIONE) */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700;900&family=Lilita+One&family=Titan+One&display=swap');

        /* FONT SEZIONE STILE "PAESE DEI GIOCATTOLI" (GIALLO-ARANCIO 3D VIBRANTE CON CONTORNO ED ESTRUSIONE NERA) */
        .brawl-game-title {
          font-family: 'Lilita One', 'Titan One', 'Impact', sans-serif;
          background: linear-gradient(180deg, #FFF952 0%, #FFCC00 35%, #FF7A00 70%, #E63900 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          filter: 
            drop-shadow(0 2px 0 #000) 
            drop-shadow(2px 0 0 #000) 
            drop-shadow(-2px 0 0 #000) 
            drop-shadow(0 -2px 0 #000) 
            drop-shadow(3px 4px 0 #000) 
            drop-shadow(0 8px 18px rgba(0, 0, 0, 0.9));
          transform: rotate(-1.5deg);
          letter-spacing: 0.03em;
        }

        /* FONT SOTTOTITOLO FASE AZZURRO STILE "Ti diamo il benvenuto a" */
        .brawl-game-phase {
          font-family: 'Lilita One', cursive, sans-serif;
          color: #38bdf8;
          text-shadow: 
            2px 2px 0 #000, 
            -1.5px -1.5px 0 #000, 
            1.5px -1.5px 0 #000, 
            -1.5px 1.5px 0 #000, 
            0 3px 0 #000, 
            0 4px 10px rgba(0, 0, 0, 0.85);
          transform: rotate(-1.5deg);
          letter-spacing: 0.05em;
        }

        /* FONT IMPERIALE VIII PER IL LOGO A SINISTRA */
        .font-imperio-title {
          font-family: 'Cinzel', serif;
          background: linear-gradient(180deg, #FFFFFF 0%, #FEF08A 35%, #F59E0B 75%, #B45309 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          filter: drop-shadow(0 4px 12px rgba(0,0,0,0.9)) drop-shadow(0 0 20px rgba(245, 158, 11, 0.5));
        }

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
          50% { transform: translate(16px, -10px) scale(1.02); }
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
          0%, 100% { transform: scale(1) translateY(0); filter: drop-shadow(0 0 15px rgba(245, 158, 11, 0.75)); }
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

        /* KEYFRAMES TRANSIZIONE DI INGRESSO ISOLA DI GIOCO */
        @keyframes islandIntroZoom {
          0% {
            opacity: 0;
            transform: scale(1.08);
            filter: brightness(0.35) blur(8px);
          }
          40% {
            opacity: 1;
            filter: brightness(0.85) blur(2px);
          }
          100% {
            opacity: 1;
            transform: scale(1);
            filter: brightness(1) blur(0px);
          }
        }
        @keyframes curtainFade {
          0% { opacity: 0.95; }
          30% { opacity: 0.85; }
          100% { opacity: 0; }
        }
        @keyframes cloudsPart {
          0% { transform: scale(1); opacity: 0.75; }
          40% { transform: scale(1.15); opacity: 0.65; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes sunbeamSweep {
          0% { transform: translateX(-60%) rotate(-25deg); opacity: 0; }
          30% { opacity: 0.75; }
          100% { transform: translateX(70%) rotate(-25deg); opacity: 0; }
        }
        @keyframes mistDissolve {
          0%, 90% { pointer-events: none; }
          100% { visibility: hidden; }
        }
        .animate-curtain-fade {
          animation: curtainFade 2.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-clouds-part {
          animation: cloudsPart 2.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-sunbeam-sweep {
          animation: sunbeamSweep 2.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-mist-dissolve {
          animation: mistDissolve 2.5s forwards;
        }

        /* DISCESA E ATTERRAGGIO CON RIMBALZO DEI 3 EROI */
        @keyframes dropBounceRed {
          0% {
            opacity: 0;
            transform: translateY(-130px) scale(0.6);
          }
          60% {
            opacity: 1;
            transform: translateY(10px) scale(1.08);
          }
          80% {
            transform: translateY(-5px) scale(0.96);
          }
          100% {
            opacity: 1;
            transform: translateY(0px) scale(1);
          }
        }
        @keyframes dropBounceBlue {
          0% {
            opacity: 0;
            transform: translateY(-150px) scale(0.6);
          }
          60% {
            opacity: 1;
            transform: translateY(12px) scale(1.1);
          }
          80% {
            transform: translateY(-6px) scale(0.96);
          }
          100% {
            opacity: 1;
            transform: translateY(0px) scale(1);
          }
        }
        @keyframes dropBounceGreen {
          0% {
            opacity: 0;
            transform: translateY(-130px) scale(0.6);
          }
          60% {
            opacity: 1;
            transform: translateY(10px) scale(1.08);
          }
          80% {
            transform: translateY(-5px) scale(0.96);
          }
          100% {
            opacity: 1;
            transform: translateY(0px) scale(1);
          }
        }
        .animate-team-red-drop {
          animation: dropBounceRed 1.1s cubic-bezier(0.16, 1, 0.3, 1) 0.5s backwards;
        }
        .animate-team-blue-drop {
          animation: dropBounceBlue 1.1s cubic-bezier(0.16, 1, 0.3, 1) 0.75s backwards;
        }
        .animate-team-green-drop {
          animation: dropBounceGreen 1.1s cubic-bezier(0.16, 1, 0.3, 1) 1.0s backwards;
        }

        /* SCIVOLAMENTO HUD SUPERIORE E INFERIORE */
        @keyframes hudTopSlide {
          0% {
            opacity: 0;
            transform: translateY(-60px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-hud-top-slide {
          animation: hudTopSlide 1.2s cubic-bezier(0.16, 1, 0.3, 1) 0.7s backwards;
        }

        @keyframes hudBottomSlide {
          0% {
            opacity: 0;
            transform: translateY(60px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-hud-bottom-slide {
          animation: hudBottomSlide 1.2s cubic-bezier(0.16, 1, 0.3, 1) 0.9s backwards;
        }
      `}</style>

      {/* TRANSIZIONE DI INGRESSO ISOLA DI GIOCO - Velo di nebbia atmosferica che si apre */}
      {isIslandIntro && (
        <div className="absolute inset-0 z-50 pointer-events-none overflow-hidden animate-mist-dissolve">
          {/* Telo di buio iniziale che sfuma */}
          <div className="absolute inset-0 bg-[#07090e] animate-curtain-fade" />

          {/* Cumuli di nuvole dense che si aprono dal centro verso l'esterno */}
          <div className="absolute inset-0 flex items-center justify-center animate-clouds-part">
            <div className="w-[1500px] h-[900px] rounded-full bg-slate-300/25 blur-3xl" />
            <div className="absolute w-[1000px] h-[600px] rounded-full bg-white/35 blur-2xl" />
          </div>

          {/* Raggio di sole dorato che spazza l'isola appena svelata */}
          <div className="absolute -inset-full bg-gradient-to-r from-transparent via-amber-300/30 to-transparent transform -rotate-25 animate-sunbeam-sweep pointer-events-none" />
        </div>
      )}

      {/* CONTENITORE MAPPA ISOLA CON ZOOM DINAMICO ED ENTRATA CINEMATICA */}
      <div
        className="absolute inset-0 w-full h-full origin-center"
        style={{
          transformOrigin: isZoomed ? `${targetZone.zoomX}% ${targetZone.zoomY}%` : '50% 50%',
          transform: isZoomed ? 'scale(2.75)' : 'scale(1)',
          transition: 'transform 1.25s cubic-bezier(0.22, 1, 0.36, 1)',
          animation: isIslandIntro ? 'islandIntroZoom 2.2s cubic-bezier(0.16, 1, 0.3, 1) forwards' : undefined,
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
            d="M 422 670 C 470 510, 580 400, 662 308"
            stroke={activeBox > 2 || (activeBox === 2 && animProgress > 0) ? '#fbbf24' : 'rgba(255,255,255,0.22)'}
            strokeWidth={activeBox > 2 || (activeBox === 2 && animProgress > 0) ? '7' : '4'}
            strokeDasharray={activeBox > 2 || (activeBox === 2 && animProgress > 0) ? '14 10' : '6 8'}
            strokeLinecap="round"
            className={activeBox > 2 || (activeBox === 2 && animProgress > 0) ? 'animate-path-dash' : ''}
            filter={activeBox > 2 || (activeBox === 2 && animProgress > 0) ? 'url(#glowEffect)' : undefined}
          />

          {/* S2: Zona 2 -> Zona 3 */}
          <path
            d="M 662 308 C 710 470, 770 720, 922 799"
            stroke={activeBox > 3 || (activeBox === 3 && animProgress > 0) ? '#fbbf24' : 'rgba(255,255,255,0.22)'}
            strokeWidth={activeBox > 3 || (activeBox === 3 && animProgress > 0) ? '7' : '4'}
            strokeDasharray={activeBox > 3 || (activeBox === 3 && animProgress > 0) ? '14 10' : '6 8'}
            strokeLinecap="round"
            className={activeBox > 3 || (activeBox === 3 && animProgress > 0) ? 'animate-path-dash' : ''}
            filter={activeBox > 3 || (activeBox === 3 && animProgress > 0) ? 'url(#glowEffect)' : undefined}
          />

          {/* S3: Zona 3 -> Zona 4 */}
          <path
            d="M 922 799 C 1050 750, 1140 500, 1219 362"
            stroke={activeBox > 4 || (activeBox === 4 && animProgress > 0) ? '#fbbf24' : 'rgba(255,255,255,0.22)'}
            strokeWidth={activeBox > 4 || (activeBox === 4 && animProgress > 0) ? '7' : '4'}
            strokeDasharray={activeBox > 4 || (activeBox === 4 && animProgress > 0) ? '14 10' : '6 8'}
            strokeLinecap="round"
            className={activeBox > 4 || (activeBox === 4 && animProgress > 0) ? 'animate-path-dash' : ''}
            filter={activeBox > 4 || (activeBox === 4 && animProgress > 0) ? 'url(#glowEffect)' : undefined}
          />

          {/* S4: Zona 4 -> Zona 5 */}
          <path
            d="M 1219 362 C 1320 440, 1440 550, 1498 670"
            stroke={activeBox > 5 || (activeBox === 5 && animProgress > 0) ? '#fbbf24' : 'rgba(255,255,255,0.22)'}
            strokeWidth={activeBox > 5 || (activeBox === 5 && animProgress > 0) ? '7' : '4'}
            strokeDasharray={activeBox > 5 || (activeBox === 5 && animProgress > 0) ? '14 10' : '6 8'}
            strokeLinecap="round"
            className={activeBox > 5 || (activeBox === 5 && animProgress > 0) ? 'animate-path-dash' : ''}
            filter={activeBox > 5 || (activeBox === 5 && animProgress > 0) ? 'url(#glowEffect)' : undefined}
          />
        </svg>

        {/* ELEMENTO CENTRALE: LAMPADA MAGICA DI ALADINO (VISIBILE SENZA ALCUN TESTO SPOILER) */}
        <div
          className="absolute z-20 pointer-events-none transform -translate-x-1/2 -translate-y-1/2"
          style={{ left: '50%', top: '44%' }}
        >
          {/* Alone mistico pulsante oro & viola */}
          <div className="absolute -inset-16 rounded-full bg-gradient-to-r from-amber-500/35 via-purple-600/40 to-amber-400/35 blur-2xl animate-aura pointer-events-none" />

          {/* Scintille magiche intorno alla lampada (nessuna scritta) */}
          <div className="relative flex items-center justify-center pointer-events-none">
            <span className="text-amber-300 text-sm animate-ping absolute -top-4 -right-4">✨</span>
            <span className="text-purple-300 text-xs animate-pulse absolute -bottom-3 -left-3">✨</span>
          </div>
        </div>

        {/* RENDERING DELLE 5 ZONE CON PIN E COPERTURA NUVOLE */}
        {dynamicZones.map((zone) => {
          // Una zona è completata se il suo ID è inferiore al box attivo (o se siamo nel box attivo e siamo già avanzati oltre)
          const isCompleted = zone.id < activeBox;
          const isCurrent = zone.id === activeBox;
          const isFuture = zone.id > activeBox;

          // Per la zona corrente: è coperta dalle nuvole se non è ancora stata svelata (animProgress < 0.85)
          const showCloudsOnCurrent = isCurrent && !isSectionRevealed;

          return (
            <div
              key={zone.id}
              className="absolute z-20 transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
              style={{ left: `${zone.x}%`, top: `${zone.y}%` }}
            >
              {/* NEBBIA DI GUERRA: GRANDI NUVOLE DENSE SULLE ZONE NON ANCORA SCOPERTE */}
              {(isFuture || showCloudsOnCurrent) && (
                <div
                  className="absolute -inset-64 flex items-center justify-center pointer-events-none transition-all duration-1000"
                  style={{ animation: 'cloudDriftSlow 10s ease-in-out infinite' }}
                >
                  {/* Grande coltre di nuvole bianche realistiche con dissolvenza fluida quando si scopre */}
                  <HeavyCloudBlanket isDissolving={isCurrent && isSectionRevealed} />

                  {/* Medaglione Punto di Domanda ? in rilievo dorato 3D fluttuante */}
                  {(!isCurrent || !isSectionRevealed) && (
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
                  )}
                </div>
              )}

              {/* ONDE RADAR & EFFETTO SULLA ZONA CORRENTE (ATTIVE QUANDO SCOPERTA) */}
              {isCurrent && isSectionRevealed && (
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

              {/* ZONA ATTIVA (Solo numero stilizzato in medaglione dorato 3D quando scoperta) */}
              {isCurrent && isSectionRevealed && (
                <div className="flex flex-col items-center animate-fade-in">
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

        {/* I 3 PERSONAGGI / SEGNALINI IN MOVIMENTO LUNGO LA CURVA BÉZIER */}
        <div
          className="absolute z-30 pointer-events-none transform -translate-x-1/2 -translate-y-full"
          style={{
            left: `${currentTokenPos.x}%`,
            top: `${currentTokenPos.y - 1}%`,
          }}
        >
          {/* Ombra collettiva a terra */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-48 h-10 bg-black/75 rounded-full blur-md" />

          {/* Formazione a 3 dei Personaggi delle Squadre */}
          <div className="relative flex items-end justify-center w-56 h-40">
            {/* 1. SQUADRA 1 (ROSSO) - Sinistra */}
            <div className={`absolute left-0 bottom-0 flex flex-col items-center z-10 ${
              isIslandIntro ? 'animate-team-red-drop' : 'animate-team-red'
            }`}>
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
            <div className={`absolute left-1/2 -translate-x-1/2 bottom-3 flex flex-col items-center z-20 ${
              isIslandIntro ? 'animate-team-blue-drop' : 'animate-team-blue'
            }`}>
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
            <div className={`absolute right-0 bottom-0 flex flex-col items-center z-10 ${
              isIslandIntro ? 'animate-team-green-drop' : 'animate-team-green'
            }`}>
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
          HUD SUPERIORE
          - A SINISTRA: LOGO E TITOLO EPICO IMPERIALE "IMPERIO VIII"
          - A DESTRA: TITOLO SEZIONE IN STILE BRAWL STARS ("PAESE DEI GIOCATTOLI")
          ========================================================================= */}
      <div className={`absolute top-0 inset-x-0 z-40 p-8 flex items-start justify-between pointer-events-none transition-opacity duration-500 ${
        isZoomed ? 'opacity-0' : 'opacity-100'
      } ${isIslandIntro ? 'animate-hud-top-slide' : ''}`}>
        
        {/* LOGO E TITOLO "IMPERIO VIII" A SINISTRA (STILE IMPERIALE EPICO CHISELED) */}
        <div className="flex items-center gap-4 drop-shadow-[0_8px_24px_rgba(0,0,0,0.9)]">
          {/* Medaglione Scudetto 3D con VIII e Corona */}
          <div className="relative w-16 h-18 rounded-2xl bg-gradient-to-b from-amber-300 via-amber-600 to-amber-900 p-1 shadow-[0_0_30px_rgba(245,158,11,0.7)] flex items-center justify-center">
            <div className="w-full h-full rounded-xl bg-gradient-to-b from-red-950 via-slate-950 to-red-950 border border-amber-400/60 flex flex-col items-center justify-center py-1">
              <span className="text-amber-400 text-xs leading-none">👑</span>
              <span className="font-serif font-black text-2xl tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-amber-200 via-amber-400 to-amber-600 drop-shadow">
                VIII
              </span>
            </div>
            {/* Alone luminoso */}
            <div className="absolute -inset-1 rounded-2xl bg-amber-500/25 blur-sm pointer-events-none" />
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2.5">
              <span className="font-imperio-title text-3xl md:text-4xl font-black tracking-widest uppercase">
                Imperio VIII
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/50 text-[10px] font-black text-amber-300 uppercase tracking-widest shadow-sm">
                Mappa
              </span>
            </div>
            <span className="text-xs font-semibold text-amber-100/75 tracking-wider mt-0.5 drop-shadow">
              Il Viaggio attraverso le 3 Fasi del Torneo
            </span>
          </div>
        </div>

        {/* TITOLO DEL GIOCO IN ALTO A DESTRA IN STILE "PAESE DEI GIOCATTOLI" */}
        <div className="flex flex-col items-end text-right">
          {/* Sottotitolo azzurro brillante con contorno nero stile "Ti diamo il benvenuto a" */}
          <span className="brawl-game-phase text-xl md:text-2xl font-black uppercase">
            {targetZone.phaseLabel}
          </span>
          {/* Titolo principale giallo-arancio-rosso 3D brillante stile "PAESE DEI GIOCATTOLI" */}
          <h1 className="brawl-game-title text-5xl md:text-6xl font-black uppercase mt-0.5 transition-all duration-700">
            {isSectionRevealed ? targetZone.title : `SCOPRI LA SEZIONE ${targetZone.id} ?`}
          </h1>
        </div>

      </div>

      {/* =========================================================================
          HUD INFERIORE (DESCRIZIONE GIOCO & PULSANTE AVVIO/AVANZAMENTO)
          ========================================================================= */}
      <div className={`absolute bottom-0 inset-x-0 z-40 p-8 flex items-end justify-between pointer-events-auto transition-opacity duration-500 ${
        isZoomed ? 'opacity-0 pointer-events-none' : 'opacity-100'
      } ${isIslandIntro ? 'animate-hud-bottom-slide' : ''}`}>
        {/* Card Dettagli Regole del Gioco */}
        <div className="max-w-xl p-5 rounded-2xl bg-slate-950/90 border border-amber-500/30 shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-[11px] font-black text-amber-300 uppercase tracking-wider">
              Sezione {targetZone.id}
            </span>
            <span className="text-xs font-bold text-white/50 uppercase tracking-wider">
              {isSectionRevealed ? targetZone.subtitle : 'Area da Esplorare'}
            </span>
          </div>
          <p className="text-sm font-medium text-slate-200 leading-relaxed">
            {isSectionRevealed
              ? targetZone.description
              : 'Premi la Freccia Destra [→] per far muovere i campioni delle squadre lungo il sentiero e svelare questa nuova porzione della mappa!'}
          </p>
        </div>

      </div>

      {/* =========================================================================
          MODALITA VIDEO SPIEGAZIONE A SCHERMO INTERO (DOPO LA TRANSIZIONE DI ZOOM)
          ========================================================================= */}
      {showVideoOverlay && (
        <div className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center animate-fade-in">
          {targetZone.id === 1 && (!hasVideo || rawVideoUrl.includes('spiegazione_box1') || rawVideoUrl.endsWith('.m4a') || rawVideoUrl.endsWith('.wav')) ? (
            <div className="relative w-full h-full flex items-center justify-center">
              {/* Scheda Spiegazione Regole Ufficiale Gioco 1 (Il mio nome è nessuno) */}
              <GameDataProvider
                data={{
                  src: rawVideoUrl,
                  sfondo: data?.sfondoSpiegazione || '/Mappa/spiegazione_box1_ambientazione.jpg',
                  sfondoSpiegazione: data?.sfondoSpiegazione || '/Mappa/spiegazione_box1_ambientazione.jpg',
                  audioUrl: data?.audioSpiegazione || rawVideoUrl || '/Audio/Spiegazioni/Spiegazione_box1.mp3',
                  audioSpiegazione: data?.audioSpiegazione || rawVideoUrl || '/Audio/Spiegazioni/Spiegazione_box1.mp3',
                  titolo: targetZone.title,
                  titoloGioco: targetZone.title,
                  sottotitolo: targetZone.subtitle,
                  slideId: `${slideId}_spiegazione_box1`,
                  notePresentatore: data?.notePresentatore || '',
                }}
              >
                <SpiegazioneBox1Board
                  interactive={interactive}
                  revealAll={revealAll}
                  isPresenter={isPresenterMode}
                  onReturnToMap={handleReturnToMap}
                />
              </GameDataProvider>

              {/* Pulsante per Tornare alla Mappa in Alto a Destra (Solo Relatore) */}
              {interactive && isPresenterMode && (
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
          ) : hasVideo ? (
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
                <VideoBoard interactive={interactive} revealAll={revealAll} isPresenter={isPresenterMode} />
              </GameDataProvider>

              {/* Pulsante per Tornare alla Mappa in Alto a Destra (Solo Relatore) */}
              {interactive && isPresenterMode && (
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
              {isPresenterMode && (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleReturnToMap}
                    className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                  >
                    🗺️ Torna alla Mappa
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
