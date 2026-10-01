import { useState, useRef, useEffect, useCallback } from 'react';
import { useGameData } from './context/GameDataContext';
import { assetUrl } from './lib/assetUrl';
import { useSyncedState } from './hooks/useSyncedState';

interface VideoData {
  src?: string;
  videoUrl?: string;
  titolo?: string;
  sottotitolo?: string;
  slideId?: string;
  notePresentatore?: string;
}

interface VideoBoardProps {
  interactive?: boolean;
  revealAll?: boolean;
}

export default function VideoBoard({ interactive = true }: VideoBoardProps) {
  const data = useGameData<VideoData>();
  const slideId = data?.slideId || 'video_slide';
  const rawSrc = data?.src || data?.videoUrl || '';
  const videoSrc = rawSrc ? assetUrl(rawSrc) : '';
  const titolo = data?.titolo || 'Video';
  const sottotitolo = data?.sottotitolo || 'Riproduzione Video';

  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Sincronizzazione dello stato di riproduzione tra finestre (Relatore <-> Schermo Pubblico)
  const [isPlaying, setIsPlaying] = useSyncedState<boolean>(`playstate_${slideId}_video_playing`, false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const hideControlsTimer = useRef<NodeJS.Timeout | null>(null);

  // Sincronizza lo stato play/pause del tag video con lo stato sincronizzato
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.play().catch((err) => {
        console.warn('Autoplay video bloccato o non riuscito:', err);
      });
    } else {
      video.pause();
    }
  }, [isPlaying]);

  // Gestione controlli cursore e interfaccia
  const handleMouseMove = () => {
    setShowControls(true);
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    hideControlsTimer.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 2500);
  };

  const togglePlay = useCallback(() => {
    setIsPlaying(!isPlaying);
  }, [isPlaying, setIsPlaying]);

  const restartVideo = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  }, [setIsPlaying]);

  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  }, []);

  // Scorciatoie da tastiera se interattivo
  useEffect(() => {
    if (!interactive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      if (e.key === ' ' || e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'r' || e.key === 'R' || e.key === '0') {
        e.preventDefault();
        restartVideo();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        toggleMute();
      } else if (e.key === 'ArrowRight') {
        if (videoRef.current) {
          videoRef.current.currentTime = Math.min(videoRef.current.duration, videoRef.current.currentTime + 5);
        }
      } else if (e.key === 'ArrowLeft') {
        if (videoRef.current) {
          videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [interactive, togglePlay, restartVideo, toggleMute]);

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      onMouseMove={handleMouseMove}
      className="relative w-[1920px] h-[1080px] bg-black text-white flex items-center justify-center overflow-hidden font-sans select-none"
    >
      {videoSrc ? (
        <>
          <video
            ref={videoRef}
            src={videoSrc}
            playsInline
            className="w-full h-full object-contain cursor-pointer"
            onClick={interactive ? togglePlay : undefined}
            onTimeUpdate={() => {
              if (videoRef.current) {
                setCurrentTime(videoRef.current.currentTime);
              }
            }}
            onLoadedMetadata={() => {
              if (videoRef.current) {
                setDuration(videoRef.current.duration);
              }
            }}
            onEnded={() => {
              setIsPlaying(false);
              setShowControls(true);
            }}
          />

          {/* Icona Play centrale quando in pausa */}
          {!isPlaying && interactive && (
            <div 
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center bg-black/35 backdrop-blur-[1px] cursor-pointer transition-all duration-300"
            >
              <div className="w-28 h-28 rounded-full bg-amber-500/90 text-black flex items-center justify-center pl-2 text-5xl shadow-[0_0_50px_rgba(245,158,11,0.6)] transform hover:scale-110 active:scale-95 transition-transform">
                ▶
              </div>
            </div>
          )}

          {/* Barra di Controllo Inferiore Flottante */}
          {interactive && (
            <div 
              className={`absolute bottom-6 left-12 right-12 bg-[#18181b]/90 border border-white/15 rounded-2xl p-4 shadow-2xl backdrop-blur-md flex flex-col gap-2 transition-all duration-300 ${
                showControls || !isPlaying ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
              }`}
            >
              {/* Barra di Progresso */}
              <div 
                className="w-full h-2.5 bg-white/20 rounded-full cursor-pointer relative overflow-hidden group"
                onClick={(e) => {
                  if (!videoRef.current || !duration) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pos = (e.clientX - rect.left) / rect.width;
                  videoRef.current.currentTime = pos * duration;
                }}
              >
                <div 
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-100"
                  style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                />
              </div>

              {/* Bottoni di Controllo */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-4">
                  {/* Play / Pausa */}
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-lg transition-all"
                    title={isPlaying ? 'Pausa (Spazio)' : 'Riproduci (Spazio)'}
                  >
                    {isPlaying ? '⏸' : '▶'}
                  </button>

                  {/* Ricomincia da capo */}
                  <button
                    type="button"
                    onClick={restartVideo}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white/80 hover:text-white flex items-center gap-1.5 transition-all"
                    title="Ricomincia da capo (R)"
                  >
                    <span>⏪</span>
                    <span>Ricomincia</span>
                  </button>

                  {/* Mute */}
                  <button
                    type="button"
                    onClick={toggleMute}
                    className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm transition-all"
                    title={isMuted ? 'Riattiva audio (M)' : 'Silenzia (M)'}
                  >
                    {isMuted ? '🔇' : '🔊'}
                  </button>

                  {/* Tempo di riproduzione */}
                  <span className="text-xs font-mono font-bold text-white/70">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-xs font-black uppercase text-amber-400 tracking-wider">
                      {titolo}
                    </div>
                    <div className="text-[10px] text-white/50">
                      {sottotitolo}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Schermata Placeholder quando nessun video è caricato */
        <div className="flex flex-col items-center justify-center text-center p-16 max-w-3xl">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-amber-500/20 to-orange-600/20 border-2 border-amber-500/40 flex items-center justify-center text-5xl mb-6 shadow-2xl shadow-amber-500/10 animate-pulse">
            🎬
          </div>

          <h2 className="text-5xl font-black text-white uppercase tracking-wider mb-3">
            {titolo}
          </h2>

          <p className="text-lg font-bold text-amber-300 uppercase tracking-widest mb-6">
            {sottotitolo}
          </p>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-sm text-slate-300 max-w-lg leading-relaxed shadow-xl">
            <p className="mb-2 font-semibold text-white">
              Nessun file video collegato a questo step.
            </p>
            <p className="text-xs text-white/50">
              Puoi caricare il video corrispondente (formato MP4 o WebM) dal pannello <strong className="text-amber-400">Setup Pagina 0</strong>.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
