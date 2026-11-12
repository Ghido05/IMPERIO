import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useGameData } from './context/GameDataContext';
import { useSyncedState } from './hooks/useSyncedState';
import { assetUrl } from './lib/assetUrl';

interface PresentazioneSquadreData {
  slideId?: string;
  titolo?: string;
  sottotitolo?: string;
  sfondo?: string;
  musicaIngresso?: string;
  notePresentatore?: string;
}

interface PresentazioneSquadreBoardProps {
  interactive?: boolean;
  revealAll?: boolean;
  isPresenter?: boolean;
}

export default function PresentazioneSquadreBoard({
  interactive = true,
  revealAll = false,
  isPresenter = false,
}: PresentazioneSquadreBoardProps) {
  const data = useGameData<PresentazioneSquadreData>();
  const slideId = data?.slideId || 'box0_squadre';

  // Modalità relatore per abilitare audio e controlli
  const isPresenterMode = useMemo(() => {
    if (isPresenter !== undefined && isPresenter !== false) return true;
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    if (params.get('sandbox') === 'true') return true;
    if (params.get('mode') === 'games' || params.get('mode') === 'scores') return false;
    return isPresenter || params.get('mode') === 'presenter' || !params.get('mode');
  }, [isPresenter]);

  const canPlayAudio = interactive && isPresenterMode;

  // Nomi delle squadre sincronizzati dal setup
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

  // Step di presentazione sincronizzato:
  // 0 = Titolo iniziale / attesa
  // 1 = Presentazione Squadra 1 (Rosso)
  // 2 = Presentazione Squadra 2 (Blu)
  // 3 = Presentazione Squadra 3 (Verde)
  // 4 = Ingresso Trionfale della Coppa!
  const [step, setStep] = useSyncedState<number>(`playstate_${slideId}_step`, revealAll ? 4 : 0);
  const [trophyDismissed, setTrophyDismissed] = useSyncedState<boolean>(
    `playstate_${slideId}_trophy_dismissed`,
    false
  );

  // Audio personalizzato o sintesi audio fanfare per l'ingresso della coppa (solo finestra relatore)
  const trophyAudioRef = useRef<HTMLAudioElement | null>(null);

  const playTrophyFanfare = useCallback(() => {
    if (!canPlayAudio) return;

    if (data?.musicaIngresso) {
      try {
        if (!trophyAudioRef.current) {
          trophyAudioRef.current = new Audio(assetUrl(data.musicaIngresso));
        }
        trophyAudioRef.current.currentTime = 0;
        trophyAudioRef.current.play().catch(() => {});
        return;
      } catch {}
    }

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      // Grand celebratory victory fanfare arpeggio (C4, E4, G4, C5, E5, G5, C6) identico al gioco finale
      const notes = [261.63, 329.63, 392.0, 523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);
        gain.gain.setValueAtTime(0.24, now + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.65);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.7);
      });

      // Shimmering sparkles dorati
      for (let s = 0; s < 10; s++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200 + Math.random() * 1400, now + 0.8 + s * 0.08);
        gain.gain.setValueAtTime(0.09, now + 0.8 + s * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8 + s * 0.08 + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + 0.8 + s * 0.08);
        osc.stop(now + 0.8 + s * 0.08 + 0.22);
      }
      setTimeout(() => ctx.close(), 2600);
    } catch {}
  }, [canPlayAudio, data?.musicaIngresso]);

  useEffect(() => {
    return () => {
      if (trophyAudioRef.current) {
        trophyAudioRef.current.pause();
      }
    };
  }, []);

  // Suono cinematografico per l'entrata di ogni squadra
  const playTeamEntranceSound = useCallback(
    (teamIdx: number) => {
      if (!canPlayAudio) return;
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const now = ctx.currentTime;

        // Basso profondo per impatto
        const subOsc = ctx.createOscillator();
        const subGain = ctx.createGain();
        subOsc.type = 'triangle';
        subOsc.frequency.setValueAtTime(120, now);
        subOsc.frequency.exponentialRampToValueAtTime(45, now + 0.4);
        subGain.gain.setValueAtTime(0.35, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        subOsc.connect(subGain);
        subGain.connect(ctx.destination);
        subOsc.start(now);
        subOsc.stop(now + 0.5);

        // Accordo armonico per tono squadra
        const baseFreq = teamIdx === 1 ? 330 : teamIdx === 2 ? 392 : 440;
        [baseFreq, baseFreq * 1.25, baseFreq * 1.5].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = teamIdx === 2 ? 'sawtooth' : 'triangle';
          osc.frequency.setValueAtTime(freq, now + 0.06);
          gain.gain.setValueAtTime(0.18 / (idx + 1), now + 0.06);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + 0.06);
          osc.stop(now + 0.6);
        });

        setTimeout(() => ctx.close(), 800);
      } catch {}
    },
    [canPlayAudio]
  );

  // Azione per avanzare o passare allo step della Coppa
  const handleTriggerCup = useCallback(() => {
    setTrophyDismissed(false);
    setStep(4);
    playTrophyFanfare();
  }, [setStep, setTrophyDismissed, playTrophyFanfare]);

  // Gestione tastiera
  useEffect(() => {
    if (!interactive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        setStep((prev) => {
          const next = Math.min(4, prev + 1);
          if (next === 4 && prev !== 4) {
            setTrophyDismissed(false);
            playTrophyFanfare();
          } else if (next > prev) {
            playTeamEntranceSound(next);
          }
          return next;
        });
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setStep((prev) => {
          const next = Math.max(0, prev - 1);
          if (next < 4) setTrophyDismissed(false);
          return next;
        });
      } else if (e.key === '1') {
        setStep(1);
        playTeamEntranceSound(1);
      } else if (e.key === '2') {
        setStep(2);
        playTeamEntranceSound(2);
      } else if (e.key === '3') {
        setStep(3);
        playTeamEntranceSound(3);
      } else if (e.key === '4' || e.key.toLowerCase() === 'c') {
        handleTriggerCup();
      } else if (e.key === '0' || e.key.toLowerCase() === 'r') {
        setStep(0);
        setTrophyDismissed(false);
      } else if (e.key === 'Escape' && step === 4) {
        setTrophyDismissed((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [interactive, setStep, setTrophyDismissed, playTeamEntranceSound, handleTriggerCup, step]);

  const teamsMeta = [
    {
      num: 1,
      name: teamNames[0] || 'SQUADRA 1',
      badge: 'SQUADRA ROSSA',
      tagline: 'Guerrieri di Fuoco',
      postazione: 'Tavolo 1 • Settore Sinistro',
      roman: 'I',
      colorHex: '#ef4444',
      neonHex: '#ff3b4b',
      borderClass: 'border-red-500/70',
      bgGradient: 'from-red-950/80 via-red-900/40 to-black/80',
      glowShadow: 'shadow-[0_0_60px_rgba(239,68,68,0.45)]',
      accentPill: 'bg-red-500/20 text-red-300 border-red-500/40',
      icon: (
        <svg className="w-14 h-14 text-red-400 drop-shadow-[0_0_12px_rgba(239,68,68,0.8)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="M12 8v8M8 12h8" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      num: 2,
      name: teamNames[1] || 'SQUADRA 2',
      badge: 'SQUADRA BLU',
      tagline: 'Lampi di Cristallo',
      postazione: 'Tavolo 2 • Settore Centrale',
      roman: 'II',
      colorHex: '#3b82f6',
      neonHex: '#00d2ff',
      borderClass: 'border-blue-500/70',
      bgGradient: 'from-blue-950/80 via-sky-900/40 to-black/80',
      glowShadow: 'shadow-[0_0_60px_rgba(59,130,246,0.45)]',
      accentPill: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      icon: (
        <svg className="w-14 h-14 text-cyan-400 drop-shadow-[0_0_12px_rgba(0,210,255,0.8)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      num: 3,
      name: teamNames[2] || 'SQUADRA 3',
      badge: 'SQUADRA VERDE',
      tagline: 'Guardiani di Smeraldo',
      postazione: 'Tavolo 3 • Settore Destro',
      roman: 'III',
      colorHex: '#10b981',
      neonHex: '#00f59b',
      borderClass: 'border-emerald-500/70',
      bgGradient: 'from-emerald-950/80 via-teal-900/40 to-black/80',
      glowShadow: 'shadow-[0_0_60px_rgba(16,185,129,0.45)]',
      accentPill: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      icon: (
        <svg className="w-14 h-14 text-emerald-400 drop-shadow-[0_0_12px_rgba(16,185,129,0.8)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
          <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z" strokeLinejoin="round" />
          <path d="M5 20h14" strokeLinecap="round" />
        </svg>
      ),
    },
  ];

  const sfondoCustom = data?.sfondo || '/Icone/sfondi/sfondo_generale_torneo.jpg';

  // Raggi del sunburst rotante con maschera radiale progressiva: ZERO angoli quadrati, dissolvenza morbida a 360°
  const sunburstBackground = (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
      {/* 1. Bagliore dorato centrale sfumato verso il nero */}
      <div
        className="w-[1200px] h-[1200px] rounded-full opacity-65 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(250, 204, 21, 0.45) 0%, rgba(234, 179, 8, 0.18) 35%, rgba(234, 179, 8, 0.04) 55%, transparent 70%)',
        }}
      />
      {/* 2. Raggi solari conici rotanti: cerchio gigante (1900px) con maschera circolare radiale per sfumare dolcemente senza bordi */}
      <div
        className="absolute w-[1900px] h-[1900px] rounded-full pointer-events-none"
        style={{
          background:
            'conic-gradient(from 0deg, transparent 0deg, rgba(255,215,0,0.32) 15deg, transparent 30deg, rgba(255,215,0,0.32) 45deg, transparent 60deg, rgba(255,215,0,0.32) 75deg, transparent 90deg, rgba(255,215,0,0.32) 105deg, transparent 120deg, rgba(255,215,0,0.32) 135deg, transparent 150deg, rgba(255,215,0,0.32) 165deg, transparent 180deg, rgba(255,215,0,0.32) 195deg, transparent 210deg, rgba(255,215,0,0.32) 225deg, transparent 240deg, rgba(255,215,0,0.32) 255deg, transparent 270deg, rgba(255,215,0,0.32) 285deg, transparent 300deg, rgba(255,215,0,0.32) 315deg, transparent 330deg, rgba(255,215,0,0.32) 345deg, transparent 360deg)',
          animation: 'sunburst-spin 26s infinite linear',
          maskImage: 'radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0.85) 30%, rgba(0,0,0,0.3) 52%, rgba(0,0,0,0) 68%)',
          WebkitMaskImage: 'radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0.85) 30%, rgba(0,0,0,0.3) 52%, rgba(0,0,0,0) 68%)',
        }}
      />
    </div>
  );

  return (
    <div className="relative w-[1920px] h-[1080px] bg-[#05070c] text-white select-none overflow-hidden font-sans">
      {/* Definizione animazioni CSS trionfali */}
      <style>{`
        @keyframes trophy-spin-grow {
          0% {
            transform: scale(0.05) rotate(-540deg);
            opacity: 0;
            filter: blur(14px);
          }
          65% {
            transform: scale(1.1) rotate(12deg);
            opacity: 1;
            filter: blur(0);
          }
          85% {
            transform: scale(0.96) rotate(-4deg);
          }
          100% {
            transform: scale(1) rotate(0deg);
            opacity: 1;
          }
        }
        @keyframes trophy-glow-pulse {
          0%, 100% {
            transform: translateY(0);
            filter: drop-shadow(0 0 35px rgba(250, 204, 21, 0.6)) drop-shadow(0 0 70px rgba(250, 204, 21, 0.3));
          }
          50% {
            transform: translateY(-10px);
            filter: drop-shadow(0 0 55px rgba(250, 204, 21, 0.9)) drop-shadow(0 0 95px rgba(250, 204, 21, 0.5));
          }
        }
        @keyframes sunburst-spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
        @keyframes victory-banner-slide {
          0% {
            transform: translateY(35px);
            opacity: 0;
          }
          100% {
            transform: translateY(0);
            opacity: 1;
          }
        }
        @keyframes team-card-enter {
          0% {
            transform: translateY(40px) scale(0.92);
            opacity: 0;
            filter: blur(8px);
          }
          70% {
            transform: translateY(-6px) scale(1.02);
            opacity: 1;
            filter: blur(0);
          }
          100% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
      `}</style>

      {/* Sfondo principale per la presentazione delle squadre */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-all duration-1000 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(7,9,14,0.65) 0%, rgba(7,9,14,0.85) 60%, rgba(7,9,14,0.98) 100%), url("${assetUrl(sfondoCustom)}")`,
        }}
      />

      {/* Luce atmosferica superiore */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[300px] bg-gradient-to-b from-amber-500/15 via-amber-500/5 to-transparent blur-3xl pointer-events-none" />

      {/* ============================================================ */}
      {/* VISTA 1: SCHIERAMENTO SQUADRE (Header + 3 Pedestalli + Footer) */}
      {/* ============================================================ */}
      <div className="relative z-10 w-full h-full flex flex-col justify-between p-10">
        {/* Header Superiore Elegante TV Broadcast */}
        <header className="relative z-20 w-full flex items-center justify-between px-4 pt-2">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5 px-4 py-1.5 rounded-full text-xs font-black tracking-widest uppercase bg-amber-500/15 text-amber-300 border border-amber-400/30 backdrop-blur-md shadow-lg">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              BOX 0 • PROLOGO DEL TORNEO
            </div>
            <span className="text-white/40 text-xs font-semibold tracking-wider uppercase hidden sm:inline-block">
              Presentazione Squadre & Trofeo
            </span>
          </div>

          {/* Indicatore step per il relatore */}
          {isPresenterMode && (
            <div className="flex items-center gap-3 bg-black/70 px-5 py-2 rounded-full border border-white/15 text-xs text-white/90 backdrop-blur-md shadow-xl">
              <span className="text-white/40 font-semibold uppercase tracking-wider">Fase:</span>
              <span className="font-extrabold text-amber-400 flex items-center gap-1.5">
                {step === 0 && 'In Attesa (Premi ▶ o Spazio)'}
                {step === 1 && '1/3 • Svelata Squadra 1 (Rossa)'}
                {step === 2 && '2/3 • Svelata Squadra 2 (Blu)'}
                {step === 3 && '3/3 • Svelata Squadra 3 (Verde)'}
                {step === 4 && (trophyDismissed ? '🏆 Trofeo (Minimizzato)' : '🏆 IL SACRO TROFEO!')}
              </span>
            </div>
          )}
        </header>

        {/* Area Centrale: Titolo & 3 Monumentali Pedestalli delle Squadre */}
        <main className="relative z-20 w-full flex-1 flex flex-col items-center justify-center px-4 py-2">
          {/* Titolo Principale */}
          <div className="text-center mb-8">
            <span className="text-xs font-black tracking-[0.35em] uppercase text-amber-400/90 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]">
              IMPERIO VIII • LA SFIDA HA INIZIO
            </span>
            <h1 className="text-5xl font-black uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-300 drop-shadow-[0_4px_24px_rgba(245,158,11,0.6)] mt-1">
              {step === 0 && 'I CONTENDENTI AL TITOLO'}
              {step === 1 && 'ECCO LA PRIMA SQUADRA!'}
              {step === 2 && 'ECCO LA SECONDA SQUADRA!'}
              {step === 3 && 'ECCO LA TERZA SQUADRA!'}
              {step === 4 && 'LE 3 SQUADRE PRONTE ALLA BATTAGLIA'}
            </h1>
            <p className="text-sm font-semibold text-slate-300 tracking-wider uppercase mt-2">
              {step === 0 && 'In attesa dell\'ingresso dei guerrieri nell\'Arena...'}
              {step >= 1 && step < 4 && 'Pronte a sfidarsi senza esclusione di colpi per la gloria eterna'}
              {step === 4 && 'Tre schieramenti leggendari, ma solo uno solleverà il trofeo'}
            </p>
          </div>

          {/* Griglia delle 3 Squadre: Pedestalli di Cristallo */}
          <div className="grid grid-cols-3 gap-8 w-full max-w-[1600px] items-stretch">
            {teamsMeta.map((team, idx) => {
              const isVisible = step >= team.num;
              const isLatest = step === team.num;

              return (
                <div
                  key={team.num}
                  style={{
                    animation: isLatest ? 'team-card-enter 0.7s cubic-bezier(0.16, 1, 0.3, 1) both' : undefined,
                  }}
                  className={`relative rounded-3xl p-8 border-2 transition-all duration-700 flex flex-col justify-between min-h-[440px] backdrop-blur-xl overflow-hidden ${
                    isVisible
                      ? `${team.borderClass} ${team.glowShadow} bg-gradient-to-b ${team.bgGradient} scale-100 opacity-100`
                      : 'border-white/10 bg-black/40 opacity-30 scale-95 pointer-events-none'
                  }`}
                >
                  {/* Bagliore radiale interno alla carta */}
                  <div
                    className="absolute inset-0 pointer-events-none opacity-40 transition-opacity duration-700"
                    style={{
                      background: isVisible
                        ? `radial-gradient(circle at 50% 15%, ${team.colorHex}55 0%, transparent 65%)`
                        : 'none',
                    }}
                  />

                  {/* Riflesso superiore in stile Apple/Linear */}
                  <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />

                  {/* Top Badge & Numero Slot */}
                  <div className="relative z-10 w-full flex justify-between items-center mb-6">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[11px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border backdrop-blur-md ${
                          isVisible
                            ? team.accentPill
                            : 'bg-white/5 text-white/40 border-white/10'
                        }`}
                      >
                        {isVisible ? team.badge : `SLOT #${idx + 1}`}
                      </span>
                    </div>
                    <span
                      className="text-3xl font-black font-mono transition-colors duration-500"
                      style={{
                        color: isVisible ? team.neonHex : 'rgba(255,255,255,0.2)',
                        textShadow: isVisible ? `0 0 15px ${team.colorHex}` : 'none',
                      }}
                    >
                      {team.roman}
                    </span>
                  </div>

                  {/* Centro: Icona Emblema + Nome Squadra Gigante */}
                  <div className="relative z-10 flex flex-col items-center justify-center my-auto text-center py-4">
                    <div
                      className={`mb-4 p-4 rounded-2xl border transition-all duration-700 ${
                        isVisible
                          ? 'bg-black/40 border-white/20 scale-100'
                          : 'bg-white/5 border-white/10 scale-90 opacity-20'
                      }`}
                    >
                      {isVisible ? (
                        team.icon
                      ) : (
                        <div className="w-14 h-14 flex items-center justify-center text-white/20 font-black text-2xl font-mono">
                          ?
                        </div>
                      )}
                    </div>

                    <h2
                      className="text-4xl lg:text-5xl font-black uppercase tracking-tight drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)] leading-tight max-w-[420px] transition-all duration-500"
                      style={{
                        color: isVisible ? '#ffffff' : 'rgba(255,255,255,0.3)',
                        textShadow: isVisible
                          ? `0 0 25px ${team.colorHex}88, 0 2px 10px rgba(0,0,0,0.9)`
                          : 'none',
                      }}
                    >
                      {isVisible ? team.name : `SQUADRA ${team.num}`}
                    </h2>

                    <p className="text-xs font-bold tracking-[0.2em] uppercase mt-3 transition-colors duration-500"
                       style={{ color: isVisible ? team.neonHex : 'rgba(255,255,255,0.2)' }}>
                      {isVisible ? team.tagline : 'In attesa di svelamento...'}
                    </p>
                  </div>

                  {/* Footer Carta: Posizione & Stato */}
                  <div className="relative z-10 w-full pt-4 border-t border-white/15 flex items-center justify-between text-xs">
                    <span className="text-white/50 font-medium">
                      {isVisible ? team.postazione : 'Postazione Riservata'}
                    </span>
                    <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider">
                      {isVisible ? (
                        <>
                          <span className="w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: team.neonHex }} />
                          <span style={{ color: team.neonHex }}>In Gara</span>
                        </>
                      ) : (
                        <span className="text-white/30">Non Svelata</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </main>

        {/* Controlli Relatore in Basso nella schermata squadre */}
        {isPresenterMode && interactive && (
          <footer className="relative z-40 w-full flex flex-col items-center gap-2 pt-3 border-t border-white/10">
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setStep(0);
                  setTrophyDismissed(false);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                  step === 0
                    ? 'bg-white/20 border-white/40 text-white shadow-md'
                    : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                }`}
              >
                Reset [0]
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setTrophyDismissed(false);
                  playTeamEntranceSound(1);
                }}
                className={`px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                  step === 1
                    ? 'bg-red-600 border-red-400 text-white shadow-lg shadow-red-500/40 scale-105'
                    : 'bg-red-950/40 border-red-800 text-red-300 hover:bg-red-900/50'
                }`}
              >
                1. Squadra 1 (Rossa) [1]
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep(2);
                  setTrophyDismissed(false);
                  playTeamEntranceSound(2);
                }}
                className={`px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                  step === 2
                    ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/40 scale-105'
                    : 'bg-blue-950/40 border-blue-800 text-blue-300 hover:bg-blue-900/50'
                }`}
              >
                2. Squadra 2 (Blu) [2]
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep(3);
                  setTrophyDismissed(false);
                  playTeamEntranceSound(3);
                }}
                className={`px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                  step === 3
                    ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg shadow-emerald-500/40 scale-105'
                    : 'bg-emerald-950/40 border-emerald-800 text-emerald-300 hover:bg-emerald-900/50'
                }`}
              >
                3. Squadra 3 (Verde) [3]
              </button>
              <button
                type="button"
                onClick={handleTriggerCup}
                className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition-all cursor-pointer ${
                  step === 4
                    ? 'bg-yellow-500 border-yellow-300 text-black shadow-xl shadow-yellow-500/50 scale-105 animate-pulse'
                    : 'bg-yellow-950/40 border-yellow-700 text-yellow-300 hover:bg-yellow-900/50'
                }`}
              >
                🏆 4. Ingresso Coppa! [4 / C]
              </button>

              {step === 4 && trophyDismissed && (
                <button
                  type="button"
                  onClick={() => setTrophyDismissed(false)}
                  className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-amber-500/25 text-amber-300 border border-amber-400/50 hover:bg-amber-500/40 transition-all cursor-pointer shadow-lg animate-bounce"
                >
                  Riapri Coppa 🏆
                </button>
              )}
            </div>

            <span className="text-[11px] text-white/40 tracking-wider">
              Scorciatoie: <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[10px] text-white/70">1-3</kbd> Squadre • <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[10px] text-white/70">4</kbd> o <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[10px] text-white/70">C</kbd> Coppa • <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[10px] text-white/70">Invio</kbd> / <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[10px] text-white/70">Spazio</kbd> Avanza
            </span>
          </footer>
        )}
      </div>

      {/* ============================================================ */}
      {/* VISTA 2: FULLSCREEN 1920x1080 COPPA DELLA VITTORIA (STEP 4) */}
      {/* Copre al 100% l'intero schermo senza alcuna fuga di bordi */}
      {/* Raggi organici rotanti privi di quadrato o spigoli visibili */}
      {/* ============================================================ */}
      {step === 4 && !trophyDismissed && (
        <div className="absolute inset-0 z-50 w-[1920px] h-[1080px] bg-gradient-to-b from-[#04060a] via-[#070b13] to-[#020306] flex flex-col justify-between p-10 select-none animate-fade-in overflow-hidden">
          {/* Header Superiore nella schermata Coppa */}
          <header className="relative z-20 w-full flex items-center justify-between px-4 pt-2">
            <div className="flex items-center gap-3">
              <span className="px-4 py-1.5 rounded-full text-xs font-black tracking-widest uppercase bg-yellow-400/20 text-yellow-300 border border-yellow-400/40 shadow-lg">
                🏆 PREMIO UFFICIALE DI IMPERIO VIII
              </span>
              <span className="text-white/40 text-xs font-semibold tracking-wider uppercase hidden sm:inline-block">
                In palio per l'unica squadra vincitrice
              </span>
            </div>

            {isPresenterMode && (
              <button
                type="button"
                onClick={() => setTrophyDismissed(true)}
                className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-white/10 hover:bg-white/20 text-white/80 border border-white/20 transition-all cursor-pointer"
              >
                Minimizza Coppa [Esc] ✕
              </button>
            )}
          </header>

          {/* Area Centrale: Raggi Solari Organici + Coppa 3D + Annuncio */}
          <main className="relative z-20 w-full flex-1 flex flex-col items-center justify-center">
            {/* Raggi solari organici senza cornice squadrata */}
            {sunburstBackground}

            {/* Container Trofeo Trionfale */}
            <div
              className="relative flex flex-col items-center justify-center z-10 max-w-3xl px-8"
              style={{
                animation: 'trophy-spin-grow 1.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
              }}
            >
              {/* Top celebratory header */}
              <div
                className="flex flex-col items-center mb-2 text-center"
                style={{ animation: 'victory-banner-slide 0.8s ease-out 0.9s both' }}
              >
                <span className="text-xs sm:text-sm font-black tracking-[0.35em] uppercase text-yellow-300 drop-shadow-[0_0_14px_rgba(250,204,21,0.9)] bg-black/80 px-6 py-2 rounded-full border border-yellow-400/50 backdrop-blur-md shadow-2xl">
                  🏆 IL SACRO TROFEO DI IMPERIO VIII 🏆
                </span>
              </div>

              {/* 3D Golden Trophy con effetto floating e pulse */}
              <div
                className="relative flex flex-col items-center justify-center my-3"
                style={{ animation: 'trophy-glow-pulse 3s infinite ease-in-out 1.6s' }}
              >
                <img
                  src={assetUrl('/Icone/finale/trofeo_vittoria.png')}
                  alt="Coppa della Vittoria Imperio"
                  className="w-[360px] sm:w-[420px] md:w-[460px] h-auto object-contain pointer-events-none drop-shadow-[0_25px_60px_rgba(0,0,0,0.95)]"
                />
              </div>

              {/* Annuncio e Titolo Trionfale */}
              <div
                className="flex flex-col items-center mt-2 text-center"
                style={{ animation: 'victory-banner-slide 0.8s ease-out 1.1s both' }}
              >
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-100 to-amber-300 drop-shadow-[0_4px_16px_rgba(245,158,11,0.7)]">
                  IN PALIO PER I VINCITORI ASSOLUTI
                </h2>
                <span className="text-xs sm:text-sm font-bold uppercase tracking-[0.25em] text-yellow-200/90 mt-2">
                  TRE SQUADRE CONTENDENTI • UN SOLO SCHIERAMENTO TRIONFERÀ
                </span>

                {/* Chip riassuntive delle 3 squadre sotto la Coppa */}
                <div className="flex items-center gap-3 mt-4">
                  <div className="px-3.5 py-1 rounded-full bg-red-950/70 border border-red-500/60 text-[11px] font-bold text-red-300 backdrop-blur-md shadow-md">
                    🔴 {teamNames[0] || 'Squadra 1'}
                  </div>
                  <span className="text-yellow-400/60 font-black text-xs">VS</span>
                  <div className="px-3.5 py-1 rounded-full bg-blue-950/70 border border-blue-500/60 text-[11px] font-bold text-blue-300 backdrop-blur-md shadow-md">
                    🔵 {teamNames[1] || 'Squadra 2'}
                  </div>
                  <span className="text-yellow-400/60 font-black text-xs">VS</span>
                  <div className="px-3.5 py-1 rounded-full bg-emerald-950/70 border border-emerald-500/60 text-[11px] font-bold text-emerald-300 backdrop-blur-md shadow-md">
                    🟢 {teamNames[2] || 'Squadra 3'}
                  </div>
                </div>

                {/* Pulsante per minimizzare/chiudere l'overlay della coppa per rivedere le 3 squadre */}
                <button
                  type="button"
                  onClick={() => setTrophyDismissed(true)}
                  className="mt-6 px-6 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all cursor-pointer shadow-lg hover:scale-105 active:scale-95 backdrop-blur-md"
                  title="Chiudi per visualizzare i cartelloni completi delle 3 squadre"
                >
                  Mostra Schieramento Completo ✕
                </button>
              </div>
            </div>
          </main>

          {/* Footer Controlli Relatore anche dentro l'overlay per non perdere il controllo */}
          {isPresenterMode && interactive && (
            <footer className="relative z-40 w-full flex items-center justify-center gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  setStep(0);
                  setTrophyDismissed(false);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border border-white/15 bg-white/5 hover:bg-white/10 text-white/70 transition-all cursor-pointer"
              >
                Reset [0]
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setTrophyDismissed(false);
                  playTeamEntranceSound(1);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border border-red-800 bg-red-950/40 hover:bg-red-900/50 text-red-300 transition-all cursor-pointer"
              >
                1. Squadra 1
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep(2);
                  setTrophyDismissed(false);
                  playTeamEntranceSound(2);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border border-blue-800 bg-blue-950/40 hover:bg-blue-900/50 text-blue-300 transition-all cursor-pointer"
              >
                2. Squadra 2
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep(3);
                  setTrophyDismissed(false);
                  playTeamEntranceSound(3);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border border-emerald-800 bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 transition-all cursor-pointer"
              >
                3. Squadra 3
              </button>
              <button
                type="button"
                onClick={() => setTrophyDismissed(true)}
                className="px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-white/15 hover:bg-white/25 text-white border border-white/30 transition-all cursor-pointer shadow-md"
              >
                Mostra Squadre [Esc]
              </button>
            </footer>
          )}
        </div>
      )}
    </div>
  );
}
