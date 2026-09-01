import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useGameData } from './context/GameDataContext';
import { useSyncedState } from './hooks/useSyncedState';
import { assetUrl } from './lib/assetUrl';
import { getPhraseLetter, isPhraseLetterToken, normalizeFraseTempoItem, parsePhraseTokens } from './lib/fraseTempoUtils';
import { useScores } from './context/ScoreContext';

const getBonusSlotIndex = (slideBonus: string): number => {
  if (!slideBonus) return 0;
  const s = slideBonus.toLowerCase().trim();
  if (s === 'dado' || s === '0') return 0;
  if (s === 'switch' || s === '1') return 1;
  if (s === 'arco' || s === '2') return 2;
  if (s === 'scudo' || s === '3') return 3;
  return 0;
};

const getBonusDisplayEmoji = (slideBonus: string): string => {
  if (!slideBonus) return '';
  const s = slideBonus.toLowerCase().trim();
  if (s === 'dado' || s === '0') return '🎲';
  if (s === 'switch' || s === '1') return '🔄';
  if (s === 'arco' || s === '2') return '🏹';
  if (s === 'scudo' || s === '3') return '🛡️';
  return '🎁';
};

const FraseConTempo_Board: React.FC<{ interactive?: boolean; revealAll?: boolean }> = ({ interactive = true, revealAll = false }) => {
  const phrasesData = useGameData();
  const slideId = phrasesData.slideId ?? 'sandbox';

  // Active phrase index
  const [index] = useSyncedState(`playstate_${slideId}_index`, 0);

  // Phrase list from configuration or defaults
  const phraseList = (phrasesData.frasi ?? []).map(normalizeFraseTempoItem);
  const phrase = normalizeFraseTempoItem(phraseList[index % Math.max(phraseList.length, 1)] || '');

  // Construct a unique prefix for this specific phrase index to preserve state individually
  const phrasePrefix = `playstate_${slideId}_p${index}`;

  // Synced states specific to the current phrase index
  const [tokens, setTokens] = useSyncedState<string[]>(`${phrasePrefix}_tokens`, []);
  const [revealed, setRevealed] = useSyncedState<boolean>(`${phrasePrefix}_revealed`, false);
  const [auctionValue, setAuctionValue] = useSyncedState<number>(`${phrasePrefix}_auction_value`, 10);
  const [auctionLocked, setAuctionLocked] = useSyncedState<boolean>(`${phrasePrefix}_auction_locked`, false);
  const [letterCounter, setLetterCounter] = useSyncedState<number>(`${phrasePrefix}_letter_counter`, 10);
  const [calledLetters, setCalledLetters] = useSyncedState<string[]>(`${phrasePrefix}_called_letters`, []);
  const [wrongLetter, setWrongLetter] = useSyncedState<string | null>(`${phrasePrefix}_wrong_letter`, null);
  const [guessTimerEndAt, setGuessTimerEndAt] = useSyncedState<number>(`${phrasePrefix}_guess_timer_end`, 0);

  // New Synced States for steps, winning team selection and score tracking
  const [step, setStep] = useSyncedState<number>(`${phrasePrefix}_step`, 0);
  const [winningTeamIndex, setWinningTeamIndex] = useSyncedState<number | null>(`${phrasePrefix}_winning_team`, null);
  const [scoreAwarded, setScoreAwarded] = useSyncedState<boolean>(`${phrasePrefix}_score_awarded`, false);

  // Scores context
  const { bonuses, awardBonusAndPoints } = useScores();

  // Load general setup config for team names
  const [setupState, setSetupState] = useState<any>(null);
  const loadSetup = useCallback(() => {
    const saved = localStorage.getItem('imperio_quiz_setup_config_v1');
    if (saved) {
      try {
        setSetupState(JSON.parse(saved));
      } catch (e) {
        console.error('Error parsing setup state:', e);
      }
    }
  }, []);

  useEffect(() => {
    loadSetup();
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'imperio_quiz_setup_config_v1') {
        loadSetup();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [loadSetup]);

  const teamNames: string[] = setupState?.punteggi?.nomiSquadre || ['SQUADRA 1', 'SQUADRA 2', 'SQUADRA 3'];

  const isPresenter = typeof window !== 'undefined' && 
    (new URLSearchParams(window.location.search).get('mode') !== 'games' && 
     new URLSearchParams(window.location.search).get('mode') !== 'scores');

  // Award scores and handle bonus duplicate rules (awards 4000 extra points instead if team already has that bonus in Gioco 4)
  const awardPointsAndBonus = useCallback((t: number) => {
    // 1. Punti base configurati nel setup
    const rawPunti = (phrase as any).punti;
    const basePoints = (rawPunti !== undefined && rawPunti !== null && rawPunti !== '') 
      ? (Number(rawPunti) || 0) 
      : 0;

    const bonusKey = phrase.bonus;
    if (bonusKey && typeof bonusKey === 'string' && bonusKey.trim() !== '') {
      const b = getBonusSlotIndex(bonusKey);
      if (bonuses[t]?.[b]) {
        // Gioco 4 regola doppio bonus: se la squadra ha già quel particolare bonus, riceve 4000 punti extra
        awardBonusAndPoints(t, basePoints + 4000);
      } else {
        // Altrimenti riceve i punti base e ottiene il bonus
        awardBonusAndPoints(t, basePoints, b);
      }
    } else {
      if (basePoints > 0) {
        awardBonusAndPoints(t, basePoints);
      }
    }
  }, [phrase.punti, phrase.bonus, bonuses, awardBonusAndPoints]);

  // Local states
  const [targetTokens, setTargetTokens] = useState<string[]>([]);
  const [strikeActive, setStrikeActive] = useState(false);
  const [timerDisplay, setTimerDisplay] = useState(0);
  const prevLetterCounter = useRef(letterCounter);
  const prevTimerDisplay = useRef(0);
  const gongPlayedFor = useRef<number | null>(null);
  const [assetRefresh, setAssetRefresh] = useState(0);

  useEffect(() => {
    const refresh = () => setAssetRefresh((value) => value + 1);
    window.addEventListener('idb-file-loaded', refresh);
    return () => window.removeEventListener('idb-file-loaded', refresh);
  }, []);

  const playTone = useCallback((frequency: number, duration: number, type: OscillatorType, volume: number, endFrequency?: number) => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);
      if (endFrequency) osc.frequency.exponentialRampToValueAtTime(endFrequency, ctx.currentTime + duration);
      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + duration);
      setTimeout(() => ctx.close(), duration * 1000 + 100);
    } catch { /* Audio non disponibile */ }
  }, []);

  const playHammerSound = useCallback(() => {
    playTone(145, 0.18, 'triangle', 0.3, 65);
    setTimeout(() => playTone(75, 0.28, 'sine', 0.22, 42), 35);
  }, [playTone]);

  const playGongSound = useCallback(() => {
    [220, 277, 330, 440].forEach((frequency, i) => {
      setTimeout(() => playTone(frequency, 2.2, 'sine', 0.16 / (i + 1)), i * 12);
    });
  }, [playTone]);

  // Trigger gavel strike animation when letter counter changes after lock
  useEffect(() => {
    if (auctionLocked && letterCounter < prevLetterCounter.current) {
      prevLetterCounter.current = letterCounter;
      setStrikeActive(true);
      playHammerSound();
      const timer = setTimeout(() => setStrikeActive(false), 350);
      return () => clearTimeout(timer);
    }
    prevLetterCounter.current = letterCounter;
  }, [letterCounter, auctionLocked, playHammerSound]);

  const playErrorSound = useCallback(() => playTone(220, 0.4, 'square', 0.28, 90), [playTone]);

  // Nasconde la lettera sbagliata dopo 3 secondi
  useEffect(() => {
    if (!wrongLetter) return;
    const timer = setTimeout(() => setWrongLetter(null), 3000);
    return () => clearTimeout(timer);
  }, [wrongLetter, setWrongLetter]);

  // Avvia il cronometro da 10s quando il contatore lettere arriva a 0
  useEffect(() => {
    if (auctionLocked && letterCounter === 0 && guessTimerEndAt === 0) {
      setGuessTimerEndAt(Date.now() + 10000);
    }
  }, [auctionLocked, letterCounter, guessTimerEndAt, setGuessTimerEndAt]);

  // Aggiorna il display del cronometro circolare
  useEffect(() => {
    if (!guessTimerEndAt) {
      setTimerDisplay(0);
      return;
    }
    const tick = () => {
      setTimerDisplay(Math.max(0, (guessTimerEndAt - Date.now()) / 1000));
    };
    tick();
    const id = setInterval(tick, 50);
    return () => clearInterval(id);
  }, [guessTimerEndAt]);

  useEffect(() => {
    if (guessTimerEndAt > 0 && prevTimerDisplay.current > 0 && timerDisplay <= 0 && gongPlayedFor.current !== guessTimerEndAt) {
      gongPlayedFor.current = guessTimerEndAt;
      playGongSound();
    }
    prevTimerDisplay.current = timerDisplay;
  }, [timerDisplay, guessTimerEndAt, playGongSound]);

  const initGame = useCallback((idx: number) => {
    if (phraseList.length === 0) {
      setTargetTokens([]);
      return;
    }
    const configuredPhrase = phraseList[idx % phraseList.length];
    const targets = parsePhraseTokens(configuredPhrase.testo);
    setTargetTokens(targets);

    // If tokens for this phrase are not yet initialized in localStorage, set them up
    const phrasePrefix = `playstate_${slideId}_p${idx}`;
    const savedTokens = localStorage.getItem(`${phrasePrefix}_tokens`);
    if (savedTokens) {
      try {
        const parsed = JSON.parse(savedTokens);
        if (parsed.length === targets.length) {
          return;
        }
      } catch (e) {}
    }
    const visible = new Set(configuredPhrase.lettereVisibili || []);
    const initialTokens = targets.map((t, tokenIndex) => (isPhraseLetterToken(t) ? (visible.has(tokenIndex) ? t : '_') : t));
    localStorage.setItem(`${phrasePrefix}_tokens`, JSON.stringify(initialTokens));
    localStorage.setItem(`${phrasePrefix}_called_letters`, JSON.stringify([]));
    localStorage.setItem(`${phrasePrefix}_auction_value`, '10');
    localStorage.setItem(`${phrasePrefix}_auction_locked`, 'false');
    localStorage.setItem(`${phrasePrefix}_letter_counter`, '10');
    localStorage.setItem(`${phrasePrefix}_wrong_letter`, 'null');
    localStorage.setItem(`${phrasePrefix}_guess_timer_end`, '0');
    localStorage.setItem(`${phrasePrefix}_step`, '0');
    localStorage.setItem(`${phrasePrefix}_winning_team`, 'null');
    localStorage.setItem(`${phrasePrefix}_score_awarded`, 'false');

    window.dispatchEvent(new StorageEvent('storage', {
      key: `${phrasePrefix}_tokens`,
      newValue: JSON.stringify(initialTokens),
      storageArea: localStorage
    }));
    window.dispatchEvent(new StorageEvent('storage', {
      key: `${phrasePrefix}_called_letters`,
      newValue: JSON.stringify([]),
      storageArea: localStorage
    }));
    window.dispatchEvent(new StorageEvent('storage', {
      key: `${phrasePrefix}_step`,
      newValue: '0',
      storageArea: localStorage
    }));
    window.dispatchEvent(new StorageEvent('storage', {
      key: `${phrasePrefix}_winning_team`,
      newValue: null,
      storageArea: localStorage
    }));
    window.dispatchEvent(new StorageEvent('storage', {
      key: `${phrasePrefix}_score_awarded`,
      newValue: 'false',
      storageArea: localStorage
    }));
  }, [phraseList, slideId]);

  useEffect(() => {
    initGame(index);
  }, [index, initGame]);

  const processLetter = useCallback((key: string) => {
    if (revealed || calledLetters.includes(key)) return;

    const letterInPhrase = targetTokens.some(t => isPhraseLetterToken(t) && getPhraseLetter(t) === key);

    setCalledLetters(prev => [...prev, key]);

    if (auctionLocked) {
      setLetterCounter(prev => Math.max(0, prev - 1));
    }

    if (letterInPhrase) {
      setTokens(prev => prev.map((t, i) => (isPhraseLetterToken(targetTokens[i]) && getPhraseLetter(targetTokens[i]) === key ? targetTokens[i] : t)));
    } else {
      setWrongLetter(key);
      playErrorSound();
    }
  }, [revealed, calledLetters, targetTokens, auctionLocked, setCalledLetters, setLetterCounter, setTokens, setWrongLetter, playErrorSound]);

  const handleCorrectGuess = useCallback(() => {
    if (revealed) return;
    setRevealed(true);
    setTokens([...targetTokens]);
    setStep(7);

    // Award scores
    if (winningTeamIndex !== null && !scoreAwarded) {
      awardPointsAndBonus(winningTeamIndex);
      setScoreAwarded(true);
    }
  }, [revealed, targetTokens, winningTeamIndex, scoreAwarded, awardPointsAndBonus, setStep, setTokens, setRevealed]);

  const handleWrongGuess = useCallback(() => {
    if (revealed) return;
    setRevealed(true);
    setTokens([...targetTokens]);
    setStep(7);

    // Award scores to other two teams
    if (winningTeamIndex !== null && !scoreAwarded) {
      const otherTeams = [0, 1, 2].filter(idx => idx !== winningTeamIndex);
      otherTeams.forEach(t => {
        awardPointsAndBonus(t);
      });
      setScoreAwarded(true);
    }
  }, [revealed, targetTokens, winningTeamIndex, scoreAwarded, awardPointsAndBonus, setStep, setTokens, setRevealed]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (
      document.activeElement?.tagName === 'INPUT' ||
      document.activeElement?.tagName === 'TEXTAREA'
    ) {
      return;
    }

    if (e.metaKey || e.ctrlKey) return;

    // Backspace / Delete to clear/reset tokens
    if (e.key === 'Backspace' || e.key === 'Delete') {
      const visible = new Set(phrase.lettereVisibili || []);
      const initialTokens = targetTokens.map((t, tokenIndex) => (isPhraseLetterToken(t) ? (visible.has(tokenIndex) ? t : '_') : t));
      setTokens(initialTokens);
      setCalledLetters([]);
      setAuctionValue(10);
      setAuctionLocked(false);
      setLetterCounter(10);
      setRevealed(false);
      setWrongLetter(null);
      setGuessTimerEndAt(0);
      setStep(0);
      setWinningTeamIndex(null);
      setScoreAwarded(false);
      return;
    }

    // Arrow navigation for steps
    if (e.key === 'ArrowRight') {
      if (step < 3) {
        setStep(prev => prev + 1);
        return;
      }
    }
    if (e.key === 'ArrowLeft') {
      if (step > 0 && step <= 3 && !auctionLocked) {
        setStep(prev => prev - 1);
        return;
      }
    }

    // Keyboard numbers and arrows for manual bid movement (solo durante l'asta - Step 3)
    if (step === 3 && !auctionLocked) {
      if (e.key === '0') {
        setAuctionValue(10);
        return;
      }
      if (/[1-9]/.test(e.key)) {
        setAuctionValue(parseInt(e.key));
        return;
      }
      if (e.key === 'ArrowDown') {
        setAuctionValue(prev => Math.max(1, prev - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        setAuctionValue(prev => Math.min(10, prev + 1));
        return;
      }
      if (e.key === 'Enter') {
        setAuctionLocked(true);
        setLetterCounter(auctionValue);
        setStep(5);
        return;
      }
    }

    // Scoring controls (Enter for victory, \ for error)
    if (auctionLocked && winningTeamIndex !== null && !revealed) {
      if (e.key === 'Enter') {
        handleCorrectGuess();
        return;
      }

      if (e.key === '\\' || e.key === '|') {
        handleWrongGuess();
        return;
      }
    }

    // Guessed letter (only in Step 6)
    if (step === 6 && !revealed) {
      const key = e.key.toUpperCase();
      if (key.length === 1 && /[A-Z]/.test(key)) {
        processLetter(key);
      }
    }
  }, [targetTokens, phrase.lettereVisibili, revealed, auctionLocked, step, auctionValue, winningTeamIndex, processLetter, setTokens, setCalledLetters, setLetterCounter, setAuctionValue, setAuctionLocked, setRevealed, setWrongLetter, setGuessTimerEndAt, setStep, setWinningTeamIndex, setScoreAwarded, handleCorrectGuess, handleWrongGuess]);

  useEffect(() => {
    if (!interactive) return;
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, interactive]);

  // Group tokens into words for wrapping
  const words: string[][] = [];
  let currentWord: string[] = [];
  const displayTokens = revealAll ? targetTokens : tokens;
  displayTokens.forEach((t) => {
    if (t === ' ') {
      if (currentWord.length > 0) words.push(currentWord);
      words.push([' ']);
      currentWord = [];
    } else {
      currentWord.push(t);
    }
  });
  if (currentWord.length > 0) words.push(currentWord);

  const auctionSteps = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
  const timerRadius = 54;
  const timerCircumference = 2 * Math.PI * timerRadius;
  const timerProgress = guessTimerEndAt > 0 ? timerDisplay / 10 : 0;
  const timerStrokeOffset = timerCircumference * (1 - timerProgress);
  const showGuessTimer = auctionLocked && letterCounter === 0 && guessTimerEndAt > 0 && timerDisplay > 0;

  const showContent = step >= 1 || revealAll;
  const showPhraseAndAuction = step >= 3 || revealAll;

  return (
    <div data-asset-refresh={assetRefresh} className="relative w-full min-h-screen bg-black text-white flex items-center justify-center overflow-hidden select-none" style={{ backgroundImage: phrase.sfondo ? `linear-gradient(rgba(0,0,0,.55), rgba(0,0,0,.72)), url("${assetUrl(phrase.sfondo)}")` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }}>
      {/* Visual gavel style sheets */}
      <style>{`
        @keyframes gavel-strike {
          0% { transform: rotate(-35deg); }
          15% { transform: rotate(3deg); }
          30% { transform: rotate(0deg); }
          100% { transform: rotate(-35deg); }
        }
        .animate-gavel-strike {
          animation: gavel-strike 0.35s ease-out;
          transform-origin: 35px 100px;
        }
        @keyframes ring-expand {
          0% { transform: scale(0.5); opacity: 0; }
          30% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        .animate-ring-expand {
          animation: ring-expand 0.35s ease-out;
        }
        @keyframes counter-pop {
          0% { transform: scale(1); }
          40% { transform: scale(1.12); }
          100% { transform: scale(1); }
        }
        .animate-counter-pop {
          animation: counter-pop 0.35s ease-out;
        }
        @keyframes wrong-letter-shake {
          0%, 100% { transform: scale(1) rotate(0deg); }
          20% { transform: scale(1.08) rotate(-4deg); }
          40% { transform: scale(1.08) rotate(4deg); }
          60% { transform: scale(1.05) rotate(-2deg); }
          80% { transform: scale(1.05) rotate(2deg); }
        }
        .animate-wrong-letter {
          animation: wrong-letter-shake 0.5s ease-out;
        }
        @keyframes team-blink {
          0%, 100% { opacity: 1; transform: scale(1.05); }
          50% { opacity: 0.4; transform: scale(0.98); }
        }
        .animate-team-blink {
          animation: team-blink 0.8s ease-in-out infinite;
        }
      `}</style>

      {/* Lettera sbagliata — overlay con suono errore */}
      {wrongLetter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="animate-wrong-letter relative w-[120px] h-[120px] rounded-2xl border-4 border-red-500 bg-red-950/90 shadow-[0_0_40px_rgba(239,68,68,0.6)] flex items-center justify-center">
            <span className="text-6xl font-black text-red-200 select-none">{wrongLetter}</span>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-[85%] h-1.5 bg-red-500 rounded-full rotate-[-35deg] shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
            </div>
          </div>
        </div>
      )}

      {/* Team selection modal overlay for Step 5 (Presenter/Relatore only) */}
      {isPresenter && step === 5 && winningTeamIndex === null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md">
          <div className="bg-zinc-900 border-2 border-amber-500 rounded-3xl p-8 max-w-lg w-full text-center shadow-2xl animate-zoom-in">
            <h2 className="text-2xl font-black text-yellow-400 uppercase tracking-wide mb-6">
              Aggiudicazione Asta
            </h2>
            <p className="text-sm text-slate-300 mb-6">
              Seleziona la squadra che si è aggiudicata l'asta a <strong className="text-white">{auctionValue} lettere</strong>:
            </p>
            <div className="grid grid-cols-1 gap-4">
              {teamNames.map((name, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setWinningTeamIndex(idx);
                    setStep(6);
                  }}
                  className={`py-4 rounded-xl text-lg font-black text-white uppercase tracking-wider border shadow-lg transition-all transform hover:scale-105 active:scale-95 cursor-pointer
                    ${idx === 0 ? 'bg-red-700 hover:bg-red-650 border-red-500 hover:shadow-red-600/30' : ''}
                    ${idx === 1 ? 'bg-blue-700 hover:bg-blue-650 border-blue-500 hover:shadow-blue-600/30' : ''}
                    ${idx === 2 ? 'bg-emerald-700 hover:bg-emerald-650 border-emerald-500 hover:shadow-emerald-600/30' : ''}
                  `}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Frame 16:9 viewport wrapper */}
      <div className={`relative w-full max-w-[1920px] aspect-[16/9] flex flex-col items-center justify-center px-10 py-6 transition-all duration-1000 ${showContent ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        
        {/* Header Title Banner */}
        <div className="text-center mb-[1%]">
          <span className="px-4 py-1 text-xs font-black bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-full tracking-widest uppercase mb-2 inline-block">
            BOX 4 — ASTA A RIBASSO
          </span>
          <h1 className="text-[clamp(24px,3.2vw,56px)] font-black text-yellow-400 tracking-tight uppercase animate-fade-in drop-shadow-[0_2px_15px_rgba(234,179,8,0.4)]">
            INDOVINA LA FRASE
          </h1>
        </div>

        {/* Flashing Team Name Banner if winningTeamIndex !== null */}
        {winningTeamIndex !== null && (
          <div className="text-center mb-4 animate-team-blink">
            <span className={`px-6 py-2 rounded-xl text-lg font-black uppercase tracking-wider text-white border shadow-lg
              ${winningTeamIndex === 0 ? 'bg-red-600 border-red-400 shadow-red-900/50' : ''}
              ${winningTeamIndex === 1 ? 'bg-blue-600 border-blue-400 shadow-blue-900/50' : ''}
              ${winningTeamIndex === 2 ? 'bg-emerald-600 border-emerald-400 shadow-emerald-900/50' : ''}
            `}>
              ASTA AGGIUDICATA A: {teamNames[winningTeamIndex]}
            </span>
          </div>
        )}

        <div className="flex-grow" />

        {/* Phrase Display Grid */}
        <div className={`flex flex-wrap justify-center gap-x-[1.6%] gap-y-[1.6vw] max-w-[95%] px-6 mb-4 min-h-[180px] items-center transition-all duration-500 ${showPhraseAndAuction ? 'opacity-100 scale-100' : 'opacity-0 scale-90 h-0 overflow-hidden pointer-events-none mb-0'}`}>
          {words.map((word, wIdx) => (
            <div key={wIdx} className="flex gap-[0.3vw]">
              {word.map((t, tIdx) => (
                t === ' ' ? (
                  <div key={tIdx} className="w-[2.2vw]" />
                ) : (
                  <div 
                    key={tIdx} 
                    className={`w-[clamp(42px,3.8vw,96px)] h-[clamp(60px,5.6vw,136px)] border-[5px] rounded-xl flex items-center justify-center text-[clamp(24px,3.2vw,68px)] font-black shadow-2xl transition-all duration-300
                      ${t === '_' 
                        ? 'bg-blue-950/40 border-blue-600/30 text-transparent shadow-black/40' 
                        : 'bg-gradient-to-b from-blue-900 to-indigo-950 border-blue-400 text-white shadow-blue-950/50 scale-105 animate-zoom-in'
                      }`}
                  >
                    {t === '_' ? '' : t}
                  </div>
                )
              ))}
            </div>
          ))}
        </div>

        {/* Called Letters list + reveal/error buttons */}
        <div className={`flex items-center justify-center gap-4 mb-4 flex-wrap transition-all duration-500 ${showPhraseAndAuction ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden pointer-events-none'}`}>
          {calledLetters.length > 0 && (
            <div className="flex items-center gap-2 animate-fade-in bg-zinc-900/60 border border-white/5 px-4 py-1.5 rounded-full text-xs">
              <span className="text-zinc-500 font-bold uppercase tracking-wider text-[10px]">Lettere Chiamate:</span>
              <div className="flex gap-1.5">
                {calledLetters.map((l) => {
                  const isCons = /[B-DF-HJ-NP-TV-Z]/.test(l);
                  return (
                    <span
                      key={l}
                      className={`w-5 h-5 flex items-center justify-center rounded font-black text-[10px] select-none
                        ${isCons ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'}`}
                    >
                      {l}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
          {interactive && !revealed && (
            <div className="flex gap-4">
              <button
                type="button"
                onClick={handleCorrectGuess}
                className="px-5 py-2 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/35 hover:text-white transition-all shadow-lg hover:shadow-emerald-900/30 cursor-pointer"
              >
                Scopri soluzione (Vittoria) [Invio]
              </button>
              {winningTeamIndex !== null && (
                <button
                  type="button"
                  onClick={handleWrongGuess}
                  className="px-5 py-2 rounded-full text-xs font-black uppercase tracking-wider bg-red-600/20 border border-red-500/40 text-red-300 hover:bg-red-600/35 hover:text-white transition-all shadow-lg hover:shadow-red-900/30 cursor-pointer"
                >
                  Errore ( \ )
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex-grow" />

        {/* Descending Auction Bar */}
        <div className={`w-[90%] max-w-[1200px] mb-6 transition-all duration-500 ${showPhraseAndAuction ? 'opacity-100 scale-100' : 'opacity-0 scale-90 h-0 overflow-hidden pointer-events-none'}`}>
          <div className="grid grid-cols-10 gap-2.5 w-full">
            {auctionSteps.map((stepNum) => {
              const isActive = auctionValue === stepNum;
              const isWinningBid = auctionLocked && isActive;
              return (
                <button
                  key={stepNum}
                  disabled={!interactive || auctionLocked}
                  onClick={() => {
                    if (!interactive || auctionLocked) return;
                    setAuctionValue(stepNum);
                    setLetterCounter(stepNum);
                    setAuctionLocked(true);
                    setStep(5);
                  }}
                  className={`relative py-3 rounded-xl border flex flex-col items-center justify-center transition-all duration-300 select-none cursor-pointer
                    ${isWinningBid
                      ? 'bg-gradient-to-b from-emerald-400 to-green-500 border-green-300 ring-4 ring-green-400/50 text-black scale-110 z-10 shadow-[0_0_20px_rgba(34,197,94,0.7)]'
                      : isActive
                        ? 'bg-gradient-to-b from-amber-400 to-yellow-500 border-yellow-300 ring-4 ring-yellow-400/50 text-black scale-110 z-10 shadow-[0_0_20px_rgba(234,179,8,0.7)]'
                        : auctionLocked
                          ? 'bg-zinc-950/60 border-zinc-800/60 text-zinc-600 cursor-not-allowed opacity-50'
                          : 'bg-zinc-900/80 border-zinc-700/80 hover:border-zinc-500 text-zinc-400 hover:text-white hover:bg-zinc-800'
                    }`}
                >
                  <span className="text-2xl font-black">{stepNum}</span>
                  {isActive && !auctionLocked && (
                    <span className="absolute -top-3 text-[9px] font-black bg-black text-amber-400 px-2 py-0.5 rounded-full uppercase tracking-wider border border-amber-400 animate-pulse">
                      OFFERTA
                    </span>
                  )}
                  {isWinningBid && (
                    <span className="absolute -top-3 text-[9px] font-black bg-black text-emerald-400 px-2 py-0.5 rounded-full uppercase tracking-wider border border-emerald-400">
                      AGGIUDICATA
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Auction Dashboard Panel — in basso a sinistra in modo assoluto, compatto e rimpicciolito */}
        <div className={`absolute bottom-6 left-10 flex flex-col items-center bg-zinc-950/80 border border-white/10 rounded-2xl p-4 shadow-2xl backdrop-blur-md transition-all duration-500 z-20 ${showPhraseAndAuction ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'}`}>
          <div className="flex items-center gap-6">
            
            {/* Letter counter (rimpicciolito, w-20 h-20) — appare dopo l'aggiudicazione */}
            {auctionLocked && (
              <div className="flex flex-col items-center animate-fade-in">
                <span className="text-[9px] font-black uppercase tracking-wider text-indigo-400 mb-1.5">
                  Lettere
                </span>
                <div className="relative">
                  <div
                    key={letterCounter}
                    className={`relative w-[80px] h-[80px] rounded-xl border-2 flex flex-col items-center justify-center shadow-lg animate-counter-pop
                      ${letterCounter === 0
                        ? 'bg-gradient-to-b from-zinc-800 to-zinc-950 border-zinc-600 text-zinc-500'
                        : 'bg-gradient-to-b from-indigo-600 to-blue-950 border-indigo-300 text-white shadow-indigo-950/60'
                      }`}
                  >
                    <span className="text-4xl font-black leading-none drop-shadow-lg tabular-nums">
                      {letterCounter}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Animated Auction Gavel (SVG rimpicciolito) */}
            <div className="flex flex-col items-center justify-center relative py-1">
              <svg width="110" height="75" viewBox="0 0 200 150" className="overflow-visible select-none pointer-events-none">
                {/* 3D Sound Block / Base */}
                <ellipse cx="125" cy="128" rx="40" ry="12" fill="#3d1a03" />
                <rect x="85" y="120" width="80" height="8" fill="#3d1a03" />
                {/* Top face of base */}
                <ellipse cx="125" cy="120" rx="40" ry="12" fill="#78350f" stroke="#fbbf24" strokeWidth="2.5" />
                
                {/* Shockwave ripple ring */}
                {strikeActive && (
                  <ellipse 
                    cx="125" 
                    cy="120" 
                    rx="40" 
                    ry="12" 
                    fill="none" 
                    stroke="#fbbf24" 
                    strokeWidth="3.5" 
                    className="animate-ring-expand" 
                    style={{ transformOrigin: '125px 120px' }} 
                  />
                )}

                {/* Martelletto (Gavel) */}
                <g 
                  className={strikeActive ? "animate-gavel-strike" : ""} 
                  style={{ 
                    transformOrigin: "35px 100px", 
                    transform: strikeActive ? "rotate(0deg)" : "rotate(-35deg)",
                    transition: "transform 0.12s ease-out"
                  }}
                >
                  {/* Wooden handle */}
                  <line x1="35" y1="100" x2="125" y2="100" stroke="#92400e" strokeWidth="7" strokeLinecap="round" />
                  {/* Leather Grip */}
                  <line x1="35" y1="100" x2="65" y2="100" stroke="#451a03" strokeWidth="9" strokeLinecap="round" />
                  
                  {/* Joint accent pin */}
                  <circle cx="125" cy="100" r="4.5" fill="#fbbf24" />

                  {/* Gavel Head (Vertical Barrel) */}
                  <g transform="translate(125, 100)">
                    {/* Cylinder head body */}
                    <rect x="-10" y="-20" width="20" height="40" rx="3" fill="#78350f" stroke="#fbbf24" strokeWidth="1.5" />
                    {/* Top barrel face */}
                    <ellipse cx="0" cy="-20" rx="10" ry="3.5" fill="#451a03" stroke="#fbbf24" strokeWidth="1" />
                    {/* Bottom barrel face */}
                    <ellipse cx="0" cy="20" rx="10" ry="3.5" fill="#78350f" stroke="#fbbf24" strokeWidth="1" />
                    {/* Decorative Gold band */}
                    <rect x="-10" y="-3" width="20" height="6" fill="#fbbf24" />
                  </g>
                </g>
              </svg>
              
              {/* Status badge (rimpicciolito) */}
              <div className={`absolute -bottom-4 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider border whitespace-nowrap z-10
                ${auctionLocked
                  ? 'bg-emerald-400/10 border-emerald-400/30 text-emerald-400'
                  : 'bg-yellow-400/10 border-yellow-400/30 text-yellow-400 animate-pulse'
                }`}
              >
                {auctionLocked ? `${auctionValue} Lettere` : `Offerta: ${auctionValue}`}
              </div>
            </div>

          </div>
        </div>

        {/* Clue Box (visible if step >= 1) */}
        {step >= 1 && (
          <div className="flex flex-col items-center gap-4 mt-2">
            {/* Clue Box */}
            <div className="bg-zinc-950/90 border-2 border-amber-500/50 rounded-2xl px-8 py-4 shadow-2xl backdrop-blur-md text-center max-w-[800px] animate-fade-in mb-2">
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-500 mb-1 block">
                INDIZIO MISTERIOSO
              </span>
              <p className="text-[clamp(18px,2vw,36px)] font-bold text-white tracking-wide leading-snug">
                {phrase.indizio || 'Nessun indizio inserito'}
              </p>
            </div>
          </div>
        )}

        {/* Permanent Points & Bonus in basso a destra per tutta la durata del gioco */}
        {step >= 2 && (
          <div className="absolute bottom-6 right-10 flex items-center gap-4 z-20">
            {phrase.bonus && typeof phrase.bonus === 'string' && phrase.bonus.trim() !== '' && (
              <div className="bg-zinc-950/80 border border-white/10 rounded-xl p-3 flex flex-col items-center justify-center shadow-2xl backdrop-blur-md w-24 h-24 animate-fade-in">
                <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest mb-1.5">BONUS</span>
                <span className="text-3xl animate-pulse">{getBonusDisplayEmoji(phrase.bonus)}</span>
              </div>
            )}
            <div className="bg-zinc-950/80 border border-white/10 rounded-xl p-3 flex flex-col items-center justify-center shadow-2xl backdrop-blur-md min-w-[100px] h-24 animate-fade-in">
              <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest mb-1.5">PUNTI</span>
              <span className="text-3xl font-black text-white tabular-nums">
                {(() => {
                  const rawP = (phrase as any).punti;
                  const pts = (rawP !== undefined && rawP !== null && rawP !== '') ? (Number(rawP) || 0) : 0;
                  return pts.toLocaleString('it-IT');
                })()}
              </span>
            </div>
          </div>
        )}

        {/* Large Round Timer in alto a destra */}
        {showGuessTimer && (
          <div className="absolute top-6 right-10 flex flex-col items-center justify-center bg-zinc-950/90 border-2 border-red-500/50 p-4 rounded-3xl shadow-2xl backdrop-blur-md z-30 animate-fade-in w-[150px] h-[150px]">
            <span className="text-[9px] font-black uppercase tracking-widest text-red-400 mb-1.5">
              TEMPO
            </span>
            <div className="relative w-[90px] h-[90px]">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle
                  cx="60"
                  cy="60"
                  r={timerRadius}
                  fill="none"
                  stroke="rgb(39 39 42)"
                  strokeWidth="8"
                />
                <circle
                  cx="60"
                  cy="60"
                  r={timerRadius}
                  fill="none"
                  stroke="rgb(239 68 68)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={timerCircumference}
                  strokeDashoffset={timerStrokeOffset}
                  className="transition-[stroke-dashoffset] duration-100 ease-linear"
                  style={{ filter: 'drop-shadow(0 0 8px rgba(239,68,68,0.7))' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black text-red-400 tabular-nums leading-none">
                  {Math.ceil(timerDisplay)}
                </span>
                <span className="text-[8px] font-black uppercase tracking-wider text-red-400/60 mt-0.5">sec</span>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default FraseConTempo_Board;
