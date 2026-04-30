import React, { useState, useEffect, useCallback, useRef } from 'react';
import phrasesData from './data/FraseConTempo_Data.json';

const FraseConTempo_Board: React.FC = () => {
  const [index, setIndex] = useState(0);
  const [tokens, setTokens] = useState<string[]>([]);
  const [targetTokens, setTargetTokens] = useState<string[]>([]);
  const [time, setTime] = useState(30.0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState<number | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const thresholds = [25, 20, 16, 12, 8, 4, 0];
  const values = [8, 7, 6, 5, 4, 3, 2];

  const initGame = useCallback((idx: number) => {
    const frase = phrasesData[idx % phrasesData.length].frase.toUpperCase();
    const targets: string[] = [];
    let i = 0;
    while (i < frase.length) {
      const c = frase[i];
      if (i + 1 < frase.length && frase[i + 1] === "'") {
        targets.push(c + "'");
        i += 2;
      } else {
        targets.push(c);
        i += 1;
      }
    }
    setTargetTokens(targets);
    setTokens(targets.map(t => (/[A-Z]/.test(t[0]) ? '_' : t)));
    setTime(30.0);
    setIsTimerRunning(false);
    setRevealed(false);
    setSelectedMarker(null);
  }, []);

  useEffect(() => {
    initGame(index);
  }, [index, initGame]);

  useEffect(() => {
    if (isTimerRunning && time > 0) {
      timerRef.current = setInterval(() => {
        setTime(prev => Math.max(0, prev - 0.1));
      }, 100);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning, time]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (revealed) return;
    const key = e.key.toUpperCase();
    if (key.length === 1 && /[A-Z]/.test(key)) {
      setTokens(prev => prev.map((t, i) => (targetTokens[i][0] === key ? targetTokens[i] : t)));
    }
  }, [targetTokens, revealed]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const startTimer = () => setIsTimerRunning(true);
  const stopTimer = () => setIsTimerRunning(false);

  const revealSolution = () => {
    stopTimer();
    setRevealed(true);
    setTokens([...targetTokens]);
    
    // Find the current marker
    let markerIdx = -1;
    for (let i = 0; i < thresholds.length; i++) {
      if (time >= thresholds[i]) {
        markerIdx = i;
        break;
      }
    }
    if (markerIdx !== -1) {
      setSelectedMarker(markerIdx);
    }
  };

  const nextPhrase = () => {
    setIndex(prev => prev + 1);
  };

  const getTimerColor = () => {
    if (time > 20) return '#00FF00';
    if (time > 10) return '#FFFF00';
    return '#FF0000';
  };

  // Group tokens into words for wrapping
  const words: string[][] = [];
  let currentWord: string[] = [];
  tokens.forEach((t, i) => {
    if (t === ' ') {
      if (currentWord.length > 0) words.push(currentWord);
      words.push([' ']);
      currentWord = [];
    } else {
      currentWord.push(t);
    }
  });
  if (currentWord.length > 0) words.push(currentWord);

  return (
    <div className="relative w-full min-h-screen bg-black text-white flex flex-col items-center py-10 overflow-hidden">
      <h1 className="text-5xl font-bold text-yellow-400 mb-10">INDOVINA LA FRASE (TEMPO)</h1>

      {/* Frase Display */}
      <div className="flex flex-wrap justify-center gap-2 max-w-6xl px-10 mb-10">
        {words.map((word, wIdx) => (
          <div key={wIdx} className="flex gap-1">
            {word.map((t, tIdx) => (
              t === ' ' ? (
                <div key={tIdx} className="w-8" />
              ) : (
                <div 
                  key={tIdx} 
                  className="w-14 h-20 bg-blue-900 border-4 border-blue-400 rounded-md flex items-center justify-center text-4xl font-bold"
                >
                  {t === '_' ? '' : t}
                </div>
              )
            ))}
          </div>
        ))}
      </div>

      {/* Timer Bar */}
      <div className="relative w-[800px] h-40 mt-10">
        {/* Progress Bar Container */}
        <div className="absolute top-1/2 left-0 w-full h-10 -translate-y-1/2 border-4 border-cyan-400 bg-gray-800 rounded-lg overflow-hidden">
            <div 
                className="h-full transition-all duration-100 ease-linear"
                style={{ 
                    width: `${(time / 30) * 100}%`,
                    backgroundColor: getTimerColor()
                }}
            />
        </div>

        {/* Markers */}
        {thresholds.map((threshold, i) => {
          const position = (threshold / 30) * 100;
          const isVisible = time >= threshold || revealed;
          const isSelected = selectedMarker === i;

          return (
            <div 
              key={i} 
              className={`absolute top-0 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
              style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
            >
              <div className="flex flex-col items-center">
                <div className={`w-12 h-12 rounded flex items-center justify-center text-2xl font-bold border-2 transition-colors ${
                  isSelected ? 'bg-orange-500 border-yellow-300 scale-125' : 'bg-blue-700 border-white'
                }`}>
                  {values[i]}
                </div>
                <div className="w-0.5 h-20 bg-white mt-1" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Controls */}
      <div className="flex gap-6 mt-16">
        {!isTimerRunning && !revealed && (
          <button 
            onClick={startTimer}
            className="px-10 py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl text-2xl font-bold transition-all"
          >
            START TIMER
          </button>
        )}
        {isTimerRunning && (
          <button 
            onClick={stopTimer}
            className="px-10 py-4 bg-yellow-600 hover:bg-yellow-700 text-white rounded-xl text-2xl font-bold transition-all"
          >
            PAUSE
          </button>
        )}
        <button 
          onClick={revealSolution}
          className="px-10 py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-2xl font-bold transition-all"
        >
          MOSTRA SOLUZIONE
        </button>
        <button 
          onClick={nextPhrase}
          className="px-10 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-2xl font-bold transition-all"
        >
          PROSSIMA FRASE
        </button>
      </div>

      {/* Back to Menu (using window.location for simplicity as per existing pattern) */}
      <button 
        onClick={() => { window.location.href = '/'; }}
        className="mt-10 px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm font-bold opacity-50 hover:opacity-100 transition-all"
      >
        MENU
      </button>
    </div>
  );
};

export default FraseConTempo_Board;
