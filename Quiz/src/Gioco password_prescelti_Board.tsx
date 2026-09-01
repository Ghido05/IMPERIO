import React, { useState, useEffect } from 'react';
import { useGameData } from './context/GameDataContext';
import { useSyncedState } from './hooks/useSyncedState';
import { assetUrl } from './lib/assetUrl';
import { BussolottiOverlay } from './Gioco password_squadre_Board';
import { getInitialPasswordGrid, type WordItem } from './lib/passwordUtils';

type RankType = 1 | 2 | 3;
type BussolottiStatus = 'pending' | 'active' | 'done';

const teamColors = {
  team1: 'bg-red-600 border-red-400',
  team2: 'bg-blue-600 border-blue-400',
  team3: 'bg-green-600 border-green-400',
  bomb: 'bg-black border-red-600',
  neutral: 'bg-gray-600 border-gray-400'
};

const PasswordPresceltiBoard: React.FC<{ interactive?: boolean; ipadMode?: boolean }> = ({ interactive = true, ipadMode = false }) => {
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
  const [currentRound, setCurrentRound] = useState<number>(() => {
    const stored = localStorage.getItem('password_current_round');
    return stored ? parseInt(stored) : 1;
  });
  const [excludedTeams, setExcludedTeams] = useState<number[]>(() => {
    const stored = localStorage.getItem('password_excluded_teams');
    try {
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [chosenSuggestion, setChosenSuggestion] = useState<string>(() => {
    const stored = localStorage.getItem('password_chosen_suggestion');
    return stored || "";
  });
  const [grid, setGrid] = useState<WordItem[]>([]);

  const manches = gameDataRaw.manches;
  const gameData = manches[currentManche] || manches[0];

  const [audioPlaying, setAudioPlaying] = useSyncedState<boolean>('playstate_password_squadre_audio_playing', false);
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
  const [winnersOrder, setWinnersOrder] = useState<number[]>(() => {
    const stored = localStorage.getItem('password_winners_order');
    try {
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

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

  const handleBussolottiComplete = () => {
    if (activeBussolottiRank) {
      const newStatus = { ...bussolottiStatus, [activeBussolottiRank]: 'done' as BussolottiStatus };
      setBussolottiStatus(newStatus);
      setActiveBussolottiRank(null);
      localStorage.setItem(`password_bussolotti_status_m${currentManche}`, JSON.stringify(newStatus));
      localStorage.setItem('password_bussolotti_status', JSON.stringify(newStatus));
      localStorage.setItem(`password_active_bussolotti_m${currentManche}`, JSON.stringify(null));
      localStorage.setItem('password_active_bussolotti', JSON.stringify(null));
      localStorage.removeItem(`password_bussolotti_${activeBussolottiRank}_selected_idx`);
      localStorage.removeItem(`password_bussolotti_${activeBussolottiRank}_show_all`);
      localStorage.removeItem(`password_bussolotti_${activeBussolottiRank}_awarded`);
    }
  };

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
      const mancheIdx = (manche && manche !== "null") ? parseInt(manche, 10) : 0;
      setCurrentManche(mancheIdx);

      const team = localStorage.getItem(`password_current_team_m${mancheIdx}`) || localStorage.getItem('password_current_team');
      if (team && team !== "null") {
        setCurrentTeam(parseInt(team, 10));
      } else {
        const seq = getTurnSequence(mancheIdx);
        setCurrentTeam(seq[0]);
      }
      
      const round = localStorage.getItem(`password_current_round_m${mancheIdx}`) || localStorage.getItem('password_current_round');
      if (round && round !== "null") {
        setCurrentRound(parseInt(round, 10));
      } else {
        setCurrentRound(1);
      }

      const excluded = localStorage.getItem(`password_excluded_teams_m${mancheIdx}`) || localStorage.getItem('password_excluded_teams');
      if (excluded && excluded !== "null") {
        try {
          setExcludedTeams(JSON.parse(excluded));
        } catch {}
      } else {
        setExcludedTeams([]);
      }

      const storedGrid = localStorage.getItem(`password_grid_state_m${mancheIdx}`) || localStorage.getItem('password_grid_state');
      if (storedGrid && storedGrid !== "null") {
        try {
          setGrid(JSON.parse(storedGrid));
        } catch {}
      }

      const sugg = localStorage.getItem(`password_chosen_suggestion_m${mancheIdx}`) || localStorage.getItem('password_chosen_suggestion');
      if (sugg && sugg !== "null") {
        setChosenSuggestion(sugg);
      } else {
        setChosenSuggestion("");
      }

      const winners = localStorage.getItem(`password_winners_order_m${mancheIdx}`) || localStorage.getItem('password_winners_order');
      if (winners && winners !== "null") {
        try {
          setWinnersOrder(JSON.parse(winners));
        } catch {}
      } else {
        setWinnersOrder([]);
      }

      const bStatus = localStorage.getItem(`password_bussolotti_status_m${mancheIdx}`) || localStorage.getItem('password_bussolotti_status');
      if (bStatus && bStatus !== "null") {
        try {
          setBussolottiStatus(JSON.parse(bStatus));
        } catch {}
      } else {
        setBussolottiStatus({ 1: 'pending', 2: 'pending', 3: 'pending' });
      }

      const bActive = localStorage.getItem(`password_active_bussolotti_m${mancheIdx}`) || localStorage.getItem('password_active_bussolotti');
      if (bActive !== null && bActive !== "null") {
        try {
          setActiveBussolottiRank(JSON.parse(bActive));
        } catch {}
      } else {
        setActiveBussolottiRank(null);
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('local-storage-update', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('local-storage-update', handleStorage);
    };
  }, []);

  useEffect(() => {
    // Gestione Bussolotti per Manche
    const storedBussolottiManche = localStorage.getItem('password_bussolotti_manche');
    if (storedBussolottiManche !== currentManche.toString()) {
      const savedBStatus = localStorage.getItem(`password_bussolotti_status_m${currentManche}`);
      const initialBussolotti = savedBStatus ? JSON.parse(savedBStatus) : { 1: 'pending' as BussolottiStatus, 2: 'pending' as BussolottiStatus, 3: 'pending' as BussolottiStatus };
      setBussolottiStatus(initialBussolotti);
      setActiveBussolottiRank(null);
      localStorage.setItem(`password_bussolotti_status_m${currentManche}`, JSON.stringify(initialBussolotti));
      localStorage.setItem('password_bussolotti_status', JSON.stringify(initialBussolotti));
      localStorage.setItem('password_active_bussolotti', JSON.stringify(null));
      localStorage.setItem('password_bussolotti_manche', currentManche.toString());
    }
  }, [currentManche]);

  useEffect(() => {
    // Inizializza la griglia deterministica per la manche attuale
    const storedGrid = localStorage.getItem(`password_grid_state_m${currentManche}`);
    if (storedGrid && storedGrid !== "null") {
      try {
        const parsed = JSON.parse(storedGrid);
        setGrid(parsed);
        localStorage.setItem('password_grid_state', storedGrid);
      } catch {
        const initial = getInitialPasswordGrid(gameData, currentManche);
        setGrid(initial);
        localStorage.setItem(`password_grid_state_m${currentManche}`, JSON.stringify(initial));
        localStorage.setItem('password_grid_state', JSON.stringify(initial));
      }
    } else {
      const initial = getInitialPasswordGrid(gameData, currentManche);
      setGrid(initial);
      localStorage.setItem(`password_grid_state_m${currentManche}`, JSON.stringify(initial));
      localStorage.setItem('password_grid_state', JSON.stringify(initial));
    }
  }, [currentManche, gameData]);

  const selectSuggestion = (sugg: string) => {
    setChosenSuggestion(sugg);
    localStorage.setItem(`password_chosen_suggestion_m${currentManche}`, sugg);
    localStorage.setItem('password_chosen_suggestion', sugg);
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('local-storage-update', {
      detail: { key: 'password_chosen_suggestion', value: sugg }
    }));
  };

  const getTurnSequence = (mancheIndex: number) => {
    if (mancheIndex === 0) return [1, 2, 3];
    if (mancheIndex === 1) return [2, 3, 1];
    if (mancheIndex === 2) return [3, 1, 2];
    return [1, 2, 3];
  };

  const handleWordClick = (index: number) => {
    if (!grid[index] || grid[index].guessed || excludedTeams.includes(currentTeam)) return;

    const newGrid = [...grid];
    const clickedWord = { ...newGrid[index] };
    clickedWord.guessed = true;
    clickedWord.guessedBy = currentTeam;
    newGrid[index] = clickedWord;
    setGrid(newGrid);

    let newExcluded = [...excludedTeams];
    if (clickedWord.type === 'bomb') {
      newExcluded.push(currentTeam);
      setExcludedTeams(newExcluded);
      localStorage.setItem(`password_excluded_teams_m${currentManche}`, JSON.stringify(newExcluded));
      localStorage.setItem('password_excluded_teams', JSON.stringify(newExcluded));
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
      localStorage.setItem(`password_winners_order_m${currentManche}`, JSON.stringify(newWinners));
      localStorage.setItem('password_winners_order', JSON.stringify(newWinners));
    }

    localStorage.setItem(`password_grid_state_m${currentManche}`, JSON.stringify(newGrid));
    localStorage.setItem('password_grid_state', JSON.stringify(newGrid));
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('local-storage-update', {
      detail: { key: 'password_grid_state', value: JSON.stringify(newGrid) }
    }));
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
            setChosenSuggestion("");
            
            localStorage.setItem('password_current_manche', nextM.toString());
            localStorage.setItem(`password_current_round_m${nextM}`, "1");
            localStorage.setItem('password_current_round', "1");
            localStorage.setItem(`password_current_team_m${nextM}`, nextSeq[0].toString());
            localStorage.setItem('password_current_team', nextSeq[0].toString());
            localStorage.removeItem('password_chosen_suggestion');
            localStorage.removeItem(`password_chosen_suggestion_m${nextM}`);
            window.dispatchEvent(new Event('storage'));
            window.dispatchEvent(new CustomEvent('local-storage-update', {
              detail: { key: 'password_current_manche', value: nextM.toString() }
            }));
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
      
      localStorage.setItem(`password_current_team_m${currentManche}`, nextTeam.toString());
      localStorage.setItem('password_current_team', nextTeam.toString());
      localStorage.setItem(`password_current_round_m${currentManche}`, nextRound.toString());
      localStorage.setItem('password_current_round', nextRound.toString());
      localStorage.removeItem('password_chosen_suggestion');
      localStorage.removeItem(`password_chosen_suggestion_m${currentManche}`);
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('local-storage-update', {
        detail: { key: 'password_current_team', value: nextTeam.toString() }
      }));
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
            const prevSeq = getTurnSequence(prevM);
            let lastTeam = prevSeq[2];
            for (let i = prevSeq.length - 1; i >= 0; i--) {
              if (!excludedTeams.includes(prevSeq[i])) {
                lastTeam = prevSeq[i];
                break;
              }
            }
            
            setCurrentManche(prevM);
            setCurrentRound(3);
            setCurrentTeam(lastTeam);
            setChosenSuggestion("");
            
            localStorage.setItem('password_current_manche', prevM.toString());
            localStorage.setItem(`password_current_round_m${prevM}`, "3");
            localStorage.setItem('password_current_round', "3");
            localStorage.setItem(`password_current_team_m${prevM}`, lastTeam.toString());
            localStorage.setItem('password_current_team', lastTeam.toString());
            localStorage.removeItem('password_chosen_suggestion');
            localStorage.removeItem(`password_chosen_suggestion_m${prevM}`);
            window.dispatchEvent(new Event('storage'));
            window.dispatchEvent(new CustomEvent('local-storage-update', {
              detail: { key: 'password_current_manche', value: prevM.toString() }
            }));
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
      
      localStorage.setItem(`password_current_team_m${currentManche}`, prevTeam.toString());
      localStorage.setItem('password_current_team', prevTeam.toString());
      localStorage.setItem(`password_current_round_m${currentManche}`, prevRound.toString());
      localStorage.setItem('password_current_round', prevRound.toString());
      localStorage.removeItem('password_chosen_suggestion');
      localStorage.removeItem(`password_chosen_suggestion_m${currentManche}`);
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('local-storage-update', {
        detail: { key: 'password_current_team', value: prevTeam.toString() }
      }));
    }
  };

  const resetGame = () => {
    if (!confirm("Sei sicuro di voler resettare l'intero gioco (tutte le manche)?")) return;
    
    const keysToRemove = [
      'password_current_manche',
      'password_current_round',
      'password_current_team',
      'password_excluded_teams',
      'password_grid_state',
      'password_chosen_suggestion',
      'password_winners_order',
      'password_bussolotti_status',
      'password_active_bussolotti',
      'password_bussolotti_manche',
      'playstate_password_bussolotti_selected_idx',
      'playstate_password_bussolotti_show_all'
    ];
    // Rimuovi anche le chiavi per manche
    for (let m = 0; m < 10; m++) {
      keysToRemove.push(
        `password_grid_state_m${m}`,
        `password_excluded_teams_m${m}`,
        `password_winners_order_m${m}`,
        `password_chosen_suggestion_m${m}`,
        `password_bussolotti_status_m${m}`,
        `password_active_bussolotti_m${m}`,
        `password_current_team_m${m}`,
        `password_current_round_m${m}`
      );
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
    
    setCurrentManche(0);
    setCurrentRound(1);
    const firstSeq = getTurnSequence(0);
    setCurrentTeam(firstSeq[0]);
    setExcludedTeams([]);
    setChosenSuggestion("");
    
    const m0 = manches[0] || gameData;
    if (m0) {
      const initial = getInitialPasswordGrid(m0, 0);
      setGrid(initial);
      localStorage.setItem('password_grid_state_m0', JSON.stringify(initial));
      localStorage.setItem('password_grid_state', JSON.stringify(initial));
    }
    
    window.dispatchEvent(new Event('storage'));
  };

  const [presceltiTeamNames, setPresceltiTeamNames] = useState<string[]>(['SQUADRA 1', 'SQUADRA 2', 'SQUADRA 3']);

  useEffect(() => {
    const saved = localStorage.getItem('imperio_quiz_setup_config_v1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed?.punteggi?.nomiSquadre) {
          setPresceltiTeamNames(parsed.punteggi.nomiSquadre);
        }
      } catch {}
    }
  }, []);

  const currentPair = gameData.suggerimenti_turni[currentRound - 1]?.[currentTeam - 1] || [];

  const isWordGuessed = (word: string) => {
    return grid.find(w => w.word === word.toUpperCase())?.guessed;
  };
  return (
    <div className={`w-full min-h-screen bg-slate-900 text-white font-sans ${ipadMode ? 'p-3 sm:p-6' : 'p-8'}`}>
      {!ipadMode ? (
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-yellow-500">
              VISTA PRESCELTI / CONDUTTORE
            </h1>
            <div className="flex items-center gap-4">
              <p className="text-slate-400 font-bold">MANCHE {currentManche + 1} di {manches.length}</p>
              {(gameData as any).musicaIntro && (
                <button
                  type="button"
                  onClick={() => setAudioPlaying(prev => !prev)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    audioPlaying 
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white animate-pulse' 
                      : 'bg-slate-700 hover:bg-slate-650 text-slate-350 border border-slate-600'
                  }`}
                >
                  {audioPlaying ? '🔊 Stop Intro' : '🎵 Play Intro'}
                </button>
              )}
            </div>
          </div>
          <button 
            onClick={resetGame}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded font-bold text-sm cursor-pointer"
          >
            RESET TOTALE
          </button>
        </div>
      ) : (
        <div className="flex justify-between items-center mb-4 bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
          <div>
            <span className="text-[10px] text-yellow-500 font-black tracking-widest uppercase block">GIOCO 3: PASSWORD PRESCELTI</span>
            <span className="text-sm font-bold">MANCHE {currentManche + 1} / {manches.length}</span>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-8 mb-8">
        <div className="flex-1">
          <h2 className="text-lg sm:text-2xl font-bold mb-3 sm:mb-4 text-slate-300">Mappa Parole (Griglia)</h2>
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
            {grid.map((item, i) => (
              <div
                key={i}
                onClick={() => {
                  if (interactive && !item.guessed) {
                    handleWordClick(i);
                  }
                }}
                className={`p-2 sm:p-3 rounded border sm:border-2 text-xs sm:text-sm font-bold text-center transition-all ${teamColors[item.type]} ${item.guessed ? 'opacity-30 scale-95' : 'cursor-pointer hover:scale-105 active:scale-95'}`}
              >
                {item.word}
                {item.type === 'bomb' && <span className="block text-[8px] sm:text-[10px] text-red-450 font-black">BOMBA</span>}
                {item.guessed && <span className="block text-[8px] sm:text-[10px] text-white/50 font-black">INDOVINATA</span>}
              </div>
            ))}
          </div>
        </div>

        <div className="w-full lg:w-96 flex flex-col gap-4">
          <div className="bg-slate-800 p-4 sm:p-6 rounded-xl border border-slate-700 shadow-xl">
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <div>
                <span className="text-slate-400 text-[10px] sm:text-xs uppercase font-black block">Round</span>
                <span className="text-xl sm:text-3xl font-black text-white">{currentRound} / 3</span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 text-[10px] sm:text-xs uppercase font-black block">Turno di</span>
                <span className={`text-xl sm:text-3xl font-black ${currentTeam === 1 ? 'text-red-500' : currentTeam === 2 ? 'text-blue-500' : 'text-green-500'}`}>
                  {presceltiTeamNames[currentTeam - 1] || `SQUADRA ${currentTeam}`}
                </span>
              </div>
            </div>

            <h2 className="text-sm sm:text-xl font-bold mb-3 sm:mb-4 text-yellow-400">Suggerimenti Manche {currentManche + 1}:</h2>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
              {currentPair.map((s: string, i: number) => (
                <button
                  key={i}
                  onClick={() => selectSuggestion(s)}
                  className={`py-3 sm:py-6 px-2 sm:px-4 rounded-xl font-black text-md sm:text-xl transition-all border-2 sm:border-4 ${chosenSuggestion === s ? 'bg-yellow-500 text-black border-white scale-105 shadow-lg' : 'bg-slate-700 border-slate-600 hover:border-yellow-500'}`}
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={prevTurn}
                className="flex-1 py-3 sm:py-4 bg-slate-600 text-white font-black text-xs sm:text-sm rounded-xl hover:bg-slate-500 transition-all shadow-lg uppercase tracking-tighter cursor-pointer"
              >
                ← Indietro
              </button>
              <button
                onClick={nextTurn}
                className="flex-1 py-3 sm:py-4 bg-white text-black font-black text-xs sm:text-sm rounded-xl hover:bg-yellow-400 transition-all shadow-lg uppercase tracking-tighter cursor-pointer"
              >
                Prossimo →
              </button>
            </div>
            
            {chosenSuggestion && (
              <div className="mt-3 p-3 bg-yellow-500 text-black rounded-lg text-center text-sm font-black animate-pulse">
                INVIATO: {chosenSuggestion}
              </div>
            )}
          </div>
        </div>
      </div>

      {!ipadMode && (
        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
          <h2 className="text-2xl font-bold mb-6 text-center">Riepilogo Squadre (Manche {currentManche + 1})</h2>
          <div className="grid grid-cols-3 gap-6">
            {[1, 2, 3].map(t => (
              <div key={t} className={`p-4 rounded-xl border-2 transition-all ${excludedTeams.includes(t) ? 'opacity-40 grayscale border-gray-600' : (t === 1 ? 'border-red-600 bg-red-900/10' : t === 2 ? 'border-blue-600 bg-blue-900/10' : 'border-green-600 bg-green-900/10')}`}>
                <h3 className="text-xl font-bold mb-4 text-center">
                  {presceltiTeamNames[t - 1] || `SQUADRA ${t}`} {excludedTeams.includes(t) && "❌"}
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
    </div>
  );
};

export default PasswordPresceltiBoard;

