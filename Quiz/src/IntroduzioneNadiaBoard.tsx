import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useGameData } from './context/GameDataContext';
import { assetUrl } from './lib/assetUrl';

interface IntroduzioneNadiaData {
  slideId?: string;
  titolo?: string;
  sottotitolo?: string;
  sfondo?: string;
  video?: string;
  videoUrl?: string;
  src?: string;
  audioStacchetto?: string;
  notePresentatore?: string;
}

interface IntroduzioneNadiaBoardProps {
  interactive?: boolean;
  revealAll?: boolean;
  isPresenter?: boolean;
}

export default function IntroduzioneNadiaBoard({
  interactive = true,
  isPresenter = false,
}: IntroduzioneNadiaBoardProps) {
  const data = useGameData<IntroduzioneNadiaData>();

  // Determinazione se siamo in modalità relatore
  const isPresenterMode = useMemo(() => {
    if (isPresenter !== undefined && isPresenter !== false) return true;
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    if (params.get('sandbox') === 'true') return true;
    if (params.get('mode') === 'games' || params.get('mode') === 'scores') return false;
    return isPresenter || params.get('mode') === 'presenter' || !params.get('mode');
  }, [isPresenter]);

  const canPlayAudio = interactive && isPresenterMode;

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

  // Controllo presenza video configurato
  const videoSrc = data?.video || data?.videoUrl || data?.src || '';
  const hasVideo = Boolean(videoSrc && videoSrc.trim() !== '');

  // Gestione Video (se configurato)
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = !isPresenterMode;
    }
  }, [isPresenterMode]);

  // Gestione Audio Sigla Nadia (se non c'è video)
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);

  const toggleNadiaMusic = useCallback(() => {
    if (!canPlayAudio) return;
    if (audioRef.current) {
      if (audioRef.current.paused) {
        audioRef.current.play().then(() => setIsAudioPlaying(true)).catch(() => {});
      } else {
        audioRef.current.pause();
        setIsAudioPlaying(false);
      }
    } else {
      const audioUrl = assetUrl(data?.audioStacchetto || '/Audio/strumenti/0_MilleeunaNadia_versionelunga.mp3');
      const audio = new Audio(audioUrl);
      audio.onplay = () => setIsAudioPlaying(true);
      audio.onpause = () => setIsAudioPlaying(false);
      audio.onended = () => setIsAudioPlaying(false);
      audioRef.current = audio;
      audio.play().then(() => setIsAudioPlaying(true)).catch(() => {});
    }
  }, [canPlayAudio]);

  // Pulizia audio/video all'unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Scorciatoie tastiera: M per musica, K o Spazio per video
  useEffect(() => {
    if (!interactive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (hasVideo) {
        if (e.key === ' ' || e.key.toLowerCase() === 'k') {
          e.preventDefault();
          if (videoRef.current) {
            if (videoRef.current.paused) {
              videoRef.current.play().then(() => setIsVideoPlaying(true)).catch(() => {});
            } else {
              videoRef.current.pause();
              setIsVideoPlaying(false);
            }
          }
        }
      } else {
        if (e.key.toLowerCase() === 'm') {
          e.preventDefault();
          toggleNadiaMusic();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [interactive, hasVideo, toggleNadiaMusic]);

  // Sfondo: Lampada di Nadia al centro
  const defaultBg = '/Icone/sfondi/sfondo_nadia_lampada.jpg';
  const customBg = data?.sfondo || defaultBg;
  const bgImage = assetUrl(customBg);

  // CASO 1: Riproduzione Video (se presente nel Setup)
  if (hasVideo) {
    return (
      <div className="relative w-[1920px] h-[1080px] bg-black text-white select-none overflow-hidden flex flex-col items-center justify-center font-sans">
        <video
          ref={videoRef}
          src={assetUrl(videoSrc)}
          className="w-full h-full object-contain"
          playsInline
          autoPlay={false}
          controls={false}
          onPlay={() => setIsVideoPlaying(true)}
          onPause={() => setIsVideoPlaying(false)}
          onEnded={() => setIsVideoPlaying(false)}
        />

        {/* Overlay Controlli Relatore per il Video */}
        {isPresenterMode && interactive && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 bg-black/80 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/20 flex items-center gap-4">
            <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
              🎬 Video Intro Nadia
            </span>
            <button
              type="button"
              onClick={() => {
                if (videoRef.current) {
                  if (videoRef.current.paused) {
                    videoRef.current.play().catch(() => {});
                  } else {
                    videoRef.current.pause();
                  }
                }
              }}
              className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase cursor-pointer transition-all"
            >
              {isVideoPlaying ? '⏸ Pausa' : '▶ Riproduci'}
            </button>
            <button
              type="button"
              onClick={() => {
                if (videoRef.current) {
                  videoRef.current.currentTime = 0;
                  videoRef.current.play().catch(() => {});
                }
              }}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs uppercase cursor-pointer transition-all"
            >
              Riavvia
            </button>
          </div>
        )}
      </div>
    );
  }

  // CASO 2: Ambientazione Mille e una Nadia (quello che già c'è per Nadia ma senza la parte delle domande)
  return (
    <div className="relative w-[1920px] h-[1080px] select-none overflow-hidden flex flex-col items-center justify-between p-12 bg-black text-white font-sans">
      {/* Sfondo basato sulla mappa e lampada con overlay cinematografico scuro */}
      {bgImage ? (
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-700 pointer-events-none"
          style={{ backgroundImage: `url("${bgImage}")` }}
        >
          {/* Overlay scuro soffuso + vignettatura dorata */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/55 to-black/75" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-500/15 via-transparent to-black/70" />
        </div>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#1b0a2a] via-[#090814] to-[#12081f]">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/20 via-transparent to-transparent" />
        </div>
      )}

      {/* Header Superiore Elegante con Stato Squadre (Identico a Mille e una Nadia) */}
      <header className="relative z-10 w-full flex items-center justify-between pt-2">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-600 p-[2px] shadow-lg shadow-orange-500/30">
            <div className="w-full h-full bg-[#140c1e] rounded-[14px] flex items-center justify-center">
              <span className="text-3xl">✨</span>
            </div>
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-orange-300 to-yellow-200 uppercase drop-shadow-[0_2px_10px_rgba(245,158,11,0.4)]">
              Mille e una Nadia
            </h1>
            <p className="text-xs tracking-wider uppercase text-amber-200/70 font-semibold mt-0.5">
              Evento Speciale • Intermezzo a Sorpresa tra i Box
            </p>
          </div>
        </div>

        {/* Indicatore Squadre in Gara */}
        <div className="flex items-center gap-3">
          {[1, 2, 3].map((tNum) => {
            const teamName = teamNames[tNum - 1] || `Squadra ${tNum}`;
            return (
              <div
                key={tNum}
                className="px-4 py-2 rounded-xl border border-white/20 bg-black/50 backdrop-blur-md text-xs font-black uppercase tracking-wider flex items-center gap-2"
              >
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    tNum === 1 ? 'bg-red-400' : tNum === 2 ? 'bg-blue-400' : 'bg-emerald-400'
                  }`}
                />
                <span>{teamName}</span>
              </div>
            );
          })}
        </div>
      </header>

      {/* Area Centrale: Ambientazione Magica & Presentazione Lore */}
      <main className="relative z-10 w-full max-w-[1550px] flex-1 flex flex-col items-center justify-center py-6">
        {/* Lampada Dorata Fluttuante con Bagliore */}
        <div className="relative mb-8 flex flex-col items-center justify-center">
          <div className="w-[420px] h-[420px] rounded-full bg-amber-500/20 blur-3xl absolute -z-10 animate-pulse" />
          <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-amber-300 via-orange-500 to-amber-700 p-1 shadow-[0_0_60px_rgba(245,158,11,0.6)] flex items-center justify-center animate-[bounce_3.5s_ease-in-out_infinite]">
            <div className="w-full h-full rounded-[22px] bg-[#1a0f28] flex items-center justify-center">
              <span className="text-6xl select-none">🪔</span>
            </div>
          </div>
        </div>

        {/* Card Regolamento / Presentazione Nadia */}
        <div className="w-full max-w-4xl p-8 rounded-3xl bg-black/60 border-2 border-amber-500/40 shadow-[0_0_80px_rgba(245,158,11,0.25)] backdrop-blur-xl flex flex-col gap-6 text-center">
          <div>
            <span className="px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest bg-amber-500/20 text-amber-300 border border-amber-400/40 inline-block mb-3">
              COME FUNZIONA L'EVENTO SPECIALE
            </span>
            <h2 className="text-3xl font-black uppercase tracking-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
              La Sfida della Lampada Magica
            </h2>
          </div>

          <div className="grid grid-cols-3 gap-6 text-left">
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-sm">
                1
              </div>
              <h3 className="text-sm font-black text-amber-300 uppercase tracking-wide">
                Apparizione Improvvisa
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                Tra un Box e l'altro, il suono della sigla annuncerà l'arrivo a sorpresa di Nadia sul grande schermo.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-2">
              <div className="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-300 flex items-center justify-center font-bold text-sm">
                2
              </div>
              <h3 className="text-sm font-black text-orange-300 uppercase tracking-wide">
                Domanda a 3 Opzioni
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                Una domanda a tema con 3 opzioni (A, B, C). Le squadre si prenotano col pulsante rapido appena svelate.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-sm">
                3
              </div>
              <h3 className="text-sm font-black text-emerald-300 uppercase tracking-wide">
                +1000 Punti in Palio
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                Chi indovina guadagna 1000 punti immediati in classifica. In caso di errore, la squadra viene esclusa!
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Relatore con Tasto Stacchetto Nadia */}
      <footer className="relative z-40 w-full flex items-center justify-between pt-4 border-t border-white/10">
        <span className="text-xs text-white/50">
          Scorciatoia: <strong>M</strong> per avviare/fermare la sigla musicale di Nadia
        </span>

        {isPresenterMode && interactive && (
          <button
            type="button"
            onClick={toggleNadiaMusic}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider border transition-all cursor-pointer flex items-center gap-2 ${
              isAudioPlaying
                ? 'bg-amber-500 border-amber-300 text-black shadow-lg shadow-amber-500/50 animate-pulse'
                : 'bg-white/10 hover:bg-white/20 border-white/20 text-white'
            }`}
          >
            <span>{isAudioPlaying ? '⏸' : '🎵'}</span>
            <span>{isAudioPlaying ? 'Pausa Sigla Nadia' : 'Suona Sigla Nadia'}</span>
          </button>
        )}
      </footer>
    </div>
  );
}
