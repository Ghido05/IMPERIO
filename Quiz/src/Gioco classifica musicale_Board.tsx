import React, { useState, useEffect } from "react";
import { useGameData } from './context/GameDataContext';
import { CompactScoreAssigner } from "./components/ScoreAssigner";
import { assetUrl, assetUrlCss } from './lib/assetUrl';

const ClassificaMusicaleBoard = (): React.JSX.Element => {
  const gameData = useGameData();
  if (!gameData) return <div className="text-white flex items-center justify-center w-full h-full">In attesa di dati...</div>;

  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const [pointsAssigned, setPointsAssigned] = useState<Record<number, boolean>>({});
  const [showError, setShowError] = useState(false);
  const [isAutoAdvancing, setIsAutoAdvancing] = useState(false);
  const [showTitle, setShowTitle] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  
  const audiosRef = React.useRef<Record<number, HTMLAudioElement>>({});
  const finalAudioRef = React.useRef<HTMLAudioElement | null>(null);
  const isPlayingStemsRef = React.useRef(false);
  const isFadingOutRef = React.useRef(false);

  // Inizializza gli audio stems e l'audio finale
  useEffect(() => {
    // Stems (iniziano mutati)
    gameData.elementi.forEach((el: any) => {
      if ((el as any).audio) {
        const audio = new Audio(assetUrl((el as any).audio));
        audio.loop = false; // NON ripartono automaticamente alla fine
        audio.volume = 0;  // Partono tutti mutati
        audiosRef.current[el.posizione] = audio;
      }
    });

    // Canzone finale (suona quando si preme T)
    if ((gameData as any).canzoneFinale) {
      finalAudioRef.current = new Audio(assetUrl((gameData as any).canzoneFinale));
    }

    return () => {
      Object.values(audiosRef.current).forEach(a => {
        a.pause();
        a.removeAttribute('src');
      });
      if (finalAudioRef.current) {
        finalAudioRef.current.pause();
        finalAudioRef.current.removeAttribute('src');
      }
    };
  }, []);

  // Smuta gli stems in base ai clue rivelati
  useEffect(() => {
    Object.keys(revealed).forEach(key => {
      const clue = Number(key);
      if (revealed[clue] && audiosRef.current[clue]) {
        if (!isFadingOutRef.current) {
          audiosRef.current[clue].volume = 1;
        }
      }
    });
  }, [revealed]);

  const getPhraseStyle = (clue: number, isRevealed: boolean) => {
    if (!isRevealed) return "bg-white/5 border border-white/10";
    
    // 4 tonalità di Azzurro/Blu (dalla più chiara alla più scura)
    if (clue === 1) return "bg-[#00b3f6] text-white";
    if (clue === 2) return "bg-[#0099ff] text-white";
    if (clue === 3) return "bg-[#007acc] text-white";
    if (clue === 4) return "bg-[#005c8a] text-white";
    
    // 2 tonalità di Verde (dalla più chiara alla più scura)
    if (clue === 5) return "bg-[#00ff00] text-[#1b1b1b]";
    if (clue === 6) return "bg-[#00b300] text-white";
    
    // 1 tonalità di Giallo
    return "bg-[#f7f700] text-[#1b1b1b]"; // clue 7
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
      // Trova il primo indizio non ancora svelato (da 1 a 7)
      const nextClue = Array.from({ length: 7 }, (_, i) => i + 1).find(i => !revealed[i]);
      if (nextClue) {
        timer = setTimeout(() => {
          // Assicuriamoci che tutti gli stems stiano andando avanti (in background se non svelati)
          if (!isPlayingStemsRef.current) {
            isPlayingStemsRef.current = true;
            Object.values(audiosRef.current).forEach(a => {
              const p = a.play();
              if (p !== undefined) p.catch(err => console.log("Errore riproduzione stem:", err));
            });
          }
          setRevealed(prev => ({ ...prev, [nextClue]: true }));
        }, 1500); // Leggero ritardo tra un indizio e l'altro
      } else {
        setIsAutoAdvancing(false); // Tutti svelati, ferma l'avanzamento
        
        // Quando tutti sono svelati in automatico, si avvia la soluzione e il crossfade
        if (!showSolution) {
          setShowSolution(true);
          
          if (finalAudioRef.current && !isFadingOutRef.current) {
            isFadingOutRef.current = true;
            
            finalAudioRef.current.currentTime = 0;
            finalAudioRef.current.volume = 0;
            finalAudioRef.current.play().catch(err => console.log("Errore riproduzione canzone finale:", err));
            
            let fadeStep = 0;
            const fadeInterval = setInterval(() => {
              fadeStep += 1;
              const finalVol = Math.min(1, fadeStep * 0.05); // Fade in: 20 steps da 0 a 1 in 2 secondi
              const stemVol = Math.max(0, 1 - fadeStep * 0.05); // Fade out
              
              if (finalAudioRef.current) finalAudioRef.current.volume = finalVol;
              
              Object.values(audiosRef.current).forEach(a => {
                if (a && !a.paused) a.volume = stemVol;
              });
              
              if (fadeStep >= 20) {
                clearInterval(fadeInterval);
                // Fermiamo completamente gli stems
                Object.values(audiosRef.current).forEach(a => a.pause());
              }
            }, 150); // 3 secondi di crossfade
          }
        }
      }
    }
    return () => clearTimeout(timer);
  }, [revealed, isAutoAdvancing]);

  // Input da tastiera (1-7)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Se stiamo auto-avanzando blocchiamo i numeri, ma permettiamo le altre funzioni
      if (isAutoAdvancing && e.key >= '1' && e.key <= '7') return;

      const key = e.key;
      if (key >= '1' && key <= '7') {
        const numKey = Number(key);
        // Quando i numeri vengono premuti manualmente, riavviamo da capo tutti gli stems
        isPlayingStemsRef.current = true;
        Object.values(audiosRef.current).forEach(a => {
          a.currentTime = 0;
          const p = a.play();
          if (p !== undefined) p.catch(err => console.log("Errore riproduzione stem:", err));
        });
        setRevealed(prev => ({ ...prev, [numKey]: true }));
      } else if (key.toLowerCase() === 's' || key === 'Enter') {
        const allRevealed = Array.from({ length: 7 }, (_, i) => i + 1).every(i => revealed[i]);
        
        // Se non tutto è svelato, avvia auto-svelamento (che alla fine mostrerà la soluzione)
        if (!allRevealed) {
          if (!isAutoAdvancing) {
            setIsAutoAdvancing(true);
          }
        } else {
          // Se tutto è GIA' svelato (manualmente), premendo S mostra la soluzione e fa il crossfade
          if (!showSolution) {
            setShowSolution(true);
            
            if (finalAudioRef.current && !isFadingOutRef.current) {
              isFadingOutRef.current = true;
              
              finalAudioRef.current.currentTime = 0;
              finalAudioRef.current.volume = 0;
              finalAudioRef.current.play().catch(err => console.log("Errore riproduzione canzone finale:", err));
              
              let fadeStep = 0;
              const fadeInterval = setInterval(() => {
                fadeStep += 1;
                const finalVol = Math.min(1, fadeStep * 0.05); // Fade in: 20 steps da 0 a 1 in 2 secondi
                const stemVol = Math.max(0, 1 - fadeStep * 0.05); // Fade out
                
                if (finalAudioRef.current) finalAudioRef.current.volume = finalVol;
                
                Object.values(audiosRef.current).forEach(a => {
                  if (a && !a.paused) a.volume = stemVol;
                });
                
                if (fadeStep >= 20) {
                  clearInterval(fadeInterval);
                  Object.values(audiosRef.current).forEach(a => a.pause());
                }
              }, 150); // 3 secondi di crossfade
            }
          }
        }
      } else if (key.toLowerCase() === 'e' || key.toLowerCase() === 'x') {
        setShowError(true);
      } else if (key.toLowerCase() === 't') {
        setShowTitle(true);
      } else if (key.toLowerCase() === 'm') {
        // Riavvia tutti gli stems dall'inizio (e anche la canzone finale se sta suonando)
        Object.values(audiosRef.current).forEach(a => {
          a.currentTime = 0;
          if (a.paused) {
             const p = a.play();
             if (p !== undefined) p.catch(err => console.log("Errore play stem:", err));
          }
        });
        isPlayingStemsRef.current = true;
        
        if (finalAudioRef.current && !finalAudioRef.current.paused) {
          finalAudioRef.current.currentTime = 0;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAutoAdvancing, revealed]);

  const rankingMarkers = [
    { value: 7, top: "34.070%" }, // Giallo (1 indizio)
    { value: 6, top: "48.500%" }, // Verde alto
    { value: 5, top: "56.000%" }, // Verde basso
    { value: 4, top: "68.000%" }, // Blu 1
    { value: 3, top: "75.000%" }, // Blu 2
    { value: 2, top: "82.000%" }, // Blu 3
    { value: 1, top: "89.000%" }  // Blu 4
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
        
        {/* Riquadro sinistro (Frasi da svelare) */}
        <div
          className="absolute left-[5.026%] top-[7.87%] w-[35.794%] h-[63.611%] border-[#8e3600] bg-black/40 backdrop-blur-md overflow-hidden flex-shrink-0 p-4"
          style={{ borderWidth: "clamp(6px, 1.0417vw, 20px)" }}
        >
          <div className="w-full h-full flex flex-col justify-around gap-2">
            {gameData.elementi.map((el: any) => {
              const isRevealed = !!revealed[el.posizione];
              return (
                <div 
                  key={el.posizione}
                  className={`flex-1 flex items-center justify-center rounded-xl transition-all duration-700 ${getPhraseStyle(el.posizione, isRevealed)}`}
                  style={{ boxShadow: isRevealed ? "inset 0 0 20px rgba(255,255,255,0.2)" : "none" }}
                >
                  <span className={`font-black tracking-tight text-[clamp(14px,1.5vw,28px)] text-center px-4 transition-all duration-700 ${isRevealed ? 'opacity-100 scale-100' : 'opacity-0 scale-90 text-transparent'}`}>
                    {(el as any).frase}
                  </span>
                </div>
              );
            })}
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
        
        {/* Box Yellow (7) */}
        <div
          className="absolute left-[53.073%] w-[33.229%] border-[#002164] bg-[#f7f700] top-[29.907%] h-[12.685%] transition-all duration-700"
          style={{
            borderWidth: "clamp(2px, 0.2604vw, 5px)",
            borderRadius: "clamp(6px, 0.5208vw, 10px)"
          }}
        />

        {/* Box Green (5, 6) */}
        <div
          className="absolute left-[53.073%] w-[33.229%] border-[#002164] bg-[#00ff00] top-[45.556%] h-[17.87%] transition-all duration-700"
          style={{
            borderWidth: "clamp(2px, 0.2604vw, 5px)",
            borderRadius: "clamp(6px, 0.5208vw, 10px)"
          }}
        />

        {/* Box Blue (1, 2, 3, 4) */}
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
              <p className={`w-full font-black uppercase text-[clamp(10px,1.2vw,24px)] leading-tight text-center ${marker.value <= 4 ? 'text-white' : 'text-[#1b1b1b]'}`}>
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

              {/* Punti Selettore */}
              {revealed[marker.value] && !pointsAssigned[marker.value] && (
                <div className="absolute left-full ml-2 flex items-center h-full">
                  <CompactScoreAssigner 
                    points={marker.value <= 4 ? 1000 : marker.value <= 6 ? 2000 : 3000}
                    onAssigned={() => setPointsAssigned(prev => ({ ...prev, [marker.value]: true }))}
                  />
                </div>
              )}
              {pointsAssigned[marker.value] && (
                <div className="absolute left-full ml-2 text-green-400 text-[10px] font-black uppercase">
                  OK
                </div>
              )}
            </div>
          </React.Fragment>
        ))}

        {/* Pill inferiore sinistra (Box di completamento o categoria) */}
        <div
          className={`absolute left-[5.052%] top-[80%] w-[35.781%] h-[15.222%] bg-[#792ba6] border-[#0f2d54] flex flex-col items-center justify-center px-[2%] transition-all duration-700 ${
            showSolution ? 'scale-105 shadow-[0_0_50px_rgba(121,43,166,0.6)]' : ''
          }`}
          style={{
            borderWidth: "clamp(4px, 0.5208vw, 10px)",
            borderRadius: "clamp(30px, 6.5vw, 124px)"
          }}
        >
          {!showSolution ? (
             <p className="text-white font-black uppercase tracking-tight text-[clamp(14px,1.8vw,36px)] text-center leading-none">
               Gioco Indizi
             </p>
          ) : (
             <div className="animate-zoom-in flex flex-col items-center">
               <p className="text-white font-black uppercase tracking-tight text-[clamp(16px,2vw,30px)] text-center leading-tight mb-2">
                 {(gameData as any).soluzioneTesto}
               </p>
               {!pointsAssigned[100] ? (
                 <CompactScoreAssigner 
                    points={5000}
                    onAssigned={() => setPointsAssigned(prev => ({ ...prev, 100: true }))}
                 />
               ) : (
                 <span className="text-green-400 font-black text-xs uppercase">Punti Assegnati</span>
               )}
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClassificaMusicaleBoard;