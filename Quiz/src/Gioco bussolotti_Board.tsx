import React, { useState, useEffect, useCallback } from "react";
import gameData from "./data/Gioco bussolotti_Data.json";

const GiocoBussolottiBoard: React.FC = () => {
  // Modalità: 0=nessuna, 1=1 bussolotto, 2=3 bussolotti, 3=5 bussolotti
  const [mode, setMode] = useState<number>(0);
  const [winningIndex, setWinningIndex] = useState<number | null>(null);
  const [opened, setOpened] = useState<Record<number, boolean>>({});

  const initGame = useCallback((m: number) => {
    setMode(m);
    setOpened({});
    
    // Numero di bussolotti in base alla modalità
    let count = 0;
    if (m === 1) count = 1;
    if (m === 2) count = 3;
    if (m === 3) count = 5;

    // Scegli un vincitore a caso tra 0 e count-1
    const winner = Math.floor(Math.random() * count);
    setWinningIndex(winner);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "1") initGame(1);
      if (e.key === "2") initGame(2);
      if (e.key === "3") initGame(3);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [initGame]);

  const handleOpen = (index: number) => {
    setOpened((prev) => ({ ...prev, [index]: true }));
  };

  const getBussolottiCount = () => {
    if (mode === 1) return 1;
    if (mode === 2) return 3;
    if (mode === 3) return 5;
    return 0;
  };

  return (
    <div className="relative w-full min-h-screen bg-gradient-to-br from-neutral-950 to-neutral-900 flex flex-col items-center justify-center font-sans overflow-hidden select-none">
      {/* EFFETTI DI LUCE SULLO SFONDO */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-500/10 blur-[120px] rounded-full pointer-events-none" />

      {mode === 0 ? (
        <div className="text-center animate-fade-in">
          <h1 className="text-white text-6xl font-black mb-12 tracking-tighter opacity-80">
            {gameData.titolo}
          </h1>
          <div className="space-y-6">
            <p className="text-blue-400 text-2xl font-bold">PREMI UN TASTO PER INIZIARE:</p>
            <div className="flex gap-8 justify-center">
              <div className="bg-gray-800 p-6 rounded-2xl border-2 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                <span className="block text-4xl font-black text-white mb-2">1</span>
                <span className="text-xs text-gray-400 uppercase tracking-widest">1° POSTO</span>
              </div>
              <div className="bg-gray-800 p-6 rounded-2xl border-2 border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.3)]">
                <span className="block text-4xl font-black text-white mb-2">2</span>
                <span className="text-xs text-gray-400 uppercase tracking-widest">2° POSTO</span>
              </div>
              <div className="bg-gray-800 p-6 rounded-2xl border-2 border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.3)]">
                <span className="block text-4xl font-black text-white mb-2">3</span>
                <span className="text-xs text-gray-400 uppercase tracking-widest">3° POSTO</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center w-full max-w-6xl">
          <h2 className="text-white text-4xl font-black mb-20 tracking-widest uppercase">
            {mode === 1 ? "PREMIO GARANTITO" : mode === 2 ? "SCEGLI TRA 3 BUSSOLOTTI" : "SCEGLI TRA 5 BUSSOLOTTI"}
          </h2>

          <div className="flex flex-wrap justify-center gap-12">
            {Array.from({ length: getBussolottiCount() }).map((_, i) => {
              const isOpened = opened[i];
              const isWinner = i === winningIndex;

              return (
                <div 
                  key={i}
                  onClick={() => !isOpened && handleOpen(i)}
                  className={`relative w-48 h-64 cursor-pointer transition-all duration-500 transform hover:scale-105 active:scale-95 ${isOpened ? 'rotate-y-180' : ''}`}
                  style={{ perspective: "1000px" }}
                >
                  <div className={`relative w-full h-full transition-all duration-700 preserve-3d ${isOpened ? '[transform:rotateY(180deg)]' : ''}`}>
                    
                    {/* PARTE FRONTALE (Chiuso) */}
                    <div className="absolute inset-0 backface-hidden bg-gradient-to-b from-gray-700 to-gray-900 border-4 border-white/20 rounded-2xl flex flex-col items-center justify-center shadow-2xl">
                      <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center border-2 border-white/10 mb-4">
                        <span className="text-6xl font-black text-white/20 italic">{i + 1}</span>
                      </div>
                      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none" />
                    </div>

                    {/* PARTE POSTERIORE (Aperto) */}
                    <div className="absolute inset-0 backface-hidden [transform:rotateY(180deg)] bg-gray-800 border-4 border-white/40 rounded-2xl flex items-center justify-center overflow-hidden shadow-[0_0_50px_rgba(255,255,255,0.1)]">
                      {isWinner ? (
                        <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-green-500/10">
                           <img 
                            src={gameData.immagine_premio} 
                            alt="PREMIO" 
                            className="w-full h-full object-contain animate-zoom-in"
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = "https://placehold.co/400x600/22c55e/white?text=BONUS";
                            }}
                           />
                        </div>
                      ) : (
                        <div className="flex flex-col items-center opacity-30">
                          <svg className="w-20 h-20 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l18 18" />
                          </svg>
                          <span className="text-white font-bold mt-2 uppercase tracking-tighter">VUOTO</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button 
            onClick={() => setMode(0)}
            className="mt-24 px-8 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-white/40 text-sm font-bold tracking-widest transition-all uppercase"
          >
            Torna alla selezione
          </button>
        </div>
      )}

      {/* Footer Istruzioni */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 text-white/20 text-[10px] font-bold tracking-[0.3em] uppercase pointer-events-none">
        Premi 1, 2 o 3 per cambiare modalità
      </div>
    </div>
  );
};

export default GiocoBussolottiBoard;
