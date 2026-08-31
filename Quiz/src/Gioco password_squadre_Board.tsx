import React, { useState, useEffect } from 'react';
import { useGameData } from './context/GameDataContext';
import { useScores } from './context/ScoreContext';
import { assetUrl, assetUrlCss } from './lib/assetUrl';
import { useSyncedState } from './hooks/useSyncedState';

type WordType = 'team1' | 'team2' | 'team3' | 'bomb' | 'neutral';
type RankType = 1 | 2 | 3;
type BussolottiStatus = 'pending' | 'active' | 'done';

interface WordItem {
  word: string;
  type: WordType;
  guessed: boolean;
  guessedBy?: number;
}

export interface BussolottiConfig {
  immagine_premio: string;
  immagine_premio_squadra1?: string;
  immagine_premio_squadra2?: string;
  immagine_premio_squadra3?: string;
  schede_2_posto?: ('bonus' | 'vuoto' | '2000')[];
  schede_3_posto?: ('bonus' | 'vuoto' | '2000' | '1000')[];
}

const teamColors = {
  team1: 'bg-red-600',
  team2: 'bg-blue-600',
  team3: 'bg-green-600',
  bomb: 'bg-black',
  neutral: 'bg-gray-400'
};

export const BussolottiOverlay: React.FC<{
  rank: RankType;
  teamNum: number;
  bussolottiConfig: BussolottiConfig;
  onComplete: () => void;
}> = ({ rank, teamNum, bussolottiConfig, onComplete }) => {
  const count = rank === 1 ? 1 : rank === 2 ? 3 : 5;
  const [selectedIndex, setSelectedIndex] = useSyncedState<number | null>(`password_bussolotti_${rank}_selected_idx`, null);
  const [showAll, setShowAll] = useSyncedState<boolean>(`password_bussolotti_${rank}_show_all`, false);
  const [awarded, setAwarded] = useSyncedState<boolean>(`password_bussolotti_${rank}_awarded`, false);

  const { awardBonusAndPoints } = useScores();

  const getBonusSlotIdxForTeam = () => {
    let key = '';
    if (teamNum === 1) key = bussolottiConfig?.immagine_premio_squadra1 || 'dado';
    else if (teamNum === 2) key = bussolottiConfig?.immagine_premio_squadra2 || 'switch';
    else key = bussolottiConfig?.immagine_premio_squadra3 || 'arco';
    
    const s = key.toLowerCase().trim();
    if (s === 'dado' || s === '0') return 0;
    if (s === 'switch' || s === '1') return 1;
    if (s === 'arco' || s === '2') return 2;
    if (s === 'scudo' || s === '3') return 3;
    return (teamNum - 1) % 4;
  };

  const getBonusEmojiForTeam = (): string => {
    const slotIdx = getBonusSlotIdxForTeam();
    const emojis = ['🎲', '🔄', '🏹', '🛡️'];
    return emojis[slotIdx] || '🎁';
  };

  const getCardInfo = (i: number) => {
    if (rank === 1) {
      return { type: 'bonus_4000' as const, label: 'BONUS + 4000' };
    }
    if (rank === 2) {
      let cards = bussolottiConfig?.schede_2_posto;
      if (!cards || !Array.isArray(cards) || cards.length === 0) {
        const pos = (bussolottiConfig as any)?.posizione_premio_2_posto ?? 0;
        cards = ['vuoto', 'vuoto', 'vuoto'];
        cards[pos % 3] = 'bonus';
      }
      const type = cards[i] || 'vuoto';
      return { type, label: type === 'bonus' ? 'BONUS' : type === '2000' ? '+2000 PUNTI' : 'VUOTO' };
    }
    // rank === 3
    let cards = bussolottiConfig?.schede_3_posto;
    if (!cards || !Array.isArray(cards) || cards.length === 0) {
      const pos = (bussolottiConfig as any)?.posizione_premio_3_posto ?? 4;
      cards = ['vuoto', 'vuoto', 'vuoto', 'vuoto', 'bonus'];
      cards[pos % 5] = 'bonus';
    }
    const type = cards[i] || 'vuoto';
    return { type, label: type === 'bonus' ? 'BONUS' : type === '2000' ? '+2000 PUNTI' : type === '1000' ? '+1000 PUNTI' : 'VUOTO' };
  };

  const handleOpen = (i: number) => {
    const awardKey = `password_bussolotti_${rank}_awarded`;
    if (selectedIndex !== null || awarded || localStorage.getItem(awardKey) === 'true') return; // Solo una scelta consentita ed eseguita esattamente una volta
    
    setSelectedIndex(i);
    setAwarded(true);
    localStorage.setItem(awardKey, 'true');
    
    const teamIdx = teamNum - 1;
    const card = getCardInfo(i);
    const targetBonusSlot = getBonusSlotIdxForTeam();

    if (card.type === 'bonus_4000') {
      awardBonusAndPoints(teamIdx, 4000, targetBonusSlot);
    } else if (card.type === 'bonus') {
      awardBonusAndPoints(teamIdx, 0, targetBonusSlot);
    } else if (card.type === '2000') {
      awardBonusAndPoints(teamIdx, 2000);
    } else if (card.type === '1000') {
      awardBonusAndPoints(teamIdx, 1000);
    }
  };

  useEffect(() => {
    if (selectedIndex !== null && rank !== 1 && !showAll) {
      const t = setTimeout(() => {
        setShowAll(true);
      }, 3000);
      return () => clearTimeout(t);
    }
  }, [selectedIndex, rank, showAll]);

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
          const card = getCardInfo(i);
          const isWinningChoice = isSelected && card.type !== 'vuoto';
          
          const borderClass = isWinningChoice
            ? 'border-green-400 shadow-[0_0_50px_rgba(74,222,128,0.8)] bg-green-900/20' 
            : card.type !== 'vuoto' && showAll
              ? 'border-green-400/50 shadow-[0_0_30px_rgba(74,222,128,0.3)] bg-green-900/10'
              : 'border-white/40 shadow-[0_0_50px_rgba(255,255,255,0.1)]';

          return (
            <div 
              key={i}
              onClick={() => { if (selectedIndex === null) handleOpen(i); }}
              className={`relative w-48 h-64 ${selectedIndex === null ? 'cursor-pointer hover:scale-105 active:scale-95' : ''} transition-all duration-500`}
              style={{ perspective: "1000px" }}
            >
              <div className={`relative w-full h-full transition-all duration-700 [transform-style:preserve-3d] ${isOpened ? '[transform:rotateY(180deg)]' : ''}`}>
                
                {/* PARTE FRONTALE */}
                <div className="absolute inset-0 [backface-visibility:hidden] [webkit-backface-visibility:hidden] bg-gradient-to-b from-gray-700 to-gray-900 border-4 border-white/20 rounded-2xl flex flex-col items-center justify-center shadow-2xl">
                  <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center border-2 border-white/10 mb-4">
                    <span className="text-6xl font-black text-white/20 italic">{i + 1}</span>
                  </div>
                </div>

                {/* PARTE POSTERIORE */}
                <div className={`absolute inset-0 [backface-visibility:hidden] [webkit-backface-visibility:hidden] [transform:rotateY(180deg)] bg-gray-800 border-4 rounded-2xl flex items-center justify-center overflow-hidden transition-all duration-500
                  ${borderClass}
                  ${!isSelected && showAll ? 'opacity-40 grayscale' : ''}
                `}>
                  {card.type === 'bonus' || card.type === 'bonus_4000' ? (
                    <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-green-500/10 relative">
                       <span className="text-7xl animate-pulse">{getBonusEmojiForTeam()}</span>
                       {card.type === 'bonus_4000' ? (
                         <div className="absolute bottom-2 bg-yellow-500 text-slate-950 font-black text-[9px] px-2 py-0.5 rounded-full shadow-[0_0_15px_rgba(234,179,8,0.5)] whitespace-nowrap">
                           +4000 PUNTI & BONUS
                         </div>
                       ) : (
                         <div className="absolute bottom-2 bg-emerald-400 text-slate-950 font-black text-[9px] px-2 py-0.5 rounded-full shadow-[0_0_15px_rgba(52,211,153,0.5)] whitespace-nowrap">
                           BONUS OTTENUTO
                         </div>
                       )}
                    </div>
                  ) : card.type === '2000' || card.type === '1000' ? (
                    <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-yellow-500/10">
                      <span className="text-6xl mb-2">🏆</span>
                      <span className="text-3xl font-black text-yellow-400 drop-shadow-md tracking-tight">
                        {card.type === '2000' ? '+2.000' : '+1.000'}
                      </span>
                      <span className="text-xs text-slate-350 font-bold uppercase tracking-wider mt-1">Punti</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center opacity-30">
                      <svg className="w-20 h-20 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l18 18" />
                      </svg>
                      <span className="text-white font-bold mt-2 uppercase tracking-tighter text-sm">VUOTO</span>
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

// Dummy line to match bounds

const PasswordBoard: React.FC<{ interactive?: boolean; revealAll?: boolean }> = ({ interactive = true, revealAll = false }) => {
  const gameDataRaw = useGameData();
  if (!gameDataRaw) return <div className="text-white flex items-center justify-center w-full h-full">In attesa di dati...</div>;

  const [currentManche, setCurrentManche] = useState<number>(() => {
    const stored = localStorage.getItem('password_current_manche');
    return stored ? parseInt(stored) : 0;
  });
  const [currentTeam, setCurrentTeam] = useState<number>(() => {
    const stored = localStorage.getItem('password_current_team');
    return stored ? parseInt(stored) : 1;
  });
  const [chosenSuggestion, setChosenSuggestion] = useState<string>(() => {
    const stored = localStorage.getItem('password_chosen_suggestion');
    return stored || "";
  });
  const [excludedTeams, setExcludedTeams] = useState<number[]>(() => {
    const stored = localStorage.getItem('password_excluded_teams');
    try {
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [winnersOrder, setWinnersOrder] = useState<number[]>(() => {
    const stored = localStorage.getItem('password_winners_order');
    try {
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [bussolottiStatus, setBussolottiStatus] = useState<Record<RankType, BussolottiStatus>>(() => {
    const stored = localStorage.getItem('password_bussolotti_status');
    try {
      return stored ? JSON.parse(stored) : { 1: 'pending', 2: 'pending', 3: 'pending' };
    } catch {
      return { 1: 'pending', 2: 'pending', 3: 'pending' };
    }
  });
  const [activeBussolottiRank, setActiveBussolottiRank] = useState<RankType | null>(() => {
    const stored = localStorage.getItem('password_active_bussolotti');
    try {
      return stored && stored !== "null" ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [grid, setGrid] = useState<WordItem[]>([]);
  const [gameOver] = useState<string | null>(null);

  const manches = gameDataRaw.manches;
  const gameData = manches[currentManche] || manches[0];

  const [audioPlaying, setAudioPlaying] = useSyncedState<boolean>('playstate_password_squadre_audio_playing', false);
  const musicaIntro = (gameData as any).musicaIntro;

  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const shouldPlayAudio = React.useMemo(() => {
    if (!interactive) return false;
    const mode = new URLSearchParams(window.location.search).get('mode');
    const isSandbox = new URLSearchParams(window.location.search).get('sandbox') === 'true';
    return mode === 'games' || isSandbox || !mode;
  }, [interactive]);

  useEffect(() => {
    setAudioPlaying(false);
  }, [currentManche]);

  useEffect(() => {
    if (!shouldPlayAudio) return;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    if (musicaIntro) {
      audioRef.current = new Audio(assetUrl(musicaIntro));
      audioRef.current.loop = true;
      if (audioPlaying) {
        audioRef.current.play().catch(err => console.error("Error playing intro music:", err));
      }
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [musicaIntro, currentManche, shouldPlayAudio]);

  useEffect(() => {
    if (!shouldPlayAudio || !audioRef.current) return;

    if (audioPlaying) {
      audioRef.current.play().catch(err => {
        console.error("Error playing intro music:", err);
        setAudioPlaying(false);
      });
    } else {
      audioRef.current.pause();
    }
  }, [audioPlaying, shouldPlayAudio]);

  useEffect(() => {
    if (!interactive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }
      if (e.key.toLowerCase() === 'm') {
        if (musicaIntro) {
          setAudioPlaying(prev => !prev);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [interactive, musicaIntro]);

  useEffect(() => {
    const handleStorage = () => {
      const manche = localStorage.getItem('password_current_manche');
      const team = localStorage.getItem('password_current_team');
      const sugg = localStorage.getItem('password_chosen_suggestion') || "";
      const gridState = localStorage.getItem('password_grid_state');
      const excluded = localStorage.getItem('password_excluded_teams');
      const winners = localStorage.getItem('password_winners_order');

      const isMancheFalsy = !manche || manche === "null" || manche === "undefined";
      const isGridFalsy = !gridState || gridState === "null" || gridState === "undefined";

      // Se non c'è stato salvato, resetta tutto
      if (isMancheFalsy && isGridFalsy) {
        setCurrentManche(0);
        setCurrentTeam(1);
        setChosenSuggestion("");
        setExcludedTeams([]);
        setWinnersOrder([]);
        setBussolottiStatus({ 1: 'pending', 2: 'pending', 3: 'pending' });
        setActiveBussolottiRank(null);
        
        const m0 = manches[0] || gameData;
        if (m0) {
          const allWords: WordItem[] = [
            ...m0.squadra1.map((w: string) => ({ word: w.toUpperCase(), type: 'team1' as WordType, guessed: false })),
            ...m0.squadra2.map((w: string) => ({ word: w.toUpperCase(), type: 'team2' as WordType, guessed: false })),
            ...m0.squadra3.map((w: string) => ({ word: w.toUpperCase(), type: 'team3' as WordType, guessed: false })),
            ...m0.altre.map((w: string, i: number) => ({ word: w.toUpperCase(), type: (i === 0 ? 'bomb' : 'neutral') as WordType, guessed: false }))
          ];
          const shuffled = [...allWords].sort(() => Math.random() - 0.5);
          setGrid(shuffled);
        }
        return;
      }

      if (manche && manche !== "null") setCurrentManche(parseInt(manche));
      if (team && team !== "null") setCurrentTeam(parseInt(team));
      if (sugg && sugg !== "null") setChosenSuggestion(sugg);
      if (gridState && gridState !== "null") {
        try {
          setGrid(JSON.parse(gridState));
        } catch {}
      }
      if (excluded && excluded !== "null") {
        try {
          setExcludedTeams(JSON.parse(excluded));
        } catch {}
      } else {
        setExcludedTeams([]);
      }
      if (winners && winners !== "null") {
        try {
          setWinnersOrder(JSON.parse(winners));
        } catch {}
      } else {
        setWinnersOrder([]);
      }
      
      const bStatus = localStorage.getItem('password_bussolotti_status');
      if (bStatus && bStatus !== "null") {
        try {
          setBussolottiStatus(JSON.parse(bStatus));
        } catch {}
      } else {
        setBussolottiStatus({ 1: 'pending', 2: 'pending', 3: 'pending' });
      }
      const bActive = localStorage.getItem('password_active_bussolotti');
      if (bActive !== null && bActive !== "null") {
        try {
          setActiveBussolottiRank(JSON.parse(bActive));
        } catch {}
      } else {
        setActiveBussolottiRank(null);
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    // Gestione Bussolotti per Manche
    const storedBussolottiManche = localStorage.getItem('password_bussolotti_manche');
    if (storedBussolottiManche !== currentManche.toString()) {
      const initialBussolotti = { 1: 'pending' as BussolottiStatus, 2: 'pending' as BussolottiStatus, 3: 'pending' as BussolottiStatus };
      setBussolottiStatus(initialBussolotti);
      setActiveBussolottiRank(null);
      localStorage.setItem('password_bussolotti_status', JSON.stringify(initialBussolotti));
      localStorage.setItem('password_active_bussolotti', JSON.stringify(null));
      localStorage.setItem('password_bussolotti_manche', currentManche.toString());
    }

    // Inizializzazione Griglia Parole
    const allWords: WordItem[] = [
      ...gameData.squadra1.map((w: string) => ({ word: w.toUpperCase(), type: 'team1' as WordType, guessed: false })),
      ...gameData.squadra2.map((w: string) => ({ word: w.toUpperCase(), type: 'team2' as WordType, guessed: false })),
      ...gameData.squadra3.map((w: string) => ({ word: w.toUpperCase(), type: 'team3' as WordType, guessed: false })),
      ...gameData.altre.map((w: string, i: number) => ({ word: w.toUpperCase(), type: (i === 0 ? 'bomb' : 'neutral') as WordType, guessed: false }))
    ];
    const storedGrid = localStorage.getItem('password_grid_state');
    if (storedGrid) {
      try {
        setGrid(JSON.parse(storedGrid));
      } catch {
        const shuffled = [...allWords].sort(() => Math.random() - 0.5);
        setGrid(shuffled);
        localStorage.setItem('password_grid_state', JSON.stringify(shuffled));
      }
    } else {
      const shuffled = [...allWords].sort(() => Math.random() - 0.5);
      setGrid(shuffled);
      localStorage.setItem('password_grid_state', JSON.stringify(shuffled));
    }
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
    if (winnersOrder.length >= 2 && !winnersOrder.includes(teamNum)) return 3;
    if (winnersOrder.length === 1 && excludedTeams.length > 0 && !excludedTeams.includes(teamNum) && !winnersOrder.includes(teamNum)) return 2;
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

    const isMancheOver = (winnersOrder.length >= 2) || (winnersOrder.length >= 1 && excludedTeams.length > 0) || (excludedTeams.length >= 2);

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
      localStorage.removeItem(`password_bussolotti_${activeBussolottiRank}_selected_idx`);
      localStorage.removeItem(`password_bussolotti_${activeBussolottiRank}_show_all`);
      localStorage.removeItem(`password_bussolotti_${activeBussolottiRank}_awarded`);
    }
  };

  const getTeamForRank = (rank: RankType): number | null => {
    if (rank === 1) return winnersOrder[0] || null;
    if (rank === 2) {
      if (winnersOrder[1]) return winnersOrder[1];
      if (winnersOrder[0] && excludedTeams.length > 0) {
        const remaining = [1, 2, 3].find(t => t !== winnersOrder[0] && !excludedTeams.includes(t));
        return remaining || null;
      }
      return null;
    }
    if (rank === 3) {
      if (excludedTeams.length > 0) return excludedTeams[0];
      if (winnersOrder[2]) return winnersOrder[2];
      if (winnersOrder.length >= 2) {
        const remaining = [1, 2, 3].find(t => !winnersOrder.includes(t));
        return remaining || null;
      }
      return null;
    }
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
            backgroundImage: assetUrlCss(gameData.sfondo),
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
      )}
      
      {activeBussolottiRank !== null && getTeamForRank(activeBussolottiRank) && (
        <BussolottiOverlay 
          key={`bussolotti-${activeBussolottiRank}-${currentManche}`}
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
            {grid.map((item, i) => {
              const isGuessedOrReveal = item.guessed || revealAll;
              return (
                <div
                  key={i}
                  onClick={() => handleWordClick(i)}
                  className={`
                    w-40 h-24 flex items-center justify-center text-center p-2 rounded-lg cursor-pointer font-bold text-lg transition-all duration-500 transform
                    ${isGuessedOrReveal 
                      ? item.type === 'neutral' 
                        ? 'bg-zinc-700/60 border border-zinc-650 text-white/50 scale-95' 
                        : `${teamColors[item.type]} text-white scale-110 shadow-[0_0_20px_rgba(255,255,255,0.3)]` 
                      : 'bg-gray-100 text-gray-900 hover:bg-white hover:scale-105'}
                  `}
                >
                  {!isGuessedOrReveal || item.type !== 'neutral' || revealAll ? item.word : ''}
                </div>
              );
            })}
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
