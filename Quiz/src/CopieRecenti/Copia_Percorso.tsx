import React, { useState, useEffect } from 'react';
import gameData from '../data/Gioco percorso_Data.json';

const PercorsoBoard: React.FC = () => {
  const [slots, setSlots] = useState<string[]>(Array(10).fill(''));
  const [availableWords, setAvailableWords] = useState<string[]>([]);
  const [remainingDistractors, setRemainingDistractors] = useState<string[]>([]);
  const [currentSolIdx, setCurrentSolIdx] = useState(0);
  const [errorWord, setErrorWord] = useState<string | null>(null);

  const fixedIndices = [0, 3, 6, 9];
  const emptyIndices = [1, 2, 4, 5, 7, 8];

  useEffect(() => {
    // Inizializza slots
    const newSlots = Array(10).fill('_');
    fixedIndices.forEach((pos, i) => {
      if (i < gameData.fisse.length) {
        newSlots[pos] = gameData.fisse[i].toUpperCase();
      }
    });
    setSlots(newSlots);

    // Prepara le parole (soluzioni + alcuni distrattori per arrivare a 10)
    const allSolutions = gameData.soluzioni.map(s => s.toUpperCase());
    const allDistractors = gameData.distrattori.map(d => d.toUpperCase());
    
    const neededDistractors = 10 - allSolutions.length;
    const initialPool = [...allSolutions, ...allDistractors.slice(0, neededDistractors)];
    
    // Mescola initialPool
    const shuffledPool = initialPool.sort(() => Math.random() - 0.5);
    setAvailableWords(shuffledPool);
    setRemainingDistractors(allDistractors.slice(neededDistractors));
    setCurrentSolIdx(0);
  }, []);

  const handleWordClick = (word: string) => {
    if (currentSolIdx >= gameData.soluzioni.length) return;

    const correctWord = gameData.soluzioni[currentSolIdx].toUpperCase();
    if (word === correctWord) {
      // Corretto
      const targetSlotIdx = emptyIndices[currentSolIdx];
      const newSlots = [...slots];
      newSlots[targetSlotIdx] = word;
      setSlots(newSlots);
      
      setCurrentSolIdx(prev => prev + 1);

      // Aggiorna pool
      const newAvailable = availableWords.filter(w => w !== word);
      const newRemaining = [...remainingDistractors];
      if (newRemaining.length > 0) {
        newAvailable.push(newRemaining.shift()!);
      }
      setAvailableWords(newAvailable);
      setRemainingDistractors(newRemaining);
      setErrorWord(null);
    } else {
      // Errato (flash rosso)
      setErrorWord(word);
      setTimeout(() => setErrorWord(null), 1000);
    }
  };

  return (
    <div className="relative w-full min-h-screen bg-gradient-to-br from-neutral-950 to-neutral-900 flex flex-col items-center justify-center font-sans overflow-hidden select-none">
      {/* EFFETTI DI LUCE SULLO SFONDO (Decorativi) */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-500/10 blur-[120px] rounded-full pointer-events-none" />
      <h1 className="text-yellow-400 text-5xl font-bold mb-16 tracking-widest drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]">
        PERCORSO PAROLE
      </h1>

      {/* Percorso (Slots) */}
      <div className="flex flex-wrap justify-center gap-4 mb-20 px-8">
        {slots.map((word, index) => {
          const isFixed = fixedIndices.includes(index);
          const isRevealed = word !== '_';
          return (
            <div 
              key={index}
              className={`flex items-center justify-center h-20 px-6 rounded-lg border-2 font-bold text-2xl shadow-lg transition-all duration-500
                ${isFixed ? 'bg-indigo-900 border-indigo-400 text-white' : 
                  isRevealed ? 'bg-blue-600 border-blue-400 text-white scale-105' : 'bg-gray-800 border-gray-600 text-transparent'}`}
              style={{ minWidth: '150px' }}
            >
              {isRevealed ? word : ''}
            </div>
          );
        })}
      </div>

      {/* Pool di parole cliccabili */}
      <div className="grid grid-cols-5 gap-6">
        {availableWords.map((word, i) => {
          const isError = errorWord === word;
          return (
            <button
              key={`${word}-${i}`}
              onClick={() => handleWordClick(word)}
              className={`h-16 px-6 text-xl font-bold rounded shadow-md transition-colors duration-300
                ${isError ? 'bg-red-600 text-white border-2 border-red-400 animate-pulse' : 'bg-white text-black hover:bg-gray-200'}`}
            >
              {word}
            </button>
          );
        })}
      </div>

      {currentSolIdx >= gameData.soluzioni.length && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 animate-fade-in">
           <h2 className="text-6xl font-bold text-green-400 drop-shadow-[0_0_15px_rgba(74,222,128,1)]">
             PERCORSO COMPLETATO!
           </h2>
        </div>
      )}
    </div>
  );
};

export default PercorsoBoard;
