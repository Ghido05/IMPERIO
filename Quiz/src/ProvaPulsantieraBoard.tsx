import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useGameData } from './context/GameDataContext';
import { useSyncedState } from './hooks/useSyncedState';
import { sendSerialReset, subscribeSerialStatus } from './lib/webSerial';
import { assetUrl } from './lib/assetUrl';

interface ProvaPulsantieraData {
  slideId?: string;
  titolo?: string;
  sottotitolo?: string;
  sfondo?: string;
  notePresentatore?: string;
}

interface ProvaPulsantieraBoardProps {
  interactive?: boolean;
  revealAll?: boolean;
  isPresenter?: boolean;
}

interface BuzzerTestState {
  teamNum: number;
  timestamp: number;
  pressedCount: number;
}

export default function ProvaPulsantieraBoard({
  interactive = true,
  isPresenter = false,
}: ProvaPulsantieraBoardProps) {
  const data = useGameData<ProvaPulsantieraData>();
  const slideId = data?.slideId || 'box0_pulsantiera';

  const isPresenterMode = useMemo(() => {
    if (isPresenter !== undefined && isPresenter !== false) return true;
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    if (params.get('sandbox') === 'true') return true;
    if (params.get('mode') === 'games' || params.get('mode') === 'scores') return false;
    return isPresenter || params.get('mode') === 'presenter' || !params.get('mode');
  }, [isPresenter]);

  const canPlayAudio = interactive && isPresenterMode;

  // Monitoraggio connessione hardware fisica
  const [hardwareConnected, setHardwareConnected] = useState(false);

  useEffect(() => {
    return subscribeSerialStatus((status) => {
      setHardwareConnected(status);
    });
  }, []);

  // Nomi squadre sincronizzati da setup
  const [teamNames, setTeamNames] = useState<string[]>(['SQUADRA 1', 'SQUADRA 2', 'SQUADRA 3']);

  useEffect(() => {
    const loadTeamNames = () => {
      try {
        const raw = localStorage.getItem('imperio_quiz_setup_config_v1');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.punteggi?.nomiSquadre && Array.isArray(parsed.punteggi.nomiSquadre)) {
            setTeamNames(parsed.punteggi.nomiSquadre);
          }
        }
      } catch {}
    };

    loadTeamNames();
    window.addEventListener('storage', loadTeamNames);
    window.addEventListener('local-storage-update', loadTeamNames);
    return () => {
      window.removeEventListener('storage', loadTeamNames);
      window.removeEventListener('local-storage-update', loadTeamNames);
    };
  }, []);

  // Stato sincronizzato delle prenotazioni di prova (memorizza gli hit delle squadre)
  const [activeBookedTeam, setActiveBookedTeam] = useSyncedState<number | null>(
    `playstate_${slideId}_booked_team`,
    null
  );

  // Registro storico degli hit per ciascuna squadra
  const [testedTeams, setTestedTeams] = useSyncedState<Record<number, BuzzerTestState>>(
    `playstate_${slideId}_tested_teams`,
    {}
  );

  // Suono di feedback al click (solo relatore)
  const playBuzzerTone = useCallback((teamNum: number) => {
    if (!canPlayAudio) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      const freq = teamNum === 1 ? 523.25 : teamNum === 2 ? 659.25 : 783.99;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.25, now + 0.15);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.45);
      setTimeout(() => {
        try { ctx.close(); } catch {}
      }, 600);
    } catch {}
  }, [canPlayAudio]);

  const lastHandledHitRef = useRef<number | null>(null);

  // Gestione attivazione pulsante squadra (click a schermo o tasto 1-2-3)
  const triggerTeamBuzzer = useCallback((teamNum: number) => {
    if (![1, 2, 3].includes(teamNum)) return;
    lastHandledHitRef.current = teamNum;
    playBuzzerTone(teamNum);
    setActiveBookedTeam(teamNum);
    setTestedTeams((prev) => {
      const safePrev = prev && typeof prev === 'object' ? prev : {};
      const current = safePrev[teamNum] || { teamNum, timestamp: 0, pressedCount: 0 };
      return {
        ...safePrev,
        [teamNum]: {
          teamNum,
          timestamp: Date.now(),
          pressedCount: (current.pressedCount || 0) + 1,
        },
      };
    });
  }, [playBuzzerTone, setActiveBookedTeam, setTestedTeams]);

  // Ascolto sincronizzazione da WebSerialManager o altre finestre tramite activeBookedTeam
  useEffect(() => {
    if (activeBookedTeam && [1, 2, 3].includes(activeBookedTeam)) {
      if (lastHandledHitRef.current !== activeBookedTeam) {
        lastHandledHitRef.current = activeBookedTeam;
        playBuzzerTone(activeBookedTeam);
        setTestedTeams((prev) => {
          const safePrev = prev && typeof prev === 'object' ? prev : {};
          const current = safePrev[activeBookedTeam] || { teamNum: activeBookedTeam, timestamp: 0, pressedCount: 0 };
          return {
            ...safePrev,
            [activeBookedTeam]: {
              teamNum: activeBookedTeam,
              timestamp: Date.now(),
              pressedCount: (current.pressedCount || 0) + 1,
            },
          };
        });
      }
    } else if (activeBookedTeam === null) {
      lastHandledHitRef.current = null;
    }
  }, [activeBookedTeam, playBuzzerTone, setTestedTeams]);

  // Reset delle pulsantiere (funziona sia online che offline senza crash o attese)
  const handleReset = useCallback(() => {
    lastHandledHitRef.current = null;
    setActiveBookedTeam(null);
    setTestedTeams({});

    try {
      localStorage.removeItem(`playstate_${slideId}_booked_team`);
      localStorage.removeItem(`playstate_${slideId}_tested_teams`);
      localStorage.removeItem(`playstate_${slideId}_assigned_team`);
      localStorage.removeItem(`playstate_${slideId}_locked_step`);

      window.dispatchEvent(new CustomEvent('local-storage-update', {
        detail: { key: `playstate_${slideId}_booked_team`, value: null }
      }));
      window.dispatchEvent(new CustomEvent('local-storage-update', {
        detail: { key: `playstate_${slideId}_tested_teams`, value: '{}' }
      }));
    } catch {}

    // Invia sblocco hardware protetto con catch: se non connesso non blocca mai l'interfaccia
    try {
      sendSerialReset().catch(() => {});
    } catch {}
  }, [slideId, setActiveBookedTeam, setTestedTeams]);

  // Ascolto input tastiera (Tasti 1, 2, 3 e Reset con Spazio o R)
  useEffect(() => {
    if (!interactive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '1') {
        triggerTeamBuzzer(1);
      } else if (e.key === '2') {
        triggerTeamBuzzer(2);
      } else if (e.key === '3') {
        triggerTeamBuzzer(3);
      } else if (e.key === ' ' || e.key.toLowerCase() === 'r' || e.key === 'Escape' || e.key === 'Backspace') {
        e.preventDefault();
        handleReset();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [interactive, triggerTeamBuzzer, handleReset]);

  // Configurazione dei 3 pulsanti digitali
  const buttonsConfig = [
    {
      num: 1,
      name: teamNames[0] || 'SQUADRA 1',
      keyboardKey: 'TASTO 1',
      colorName: 'Rosso',
      baseBg: 'bg-red-700',
      activeBg: 'bg-red-500',
      borderClass: 'border-red-400',
      glowShadow: 'shadow-[0_0_80px_rgba(239,68,68,0.9)]',
      domeGradient: 'from-red-400 via-red-600 to-red-950',
      activeDomeGradient: 'from-white via-red-400 to-red-600',
      ringColor: 'ring-red-400/80',
    },
    {
      num: 2,
      name: teamNames[1] || 'SQUADRA 2',
      keyboardKey: 'TASTO 2',
      colorName: 'Blu',
      baseBg: 'bg-blue-700',
      activeBg: 'bg-blue-500',
      borderClass: 'border-blue-400',
      glowShadow: 'shadow-[0_0_80px_rgba(59,130,246,0.9)]',
      domeGradient: 'from-blue-400 via-blue-600 to-blue-950',
      activeDomeGradient: 'from-white via-cyan-400 to-blue-600',
      ringColor: 'ring-blue-400/80',
    },
    {
      num: 3,
      name: teamNames[2] || 'SQUADRA 3',
      keyboardKey: 'TASTO 3',
      colorName: 'Verde',
      baseBg: 'bg-emerald-700',
      activeBg: 'bg-emerald-500',
      borderClass: 'border-emerald-400',
      glowShadow: 'shadow-[0_0_80px_rgba(16,185,129,0.9)]',
      domeGradient: 'from-emerald-400 via-emerald-600 to-emerald-950',
      activeDomeGradient: 'from-white via-emerald-400 to-emerald-600',
      ringColor: 'ring-emerald-400/80',
    },
  ];

  const sfondoCustom = data?.sfondo || '/Icone/sfondi/sfondo_generale_torneo.jpg';

  // Oggetto testedTeams sicuro per prevenire qualsiasi crash
  const safeTestedTeams = testedTeams && typeof testedTeams === 'object' ? testedTeams : {};

  return (
    <div className="relative w-[1920px] h-[1080px] bg-[#090a10] text-white select-none overflow-hidden flex flex-col items-center justify-between p-12 font-sans">
      {/* Sfondo generale scuro ad alto contrasto */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-all duration-700 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.65), rgba(0,0,0,0.85)), url("${assetUrl(sfondoCustom)}")`,
        }}
      />

      {/* Header Superiore */}
      <header className="relative z-10 w-full flex items-center justify-between pt-2">
        <div className="flex items-center gap-4">
          <span className="px-4 py-1.5 rounded-full text-xs font-black tracking-widest uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-400/40">
            BOX 0 • COLLAUDO PULSANTIERE
          </span>
          <span className="text-white/40 text-xs font-semibold tracking-wider uppercase">
            Test di Connessione e Reattività
          </span>
        </div>

        {/* Status Connessione */}
        <div className="flex items-center gap-3 bg-black/60 px-5 py-2 rounded-full border border-white/10 text-xs backdrop-blur-md">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              hardwareConnected
                ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]'
                : 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]'
            }`}
          />
          <span className="font-bold text-white/90">
            {hardwareConnected ? 'Pulsantiera Hardware: COLLEGATA' : 'Modalità Digitale: ATTIVA (Senza Hardware)'}
          </span>
          <span className="text-white/40">| Test con tasti 1-2-3 o clic a schermo</span>
        </div>
      </header>

      {/* Area Centrale: I 3 Pulsanti Digitali Giganti */}
      <main className="relative z-10 w-full flex-1 flex flex-col items-center justify-center py-6">
        {/* Titolo & Istruzioni */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-black uppercase tracking-tight text-white drop-shadow-[0_4px_25px_rgba(0,0,0,0.9)]">
            PROVA PULSANTIERE
          </h1>
          <p className="text-sm font-semibold text-slate-300 tracking-wider uppercase mt-1">
            Ogni squadra prema il proprio pulsante per verificare la trasmissione del segnale
          </p>
        </div>

        {/* Griglia dei 3 Pulsanti Digitali (Stesso ordine dei Punteggi: Squadra 1, 2, 3) */}
        <div className="grid grid-cols-3 gap-12 w-full max-w-[1600px] items-center">
          {buttonsConfig.map((btn) => {
            const isLatestHit = activeBookedTeam === btn.num;
            const testInfo = safeTestedTeams[btn.num];
            const isTested = Boolean(testInfo && (testInfo.pressedCount || 0) > 0);

            return (
              <div
                key={btn.num}
                onClick={() => triggerTeamBuzzer(btn.num)}
                className={`relative group rounded-3xl p-8 border-2 transition-all duration-300 flex flex-col items-center justify-between min-h-[460px] cursor-pointer select-none backdrop-blur-md ${
                  isLatestHit
                    ? `${btn.borderClass} ${btn.glowShadow} bg-white/15 scale-105 ring-4 ${btn.ringColor}`
                    : isTested
                    ? 'border-white/30 bg-white/10 scale-100 hover:scale-[1.02]'
                    : 'border-white/15 bg-white/5 hover:border-white/30 hover:bg-white/10 scale-100'
                }`}
              >
                {/* Header Card Squadra */}
                <div className="w-full flex items-center justify-between mb-4">
                  <span className={`text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-black/50 border border-white/20 text-white`}>
                    {btn.keyboardKey} • {btn.colorName}
                  </span>
                  {isTested ? (
                    <span className="flex items-center gap-1 text-xs font-black text-emerald-400 bg-emerald-950/60 border border-emerald-500/50 px-3 py-0.5 rounded-full">
                      <span>✓</span> OK ({testInfo?.pressedCount ?? 1})
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-white/40">
                      In attesa...
                    </span>
                  )}
                </div>

                {/* Nome Squadra */}
                <h2 className="text-3xl font-black uppercase tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] text-center mb-6">
                  {btn.name}
                </h2>

                {/* IL PULSANTE FISICO 3D DIGITALE */}
                <div className="relative my-auto flex items-center justify-center">
                  {/* Base circolare metallica */}
                  <div className="w-48 h-48 rounded-full bg-gradient-to-b from-zinc-700 via-zinc-900 to-black p-3 shadow-2xl border-2 border-zinc-600/50 flex items-center justify-center">
                    {/* Anello intermedio con effetto profondità 3D */}
                    <div className="w-full h-full rounded-full bg-zinc-950 p-2 shadow-inner flex items-center justify-center">
                      {/* Cupola Pulsante che si illumina e si preme */}
                      <div
                        className={`w-full h-full rounded-full transition-all duration-200 flex flex-col items-center justify-center shadow-lg border-2 ${
                          isLatestHit
                            ? `bg-gradient-to-b ${btn.activeDomeGradient} border-white scale-95 shadow-[0_0_50px_rgba(255,255,255,0.9)] animate-pulse`
                            : isTested
                            ? `bg-gradient-to-b ${btn.domeGradient} border-white/40 hover:scale-105`
                            : `bg-gradient-to-b ${btn.domeGradient} border-white/20 opacity-80 group-hover:opacity-100 group-hover:scale-105`
                        }`}
                      >
                        {/* Riflesso luce superiore sulla cupola */}
                        <div className="w-20 h-8 rounded-full bg-white/40 blur-[2px] -mt-6 mb-2" />

                        {/* Icona o Simbolo di Pressione */}
                        <span className="text-3xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                          {isLatestHit ? '⚡' : isTested ? '🔔' : '🔴'}
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/90 drop-shadow mt-1">
                          {isLatestHit ? 'PREMUTO!' : 'PREMI'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Status della Card */}
                <div className="w-full pt-4 border-t border-white/10 flex items-center justify-center mt-6">
                  {isLatestHit ? (
                    <span className="text-xs font-black uppercase tracking-wider text-amber-300 animate-pulse flex items-center gap-1.5">
                      <span>⚡</span> SEGNALE RICEVUTO ORA!
                    </span>
                  ) : isTested ? (
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                      Collaudato con successo
                    </span>
                  ) : (
                    <span className="text-xs font-semibold uppercase tracking-wider text-white/40">
                      Clicca o premi il pulsante
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Footer con Controlli di Reset e Guida */}
      <footer className="relative z-40 w-full flex items-center justify-between pt-4 border-t border-white/10">
        <div className="text-xs text-white/50 flex items-center gap-4">
          <span>Scorciatoie Tastiera: <strong>1, 2, 3</strong> (simulazione buzzer)</span>
          <span>•</span>
          <span>Spazio o R per resettare</span>
        </div>

        <button
          type="button"
          onClick={handleReset}
          className="px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-600/40 border border-cyan-400 transition-all cursor-pointer active:scale-95 flex items-center gap-2"
        >
          <span>🔄</span>
          <span>Reset Collaudo (Riprova)</span>
        </button>
      </footer>
    </div>
  );
}
