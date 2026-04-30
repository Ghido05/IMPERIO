import React, { useState, useEffect, useCallback } from 'react';
import gameData from '../data/Gioco frasetempo_Data.json';

const FraseTempoBoard: React.FC = () => {
  const [fraseIdx, setFraseIdx] = useState(0);
  const [frase, setFrase] = useState<string>('');
  const [revealedLetters, setRevealedLetters] = useState<boolean[]>([]);
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [timerActive, setTimerActive] = useState<boolean>(false);
  const [score, setScore] = useState<number | null>(null);

  const markers = [
    { time: 25, val: 8 },
    { time: 20, val: 7 },
    { time: 16, val: 6 },
    { time: 12, val: 5 },
    { time: 8, val: 4 },
    { time: 4, val: 3 },
    { time: 0, val: 2 },
  ];

  // Inizializza o cambia frase
  useEffect(() => {
    if (gameData.frasi.length === 0) return;
    const currentFrase = gameData.frasi[fraseIdx].toUpperCase();
    setFrase(currentFrase);
    setRevealedLetters(new Array(currentFrase.length).fill(false));
    setTimeLeft(30);
    setTimerActive(true);
    setScore(null);
  }, [fraseIdx]);

  // Gestione Timer
  useEffect(() => {
    if (!timerActive || timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        const next = prev - 0.1;
        if (next <= 0) {
          setTimerActive(false);
          return 0;
        }
        return next;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [timerActive, timeLeft]);

  // Gestione Tastiera
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Svela la lettera digitata
    if (/^[A-Z]$/i.test(e.key)) {
      const letter = e.key.toUpperCase();
      setRevealedLetters(prev => {
        const next = [...prev];
        let changed = false;
        for (let i = 0; i < frase.length; i++) {
          if (frase[i] === letter && !next[i]) {
            next[i] = true;
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }

    // Invio o S = Svela tutto e ferma timer
    if (e.key === 'Enter' || e.key.toUpperCase() === 'S') {
      setRevealedLetters(new Array(frase.length).fill(true));
      setTimerActive(false);
      
      // Calcola punteggio
      let currentScore = 2;
      for (const m of markers) {
        if (timeLeft >= m.time) {
          currentScore = Math.max(currentScore, m.val);
        }
      }
      setScore(currentScore);
    }

    // Freccia Destra = Prossima Frase
    if (e.key === 'ArrowRight') {
      setFraseIdx(prev => (prev + 1) % gameData.frasi.length);
    }
  }, [frase, timeLeft, markers]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const progressPercent = (timeLeft / 30) * 100;
  
  let barColor = 'bg-green-500';
  if (timeLeft <= 20 && timeLeft > 10) barColor = 'bg-yellow-400';
  if (timeLeft <= 10) barColor = 'bg-red-600';

  return (
    <div className="relative w-full min-h-screen bg-gradient-to-br from-neutral-950 to-neutral-900 flex flex-col items-center py-20 font-sans overflow-hidden select-none">
      {/* EFFETTI DI LUCE SULLO SFONDO (Decorativi) */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-500/10 blur-[120px] rounded-full pointer-events-none" />
      <h1 className="text-yellow-400 text-5xl font-bold mb-10 tracking-widest drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]">
        INDOVINA LA FRASE (TEMPO)
      </h1>

      {/* Timer Bar */}
      <div className="relative w-3/4 max-w-4xl h-12 bg-gray-800 border-4 border-cyan-400 rounded-full mb-20 overflow-hidden">
        <div 
          className={`h-full transition-all duration-100 ease-linear ${barColor}`}
          style={{ width: `${progressPercent}%` }}
        />
        
        {/* Markers */}
        {markers.map((m, i) => {
          const isVisible = timeLeft >= m.time;
          const isScored = score === m.val;
          const leftPercent = (m.time / 30) * 100;
          
          if (!isVisible && !isScored && timeLeft > 0) return null; // Nascondi se superato (tranne l'ultimo 0 o se calcolato come score)

          return (
            <div 
              key={i} 
              className="absolute top-0 bottom-0 border-l-2 border-white flex flex-col justify-center items-center"
              style={{ left: `${leftPercent}%` }}
            >
              <div className={`absolute -top-12 w-10 h-10 flex items-center justify-center font-bold text-xl rounded shadow-lg transition-all duration-300
                ${isScored ? 'bg-orange-500 border-2 border-yellow-300 text-black scale-125 z-10' : 'bg-blue-700 text-white border border-white'}`}
              >
                {m.val}
              </div>
            </div>
          );
        })}
      </div>

      {/* Frase Area */}
      <div className="flex flex-wrap justify-center items-center gap-4 px-10 max-w-5xl mt-10">
        {frase.split('').map((char, index) => {
          if (char === ' ') {
            return <div key={index} className="w-8 h-16"></div>;
          }
          if (char === "'") {
            return <div key={index} className="flex items-start justify-center w-4 h-16 text-4xl text-white font-bold">'</div>;
          }

          const isRevealed = revealedLetters[index];

          return (
            <div 
              key={index}
              className={`w-14 h-16 flex items-center justify-center border-4 rounded-md text-4xl font-bold transition-all duration-300 shadow-md
                ${isRevealed ? 'bg-blue-900 border-blue-500 text-white' : 'bg-blue-900 border-blue-800 text-transparent'}`}
            >
              {char}
            </div>
          );
        })}
      </div>

      {/* Score Popup */}
      {score !== null && (
        <div className="fixed bottom-20 bg-green-600/90 text-white px-8 py-4 rounded-xl border-4 border-green-300 shadow-2xl animate-bounce">
           <p className="text-4xl font-extrabold">PUNTI ASSEGNATI: {score}</p>
        </div>
      )}

      <div className="fixed bottom-4 right-4 text-gray-500 text-sm space-y-1 text-right">
        <p>Freccia DX: Prossima Frase</p>
        <p>Invio/S: Svela e Ferma Tempo</p>
        <p>Digita lettere: Svela la lettera</p>
      </div>
    </div>
  );
};

export default FraseTempoBoard;