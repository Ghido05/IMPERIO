import React, { useState, useEffect } from "react";
import gameData from "./data/ClassificaMusicale_Data.json";

type ClassificaMusicaleData = {
  titolo: string;
  sfondo: string;
  audio?: string;
  canzoneFinale?: string;
  immagineSegreta?: string;
  elementi: Array<{
    posizione: number;
    testo: string;
    immagine?: string;
    audio?: string;
  }>;
};

const ClassificaMusicaleBoard = (): React.JSX.Element => {
  const data = gameData as ClassificaMusicaleData;
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const [showError, setShowError] = useState(false);
  const [isAutoAdvancing, setIsAutoAdvancing] = useState(false);
  const [showTitle, setShowTitle] = useState(false);
  
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (data.audio) {
      audioRef.current = new Audio(data.audio);
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const isGameComplete = Array.from({ length: 7 }, (_, i) => i + 1).every(i => revealed[i]);

  useEffect(() => {
    if (showError) {
      const timer = setTimeout(() => setShowError(false), 800);
      return () => clearTimeout(timer);
    }
  }, [showError]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (isAutoAdvancing) {
      const nextClue = Array.from({ length: 7 }, (_, i) => i + 1).find(i => !revealed[i]);
      if (nextClue) {
        timer = setTimeout(() => {
          setRevealed(prev => ({ ...prev, [nextClue]: true }));
        }, 1000);
      } else {
        setIsAutoAdvancing(false);
      }
    }
    return () => clearTimeout(timer);
  }, [revealed, isAutoAdvancing]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isAutoAdvancing) return;

      const key = e.key;
      if (key >= '1' && key <= '7') {
        setRevealed(prev => ({ ...prev, [Number(key)]: true }));
      } else if (key.toLowerCase() === 's' || key === 'Enter') {
        setIsAutoAdvancing(true);
      } else if (key.toLowerCase() === 'e' || key.toLowerCase() === 'x') {
        setShowError(true);
      } else if (key.toLowerCase() === 't') {
        setShowTitle(true);
      } else if (key.toLowerCase() === 'm') {
        if (audioRef.current) {
          if (audioRef.current.paused) {
            audioRef.current.play().catch(err => console.error("Audio play error:", err));
          } else {
            audioRef.current.pause();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAutoAdvancing]);

  // Griglia 4x4 (16 tasselli)
  const totalTiles = 16;
  const tileOrder = React.useMemo(() => {
    return Array.from({ length: totalTiles }, (_, i) => i)
      .sort(() => Math.random() - 0.5);
  }, []);

  const getTilesToRevealCount = (clueIndex: number) => {
    if (clueIndex <= 5) return 2;
    return 3;
  };

  const isTileRevealed = (tileIndex: number) => {
    let currentTilesSum = 0;
    const orderIndexInSequence = tileOrder.indexOf(tileIndex);
    
    for (let i = 1; i <= 7; i++) {
      currentTilesSum += getTilesToRevealCount(i);
      if (orderIndexInSequence < currentTilesSum) {
        return !!revealed[i];
      }
    }
    return false;
  };

  // Nuove proporzioni per 7 elementi distanziati meglio
  const rankingMarkers = [
    { value: 7, top: "22.5%" },
    { value: 6, top: "37%" },
    { value: 5, top: "46%" },
    { value: 4, top: "55%" },
    { value: 3, top: "64%" },
    { value: 2, top: "73%" },
    { value: 1, top: "82%" }
  ];

  const leftPos = "10.000%";

  return (
    <div 
      className={`relative w-full min-h-screen ${gameData.sfondo ? 'bg-black' : 'bg-gradient-to-br from-neutral-950 to-neutral-900'} overflow-hidden flex items-center justify-center transition-transform duration-100 ${showError ? 'animate-shake' : ''}`}
      style={data.sfondo ? { backgroundImage: `url(${data.sfondo})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' } : {}}
    >
      {/* Overlay Errore */}
      {showError && (
        <div className="absolute inset-0 z-[100] pointer-events-none flex items-center justify-center">
          <div className="absolute inset-0 animate-flash-red" />
          <svg 
            className="w-[45%] h-auto text-red-600 drop-shadow-[0_0_50px_rgba(220,38,38,0.9)] animate-error-x" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="4" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </div>
      )}

      <div className="relative w-full max-w-[1920px] aspect-[16/9]">
        
        {/* Titolo centrale in alto */}
        <div
          className={`absolute left-[28.75%] top-[5%] w-[42.5%] h-[10%] bg-[#792ba6] border-[#0f2d54] flex items-center justify-center px-[2%] transition-all duration-1000 ${showTitle ? 'shadow-[0_0_40px_rgba(121,43,166,0.6)]' : ''}`}
          style={{
            borderWidth: "clamp(4px, 0.5208vw, 10px)",
            borderRadius: "clamp(30px, 6.5vw, 124px)"
          }}
        >
          <h1 className={`text-white font-black uppercase tracking-tight text-[clamp(16px,2vw,42px)] text-center leading-none transition-all duration-1000 ${showTitle ? 'opacity-100 scale-100 blur-none' : 'opacity-0 scale-90 blur-[10px]'}`}>
            {data.titolo}
          </h1>
        </div>

        {/* BOX BACKGROUNDS - Adattati alle nuove posizioni */}
        
        {/* Box Yellow (7) */}
        <div
          className="absolute w-[33.229%] border-[#002164] bg-[#f7f700] top-[24%] h-[12%] transition-all duration-700"
          style={{
            left: leftPos,
            borderWidth: "clamp(2px, 0.2604vw, 5px)",
            borderRadius: "clamp(6px, 0.5208vw, 10px)"
          }}
        />

        {/* Box Green (5, 6) */}
        <div
          className="absolute w-[33.229%] border-[#002164] bg-[#00ff00] top-[34.5%] h-[18.5%] transition-all duration-700"
          style={{
            left: leftPos,
            borderWidth: "clamp(2px, 0.2604vw, 5px)",
            borderRadius: "clamp(6px, 0.5208vw, 10px)"
          }}
        />

        {/* Box Blue (1, 2, 3, 4) */}
        <div
          className="absolute w-[33.229%] border-[#002164] bg-[#00b3f6] top-[53.5%] h-[35.5%] transition-all duration-700"
          style={{
            left: leftPos,
            borderWidth: "clamp(2px, 0.2604vw, 5px)",
            borderRadius: "clamp(6px, 0.5208vw, 10px)"
          }}
        />

        {/* TESTI INDIZI, MARKER NUMERICI E CERCHI IMMAGINE */}
        {rankingMarkers.map((marker) => (
          <React.Fragment key={marker.value}>
             {/* Marker numerico a sinistra */}
             <div
              className="absolute w-[3%] aspect-square bg-[#3a3838] border-[#002164] flex items-center justify-center"
              style={{
                left: `calc(${leftPos} - 4%)`,
                top: marker.value === 7 ? `calc(${marker.top} - 10%)` : `calc(${marker.top} + 0.5%)`,
                borderWidth: "clamp(2px, 0.2083vw, 4px)",
                borderRadius: "clamp(6px, 0.5208vw, 10px)"
              }}
            >
              <span className="text-white font-black text-[clamp(12px,1.4vw,26px)] leading-none">
                {marker.value}
              </span>
            </div>

            {/* Testo dell'indizio */}
            <div
              className="absolute w-[33.229%] flex items-center justify-center px-[2%]"
              style={{
                left: leftPos,
                top: marker.top,
                height: "4.352%"
              }}
            >
              <p className={`w-full font-black uppercase text-[clamp(10px,1.2vw,24px)] leading-tight text-center ${marker.value <= 4 ? 'text-white' : 'text-[#1b1b1b]'}`}>
                {revealed[marker.value] ? data.elementi[marker.value - 1]?.testo : ""}
              </p>
            </div>

            {/* Linea di collegamento */}
            <div 
              className={`absolute w-[1.573%] h-[2px] bg-[#002164] transition-all duration-700 ${revealed[marker.value] ? 'opacity-100' : 'opacity-0'}`}
              style={{
                left: `calc(${leftPos} + 33.229%)`,
                top: `calc(${marker.top} + 2.176%)`,
              }}
            />

            {/* Cerchio immagine a della lista */}
            <div
              className={`absolute w-[3.5%] aspect-square bg-[#3a3838] border-[#002164] rounded-full flex items-center justify-center transition-all duration-700 overflow-hidden ${revealed[marker.value] ? 'opacity-100 scale-100' : 'opacity-25 scale-90'}`}
              style={{
                left: `calc(${leftPos} + 34.802%)`,
                top: marker.value === 7 ? `calc(${marker.top} - 0.7%)` : `calc(${marker.top} + 0.3%)`,
                borderWidth: "clamp(2px, 0.2083vw, 4px)"
              }}
            >
              <img 
                src={data.elementi[marker.value - 1]?.immagine} 
                alt={`Strumento ${marker.value}`}
                className="w-[80%] h-[80%] object-contain"
              />
            </div>
          </React.Fragment>
        ))}

        {/* AREA IMMAGINE SEGRETA A DESTRA */}
        <div className="absolute right-[5%] top-[25%] w-[35%] aspect-square border-[#8e3600] bg-black overflow-hidden shadow-2xl"
          style={{ borderWidth: "clamp(6px, 1.0417vw, 18px)" }}
        >
          {/* L'Immagine Segreta */}
          <img 
            src={data.immagineSegreta || "/Icone/Il mio nome è nessuno_img/Prova.png"} 
            alt="Immagine Segreta" 
            className="w-full h-full object-cover"
          />
          
          {/* Griglia di Copertura (16 Tasselli - 4x4) */}
          <div 
            className="absolute inset-0 grid grid-cols-4 grid-rows-4"
          >
            {Array.from({ length: 16 }).map((_, i) => (
              <div 
                key={i}
                className={`w-full h-full bg-[#181a1d] border border-white/5 transition-all duration-700 ease-in-out ${
                  isTileRevealed(i) ? 'opacity-0 scale-95' : 'opacity-100'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Pill inferiore centrale */}
        <div
          className={`absolute left-[32.11%] bottom-[2%] w-[35.781%] h-[7%] bg-[#792ba6] border-[#0f2d54] flex items-center justify-center px-[2%] transition-all duration-700 ${
            isGameComplete ? 'scale-105 shadow-[0_0_50px_rgba(121,43,166,0.6)]' : ''
          }`}
          style={{
            borderWidth: "clamp(4px, 0.5208vw, 10px)",
            borderRadius: "clamp(20px, 4vw, 100px)"
          }}
        >
          {!isGameComplete ? (
             <p className="text-white font-black uppercase tracking-tight text-[clamp(14px,1.6vw,28px)] text-center leading-none">
               Classifica Musicale
             </p>
          ) : (
             <div className="animate-zoom-in">
               <p className="text-white font-black uppercase tracking-tight text-[clamp(16px,2vw,32px)] text-center leading-none">
                 COMPLETATO!
               </p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClassificaMusicaleBoard;