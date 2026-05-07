import React, { useState, useEffect } from 'react';
import gameData from './data/Gioco password_Data.json';

type WordType = 'team1' | 'team2' | 'team3' | 'bomb' | 'neutral';

interface WordItem {
  word: string;
  type: WordType;
  guessed: boolean;
  guessedBy?: number;
}

const teamColors = {
  team1: 'bg-red-600',
  team2: 'bg-blue-600',
  team3: 'bg-green-600',
  bomb: 'bg-black',
  neutral: 'bg-gray-400'
};

const PasswordBoard: React.FC = () => {
  const [grid, setGrid] = useState<WordItem[]>([]);
  const [currentTeam, setCurrentTeam] = useState<number>(1);
  const [chosenSuggestion, setChosenSuggestion] = useState<string>("");
  const [gameOver, setGameOver] = useState<string | null>(null);
  const [excludedTeams, setExcludedTeams] = useState<number[]>([]);
  const [winnersOrder, setWinnersOrder] = useState<number[]>([]);

  useEffect(() => {
    // Inizializza la griglia
    const allWords: WordItem[] = [
      ...gameData.squadra1.map(w => ({ word: w.toUpperCase(), type: 'team1' as WordType, guessed: false })),
      ...gameData.squadra2.map(w => ({ word: w.toUpperCase(), type: 'team2' as WordType, guessed: false })),
      ...gameData.squadra3.map(w => ({ word: w.toUpperCase(), type: 'team3' as WordType, guessed: false })),
      ...gameData.altre.map((w, i) => ({ word: w.toUpperCase(), type: (i === 0 ? 'bomb' : 'neutral') as WordType, guessed: false }))
    ];

    // Carica stato iniziale completo
    const storedTeam = localStorage.getItem('password_current_team');
    if (storedTeam) setCurrentTeam(parseInt(storedTeam));
    
    const storedSugg = localStorage.getItem('password_chosen_suggestion');
    if (storedSugg) setChosenSuggestion(storedSugg);

    const storedGrid = localStorage.getItem('password_grid_state');
    if (storedGrid) {
      setGrid(JSON.parse(storedGrid));
    } else {
      const shuffled = [...allWords].sort(() => Math.random() - 0.5);
      setGrid(shuffled);
    }
    
    const handleStorage = () => {
      const team = localStorage.getItem('password_current_team');
      const sugg = localStorage.getItem('password_chosen_suggestion') || "";
      const gridState = localStorage.getItem('password_grid_state');

      // Se non c'è stato salvato, resetta tutto (gestione Reset Totale)
      if (!team && !gridState) {
        setCurrentTeam(1);
        setChosenSuggestion("");
        setExcludedTeams([]);
        setWinnersOrder([]);
        // Rimescola la griglia per un nuovo gioco
        const reshuffled = [...allWords].sort(() => Math.random() - 0.5);
        setGrid(reshuffled);
        return;
      }

      setChosenSuggestion(sugg);
      if (team) setCurrentTeam(parseInt(team));
      if (gridState) setGrid(JSON.parse(gridState));
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const handleWordClick = (index: number) => {
    if (gameOver || grid[index].guessed || excludedTeams.includes(currentTeam)) return;

    const newGrid = [...grid];
    const clickedWord = newGrid[index];
    clickedWord.guessed = true;
    clickedWord.guessedBy = currentTeam;
    setGrid(newGrid);

    if (clickedWord.type === 'bomb') {
      setExcludedTeams(prev => [...prev, currentTeam]);
      alert(`SQUADRA ${currentTeam} HA COLPITO LA BOMBA ED È ESCLUSA!`);
    }

    // Controlla vincitori in ordine di completamento
    const teams = ['team1', 'team2', 'team3'];
    const newWinners = [...winnersOrder];
    let winnersChanged = false;

    teams.forEach((t, i) => {
      const teamNum = i + 1;
      const teamWords = newGrid.filter(w => w.type === t);
      if (teamWords.every(w => w.guessed) && !newWinners.includes(teamNum) && !excludedTeams.includes(teamNum)) {
        newWinners.push(teamNum);
        winnersChanged = true;
      }
    });

    if (winnersChanged) {
      setWinnersOrder(newWinners);
    }

    localStorage.setItem('password_grid_state', JSON.stringify(newGrid));
    window.dispatchEvent(new Event('storage'));
  };

  const getTeamWords = (teamType: WordType) => {
    return grid.filter(w => w.guessed && w.type === teamType);
  };

  const isTeamWinner = (teamType: WordType) => {
    const teamWords = grid.filter(w => w.type === teamType);
    return teamWords.length > 0 && teamWords.every(w => w.guessed);
  };

  const getMedal = (teamNum: number) => {
    const rank = winnersOrder.indexOf(teamNum);
    if (rank === 0) return "🥇";
    if (rank === 1) return "🥈";
    if (rank === 2) return "🥉";
    return null;
  };

  return (
    <div className="relative w-full min-h-screen bg-neutral-900 text-white flex flex-col items-center p-8 font-sans select-none overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(50,50,50,1)_0%,rgba(10,10,10,1)_100%)] z-0" />
      
      <div className="relative z-10 w-full max-w-6xl flex flex-col items-center">
        <h1 className="text-6xl font-black mb-8 tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-500">
          PASSWORD
        </h1>

        <div className="flex w-full justify-between mb-12">
          {[1, 2, 3].map(t => {
            const winner = isTeamWinner(`team${t}` as WordType);
            const isActive = currentTeam === t;
            const isExcluded = excludedTeams.includes(t);
            const medal = getMedal(t);
            
            let borderColor = 'border-gray-700';
            if (winner) {
              borderColor = 'border-yellow-400 shadow-[0_0_30px_rgba(250,204,21,0.4)] bg-yellow-400/20';
            } else if (isActive && !isExcluded) {
              borderColor = t === 1 ? 'border-red-600 bg-red-600/10' : t === 2 ? 'border-blue-600 bg-blue-600/10' : 'border-green-600 bg-green-600/10';
            }

            return (
              <div key={t} className={`flex flex-col items-center w-1/4 p-4 rounded-xl border-4 transition-all duration-500
                ${borderColor}
                ${isActive && !winner ? 'scale-105 shadow-[0_0_15px_rgba(255,255,255,0.1)]' : 'bg-gray-800/50'}
                ${isExcluded ? 'opacity-50 grayscale border-gray-800' : ''}`}>
                <h2 className={`text-2xl font-bold mb-4 ${t === 1 ? 'text-red-500' : t === 2 ? 'text-blue-500' : 'text-green-500'}`}>
                  SQUADRA {t} {isExcluded && "(ELIMINATA)"} {medal}
                </h2>
                <div className="flex flex-col gap-2 w-full">
                  {getTeamWords(`team${t}` as WordType).map((w, i) => (
                    <div key={i} className={`${teamColors[w.type]} text-white px-3 py-1 rounded text-center font-bold animate-bounce`}>
                      {w.word}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-12 items-start">
          <div className="grid grid-cols-3 gap-4 bg-gray-800 p-6 rounded-2xl shadow-2xl border border-gray-700">
            {grid.slice(0, 12).map((item, i) => (
              <div
                key={i}
                onClick={() => handleWordClick(i)}
                className={`
                  w-40 h-24 flex items-center justify-center text-center p-2 rounded-lg cursor-pointer font-bold text-lg transition-all duration-500 transform
                  ${item.guessed 
                    ? item.type === 'neutral' 
                      ? 'opacity-0 scale-50 pointer-events-none' 
                      : `${teamColors[item.type]} text-white scale-110 shadow-[0_0_20px_rgba(255,255,255,0.3)]` 
                    : 'bg-gray-100 text-gray-900 hover:bg-white hover:scale-105'}
                `}
              >
                {!item.guessed || item.type !== 'neutral' ? item.word : ''}
              </div>
            ))}
          </div>

          <div className="flex flex-col items-center gap-6">
            <div className="w-64 h-64 bg-gray-800 border-4 border-dashed border-gray-600 rounded-full flex flex-col items-center justify-center p-8 text-center">
              <span className="text-gray-500 text-sm uppercase tracking-widest mb-2">Suggerimento</span>
              <span className="text-3xl font-black text-yellow-400 drop-shadow-md">
                {chosenSuggestion || "???"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {gameOver && (
        <div className="fixed inset-0 bg-black/90 flex flex-col items-center justify-center z-50 animate-in fade-in zoom-in duration-300">
          <h2 className="text-7xl font-black text-red-600 mb-8 animate-pulse text-center px-4">
            {gameOver}
          </h2>
          <button 
            onClick={() => window.location.reload()}
            className="px-12 py-4 bg-white text-black font-black text-2xl rounded-full hover:bg-red-600 hover:text-white transition-all"
          >
            RICOMINCIA
          </button>
        </div>
      )}
    </div>
  );
};

export default PasswordBoard;
