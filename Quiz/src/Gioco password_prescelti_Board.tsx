import React, { useState, useEffect } from 'react';
import gameData from './data/Gioco password_Data.json';

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
  const [grid, setGrid] = useState<WordItem[]>([]);
  const [currentTeam, setCurrentTeam] = useState<number>(1);
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [chosenSuggestion, setChosenSuggestion] = useState<string>("");

  useEffect(() => {
    // Inizializza la griglia
    const initializeGrid = () => {
      const storedGrid = localStorage.getItem('password_grid_state');
      if (storedGrid) {
        setGrid(JSON.parse(storedGrid));
      } else {
        const allWords: WordItem[] = [
          ...gameData.squadra1.map(w => ({ word: w.toUpperCase(), type: 'team1' as WordType })),
          ...gameData.squadra2.map(w => ({ word: w.toUpperCase(), type: 'team2' as WordType })),
          ...gameData.squadra3.map(w => ({ word: w.toUpperCase(), type: 'team3' as WordType })),
          ...gameData.altre.map((w, i) => ({ word: w.toUpperCase(), type: (i === 0 ? 'bomb' : 'neutral') as WordType }))
        ];
        const sorted = [...allWords].sort((a, b) => a.word.localeCompare(b.word));
        setGrid(sorted);
      }
    };

    initializeGrid();

    // Carica stato round e team
    const storedTeam = localStorage.getItem('password_current_team');
    if (storedTeam) setCurrentTeam(parseInt(storedTeam));

    const storedRound = localStorage.getItem('password_current_round');
    if (storedRound) setCurrentRound(parseInt(storedRound));

    const handleStorage = () => {
      const team = localStorage.getItem('password_current_team');
      if (team) setCurrentTeam(parseInt(team));
      
      const round = localStorage.getItem('password_current_round');
      if (round) setCurrentRound(parseInt(round));

      const storedGrid = localStorage.getItem('password_grid_state');
      if (storedGrid) setGrid(JSON.parse(storedGrid));

      const sugg = localStorage.getItem('password_chosen_suggestion');
      if (sugg) setChosenSuggestion(sugg);
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const selectSuggestion = (sugg: string) => {
    setChosenSuggestion(sugg);
    localStorage.setItem('password_chosen_suggestion', sugg);
    window.dispatchEvent(new Event('storage'));
  };

  const nextTurn = () => {
    let nextTeam = currentTeam + 1;
    let nextRound = currentRound;

    if (nextTeam > 3) {
      nextTeam = 1;
      nextRound += 1;
    }

    if (nextRound > 3) {
      alert("GIOCO FINITO!");
      return;
    }

    setCurrentTeam(nextTeam);
    setCurrentRound(nextRound);
    setChosenSuggestion("");
    
    localStorage.setItem('password_current_team', nextTeam.toString());
    localStorage.setItem('password_current_round', nextRound.toString());
    localStorage.removeItem('password_chosen_suggestion');
    window.dispatchEvent(new Event('storage'));
  };

  const resetGame = () => {
    if (!confirm("Sei sicuro di voler resettare il gioco?")) return;
    localStorage.clear();
    // Inizializza nuovamente la griglia locale per coerenza
    const allWords: WordItem[] = [
      ...gameData.squadra1.map(w => ({ word: w.toUpperCase(), type: 'team1' as WordType })),
      ...gameData.squadra2.map(w => ({ word: w.toUpperCase(), type: 'team2' as WordType })),
      ...gameData.squadra3.map(w => ({ word: w.toUpperCase(), type: 'team3' as WordType })),
      ...gameData.altre.map((w, i) => ({ word: w.toUpperCase(), type: (i === 0 ? 'bomb' : 'neutral') as WordType }))
    ];
    const sorted = [...allWords].sort((a, b) => a.word.localeCompare(b.word));
    setGrid(sorted);
    setCurrentTeam(1);
    setCurrentRound(1);
    setChosenSuggestion("");
    
    // Notifica le altre finestre
    window.dispatchEvent(new Event('storage'));
  };

  // Ottieni la coppia di suggerimenti per il round e la squadra attuale
  // Struttura: suggerimenti_turni[round-1][team-1] = ["Parola1", "Parola2"]
  const currentPair = gameData.suggerimenti_turni[currentRound - 1]?.[currentTeam - 1] || [];

  const isWordGuessed = (word: string) => {
    return grid.find(w => w.word === word.toUpperCase())?.guessed;
  };

  return (
    <div className="w-full min-h-screen bg-slate-900 text-white p-8 font-sans">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-yellow-500">
          VISTA PRESCELTI / CONDUTTORE
        </h1>
        <button 
          onClick={resetGame}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded font-bold text-sm"
        >
          RESET TOTALE
        </button>
      </div>

      <div className="flex gap-8 mb-8">
        {/* Griglia con Soluzioni */}
        <div className="flex-1">
          <h2 className="text-2xl font-bold mb-4">Mappa Parole (Alfabetico)</h2>
          <div className="grid grid-cols-3 gap-2">
            {grid.slice(0, 12).map((item, i) => (
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

        {/* Controlli Suggerimenti */}
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

            <h2 className="text-xl font-bold mb-4 text-yellow-400">Scegli il suggerimento da inviare:</h2>
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

            <button
              onClick={nextTurn}
              className="w-full py-4 bg-white text-black font-black text-xl rounded-xl hover:bg-yellow-400 transition-all shadow-lg uppercase tracking-tighter"
            >
              Prossimo Turno →
            </button>
            
            {chosenSuggestion && (
              <div className="mt-4 p-4 bg-yellow-500 text-black rounded-lg text-center font-black animate-pulse">
                INVIATO: {chosenSuggestion}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Riepilogo Parole Squadre */}
      <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
        <h2 className="text-2xl font-bold mb-6 text-center">Riepilogo Parole per Squadra</h2>
        <div className="grid grid-cols-3 gap-6">
          {[1, 2, 3].map(t => (
            <div key={t} className={`p-4 rounded-xl border-2 transition-all ${t === 1 ? 'border-red-600 bg-red-900/10' : t === 2 ? 'border-blue-600 bg-blue-900/10' : 'border-green-600 bg-green-900/10'}`}>
              <h3 className="text-xl font-bold mb-4 text-center">SQUADRA {t}</h3>
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
