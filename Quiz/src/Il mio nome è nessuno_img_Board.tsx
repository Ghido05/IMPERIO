import React, { useState, useEffect } from "react";
import { useGameData } from './context/GameDataContext';
import ScoreAssigner from "./components/ScoreAssigner";
import { assetUrl, assetUrlCss } from './lib/assetUrl';
import { useSyncedState } from './hooks/useSyncedState';

// ============================================================================
// Gioco 2 - IMMAGINE: Logica a Step con Rivelazione Griglia e Indizi
// ============================================================================

const GameBoard = ({ interactive = true }: { interactive?: boolean }): React.JSX.Element => {
  const gameData = useGameData();
  if (!gameData) return <div className="text-white flex items-center justify-center w-full h-full">In attesa di dati...</div>;

  const slideId = gameData.slideId ?? 'sandbox';

  const [step, setStep] = useSyncedState(`playstate_${slideId}_step`, 0);
  const [isAutoAdvancing, setIsAutoAdvancing] = useSyncedState(`playstate_${slideId}_auto`, false);
  const [showError, setShowError] = useState(false);
  const [pointsAssigned, setPointsAssigned] = useSyncedState(`playstate_${slideId}_points`, false);

  const MAX_STEP = 5;

  // Generiamo l'ordine di rivelazione dei tasselli (pesato per svelare prima i bordi)
  const totalTiles = gameData.griglia.colonne * gameData.griglia.righe;
  const tileOrder = React.useMemo(() => {
    const cols = gameData.griglia.colonne;
    const rows = gameData.griglia.righe;
    
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
      
      // Normalizziamo (da 0 a 1, dove 1 è il bordo)
      const normalizedDist = dist / (maxDist || 1);
      
      // Diamo priorità ai bordi (70% peso alla distanza, 30% casuale)
      const weight = (normalizedDist * 0.7) + (Math.random() * 0.3);
      
      return { index: i, weight };
    });
    
    // Ordine decrescente: i più alti (bordi) vengono prima
    return tiles.sort((a, b) => b.weight - a.weight).map(t => t.index);
  }, [totalTiles, gameData.griglia.colonne, gameData.griglia.righe]);

  // Quanti tasselli rivelare per ogni step (16 tasselli / 5 step = ~3.2)
  const tilesPerStep = Math.ceil(totalTiles / MAX_STEP);

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
      if (step < MAX_STEP) {
        timer = setTimeout(() => {
          setStep(prev => prev + 1);
        }, 1000);
      } else {
        setIsAutoAdvancing(false);
      }
    }
    return () => clearTimeout(timer);
  }, [step, isAutoAdvancing]);

  // Input da tastiera
  useEffect(() => {
    if (!interactive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isAutoAdvancing) return;

      if (e.key === 'ArrowRight') {
        setStep(prev => Math.min(prev + 1, MAX_STEP));
      } else if (e.key === 'ArrowLeft') {
        setStep(prev => Math.max(prev - 1, 0));
      } else if (e.key.toLowerCase() === 's' || e.key === 'Enter') {
        if (step < MAX_STEP) setIsAutoAdvancing(true);
      } else if (e.key.toLowerCase() === 'e' || e.key.toLowerCase() === 'x') {
        setShowError(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAutoAdvancing, step, interactive]);

  // Calcola se un tassello deve essere visibile o coperto
  const isTileRevealed = (tileIndex: number) => {
    const orderIndex = tileOrder.indexOf(tileIndex);
    const revealStep = Math.floor(orderIndex / tilesPerStep) + 1;
    return step >= revealStep || step === MAX_STEP;
  };

  return (
    <div
      className={`relative w-full h-full ${gameData.sfondo ? 'bg-black' : 'bg-gradient-to-br from-neutral-950 to-neutral-900'} overflow-hidden transition-transform duration-100 ${showError ? 'animate-shake' : ''}`}
      style={gameData.sfondo ? { backgroundImage: assetUrlCss(gameData.sfondo), backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' } : {}}
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

      {/* EFFETTI DI LUCE SULLO SFONDO (Decorativi) */}
      {!gameData.sfondo && (
        <>
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-500/10 blur-[120px] rounded-full pointer-events-none" />
        </>
      )}

      {/* Layout a tutto schermo 1920×1080 */}
      <div className="relative w-full h-full">

        {/* AREA IMMAGINE */}
        <div className="absolute left-[4%] top-[5%] w-[38%] h-[68%] border-[18px] border-[#8e3600] bg-black overflow-hidden shadow-2xl">
          <img
            src={assetUrl(gameData.immagineSegreta)}
            alt="Immagine Segreta"
            className="w-full h-full object-cover"
          />
          <div
            className="absolute inset-0 grid"
            style={{
              gridTemplateColumns: `repeat(${gameData.griglia.colonne}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${gameData.griglia.righe}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: totalTiles }).map((_, i) => (
              <div
                key={i}
                className={`w-full h-full bg-[#181a1d] border border-white/5 transition-all duration-700 ease-in-out ${
                  isTileRevealed(i) ? 'opacity-0 scale-95' : 'opacity-100'
                }`}
              />
            ))}
          </div>
        </div>

        {/* AREA INDIZI */}
        <div className="absolute left-[45%] top-[5%] w-[51%] h-[68%] flex flex-col justify-between">
          {gameData.indizi.map((indizio: any, idx: number) => (
            <div
              key={idx}
              className={`relative flex items-stretch h-[23%] transition-all duration-700 ${
                step >= indizio.step ? 'opacity-100 translate-x-0' : 'opacity-0 pointer-events-none'
              }`}
            >
              <div className="w-[102px] h-[102px] bg-[#fe7507] border-[9px] border-[#0f2d54] rounded-full flex items-center justify-center z-10 shadow-lg flex-shrink-0">
                {indizio.icona ? (
                  <img
                    src={assetUrl(indizio.icona)}
                    alt={`Icona ${idx + 1}`}
                    className="w-[55%] h-[55%] object-contain"
                  />
                ) : (
                  <span className="text-white font-bold text-xl">{idx + 1}</span>
                )}
              </div>
              <div className="ml-6 pl-10 pr-8 flex-1 bg-[#fe7507] border-[9px] border-[#0f2d54] rounded-[50px] flex items-center shadow-md h-[102px]">
                <p className="text-white font-black text-[22px] leading-tight">
                  {indizio.testo}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* CATEGORIA / SOLUZIONE */}
        <div className="absolute left-[10%] bottom-[4%] w-[80%] h-[14%]">
          <div className={`w-full h-full bg-[#792ba6] border-[9px] border-[#0f2d54] rounded-[70px] flex items-center justify-center shadow-xl transition-all duration-700 ${step === MAX_STEP ? 'scale-105 shadow-[0_0_50px_rgba(121,43,166,0.6)]' : ''}`}>
            <div className="text-center px-12 w-full">
              {step < MAX_STEP ? (
                <h2 className="text-white font-black text-[52px] uppercase tracking-tighter">
                  {gameData.soluzione.categoria}
                </h2>
              ) : (
                <div className="animate-zoom-in">
                  <h2 className="text-white font-black text-[60px] uppercase tracking-tighter leading-none">
                    {gameData.soluzione.titolo}
                  </h2>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameBoard;
