import React, { useState, useEffect } from 'react';
import gameDataRaw from './data/Gioco password_Data.json';
import { useScores } from './context/ScoreContext';

type WordType = 'team1' | 'team2' | 'team3' | 'bomb' | 'neutral';
type RankType = 1 | 2 | 3;
type BussolottiStatus = 'pending' | 'active' | 'done';

interface WordItem {
  word: string;
  type: WordType;
  guessed: boolean;
  guessedBy?: number;
}

interface BussolottiConfig {
  immagine_premio: string;
  posizione_premio_2_posto: number;
  posizione_premio_3_posto: number;
}

const teamColors = {
  team1: 'bg-red-600',
  team2: 'bg-blue-600',
  team3: 'bg-green-600',
  bomb: 'bg-black',
  neutral: 'bg-gray-400'
};

const BussolottiOverlay: React.FC<{
  rank: RankType;
  teamNum: number;
  bussolottiConfig: BussolottiConfig;
  onComplete: () => void;
}> = ({ rank, teamNum, bussolottiConfig, onComplete }) => {
  const count = rank === 1 ? 1 : rank === 2 ? 3 : 5;
  const [winningIndex] = useState(() => {
    if (rank === 1) return 0;
    if (rank === 2) return bussolottiConfig.posizione_premio_2_posto;
    return bussolottiConfig.posizione_premio_3_posto;
  });
  
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (rank === 1) {
      const t = setTimeout(() => setSelectedIndex(0), 1000);
      return () => clearTimeout(t);
    }
  }, [rank]);

  useEffect(() => {
    if (selectedIndex !== null && rank !== 1 && !showAll) {
      const t = setTimeout(() => {
        setShowAll(true);
      }, 3000);
      return () => clearTimeout(t);
    }
  }, [selectedIndex, rank, showAll]);

  const { toggleBonus, bonuses } = useScores();

  const handleOpen = (i: number) => {
    if (selectedIndex !== null) return; // Solo una scelta consentita
    setSelectedIndex(i);
    
    // Se è il vincitore, attiva il bonus
    if (i === winningIndex) {
      const teamIdx = teamNum - 1;
      // Attiviamo il primo bonus non ancora attivo
      const nextBonusIdx = bonuses[teamIdx].findIndex(b => !b);
      if (nextBonusIdx !== -1) {
        toggleBonus(teamIdx, nextBonusIdx);
      }
    }
  };

  const teamName = `SQUADRA ${teamNum}`;
  const teamColor = teamNum === 1 ? 'text-red-500' : teamNum === 2 ? 'text-blue-500' : 'text-green-500';

  return (
    <div className="fixed inset-0 bg-black/90 flex flex-col items-center justify-center z-50 animate-in fade-in duration-500 select-none">
      <h2 className="text-4xl font-black text-white mb-2 uppercase tracking-widest text-center">
        {rank === 1 ? "PREMIO GARANTITO" : rank === 2 ? "SCEGLI TRA 3 BUSSOLOTTI" : "SCEGLI TRA 5 BUSSOLOTTI"}
      </h2>
      <h3 className={`text-4xl font-black mb-16 ${teamColor} drop-shadow-lg`}>{teamName} - {rank}° POSTO</h3>

      <div className="flex flex-wrap justify-center gap-12">
        {Array.from({ length: count }).map((_, i) => {
          const isSelected = i === selectedIndex;
          const isOpened = isSelected || showAll;
          const isWinner = i === winningIndex;
          
          const isWinningChoice = isWinner && isSelected;

          return (
            <div 
              key={i}
              onClick={() => { if (rank !== 1 && selectedIndex === null) handleOpen(i); }}
              className={`relative w-48 h-64 ${rank !== 1 && selectedIndex === null ? 'cursor-pointer hover:scale-105 active:scale-95' : ''} transition-all duration-500`}
              style={{ perspective: "1000px" }}
            >
              <div className={`relative w-full h-full transition-all duration-700 preserve-3d ${isOpened ? '[transform:rotateY(180deg)]' : ''}`}>
                
                {/* PARTE FRONTALE */}
                <div className="absolute inset-0 backface-hidden bg-gradient-to-b from-gray-700 to-gray-900 border-4 border-white/20 rounded-2xl flex flex-col items-center justify-center shadow-2xl">
                  <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center border-2 border-white/10 mb-4">
                    <span className="text-6xl font-black text-white/20 italic">{i + 1}</span>
                  </div>
                </div>

                {/* PARTE POSTERIORE */}
                <div className={`absolute inset-0 backface-hidden [transform:rotateY(180deg)] bg-gray-800 border-4 rounded-2xl flex items-center justify-center overflow-hidden transition-all duration-500
                  ${isWinningChoice ? 'border-green-400 shadow-[0_0_50px_rgba(74,222,128,0.8)] bg-green-900/20' : 'border-white/40 shadow-[0_0_50px_rgba(255,255,255,0.1)]'}
                  ${!isSelected && showAll ? 'opacity-40 grayscale' : ''}
                `}>
                  {isWinner ? (
                    <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-green-500/10">
                       <img 
                        src={bussolottiConfig.immagine_premio} 
                        alt="PREMIO" 
                        className={`w-full h-full object-contain ${isWinningChoice ? 'animate-pulse' : 'animate-in zoom-in duration-300'}`}
                        onError={(e) => {
                            (e.target as HTMLImageElement).src = "https://placehold.co/400x600/22c55e/white?text=BONUS";
                        }}
                       />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center opacity-30">
                      <svg className="w-20 h-20 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l18 18" />
                      </svg>
                      <span className="text-white font-bold mt-2 uppercase tracking-tighter">VUOTO</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedIndex !== null && (
        <button
          onClick={onComplete}
          className="mt-20 px-10 py-4 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full text-white font-bold tracking-widest transition-all uppercase animate-bounce shadow-[0_0_30px_rgba(255,255,255,0.1)]"
        >
          Continua
        </button>
      )}
    </div>
  );
};

const PasswordBoard: React.FC = () => {
  const [grid, setGrid] = useState<WordItem[]>([]);
  const [currentTeam, setCurrentTeam] = useState<number>(1);
  const [currentManche, setCurrentManche] = useState<number>(0);
  const [chosenSuggestion, setChosenSuggestion] = useState<string>("");
  const [gameOver, setGameOver] = useState<string | null>(null);
  const [excludedTeams, setExcludedTeams] = useState<number[]>([]);
  const [winnersOrder, setWinnersOrder] = useState<number[]>([]);
  
  // Stato Bussolotti
  const [bussolottiStatus, setBussolottiStatus] = useState<Record<RankType, BussolottiStatus>>({
    1: 'pending', 2: 'pending', 3: 'pending'
  });
  const [activeBussolottiRank, setActiveBussolottiRank] = useState<RankType | null>(null);

  const manches = gameDataRaw.manches;
  const gameData = manches[currentManche] || manches[0];

  useEffect(() => {
    // Carica stato iniziale completo
    const storedManche = localStorage.getItem('password_current_manche');
    if (storedManche) setCurrentManche(parseInt(storedManche));

    const storedTeam = localStorage.getItem('password_current_team');
    if (storedTeam) setCurrentTeam(parseInt(storedTeam));
    
    const storedSugg = localStorage.getItem('password_chosen_suggestion');
    if (storedSugg) setChosenSuggestion(storedSugg);

    const storedExcluded = localStorage.getItem('password_excluded_teams');
    if (storedExcluded) setExcludedTeams(JSON.parse(storedExcluded));

    const storedWinners = localStorage.getItem('password_winners_order');
    if (storedWinners) setWinnersOrder(JSON.parse(storedWinners));

    const currentM = storedManche ? parseInt(storedManche) : 0;
    const storedBussolottiManche = localStorage.getItem('password_bussolotti_manche');
    
    if (storedBussolottiManche !== currentM.toString()) {
      const initialBussolotti = { 1: 'pending' as BussolottiStatus, 2: 'pending' as BussolottiStatus, 3: 'pending' as BussolottiStatus };
      setBussolottiStatus(initialBussolotti);
      setActiveBussolottiRank(null);
      localStorage.setItem('password_bussolotti_status', JSON.stringify(initialBussolotti));
      localStorage.setItem('password_active_bussolotti', JSON.stringify(null));
      localStorage.setItem('password_bussolotti_manche', currentM.toString());
    } else {
      const storedBussolotti = localStorage.getItem('password_bussolotti_status');
      if (storedBussolotti) setBussolottiStatus(JSON.parse(storedBussolotti));
      const storedActiveBussolotti = localStorage.getItem('password_active_bussolotti');
      if (storedActiveBussolotti && storedActiveBussolotti !== "null") setActiveBussolottiRank(JSON.parse(storedActiveBussolotti));
    }

    const allWords: WordItem[] = [
      ...gameData.squadra1.map(w => ({ word: w.toUpperCase(), type: 'team1' as WordType, guessed: false })),
      ...gameData.squadra2.map(w => ({ word: w.toUpperCase(), type: 'team2' as WordType, guessed: false })),
      ...gameData.squadra3.map(w => ({ word: w.toUpperCase(), type: 'team3' as WordType, guessed: false })),
      ...gameData.altre.map((w, i) => ({ word: w.toUpperCase(), type: (i === 0 ? 'bomb' : 'neutral') as WordType, guessed: false }))
    ];

    const storedGrid = localStorage.getItem('password_grid_state');
    if (storedGrid) {
      setGrid(JSON.parse(storedGrid));
    } else {
      const shuffled = [...allWords].sort(() => Math.random() - 0.5);
      setGrid(shuffled);
      localStorage.setItem('password_grid_state', JSON.stringify(shuffled));
    }
    
    const handleStorage = () => {
      const manche = localStorage.getItem('password_current_manche');
      const team = localStorage.getItem('password_current_team');
      const sugg = localStorage.getItem('password_chosen_suggestion') || "";
      const gridState = localStorage.getItem('password_grid_state');
      const excluded = localStorage.getItem('password_excluded_teams');
      const winners = localStorage.getItem('password_winners_order');

      // Se non c'è stato salvato, resetta tutto
      if (!manche && !gridState) {
        setCurrentManche(0);
        setCurrentTeam(1);
        setChosenSuggestion("");
        setExcludedTeams([]);
        setWinnersOrder([]);
        setBussolottiStatus({ 1: 'pending', 2: 'pending', 3: 'pending' });
        setActiveBussolottiRank(null);
        window.location.reload();
        return;
      }

      if (manche) setCurrentManche(parseInt(manche));
      if (team) setCurrentTeam(parseInt(team));
      if (sugg) setChosenSuggestion(sugg);
      if (gridState) setGrid(JSON.parse(gridState));
      if (excluded) setExcludedTeams(JSON.parse(excluded));
      if (winners) setWinnersOrder(JSON.parse(winners));
      
      const bStatus = localStorage.getItem('password_bussolotti_status');
      if (bStatus) setBussolottiStatus(JSON.parse(bStatus));
      const bActive = localStorage.getItem('password_active_bussolotti');
      if (bActive !== null && bActive !== "null") setActiveBussolottiRank(JSON.parse(bActive));
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [currentManche, gameData]);

  const handleWordClick = (index: number) => {
    if (gameOver || grid[index].guessed || excludedTeams.includes(currentTeam)) return;

    const newGrid = [...grid];
    const clickedWord = newGrid[index];
    clickedWord.guessed = true;
    clickedWord.guessedBy = currentTeam;
    setGrid(newGrid);

    let newExcluded = [...excludedTeams];
    if (clickedWord.type === 'bomb') {
      newExcluded.push(currentTeam);
      setExcludedTeams(newExcluded);
      localStorage.setItem('password_excluded_teams', JSON.stringify(newExcluded));
      alert(`SQUADRA ${currentTeam} HA COLPITO LA BOMBA ED È ESCLUSA! (3° POSTO)`);
    }

    // Controlla vincitori
    const teams = ['team1', 'team2', 'team3'];
    const newWinners = [...winnersOrder];
    let winnersChanged = false;

    teams.forEach((t, i) => {
      const teamNum = i + 1;
      const teamWords = newGrid.filter(w => w.type === t);
      if (teamWords.every(w => w.guessed) && !newWinners.includes(teamNum) && !newExcluded.includes(teamNum)) {
        newWinners.push(teamNum);
        winnersChanged = true;
      }
    });

    if (winnersChanged) {
      setWinnersOrder(newWinners);
      localStorage.setItem('password_winners_order', JSON.stringify(newWinners));
    }

    localStorage.setItem('password_grid_state', JSON.stringify(newGrid));
    window.dispatchEvent(new Event('storage'));
  };

  const getTeamWords = (teamType: WordType) => {
    return grid.filter(w => w.guessed && w.type === teamType);
  };

  const getTeamRank = (teamNum: number): RankType | null => {
    if (excludedTeams.includes(teamNum)) return 3;
    const idx = winnersOrder.indexOf(teamNum);
    if (idx === 0) return 1;
    if (idx === 1) return 2;
    if (idx === 2) return 3;
    return null;
  };

  const getMedal = (teamNum: number) => {
    const rank = getTeamRank(teamNum);
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return null;
  };

  // Logica progressione bussolotti
  useEffect(() => {
    if (winnersOrder.length === 0 && excludedTeams.length === 0) return;

    let newStatus = { ...bussolottiStatus };
    let newActiveRank = activeBussolottiRank;
    let shouldUpdate = false;

    // Rank 1
    if (winnersOrder.length > 0 && newStatus[1] === 'pending') {
      newStatus[1] = 'active';
      newActiveRank = 1;
      shouldUpdate = true;
    }

    const isMancheOver = (winnersOrder.length + excludedTeams.length) === 3;

    if (isMancheOver) {
      if (newStatus[1] === 'done' && newStatus[2] === 'pending') {
        newStatus[2] = 'active';
        newActiveRank = 2;
        shouldUpdate = true;
      } else if (newStatus[2] === 'done' && newStatus[3] === 'pending') {
        newStatus[3] = 'active';
        newActiveRank = 3;
        shouldUpdate = true;
      } else if (newStatus[3] === 'done' && newActiveRank !== null) {
        newActiveRank = null;
        shouldUpdate = true;
      }
    }

    if (shouldUpdate) {
      if (newActiveRank === 1 && bussolottiStatus[1] === 'pending') {
        const timer = setTimeout(() => {
          setBussolottiStatus(newStatus);
          setActiveBussolottiRank(newActiveRank);
          localStorage.setItem('password_bussolotti_status', JSON.stringify(newStatus));
          localStorage.setItem('password_active_bussolotti', JSON.stringify(newActiveRank));
        }, 1500); // Ritardo per mostrare la medaglia prima del bussolotto
        return () => clearTimeout(timer);
      } else {
        setBussolottiStatus(newStatus);
        setActiveBussolottiRank(newActiveRank);
        localStorage.setItem('password_bussolotti_status', JSON.stringify(newStatus));
        localStorage.setItem('password_active_bussolotti', JSON.stringify(newActiveRank));
      }
    }
  }, [winnersOrder.length, excludedTeams.length, bussolottiStatus, activeBussolottiRank]);

  const handleBussolottiComplete = () => {
    if (activeBussolottiRank) {
      const newStatus = { ...bussolottiStatus, [activeBussolottiRank]: 'done' as BussolottiStatus };
      setBussolottiStatus(newStatus);
      setActiveBussolottiRank(null);
      localStorage.setItem('password_bussolotti_status', JSON.stringify(newStatus));
      localStorage.setItem('password_active_bussolotti', JSON.stringify(null));
    }
  };

  const getTeamForRank = (rank: RankType): number | null => {
    if (rank === 3 && excludedTeams.length > 0) return excludedTeams[0];
    if (rank === 1) return winnersOrder[0] || null;
    if (rank === 2) return winnersOrder[1] || null;
    if (rank === 3) return winnersOrder[2] || null;
    return null;
  };

  return (
    <div className="relative w-full min-h-screen bg-neutral-900 text-white flex flex-col items-center p-8 font-sans select-none overflow-hidden">
      {/* Sfondo base scuro */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(50,50,50,1)_0%,rgba(10,10,10,1)_100%)] z-0" />
      
      {/* Immagine di sfondo con trasparenza */}
      {gameData.sfondo && (
        <div 
          className="absolute top-0 left-0 w-full h-full z-0 transition-all duration-1000 opacity-30" 
          style={{
            backgroundImage: `url(${gameData.sfondo})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
      )}
      
      {activeBussolottiRank !== null && getTeamForRank(activeBussolottiRank) && (
        <BussolottiOverlay 
          rank={activeBussolottiRank} 
          teamNum={getTeamForRank(activeBussolottiRank)!} 
          bussolottiConfig={gameData.bussolotti}
          onComplete={handleBussolottiComplete} 
        />
      )}

      <div className="relative z-10 w-full max-w-6xl flex flex-col items-center">
        <div className="flex flex-col items-center mb-4">
          <h1 className="text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-500">
            PASSWORD
          </h1>
          <p className="text-xl font-bold text-gray-400 uppercase tracking-widest">MANCHE {currentManche + 1}</p>
        </div>

        <div className="flex w-full justify-between mb-12">
          {[1, 2, 3].map(t => {
            const rank = getTeamRank(t);
            const hasFinished = rank !== null;
            const isActive = currentTeam === t;
            const isExcluded = excludedTeams.includes(t);
            const medal = getMedal(t);
            
            let borderColor = 'border-gray-700';
            if (rank === 1) {
              borderColor = 'border-yellow-400 shadow-[0_0_30px_rgba(250,204,21,0.4)] bg-yellow-400/20';
            } else if (rank === 2) {
              borderColor = 'border-gray-300 shadow-[0_0_20px_rgba(209,213,219,0.4)] bg-gray-300/20';
            } else if (rank === 3 && !isExcluded) {
              borderColor = 'border-amber-600 shadow-[0_0_15px_rgba(217,119,6,0.4)] bg-amber-600/20';
            } else if (isActive && !isExcluded) {
              borderColor = t === 1 ? 'border-red-600 bg-red-600/10' : t === 2 ? 'border-blue-600 bg-blue-600/10' : 'border-green-600 bg-green-600/10';
            }

            return (
              <div key={t} className={`flex flex-col items-center w-1/4 p-4 rounded-xl border-4 transition-all duration-500
                ${borderColor}
                ${isActive && !hasFinished ? 'scale-105 shadow-[0_0_15px_rgba(255,255,255,0.1)]' : 'bg-gray-800/50'}
                ${isExcluded ? 'opacity-50 grayscale border-gray-800' : ''}`}>
                <h2 className={`text-2xl font-bold mb-4 ${t === 1 ? 'text-red-500' : t === 2 ? 'text-blue-500' : 'text-green-500'}`}>
                  SQUADRA {t} {isExcluded && "(BOMBA)"} {medal}
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
            {grid.map((item, i) => (
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
