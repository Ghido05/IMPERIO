import React, { useState, useEffect } from 'react';
import { useGameData } from './context/GameDataContext';

type WordType = 'team1' | 'team2' | 'team3' | 'bomb' | 'neutral';

interface WordItem {
  word: string;
  type: WordType;
  guessed?: boolean;
}

const teamColors = {
  team1: 'bg-red-600 border-red-400',
  team2: 'bg-blue-600 border-blue-400',
  team3: 'bg-green-600 border-green-400',
  bomb: 'bg-black border-red-600',
  neutral: 'bg-gray-600 border-gray-400'
};

const PasswordPresceltiBoard: React.FC = () => {
  const gameDataRaw = useGameData();
  if (!gameDataRaw) return <div className="text-white flex items-center justify-center w-full h-full">In attesa di dati...</div>;

  const [grid, setGrid] = useState<WordItem[]>([]);
  const [currentTeam, setCurrentTeam] = useState<number>(1);
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [currentManche, setCurrentManche] = useState<number>(0);
  const [chosenSuggestion, setChosenSuggestion] = useState<string>("");
  const [excludedTeams, setExcludedTeams] = useState<number[]>([]);

  const manches = gameDataRaw.manches;
  const gameData = manches[currentManche] || manches[0];

  useEffect(() => {
    const storedManche = localStorage.getItem('password_current_manche');
    if (storedManche) setCurrentManche(parseInt(storedManche));

    const storedTeam = localStorage.getItem('password_current_team');
    if (storedTeam) setCurrentTeam(parseInt(storedTeam));

    const storedRound = localStorage.getItem('password_current_round');
    if (storedRound) setCurrentRound(parseInt(storedRound));

    const storedExcluded = localStorage.getItem('password_excluded_teams');
    if (storedExcluded) setExcludedTeams(JSON.parse(storedExcluded));

    const handleStorage = () => {
      const manche = localStorage.getItem('password_current_manche');
      if (manche) setCurrentManche(parseInt(manche));

      const team = localStorage.getItem('password_current_team');
      if (team) setCurrentTeam(parseInt(team));
      
      const round = localStorage.getItem('password_current_round');
      if (round) setCurrentRound(parseInt(round));

      const excluded = localStorage.getItem('password_excluded_teams');
      if (excluded) setExcludedTeams(JSON.parse(excluded));

      const storedGrid = localStorage.getItem('password_grid_state');
      if (storedGrid) setGrid(JSON.parse(storedGrid));

      const sugg = localStorage.getItem('password_chosen_suggestion');
      if (sugg) setChosenSuggestion(sugg);
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    // Inizializza la griglia basandosi sulla manche attuale
    const initializeGrid = () => {
      const storedGrid = localStorage.getItem('password_grid_state');
      if (storedGrid) {
        setGrid(JSON.parse(storedGrid));
      } else {
        const allWords: WordItem[] = [
          ...gameData.squadra1.map((w: string) => ({ word: w.toUpperCase(), type: 'team1' as WordType })),
          ...gameData.squadra2.map((w: string) => ({ word: w.toUpperCase(), type: 'team2' as WordType })),
          ...gameData.squadra3.map((w: string) => ({ word: w.toUpperCase(), type: 'team3' as WordType })),
          ...gameData.altre.map((w: string, i: number) => ({ word: w.toUpperCase(), type: (i === 0 ? 'bomb' : 'neutral') as WordType }))
        ];
        const sorted = [...allWords].sort((a, b) => a.word.localeCompare(b.word));
        setGrid(sorted);
        localStorage.setItem('password_grid_state', JSON.stringify(sorted));
      }
    };

    initializeGrid();
  }, [currentManche]);

  const selectSuggestion = (sugg: string) => {
    setChosenSuggestion(sugg);
    localStorage.setItem('password_chosen_suggestion', sugg);
    window.dispatchEvent(new Event('storage'));
  };

  const getTurnSequence = (mancheIndex: number) => {
    if (mancheIndex === 0) return [1, 2, 3];
    if (mancheIndex === 1) return [2, 3, 1];
    if (mancheIndex === 2) return [3, 1, 2];
    return [1, 2, 3];
  };

  const nextTurn = () => {
    const currentSeq = getTurnSequence(currentManche);
    let currentIndex = currentSeq.indexOf(currentTeam);
    
    let nextTeam: number | null = null;
    let nextRound = currentRound;
    
    // Trova la prossima squadra valida in questo round
    for (let i = currentIndex + 1; i < currentSeq.length; i++) {
      if (!excludedTeams.includes(currentSeq[i])) {
        nextTeam = currentSeq[i];
        break;
      }
    }

    // Se non ci sono altre squadre nel round, passa al prossimo round
    if (nextTeam === null) {
      nextRound += 1;
      
      if (nextRound > 3) {
        if (currentManche < manches.length - 1) {
          if (confirm("Manche finita! Passare alla prossima manche?")) {
            const nextM = currentManche + 1;
            const nextSeq = getTurnSequence(nextM);
            setCurrentManche(nextM);
            setCurrentRound(1);
            setCurrentTeam(nextSeq[0]);
            setExcludedTeams([]);
            localStorage.setItem('password_current_manche', nextM.toString());
            localStorage.setItem('password_current_round', "1");
            localStorage.setItem('password_current_team', nextSeq[0].toString());
            localStorage.setItem('password_excluded_teams', JSON.stringify([]));
            localStorage.removeItem('password_grid_state');
            localStorage.removeItem('password_chosen_suggestion');
            window.location.reload();
            return;
          }
        } else {
          alert("TUTTE LE MANCHES SONO FINITE!");
          return;
        }
      } else {
        const nextSeq = getTurnSequence(currentManche);
        for (let i = 0; i < nextSeq.length; i++) {
          if (!excludedTeams.includes(nextSeq[i])) {
            nextTeam = nextSeq[i];
            break;
          }
        }
        if (nextTeam === null) nextTeam = nextSeq[0];
      }
    }

    if (nextTeam !== null) {
      setCurrentTeam(nextTeam);
      setCurrentRound(nextRound);
      setChosenSuggestion("");
      
      localStorage.setItem('password_current_team', nextTeam.toString());
      localStorage.setItem('password_current_round', nextRound.toString());
      localStorage.removeItem('password_chosen_suggestion');
      window.dispatchEvent(new Event('storage'));
    }
  };

  const prevTurn = () => {
    const currentSeq = getTurnSequence(currentManche);
    let currentIndex = currentSeq.indexOf(currentTeam);
    
    let prevTeam: number | null = null;
    let prevRound = currentRound;
    
    // Trova la squadra precedente valida in questo round
    for (let i = currentIndex - 1; i >= 0; i--) {
      if (!excludedTeams.includes(currentSeq[i])) {
        prevTeam = currentSeq[i];
        break;
      }
    }

    // Se non ci sono squadre precedenti in questo round, torna al round precedente
    if (prevTeam === null) {
      prevRound -= 1;
      
      if (prevRound < 1) {
        if (currentManche > 0) {
          if (confirm("Tornare alla manche precedente?")) {
            const prevM = currentManche - 1;
            setCurrentManche(prevM);
            setCurrentRound(3);
            
            const prevSeq = getTurnSequence(prevM);
            let lastTeam = prevSeq[2];
            for (let i = prevSeq.length - 1; i >= 0; i--) {
              if (!excludedTeams.includes(prevSeq[i])) {
                lastTeam = prevSeq[i];
                break;
              }
            }
            
            setCurrentTeam(lastTeam);
            localStorage.setItem('password_current_manche', prevM.toString());
            localStorage.setItem('password_current_round', "3");
            localStorage.setItem('password_current_team', lastTeam.toString());
            window.location.reload();
            return;
          }
        } else {
          alert("SEI GIÀ ALL'INIZIO DEL GIOCO!");
          return;
        }
      } else {
        const prevSeq = getTurnSequence(currentManche);
        for (let i = prevSeq.length - 1; i >= 0; i--) {
          if (!excludedTeams.includes(prevSeq[i])) {
            prevTeam = prevSeq[i];
            break;
          }
        }
        if (prevTeam === null) prevTeam = prevSeq[prevSeq.length - 1];
      }
    }

    if (prevTeam !== null) {
      setCurrentTeam(prevTeam);
      setCurrentRound(prevRound);
      setChosenSuggestion("");
      
      localStorage.setItem('password_current_team', prevTeam.toString());
      localStorage.setItem('password_current_round', prevRound.toString());
      localStorage.removeItem('password_chosen_suggestion');
      window.dispatchEvent(new Event('storage'));
    }
  };

  const resetGame = () => {
    if (!confirm("Sei sicuro di voler resettare l'intero gioco (tutte le manche)?")) return;
    localStorage.clear();
    window.location.reload();
  };

  const currentPair = gameData.suggerimenti_turni[currentRound - 1]?.[currentTeam - 1] || [];

  const isWordGuessed = (word: string) => {
    return grid.find(w => w.word === word.toUpperCase())?.guessed;
  };

  return (
    <div className="w-full min-h-screen bg-slate-900 text-white p-8 font-sans">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-yellow-500">
            VISTA PRESCELTI / CONDUTTORE
          </h1>
          <p className="text-slate-400 font-bold">MANCHE {currentManche + 1} di {manches.length}</p>
        </div>
        <button 
          onClick={resetGame}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded font-bold text-sm"
        >
          RESET TOTALE
        </button>
      </div>

      <div className="flex gap-8 mb-8">
        <div className="flex-1">
          <h2 className="text-2xl font-bold mb-4">Mappa Parole (Alfabetico)</h2>
          <div className="grid grid-cols-3 gap-2">
            {grid.map((item, i) => (
              <div
                key={i}
                className={`p-3 rounded border-2 text-sm font-bold text-center transition-all ${teamColors[item.type]} ${item.guessed ? 'opacity-30 scale-95' : ''}`}
              >
                {item.word}
                {item.type === 'bomb' && <span className="block text-[10px] text-red-500">BOMBA</span>}
                {item.guessed && <span className="block text-[10px] text-white/50">INDIVINATA</span>}
              </div>
            ))}
          </div>
        </div>

        <div className="w-96 flex flex-col gap-6">
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <div>
                <span className="text-slate-400 text-xs uppercase font-black block">Round</span>
                <span className="text-3xl font-black text-white">{currentRound} / 3</span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 text-xs uppercase font-black block">Turno di</span>
                <span className={`text-3xl font-black ${currentTeam === 1 ? 'text-red-500' : currentTeam === 2 ? 'text-blue-500' : 'text-green-500'}`}>
                  SQUADRA {currentTeam}
                </span>
              </div>
            </div>

            <h2 className="text-xl font-bold mb-4 text-yellow-400">Suggerimenti Manche {currentManche + 1}:</h2>
            <div className="grid grid-cols-2 gap-4 mb-6">
              {currentPair.map((s: string, i: number) => (
                <button
                  key={i}
                  onClick={() => selectSuggestion(s)}
                  className={`py-6 px-4 rounded-xl font-black text-xl transition-all border-4 ${chosenSuggestion === s ? 'bg-yellow-500 text-black border-white scale-105 shadow-lg' : 'bg-slate-700 border-slate-600 hover:border-yellow-500'}`}
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={prevTurn}
                className="flex-1 py-4 bg-slate-600 text-white font-black text-sm rounded-xl hover:bg-slate-500 transition-all shadow-lg uppercase tracking-tighter"
              >
                ← Indietro
              </button>
              <button
                onClick={nextTurn}
                className="flex-1 py-4 bg-white text-black font-black text-sm rounded-xl hover:bg-yellow-400 transition-all shadow-lg uppercase tracking-tighter"
              >
                Prossimo →
              </button>
            </div>
            
            {chosenSuggestion && (
              <div className="mt-4 p-4 bg-yellow-500 text-black rounded-lg text-center font-black animate-pulse">
                INVIATO: {chosenSuggestion}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
        <h2 className="text-2xl font-bold mb-6 text-center">Riepilogo Squadre (Manche {currentManche + 1})</h2>
        <div className="grid grid-cols-3 gap-6">
          {[1, 2, 3].map(t => (
            <div key={t} className={`p-4 rounded-xl border-2 transition-all ${excludedTeams.includes(t) ? 'opacity-40 grayscale border-gray-600' : (t === 1 ? 'border-red-600 bg-red-900/10' : t === 2 ? 'border-blue-600 bg-blue-900/10' : 'border-green-600 bg-green-900/10')}`}>
              <h3 className="text-xl font-bold mb-4 text-center">
                SQUADRA {t} {excludedTeams.includes(t) && "❌"}
              </h3>
              <div className="flex flex-col gap-2">
                {gameData[`squadra${t}` as keyof typeof gameData].map((w: string, i: number) => {
                  const guessed = isWordGuessed(w);
                  const colorClass = t === 1 ? 'bg-red-600' : t === 2 ? 'bg-blue-600' : 'bg-green-600';
                  return (
                    <div key={i} className={`p-2 rounded text-center font-bold transition-all ${guessed ? colorClass : 'bg-slate-700 text-slate-400'}`}>
                      {w} {guessed && "✓"}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PasswordPresceltiBoard;

