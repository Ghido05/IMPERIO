import React, { useState, useEffect } from "react";
import { useGameData } from './context/GameDataContext';
import { assetUrl, assetUrlCss } from './lib/assetUrl';
import { useSyncedState } from './hooks/useSyncedState';
import { useScores } from './context/ScoreContext';

interface SolutionProps {
  isVisible: boolean;
}

// Componente per la Soluzione Finale (senza assegnazione punti e intestazioni superflue, con spazio per artista/dettagli)
const Solution: React.FC<SolutionProps> = ({ isVisible }) => {
  const gameData = useGameData();
  if (!gameData) return null;

  const soluzioneTitolo = (gameData as any).soluzione?.titolo || gameData.soluzioneTesto || 'Soluzione';
  const soluzioneArtista = (gameData as any).soluzione?.artista || '';
  const soluzioneAnno = (gameData as any).soluzione?.anno || '';

  return (
    <div 
      className={`absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md transition-all duration-1000 ${
        isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'
      }`}
    >
      <div className="relative group flex flex-col items-center">
        {/* Bagliore retrostante purple-blue */}
        <div className="absolute -inset-10 bg-gradient-to-r from-[#792ba6] to-blue-600 rounded-full blur-3xl opacity-30 group-hover:opacity-50 transition duration-1000" />
        
        <div 
          className="relative text-center space-y-6 px-12 py-10 border-[#0f2d54] bg-[#792ba6]/90 backdrop-blur-2xl shadow-[0_0_50px_rgba(121,43,166,0.6)] overflow-hidden w-[40vw] max-w-[90%]"
          style={{ 
            borderWidth: "clamp(4px, 0.5208vw, 10px)",
            borderRadius: "clamp(6px, 0.5208vw, 12px)"
          }}
        >
          {/* Effetto luce che scorre */}
          <div className="absolute top-0 -left-[100%] w-[200%] h-full bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 group-hover:left-[100%] transition-all duration-1000 ease-in-out" />

          <h2 className="text-[clamp(24px,3vw,56px)] font-black text-white tracking-tight leading-tight animate-zoom-in drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
            {soluzioneTitolo}
          </h2>

          {(soluzioneArtista || soluzioneAnno) && (
            <>
              <div className="h-[2px] w-24 bg-gradient-to-r from-[#00ff00] to-yellow-400 mx-auto rounded-full" />
              <p className="text-[clamp(14px,1.2vw,24px)] font-light text-white/70 tracking-[0.2em] uppercase animate-fade-up">
                {soluzioneArtista}{soluzioneArtista && soluzioneAnno ? ' - ' : ''}{soluzioneAnno}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const ClassificaMusicaleBoard = ({ interactive = true }: { interactive?: boolean }): React.JSX.Element => {
  const gameData = useGameData();
  if (!gameData) return <div className="text-white flex items-center justify-center w-full h-full">In attesa di dati...</div>;

  const slideId = gameData.slideId ?? 'sandbox';

  const { scores, addScore } = useScores();
  const questionNum = React.useMemo(() => {
    const match = slideId.match(/q(\d+)/);
    return match ? parseInt(match[1], 10) : 1;
  }, [slideId]);

  const [revealed, setRevealed] = useSyncedState<Record<number, boolean>>(`playstate_${slideId}_revealed`, {});
  const [pointsAssigned] = useSyncedState<Record<number, number>>(`playstate_${slideId}_points`, {});
  const [, setLatestClue] = useSyncedState<number>(`playstate_${slideId}_latest`, 0);
  const [showError, setShowError] = useState(false);
  const [isAutoAdvancing, setIsAutoAdvancing] = useSyncedState(`playstate_${slideId}_auto`, false);
  const [showTitle, setShowTitle] = useSyncedState(`playstate_${slideId}_showtitle`, false);
  const [showSolution, setShowSolution] = useSyncedState(`playstate_${slideId}_showsolution`, false);
  
  const audiosRef = React.useRef<Record<number, HTMLAudioElement>>({});
  const finalAudioRef = React.useRef<HTMLAudioElement | null>(null);
  const isPlayingStemsRef = React.useRef(false);
  const isFadingOutRef = React.useRef(false);

  // Inizializza gli audio stems e l'audio finale
  useEffect(() => {
    if (!interactive) return;
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
          setLatestClue(nextClue);
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

      const getBox2StarterIdx = (): number => {
        const saved = localStorage.getItem('playstate_box2_starter_idx');
        if (saved !== null) {
          return parseInt(saved, 10);
        }
        let lowestIdx = 0;
        for (let i = 1; i < scores.length; i++) {
          if (Number(scores[i]) < Number(scores[lowestIdx])) {
            lowestIdx = i;
          }
        }
        localStorage.setItem('playstate_box2_starter_idx', lowestIdx.toString());
        return lowestIdx;
      };

      const questionStarterIdx = (getBox2StarterIdx() + (questionNum - 1)) % 3;

      const getCluePoints = (clueNum: number) => {
        if (clueNum >= 1 && clueNum <= 4) return 1000;
        if (clueNum === 5 || clueNum === 6) return 2000;
        if (clueNum === 7) return 3000;
        return 0;
      };

      const getActiveTeamIdx = (currentRevealedCount: number): number => {
        const savedActive = localStorage.getItem('playstate_box2_active_team_idx');
        if (savedActive !== null) {
          return parseInt(savedActive, 10);
        }
        return (questionStarterIdx + currentRevealedCount) % 3;
      };

      const key = e.key;
      if (key >= '1' && key <= '7') {
        const numKey = Number(key);
        if (!revealed[numKey]) {
          const currentRevealedCount = Object.values(revealed).filter(v => v === true).length;
          const targetTeamIdx = getActiveTeamIdx(currentRevealedCount);
          addScore(targetTeamIdx, getCluePoints(numKey));

          // Quando i numeri vengono premuti manualmente, riavviamo da capo tutti gli stems
          isPlayingStemsRef.current = true;
          Object.values(audiosRef.current).forEach(a => {
            a.currentTime = 0;
            const p = a.play();
            if (p !== undefined) p.catch(err => console.log("Errore riproduzione stem:", err));
          });
          setRevealed(prev => ({ ...prev, [numKey]: true }));
          setLatestClue(numKey);
        }
      } else if (key.toLowerCase() === 's' || key === 'Enter') {
        const allRevealed = Array.from({ length: 7 }, (_, i) => i + 1).every(i => revealed[i]);
        
        // Se non tutto è svelato, avvia auto-svelamento (che alla fine mostrerà la soluzione)
        if (!allRevealed) {
          if (!isAutoAdvancing) {
            const currentRevealedCount = Object.values(revealed).filter(v => v === true).length;
            const targetTeamIdx = getActiveTeamIdx(currentRevealedCount);
            addScore(targetTeamIdx, 5000);
            setIsAutoAdvancing(true);
          }
        } else {
          // Se tutto è GIA' svelato (manualmente), premendo S mostra la soluzione e fa il crossfade
          if (!showSolution) {
            const currentRevealedCount = Object.values(revealed).filter(v => v === true).length;
            const targetTeamIdx = getActiveTeamIdx(currentRevealedCount);
            addScore(targetTeamIdx, 5000);
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

    if (!interactive) return;
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAutoAdvancing, interactive, scores, revealed, questionNum, addScore, showSolution]);

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
          className="absolute left-[5.026%] top-[29.907%] w-[35.794%] h-[65.315%] border-[#8e3600] bg-black/40 backdrop-blur-md overflow-hidden flex-shrink-0 p-4"
          style={{ borderWidth: "clamp(6px, 1.0417vw, 20px)" }}
        >
          <div className="w-full h-full flex flex-col justify-around gap-2">
            {[...gameData.elementi].reverse().map((el: any) => {
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

        {/* Pill superiore centrale (Titolo) */}
        <div
          className={`absolute left-[28.75%] top-[7.87%] w-[42.5%] h-[14.444%] bg-[#792ba6] border-[#0f2d54] flex items-center justify-center px-[2%] transition-all duration-1000 ${showTitle ? 'shadow-[0_0_40px_rgba(121,43,166,0.6)]' : ''}`}
          style={{
            borderWidth: "clamp(4px, 0.5208vw, 10px)",
            borderRadius: "clamp(30px, 6.5vw, 124px)"
          }}
        >
          <h1 className="text-white font-black uppercase tracking-tight text-[clamp(16px,2vw,42px)] text-center leading-none">
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

        {/* Solution Overlay */}
        <Solution 
          isVisible={showSolution} 
        />
      </div>
    </div>
  );
};

export default ClassificaMusicaleBoard;
