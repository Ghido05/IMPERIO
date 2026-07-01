import React, { useState, useEffect } from "react";
import { useGameData } from './context/GameDataContext';
import { CompactScoreAssigner } from "./components/ScoreAssigner";
import { assetUrl, assetUrlCss } from './lib/assetUrl';
import { useSyncedState } from './hooks/useSyncedState';

const ClassificaBoard = ({ interactive = true }: { interactive?: boolean }): React.JSX.Element => {
  const gameData = useGameData();
  if (!gameData) return <div className="text-white flex items-center justify-center w-full h-full">In attesa di dati...</div>;

  const slideId = gameData.slideId ?? 'sandbox';

  const [revealed, setRevealed] = useSyncedState<Record<number, boolean>>(`playstate_${slideId}_revealed`, {});
  const [pointsAssigned, setPointsAssigned] = useSyncedState<Record<number, number>>(`playstate_${slideId}_points`, {});
  const [, setLatestClue] = useSyncedState<number>(`playstate_${slideId}_latest`, 0);
  const [showError, setShowError] = useState(false);
  const [isAutoAdvancing, setIsAutoAdvancing] = useSyncedState(`playstate_${slideId}_auto`, false);
  const [showTitle, setShowTitle] = useSyncedState(`playstate_${slideId}_showtitle`, false);
  
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  // Inizializza l'audio se presente nel JSON
  useEffect(() => {
    if (!interactive) return;
    // @ts-ignore - nel caso in cui audio non sia tipizzato su gameData
    if (gameData.audio) {
      // @ts-ignore
      audioRef.current = new Audio(assetUrl(gameData.audio));
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Controlla se tutti gli indizi da 1 a 10 sono stati svelati
  const isGameComplete = Array.from({ length: 10 }, (_, i) => i + 1).every(i => revealed[i]);

  // Generiamo l'ordine di rivelazione dei tasselli per l'immagine
  const totalTiles = (gameData.griglia?.colonne || 10) * (gameData.griglia?.righe || 10);
  const tileOrder = React.useMemo(() => {
    const cols = gameData.griglia?.colonne || 10;
    const rows = gameData.griglia?.righe || 10;
    
    // Controlliamo se esiste un punto focale definito nel JSON, altrimenti usiamo il centro perfetto
    const centerCol = (gameData.griglia as any)?.puntoFocale?.colonna !== undefined 
      ? (gameData.griglia as any).puntoFocale.colonna 
      : (cols - 1) / 2;
      
    const centerRow = (gameData.griglia as any)?.puntoFocale?.riga !== undefined 
      ? (gameData.griglia as any).puntoFocale.riga 
      : (rows - 1) / 2;
    
    // Massima distanza teorica dal punto focale agli angoli della griglia
    const maxDist = Math.max(
      Math.sqrt(Math.pow(0 - centerCol, 2) + Math.pow(0 - centerRow, 2)), // Angolo Top-Left
      Math.sqrt(Math.pow(cols - 1 - centerCol, 2) + Math.pow(0 - centerRow, 2)), // Angolo Top-Right
      Math.sqrt(Math.pow(0 - centerCol, 2) + Math.pow(rows - 1 - centerRow, 2)), // Angolo Bottom-Left
      Math.sqrt(Math.pow(cols - 1 - centerCol, 2) + Math.pow(rows - 1 - centerRow, 2)) // Angolo Bottom-Right
    );
    
    const tiles = Array.from({ length: totalTiles }, (_, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const dist = Math.sqrt(Math.pow(col - centerCol, 2) + Math.pow(row - centerRow, 2));
      const normalizedDist = dist / (maxDist || 1);
      const weight = (normalizedDist * 0.7) + (Math.random() * 0.3);
      
      return { index: i, weight };
    });
    
    return tiles.sort((a, b) => b.weight - a.weight).map(t => t.index);
  }, [totalTiles, gameData.griglia]);

  const isTileRevealed = (tileIndex: number) => {
    const orderIndex = tileOrder.indexOf(tileIndex);
    // Dividiamo i tasselli in 10 blocchi (chunk 0 a 9)
    // chunk 0 (bordo esterno) è legato all'indizio 1, ecc... fino a chunk 9 (centro) per l'indizio 10.
    const chunkIndex = Math.floor((orderIndex / totalTiles) * 10); 
    const requiredClue = chunkIndex + 1; 
    return !!revealed[requiredClue];
  };

  const getTileColor = (tileIndex: number) => {
    const orderIndex = tileOrder.indexOf(tileIndex);
    const chunkIndex = Math.floor((orderIndex / totalTiles) * 10); 
    const clue = chunkIndex + 1; 
    
    // 5 tonalità di Azzurro/Blu (dalla più chiara alla più scura)
    if (clue === 1) return "bg-[#00b3f6]";
    if (clue === 2) return "bg-[#0099ff]";
    if (clue === 3) return "bg-[#007acc]";
    if (clue === 4) return "bg-[#005c8a]";
    if (clue === 5) return "bg-[#003f5c]";
    
    // 3 tonalità di Verde (dalla più chiara alla più scura)
    if (clue === 6) return "bg-[#00ff00]";
    if (clue === 7) return "bg-[#00b300]";
    if (clue === 8) return "bg-[#008000]";
    
    // 2 tonalità di Giallo (dalla più chiara alla più scura)
    if (clue === 9) return "bg-[#f7f700]";
    return "bg-[#d4d400]"; // clue 10
  };

  // Gestione dell'animazione di errore
  useEffect(() => {
    if (showError) {
      const timer = setTimeout(() => setShowError(false), 800);
      return () => clearTimeout(timer);
    }
  }, [showError]);

  // Avanzamento automatico verso la soluzione
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (isAutoAdvancing) {
      // Trova il primo indizio non ancora svelato (da 1 a 10)
      const nextClue = Array.from({ length: 10 }, (_, i) => i + 1).find(i => !revealed[i]);
      if (nextClue) {
        timer = setTimeout(() => {
          setRevealed(prev => ({ ...prev, [nextClue]: true }));
          setLatestClue(nextClue);
        }, 1000);
      } else {
        setIsAutoAdvancing(false); // Tutti svelati, ferma l'avanzamento
      }
    }
    return () => clearTimeout(timer);
  }, [revealed, isAutoAdvancing]);

  // Input da tastiera (1-9 e 0 per 10)
  useEffect(() => {
    if (!interactive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isAutoAdvancing) return;

      const key = e.key;
      if (key >= '1' && key <= '9') {
        const num = Number(key);
        setRevealed(prev => ({ ...prev, [num]: true }));
        setLatestClue(num);
      } else if (key === '0') {
        setRevealed(prev => ({ ...prev, 10: true }));
        setLatestClue(10);
      } else if (key.toLowerCase() === 's' || key === 'Enter') {
        setIsAutoAdvancing(true);
      } else if (key.toLowerCase() === 'e' || key.toLowerCase() === 'x') {
        setShowError(true);
      } else if (key.toLowerCase() === 't') {
        setShowTitle(true);
      } else if (key.toLowerCase() === 'm') {
        // Tasto M (Musica) per play/pause
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
  }, [isAutoAdvancing, interactive]);

  const rankingMarkers = [
    { value: 10, top: "31.389%" },
    { value: 9, top: "36.852%" },
    { value: 8, top: "46.852%" },
    { value: 7, top: "52.315%" },
    { value: 6, top: "57.685%" },
    { value: 5, top: "67.611%" },
    { value: 4, top: "73.074%" },
    { value: 3, top: "78.444%" },
    { value: 2, top: "84.000%" },
    { value: 1, top: "89.370%" }
  ];

  return (
    <div 
      className={`relative w-full min-h-screen ${(gameData as any).sfondo ? 'bg-black' : 'bg-gradient-to-br from-neutral-950 to-neutral-900'} overflow-hidden flex items-center justify-center transition-transform duration-100 ${showError ? 'animate-shake' : ''}`}
      style={(gameData as any).sfondo ? { backgroundImage: assetUrlCss((gameData as any).sfondo), backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' } : {}}
    >
      {/* EFFETTI DI LUCE SULLO SFONDO (Decorativi) */}
      {!(gameData as any).sfondo && (
        <>
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-500/10 blur-[120px] rounded-full pointer-events-none" />
        </>
      )}

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

      {/* Frame 16:9 scalato automaticamente sul viewport */}
      <div className="relative w-full max-w-[1920px] aspect-[16/9]">
        
        {/* Riquadro sinistro (Immagine coperta dalla griglia) */}
        <div
          className="absolute left-[5.026%] top-[7.87%] w-[35.794%] h-[63.611%] border-[#8e3600] bg-black overflow-hidden flex-shrink-0"
          style={{ borderWidth: "clamp(6px, 1.0417vw, 20px)" }}
        >
          {/* L'Immagine Segreta */}
          <img 
            src={assetUrl(gameData.immagineSegreta)} 
            alt="Immagine Segreta" 
            className="w-full h-full object-cover"
          />
          
          {/* Griglia di Copertura (Tasselli) */}
          <div 
            className="absolute inset-0 grid"
            style={{
              gridTemplateColumns: `repeat(${gameData.griglia?.colonne || 10}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${gameData.griglia?.righe || 10}, minmax(0, 1fr))`
            }}
          >
            {Array.from({ length: totalTiles }).map((_, i) => (
              <div 
                key={i}
                className={`w-full h-full border border-white/10 transition-all duration-700 ease-in-out ${
                  isTileRevealed(i) ? 'opacity-0 scale-95' : `opacity-100 ${getTileColor(i)}`
                }`}
              />
            ))}
          </div>
        </div>

        {/* Pill superiore destra (Titolo) */}
        <div
          className={`absolute left-[48.438%] top-[7.87%] w-[42.5%] h-[14.444%] bg-[#792ba6] border-[#0f2d54] flex items-center justify-center px-[2%] transition-all duration-1000 ${showTitle ? 'shadow-[0_0_40px_rgba(121,43,166,0.6)]' : ''}`}
          style={{
            borderWidth: "clamp(4px, 0.5208vw, 10px)",
            borderRadius: "clamp(30px, 6.5vw, 124px)"
          }}
        >
          <h1 className={`text-white font-black uppercase tracking-tight text-[clamp(16px,2vw,42px)] text-center leading-none transition-all duration-1000 ${showTitle ? 'opacity-100 scale-100 blur-none' : 'opacity-0 scale-90 blur-[10px]'}`}>
            {gameData.titolo}
          </h1>
        </div>

        {/* ========================================================== */}
        {/* BOX BACKGROUNDS DESTRA - FISSI                             */}
        {/* ========================================================== */}
        
        {/* Box Yellow (9, 10) */}
        <div
          className="absolute left-[53.073%] w-[33.229%] border-[#002164] bg-[#f7f700] top-[29.907%] h-[12.685%] transition-all duration-700"
          style={{
            borderWidth: "clamp(2px, 0.2604vw, 5px)",
            borderRadius: "clamp(6px, 0.5208vw, 10px)"
          }}
        />

        {/* Box Green (6, 7, 8) */}
        <div
          className="absolute left-[53.073%] w-[33.229%] border-[#002164] bg-[#00ff00] top-[45.556%] h-[17.87%] transition-all duration-700"
          style={{
            borderWidth: "clamp(2px, 0.2604vw, 5px)",
            borderRadius: "clamp(6px, 0.5208vw, 10px)"
          }}
        />

        {/* Box Blue (1, 2, 3, 4, 5) */}
        <div
          className="absolute left-[53.073%] w-[33.229%] border-[#002164] bg-[#00b3f6] top-[66.111%] h-[29.111%] transition-all duration-700"
          style={{
            borderWidth: "clamp(2px, 0.2604vw, 5px)",
            borderRadius: "clamp(6px, 0.5208vw, 10px)"
          }}
        />

        {/* ========================================================== */}
        {/* TESTI INDIZI E MARKER NUMERICI                             */}
        {/* ========================================================== */}
        {rankingMarkers.map((marker) => (
          <React.Fragment key={marker.value}>
            {/* Testo dell'indizio (Allineato esattamente al marker) */}
            <div
              className="absolute left-[53.073%] w-[33.229%] flex items-center justify-center px-[2%]"
              style={{
                top: marker.top,
                height: "4.352%"
              }}
            >
              <p className={`w-full font-black uppercase text-[clamp(10px,1.2vw,24px)] leading-tight text-center ${marker.value <= 5 ? 'text-white' : 'text-[#1b1b1b]'}`}>
                {revealed[marker.value] ? gameData.elementi[marker.value - 1]?.testo : ""}
              </p>
            </div>

            {/* Marker numerico a destra */}
            <div
              className="absolute left-[87.708%] w-[3.177%] h-[4.352%] bg-[#3a3838] border-[#002164] flex items-center justify-center group"
              style={{
                top: marker.top,
                borderWidth: "clamp(2px, 0.2083vw, 4px)",
                borderRadius: "clamp(6px, 0.5208vw, 10px)"
              }}
            >
              <span className="text-white font-black text-[clamp(12px,1.56vw,30px)] leading-none">
                {marker.value}
              </span>

              {/* Mostra il pallino colorato della squadra che ha indovinato */}
              {pointsAssigned[marker.value] !== undefined && pointsAssigned[marker.value] !== 0 && (
                <div 
                  className={`absolute left-full ml-2 w-[clamp(20px,2vw,40px)] h-[clamp(20px,2vw,40px)] rounded-full font-black text-white text-[clamp(12px,1.2vw,24px)] flex items-center justify-center border-2 border-white/30 shadow-md animate-zoom-in ${
                    pointsAssigned[marker.value] === 1 ? 'bg-red-600' : pointsAssigned[marker.value] === 2 ? 'bg-blue-600' : 'bg-green-600'
                  }`}
                >
                  {pointsAssigned[marker.value]}
                </div>
              )}
            </div>
          </React.Fragment>
        ))}

        {/* Pill inferiore sinistra (Box di completamento o categoria) */}
        <div
          className={`absolute left-[5.052%] top-[80%] w-[35.781%] h-[15.222%] bg-[#792ba6] border-[#0f2d54] flex items-center justify-center px-[2%] transition-all duration-700 ${
            isGameComplete ? 'scale-105 shadow-[0_0_50px_rgba(121,43,166,0.6)]' : ''
          }`}
          style={{
            borderWidth: "clamp(4px, 0.5208vw, 10px)",
            borderRadius: "clamp(30px, 6.5vw, 124px)"
          }}
        >
          {!isGameComplete ? (
             <p className="text-white font-black uppercase tracking-tight text-[clamp(14px,1.8vw,36px)] text-center leading-none">
               Gioco Indizi
             </p>
          ) : (
             <div className="animate-zoom-in">
               <p className="text-white font-black uppercase tracking-tight text-[clamp(16px,2vw,40px)] text-center leading-none">
                 SOLUZIONE
               </p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClassificaBoard;