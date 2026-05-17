import React, { useState, useEffect, useRef } from 'react';
import gameData from './data/Il mio nome è nessuno_musicale_Data.json';
import ScoreAssigner from './components/ScoreAssigner';

// ============================================================================
// Layout esportato da Figma e reso Responsivo con Navigazione a Frecce e Audio
// ============================================================================

interface SvgIconProps {
  fileName?: string;
  className?: string;
  altText: string;
  isVisible: boolean;
}

// Icona standard per gli strumenti musicali (con animazione e hover)
const SvgIcon: React.FC<SvgIconProps> = ({ fileName, className, altText, isVisible }) => (
  <div 
    className={`absolute z-20 transition-opacity duration-300 ${isVisible ? 'animate-bounce-in opacity-100' : 'opacity-0 scale-75 pointer-events-none'} ${className}`}
  >
    <div
      className="w-full h-full rounded-full border-2 border-white/20 flex items-center justify-center p-[10%] bg-white/5 shadow-[0_0_15px_rgba(255,255,255,0.1)] backdrop-blur-md transition-all duration-300 hover:scale-110 hover:shadow-[0_0_30px_rgba(255,255,255,0.4)] hover:border-white/60 cursor-pointer"
      title={altText}
    >
      {fileName ? (
        <img src={`/Icone/${fileName}`} alt={altText} className="w-full h-full object-contain filter drop-shadow-lg" />
      ) : (
        <span className="text-white font-bold text-[clamp(0.6rem,1.2vw,1.2rem)] text-center leading-tight drop-shadow-md">{altText}</span>
      )}
    </div>
  </div>
);

// Componente dinamico per l'Indizio: Ricostruisce pixel-perfect la grafica di Figma
// Utilizza percentuali interne per garantire che le proporzioni rimangano intatte a qualsiasi risoluzione.
const DynamicHint: React.FC<{
  note: { id: number; text: string; color: string };
  fileName: string;
  altText: string;
  isVisible: boolean;
  className: string;
  stemSide: 'left' | 'right';
  compH: number;
  innerRef?: React.RefObject<HTMLDivElement | null>;
  yOffset?: number;
}> = ({ note, fileName, altText, isVisible, className, stemSide, compH, innerRef, yOffset = 0 }) => {
  const isUp = fileName.includes("Nota1.svg") || fileName.includes("Nota3.svg");

  // Proporzioni fisse basate sulla "Union" di Figma
  const compW = isUp ? 640.36 : 589;

  // Dimensioni Elementi (px)
  const boxW = isUp ? 551.93 : 589;
  const boxH = isUp ? 102.21 : 102;
  const stemW = isUp ? 37.82 : 38;
  const noteW = 128.25; 
  const noteH = 105.3;

  // Posizionamento orizzontale (px riferiti alla Union)
  const boxL = isUp ? 88.43 : 0;
  const stemL = isUp ? 88.43 : (589 - 38);
  const noteL = isUp ? 0 : (589 - 125);

  return (
    <div className={`absolute pointer-events-none transition-all duration-700 ${isVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'} ${className}`}
         style={{ 
           width: `${(compW / 1920) * 100}%`, 
           aspectRatio: `${compW}/${compH}`,
         }}>

      <div className="relative w-full h-full">
        {/* 1. IL BOX (Rectangle 1) */}
        <div 
          ref={innerRef}
          className="absolute z-20 pointer-events-auto flex items-center justify-center px-[8%] py-[4%] transition-transform duration-500"
          style={{
            backgroundColor: note.color,
            bottom: `${100 - (boxH / compH * 100)}%`, 
            left: `${(boxL / compW) * 100}%`,
            width: `${(boxW / compW) * 100}%`,
            minHeight: `${(boxH / compH) * 100}%`,
            borderRadius: stemSide === 'left' ? '1.5rem 1.5rem 1.5rem 0' : '1.5rem 1.5rem 0 1.5rem',
            transform: `translateY(-${yOffset}px)`
          }}
        >
          <p className="text-white font-bold text-center text-[clamp(0.7rem,1.4vw,1.1rem)] leading-tight text-balance drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            {note.text}
          </p>
          <div className="absolute top-[10%] left-[5%] w-[25%] h-[10%] rounded-full bg-white/30"></div>
        </div>

        {/* 2. L'ASTA (Rectangle 2) */}
        <div 
          className="absolute z-10 transition-all duration-500"
          style={{
            backgroundColor: note.color,
            bottom: `${(noteH / compH * 100 / 2)}%`,
            left: `${(stemL / compW) * 100}%`,
            width: `${(stemW / compW) * 100}%`,
            // Altezza dinamica: base + offset di spostamento
            height: `calc(${100 - (boxH / compH * 100) - (noteH / compH * 100 / 2) + 1}% + ${yOffset}px)`,
          }}
        />

        {/* 3. LA NOTA (Ellipse 6) */}
        <div 
          className="absolute z-30 drop-shadow-xl flex items-center justify-center"
          style={{
            width: `${(noteW / compW) * 100}%`, 
            height: `${(noteH / compH) * 100}%`,
            bottom: 0,
            left: `${(noteL / compW) * 100}%`,
            transform: 'rotate(-30.66deg)',
            backgroundColor: note.color,
            borderRadius: '50%',
          }}
        >
          <img 
            src={`/Icone/${fileName}`} 
            alt={altText} 
            className={`${fileName.includes('Nota3.svg') ? 'w-[75%] h-[75%]' : 'w-[95%] h-[95%]'} object-contain transform rotate-[30.66deg]`} 
          />
        </div>

      </div>

    </div>
  );
};

// Componente per la Soluzione Finale
const Solution: React.FC<{ isVisible: boolean, pointsAssigned: boolean, onAssigned: () => void }> = ({ isVisible, pointsAssigned, onAssigned }) => (
  <div 
    className={`absolute inset-0 z-50 flex flex-col items-center justify-center transition-all duration-1000 ${
      isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'
    }`}
  >
    <div className="relative group flex flex-col items-center">
      {/* Bagliore retrostante */}
      <div className="absolute -inset-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition duration-1000"></div>
      
      <div className="relative text-center space-y-4 px-10 py-12 rounded-3xl border border-white/10 bg-black/40 backdrop-blur-2xl shadow-2xl overflow-hidden">
        {/* Effetto luce che scorre */}
        <div className="absolute top-0 -left-[100%] w-[200%] h-full bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12 group-hover:left-[100%] transition-all duration-1000 ease-in-out"></div>

        <h2 className="text-[clamp(2rem,6vw,5rem)] font-black text-white tracking-tighter leading-none animate-zoom-in">
          {gameData.soluzione.titolo}
        </h2>
        <div className="h-1 w-24 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto rounded-full animate-fade-in" style={{ '--animation-delay': '0.4s' } as React.CSSProperties}></div>
        <p className="text-[clamp(1rem,2vw,1.8rem)] font-light text-white/70 tracking-[0.3em] uppercase animate-fade-up" style={{ '--animation-delay': '0.6s' } as React.CSSProperties}>
          {gameData.soluzione.artista} - {gameData.soluzione.anno}
        </p>
      </div>

      {isVisible && !pointsAssigned && (
        <ScoreAssigner 
          points={3000} 
          onAssigned={onAssigned} 
          className="mt-12 scale-125"
        />
      )}

      {pointsAssigned && (
        <div className="mt-12 text-green-400 font-black text-2xl uppercase tracking-widest animate-bounce">
          Punti Assegnati!
        </div>
      )}
    </div>
  </div>
);

const GameBoard: React.FC = () => {  // Stato per tenere traccia dello step attuale (da 0 a 10)
  // 0 = vuoto, 1-9 = Strumenti e Indizi, 10 = Soluzione
  const [step, setStep] = useState(0);
  const [prevStep, setPrevStep] = useState(0);
  const [isAutoAdvancing, setIsAutoAdvancing] = useState(false);
  const [showError, setShowError] = useState(false);
  const [pointsAssigned, setPointsAssigned] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Gestione dell'animazione di errore (si spegne da sola dopo 800ms)
  useEffect(() => {
    if (showError) {
      const timer = setTimeout(() => setShowError(false), 800);
      return () => clearTimeout(timer);
    }
  }, [showError]);

  // Refs per monitorare l'altezza dei box 1 e 3
  const box1Ref = useRef<HTMLDivElement>(null);
  const box3Ref = useRef<HTMLDivElement>(null);
  const [offsetLeft, setOffsetLeft] = useState(0);
  const [offsetRight, setOffsetRight] = useState(0);

  // Aggiorna gli offset quando cambiano gli indizi o lo step
  useEffect(() => {
    const updateOffsets = () => {
      if (box1Ref.current) {
        // Calcola l'altezza extra rispetto all'altezza base (circa 22% di compH)
        const baseH = (102.21 / 465.73) * box1Ref.current.parentElement!.offsetHeight;
        const extra = Math.max(0, box1Ref.current.offsetHeight - baseH);
        setOffsetLeft(extra);
      }
      if (box3Ref.current) {
        const baseH = (102.21 / 465.73) * box3Ref.current.parentElement!.offsetHeight;
        const extra = Math.max(0, box3Ref.current.offsetHeight - baseH);
        setOffsetRight(extra);
      }
    };

    updateOffsets();
    // Aggiungiamo un piccolo delay per assicurarci che il layout sia stabilizzato
    const timer = setTimeout(updateOffsets, 100);
    window.addEventListener('resize', updateOffsets);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateOffsets);
    };
  }, [step, gameData.indizi]);


  // Mappa delle canzoni per i passi in cui compaiono gli strumenti
  const audioMap: Record<number, string> = gameData.strumenti.reduce((acc, obj) => {
    if (obj.audio) {
      acc[obj.step] = obj.audio;
    }
    return acc;
  }, {} as Record<number, string>);

  // Gestione dell'avanzamento automatico verso la soluzione
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (isAutoAdvancing) {
      if (step < 10) {
        // Determiniamo il delay in base allo step SUCCESSIVO che sta per apparire
        const nextStep = step + 1;
        let delay = 1000; // Default per gli indizi
        
        if (nextStep % 2 !== 0) {
          delay = 700;  // Strumenti (veloci)
        } else if (nextStep === 10) {
          delay = 1500; // Soluzione finale (un po' più di enfasi)
        }

        timer = setTimeout(() => {
          setPrevStep(step);
          setStep(prev => prev + 1);
        }, delay);
      } else {
        setIsAutoAdvancing(false);
      }
    }
    return () => clearTimeout(timer);
  }, [step, isAutoAdvancing]);

  // Gestione dell'audio al cambio di step
  useEffect(() => {
    // 1. Ferma l'audio precedente in riproduzione, se esiste
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    // 2. Condizioni per NON far partire l'audio:
    // - Siamo in fase di avanzamento automatico (isAutoAdvancing)
    // - Stiamo tornando indietro dalla soluzione (da 10 a 9)
    const isBackingFromSolution = prevStep === 10 && step === 9;

    if (audioMap[step] && !isAutoAdvancing && !isBackingFromSolution) {
      const newAudio = new Audio(audioMap[step]);
      audioRef.current = newAudio;
      newAudio.play().catch(error => console.log('Autoplay intercettato dal browser:', error));
    }
  }, [step, isAutoAdvancing, prevStep]);

  // Ascolta la pressione dei tasti freccia e comandi speciali
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Se stiamo avanzando automaticamente, ignoriamo gli input per evitare conflitti
      if (isAutoAdvancing) return;

      if (e.key === 'ArrowRight') {
        setStep((prev) => {
          if (prev < 10) {
            setPrevStep(prev);
            return prev + 1;
          }
          return prev;
        });
      } else if (e.key === 'ArrowLeft') {
        setStep((prev) => {
          if (prev > 0) {
            setPrevStep(prev);
            return prev - 1;
          }
          return prev;
        });
      } else if (e.key === 'Enter' || e.key.toLowerCase() === 's') {
        // Avvia la sequenza di rivelazione rapida fino alla fine
        if (step < 10) {
          setIsAutoAdvancing(true);
        }
      } else if (e.key.toLowerCase() === 'e' || e.key.toLowerCase() === 'x') {
        // Attiva l'effetto di errore
        setShowError(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [step, isAutoAdvancing]);

  return (
    <div 
      className={`relative w-full min-h-screen ${gameData.sfondo ? 'bg-black' : 'bg-gradient-to-br from-neutral-950 to-neutral-900'} overflow-hidden flex items-center justify-center transition-transform duration-100 ${showError ? 'animate-shake' : ''}`}
      style={gameData.sfondo ? { backgroundImage: `url(${gameData.sfondo})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' } : {}}
    >
      
      {/* Overlay di Errore (Flash Rosso + X Centrale) */}
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
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-500/10 blur-[120px] rounded-full pointer-events-none" />

      {/* 
        CONTENITORE RESPONSIVO (Ratio 1920:668)
        Ripristiniamo le proporzioni originali per le SVGs complete.
      */}
      <div className="relative w-full max-w-[1920px] aspect-[1920/668]">
        
        {/* PENTAGRAMMA (Sempre visibile) */}
        <div className={`absolute left-0 w-full z-0 pointer-events-none flex justify-center transition-opacity duration-1000 ${step === 10 ? 'opacity-0' : 'opacity-40'}`} style={{ top: '28.44%', height: '63.17%' }}>
          <img src="/Icone/Il mio nome è nessuno_musicale/Pentagramma.svg" alt="Pentagramma" className="w-full h-full object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
        </div>

        {/* STRUMENTI (Gestiti dallo stato 'step' e da gameData) */}
        {gameData.strumenti.map((strum) => (
          <SvgIcon 
            key={strum.step}
            fileName={strum.icona} 
            altText={strum.nome} 
            className={`w-[7.5%] h-[21.5%] ${strum.posizione} transition-all duration-1000 ${step === 10 ? 'opacity-0 scale-50' : ''}`} 
            isVisible={step >= strum.step && step < 10} 
          />
        ))}

        {/* NOTE INDIZI (Dinamicamente generate in base all'SVG di Figma) */}
        
        {/* Primo Indizio (Verde) - Nota sulla 2ª riga dal basso, Box sopra la 1ª riga */}
        <DynamicHint 
          note={gameData.indizi[0]}
          fileName="Il mio nome è nessuno_musicale/Nota1.svg" 
          altText="Primo Indizio"
          isVisible={step >= 2 && step < 10} 
          className="top-[12.5%] left-[7.13%]"
          stemSide="left"
          compH={465.73}
          innerRef={box1Ref}
        />

        {/* Secondo Indizio (Rosso) - Nota sulla 3ª riga dal basso, Box sopra il verde */}
        <DynamicHint 
          note={gameData.indizi[1]}
          fileName="Il mio nome è nessuno_musicale/Nota2.svg" 
          altText="Secondo Indizio"
          isVisible={step >= 4 && step < 10} 
          className="top-[-3.77%] left-[11.77%]"
          stemSide="right"
          compH={472.12}
          yOffset={offsetLeft}
        />

        {/* Terzo Indizio (Blu) - Nota sulla 2ª riga dal basso, Box sopra la 1ª riga */}
        <DynamicHint 
          note={gameData.indizi[2]}
          fileName="Il mio nome è nessuno_musicale/Nota3.svg" 
          altText="Terzo Indizio"
          isVisible={step >= 6 && step < 10} 
          className="top-[12.5%] left-[56.66%]"
          stemSide="left"
          compH={465.73}
          innerRef={box3Ref}
        />

        {/* Quarto Indizio (Arancione) - Nota sulla 3ª riga dal basso, Box sopra il blu */}
        <DynamicHint 
          note={gameData.indizi[3]}
          fileName="Il mio nome è nessuno_musicale/Nota4.svg" 
          altText="Quarto Indizio"
          isVisible={step >= 8 && step < 10} 
          className="top-[-3.77%] left-[61.35%]"
          stemSide="right"
          compH={472.12}
          yOffset={offsetRight}
        />

        {/* Soluzione Finale */}
        <Solution 
          isVisible={step === 10} 
          pointsAssigned={pointsAssigned} 
          onAssigned={() => setPointsAssigned(true)} 
        />

      </div>

    </div>
  );
};

export default GameBoard;