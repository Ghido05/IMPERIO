import React, { useState, useEffect, useCallback } from 'react';
import { useGameData } from './context/GameDataContext';
import { assetUrl } from './lib/assetUrl';

type Direction = 'H' | 'V';

interface GridCell {
  char: string;
  revealed: boolean;
  words: number[];
}

interface WordInfo {
  word: string;
  r: number;
  c: number;
  dir: Direction;
}

const CruciverbaBoard: React.FC = () => {
  const gameData = useGameData();
  if (!gameData) return <div className="text-white flex items-center justify-center w-full h-full">In attesa di dati...</div>;

  const [levelIdx, setLevelIdx] = useState(0);
  const [grid, setGrid] = useState<Map<string, GridCell>>(new Map());
  const [wordsInfo, setWordsInfo] = useState<WordInfo[]>([]);
  const [currentWordIdx, setCurrentWordIdx] = useState(0);
  const [errorFlash, setErrorFlash] = useState(false);

  const canPlaceWord = (word: string, r: number, c: number, d: Direction, currentGrid: Map<string, GridCell>) => {
    const wordLen = word.length;
    const newCoords: Array<[number, number]> = [];
    for (let i = 0; i < wordLen; i++) {
      newCoords.push(d === 'V' ? [r + i, c] : [r, c + i]);
    }

    for (let i = 0; i < newCoords.length; i++) {
      const [cr, cc] = newCoords[i];
      const key = `${cr},${cc}`;
      if (currentGrid.has(key)) {
        if (currentGrid.get(key)!.char !== word[i]) return false;
      }
    }

    const pre = d === 'V' ? `${r - 1},${c}` : `${r},${c - 1}`;
    const post = d === 'V' ? `${r + wordLen},${c}` : `${r},${c + wordLen}`;
    if (currentGrid.has(pre) || currentGrid.has(post)) return false;

    for (const [cr, cc] of newCoords) {
      const adjacent: Array<[number, number]> = [
        [cr - 1, cc], [cr + 1, cc], [cr, cc - 1], [cr, cc + 1]
      ];
      for (const [nr, nc] of adjacent) {
        if (newCoords.some(([ncr, ncc]) => ncr === nr && ncc === nc)) continue;
        if (currentGrid.has(`${nr},${nc}`) && !currentGrid.has(`${cr},${cc}`)) {
          return false;
        }
      }
    }
    return true;
  };

  const generateGrid = (words: string[]) => {
    const newGrid = new Map<string, GridCell>();
    const newWordsInfo: WordInfo[] = [];

    if (words.length === 0) return { newGrid, newWordsInfo };

    // Prima parola
    newWordsInfo.push({ word: words[0], r: 0, c: 0, dir: 'H' });
    for (let i = 0; i < words[0].length; i++) {
      newGrid.set(`0,${i}`, { char: words[0][i], revealed: false, words: [0] });
    }

    // Altre parole
    for (let wIdx = 1; wIdx < words.length; wIdx++) {
      const w = words[wIdx];
      let placed = false;

      for (let exIdx = 0; exIdx < newWordsInfo.length; exIdx++) {
        const info = newWordsInfo[exIdx];
        for (let i = 0; i < w.length; i++) {
          for (let j = 0; j < info.word.length; j++) {
            if (w[i] === info.word[j]) {
              const d: Direction = info.dir === 'H' ? 'V' : 'H';
              const nr = d === 'V' ? info.r - i : info.r + j;
              const nc = d === 'V' ? info.c + j : info.c - i;

              if (canPlaceWord(w, nr, nc, d, newGrid)) {
                newWordsInfo.push({ word: w, r: nr, c: nc, dir: d });
                for (let k = 0; k < w.length; k++) {
                  const pr = d === 'V' ? nr + k : nr;
                  const pc = d === 'V' ? nc : nc + k;
                  const key = `${pr},${pc}`;
                  if (!newGrid.has(key)) {
                    newGrid.set(key, { char: w[k], revealed: false, words: [wIdx] });
                  } else {
                    newGrid.get(key)!.words.push(wIdx);
                  }
                }
                placed = true;
                break;
              }
            }
          }
          if (placed) break;
        }
        if (placed) break;
      }

      if (!placed) {
        let maxR = -1;
        for (const key of newGrid.keys()) {
          const r = parseInt(key.split(',')[0]);
          if (r > maxR) maxR = r;
        }
        const rr = maxR + 5;
        newWordsInfo.push({ word: w, r: rr, c: 0, dir: 'H' });
        for (let i = 0; i < w.length; i++) {
          newGrid.set(`${rr},${i}`, { char: w[i], revealed: false, words: [wIdx] });
        }
      }
    }

    return { newGrid, newWordsInfo };
  };

  useEffect(() => {
    if (levelIdx >= gameData.livelli.length) return;
    const level = gameData.livelli[levelIdx];
    const { newGrid, newWordsInfo } = generateGrid(level.parole.map((w: string) => w.toUpperCase()));
    setGrid(newGrid);
    setWordsInfo(newWordsInfo);
    setCurrentWordIdx(0);
  }, [levelIdx]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (levelIdx >= gameData.livelli.length) return;
    const level = gameData.livelli[levelIdx];
    const maxWords = level.parole.length;

    if (e.key === 'Enter' || e.key.toUpperCase() === 'S') {
      if (currentWordIdx < maxWords) {
        // Svela parola
        const newGrid = new Map(grid);
        for (const cell of newGrid.values()) {
          if (cell.words.includes(currentWordIdx)) {
            cell.revealed = true;
          }
        }
        setGrid(newGrid);
        setCurrentWordIdx(prev => prev + 1);
      } else {
        // Prossimo livello
        setLevelIdx(prev => prev + 1);
      }
      return;
    }

    if (/^[A-Z]$/i.test(e.key) && currentWordIdx < maxWords) {
      const letter = e.key.toUpperCase();
      const targetWord = wordsInfo[currentWordIdx].word;
      if (targetWord.includes(letter)) {
        const newGrid = new Map(grid);
        for (const cell of newGrid.values()) {
          if (cell.words.includes(currentWordIdx) && cell.char === letter) {
            cell.revealed = true;
          }
        }
        setGrid(newGrid);
      } else {
        setErrorFlash(true);
        setTimeout(() => setErrorFlash(false), 500);
      }
    }
  }, [grid, currentWordIdx, levelIdx, wordsInfo]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (levelIdx >= gameData.livelli.length) {
    return <div className="w-full h-screen bg-black flex items-center justify-center text-white text-5xl">FINE GIOCO</div>;
  }

  const level = gameData.livelli[levelIdx];

  // Calcola bounding box per centrare la griglia
  let minR = Infinity, maxR = -Infinity, minC = Infinity, maxC = -Infinity;
  grid.forEach((_, key) => {
    const [r, c] = key.split(',').map(Number);
    if (r < minR) minR = r;
    if (r > maxR) maxR = r;
    if (c < minC) minC = c;
    if (c > maxC) maxC = c;
  });

  const hasGrid = grid.size > 0;
  const rows = hasGrid ? maxR - minR + 1 : 0;
  const cols = hasGrid ? maxC - minC + 1 : 0;
  const cellSize = 60; // px
  const gridWidth = cols * cellSize;
  const gridHeight = rows * cellSize;

  return (
    <div className={`relative w-full min-h-screen ${level.sfondo ? 'bg-black' : 'bg-gradient-to-br from-neutral-950 to-neutral-900'} flex flex-col items-center overflow-hidden select-none`}>
      {/* EFFETTI DI LUCE SULLO SFONDO (Decorativi) */}
      {!level.sfondo && (
        <>
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-500/10 blur-[120px] rounded-full pointer-events-none" />
        </>
      )}

      {/* Sfondo Tema se presente */}
      {level.sfondo && (
        <img src={assetUrl(level.sfondo)} alt="Sfondo" className="absolute inset-0 w-full h-full object-cover opacity-30 pointer-events-none" />
      )}

      {/* Errore X grande centrale */}
      {errorFlash && (
        <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
          <span className="text-red-600 text-[400px] font-bold drop-shadow-2xl opacity-80">X</span>
        </div>
      )}

      <h1 className="text-yellow-400 text-5xl font-bold mt-10 mb-2 tracking-widest drop-shadow-md z-10">
        CRUCIVERBA - {level.tema}
      </h1>

      <div className="flex-1 w-full flex items-center justify-center relative z-10">
        <div 
          className="relative" 
          style={{ width: gridWidth, height: gridHeight }}
        >
          {Array.from(grid.entries()).map(([key, data]) => {
            const [r, c] = key.split(',').map(Number);
            const isActive = data.words.includes(currentWordIdx);
            const isPast = data.words.some(wIdx => wIdx < currentWordIdx);
            
            let bgColor = "bg-blue-900";
            if (isActive) bgColor = "bg-orange-500";
            else if (isPast && data.revealed) bgColor = "bg-green-700";

            return (
              <div 
                key={key}
                className={`absolute border-2 border-white flex items-center justify-center text-4xl font-bold text-white transition-colors duration-300 ${bgColor}`}
                style={{
                  left: (c - minC) * cellSize,
                  top: (r - minR) * cellSize,
                  width: cellSize,
                  height: cellSize
                }}
              >
                {data.revealed ? data.char : ''}
              </div>
            );
          })}
        </div>
      </div>

      <div className="absolute bottom-4 right-4 text-gray-400 text-sm text-right z-10 bg-black/50 p-2 rounded">
        <p>Digita lettere per svelare</p>
        <p>Invio/S: Svela tutta la parola o passa al livello</p>
      </div>
    </div>
  );
};

export default CruciverbaBoard;
