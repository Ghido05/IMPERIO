import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useGameData } from './context/GameDataContext';
import { useSyncedState } from './hooks/useSyncedState';
import { assetUrl } from './lib/assetUrl';
import { getPhraseLetter, isPhraseLetterToken, normalizeFraseTempoItem, parsePhraseTokens } from './lib/fraseTempoUtils';

const FraseConTempo_Board: React.FC<{ interactive?: boolean }> = ({ interactive = true }) => {
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
      return;
    }

    // Keyboard numbers and arrows for manual bid movement (solo durante l'asta)
    if (!auctionLocked) {
      if (e.key === '0') {
        setAuctionValue(10);
        return;
      }
      if (/[1-9]/.test(e.key)) {
        setAuctionValue(parseInt(e.key));
        return;
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
        setAuctionValue(prev => Math.max(1, prev - 1));
        return;
      }
      if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
        setAuctionValue(prev => Math.min(10, prev + 1));
        return;
      }
    }

    // Guessed letter
    if (!revealed) {
      const key = e.key.toUpperCase();
      if (key.length === 1 && /[A-Z]/.test(key)) {
        processLetter(key);
      }
    }
  }, [targetTokens, phrase.lettereVisibili, revealed, auctionLocked, processLetter, setTokens, setCalledLetters, setLetterCounter, setAuctionValue, setAuctionLocked, setRevealed, setWrongLetter, setGuessTimerEndAt]);

  const revealSolution = useCallback(() => {
    setRevealed(true);
    setTokens([...targetTokens]);
  }, [targetTokens, setRevealed, setTokens]);

  useEffect(() => {
    if (!interactive) return;
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, interactive]);

  // Group tokens into words for wrapping
  const words: string[][] = [];
  let currentWord: string[] = [];
  tokens.forEach((t) => {
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

      {/* Frame 16:9 viewport wrapper */}
      <div className="relative w-full max-w-[1920px] aspect-[16/9] flex flex-col items-center justify-center px-10 py-6">
        
        {/* Header Title Banner */}
        <div className="text-center mb-[2%]">
          <span className="px-4 py-1 text-xs font-black bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-full tracking-widest uppercase mb-2 inline-block">
            BOX 4 — ASTA A RIBASSO
          </span>
          <h1 className="text-[clamp(24px,3.2vw,56px)] font-black text-yellow-400 tracking-tight uppercase animate-fade-in drop-shadow-[0_2px_15px_rgba(234,179,8,0.4)]">
            INDOVINA LA FRASE
          </h1>
        </div>

        {/* Phrase Display Grid */}
        <div className="flex flex-wrap justify-center gap-x-[1.2%] gap-y-[1.2vw] max-w-[95%] px-6 mb-[2%] min-h-[140px] items-center">
          {words.map((word, wIdx) => (
            <div key={wIdx} className="flex gap-[0.2vw]">
              {word.map((t, tIdx) => (
                t === ' ' ? (
                  <div key={tIdx} className="w-[1.6vw]" />
                ) : (
                  <div 
                    key={tIdx} 
                    className={`w-[clamp(30px,3.0vw,76px)] h-[clamp(44px,4.5vw,110px)] border-4 rounded-lg flex items-center justify-center text-[clamp(18px,2.4vw,52px)] font-black shadow-lg transition-all duration-300
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

        {/* Called Letters list + reveal button */}
        <div className="flex items-center justify-center gap-4 mb-4 flex-wrap">
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
            <button
              type="button"
              onClick={revealSolution}
              className="px-5 py-2 rounded-full text-xs font-black uppercase tracking-wider bg-red-600/20 border border-red-500/40 text-red-300 hover:bg-red-600/35 hover:text-white transition-all shadow-lg hover:shadow-red-900/30"
            >
              Scopri soluzione
            </button>
          )}
        </div>

        {/* Descending Auction Bar */}
        <div className="w-[90%] max-w-[1200px] mb-6">
          <div className="grid grid-cols-10 gap-2.5 w-full">
            {auctionSteps.map((step) => {
              const isActive = auctionValue === step;
              const isWinningBid = auctionLocked && isActive;
              return (
                <button
                  key={step}
                  disabled={!interactive || auctionLocked}
                  onClick={() => {
                    if (!interactive || auctionLocked) return;
                    setAuctionValue(step);
                    setLetterCounter(step);
                    setAuctionLocked(true);
                  }}
                  className={`relative py-3 rounded-xl border flex flex-col items-center justify-center transition-all duration-300 select-none
                    ${isWinningBid
                      ? 'bg-gradient-to-b from-emerald-400 to-green-500 border-green-300 ring-4 ring-green-400/50 text-black scale-110 z-10 shadow-[0_0_20px_rgba(34,197,94,0.7)]'
                      : isActive
                        ? 'bg-gradient-to-b from-amber-400 to-yellow-500 border-yellow-300 ring-4 ring-yellow-400/50 text-black scale-110 z-10 shadow-[0_0_20px_rgba(234,179,8,0.7)]'
                        : auctionLocked
                          ? 'bg-zinc-950/60 border-zinc-800/60 text-zinc-600 cursor-not-allowed opacity-50'
                          : 'bg-zinc-900/80 border-zinc-700/80 hover:border-zinc-500 text-zinc-400 hover:text-white hover:bg-zinc-800'
                    }`}
                >
                  <span className="text-2xl font-black">{step}</span>
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

        {/* Auction Dashboard Panel */}
        <div className="flex flex-col items-center w-[90%] max-w-[1000px] bg-zinc-950/80 border border-white/10 rounded-2xl p-8 shadow-2xl backdrop-blur-md">
          <div className="flex flex-col md:flex-row items-center justify-center gap-10 w-full">

            {/* Letter counter — appare dopo l'aggiudicazione */}
            {auctionLocked && (
              <div className="flex flex-col items-center animate-fade-in">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-3">
                  Lettere rimanenti
                </span>
                <div className="relative">
                  {/* Alfabeto decorativo sullo sfondo */}
                  <div className="absolute inset-0 flex flex-wrap justify-center gap-1 opacity-[0.12] pointer-events-none select-none p-2">
                    {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((l) => (
                      <span key={l} className="text-[11px] font-black text-indigo-300 w-4 text-center">{l}</span>
                    ))}
                  </div>
                  {/* Casella stile tile da gioco di lettere */}
                  <div
                    key={letterCounter}
                    className={`relative w-[140px] h-[140px] rounded-2xl border-4 flex flex-col items-center justify-center shadow-2xl animate-counter-pop
                      ${letterCounter === 0
                        ? 'bg-gradient-to-b from-zinc-800 to-zinc-950 border-zinc-600 text-zinc-500'
                        : 'bg-gradient-to-b from-indigo-600 to-blue-950 border-indigo-300 text-white shadow-indigo-950/60'
                      }`}
                  >
                    {/* Angoli decorativi tipo mattonella Scrabble */}
                    <span className="absolute top-2 left-2.5 text-[10px] font-black text-indigo-200/40">A</span>
                    <span className="absolute top-2 right-2.5 text-[10px] font-black text-indigo-200/40">B</span>
                    <span className="absolute bottom-2 left-2.5 text-[10px] font-black text-indigo-200/40">C</span>
                    <span className="absolute bottom-2 right-2.5 text-[10px] font-black text-indigo-200/40">Z</span>
                    <span className="text-[72px] font-black leading-none drop-shadow-lg tabular-nums">
                      {letterCounter}
                    </span>
                  </div>
                  {/* Tacche lettere rimanenti */}
                  <div className="flex justify-center gap-1 mt-3 flex-wrap max-w-[160px]">
                    {Array.from({ length: auctionValue }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-3 h-3 rounded-sm border transition-all duration-300
                          ${i < letterCounter
                            ? 'bg-indigo-400 border-indigo-300 shadow-[0_0_6px_rgba(129,140,248,0.5)]'
                            : 'bg-zinc-800 border-zinc-700 opacity-40'
                          }`}
                      />
                    ))}
                  </div>

                  {/* Cronometro rotondo da 10s quando il contatore arriva a 0 */}
                  {showGuessTimer && (
                    <div className="flex flex-col items-center mt-6 animate-fade-in">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-red-400 mb-3">
                        Tempo per indovinare
                      </span>
                      <div className="relative w-[140px] h-[140px]">
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
                            style={{ filter: 'drop-shadow(0 0 6px rgba(239,68,68,0.6))' }}
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-4xl font-black text-red-400 tabular-nums leading-none">
                            {Math.ceil(timerDisplay)}
                          </span>
                          <span className="text-[9px] font-black uppercase tracking-wider text-red-400/60 mt-1">sec</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Animated Auction Gavel */}
            <div className="flex flex-col items-center justify-center py-4 relative">
            <svg width="220" height="150" viewBox="0 0 200 150" className="overflow-visible select-none pointer-events-none">
              {/* 3D Sound Block / Base (Flipped 180° to the right) */}
              {/* Bottom wood base depth */}
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

              {/* Martelletto (Gavel) - Rotated 180° horizontally (pivot on the left: 35px 100px) */}
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

                {/* Gavel Head (Vertical Barrel on the right) */}
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
            
            {/* Status badge */}
            <div className={`absolute bottom-[-15px] px-4 py-1 rounded-full text-[11px] font-black uppercase tracking-wider border whitespace-nowrap
              ${auctionLocked
                ? 'bg-emerald-400/10 border-emerald-400/30 text-emerald-400'
                : 'bg-yellow-400/10 border-yellow-400/30 text-yellow-400 animate-pulse'
              }`}
            >
              {auctionLocked ? `Aggiudicata a ${auctionValue} — chiama le lettere` : `Offerta corrente: ${auctionValue}`}
            </div>
          </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default FraseConTempo_Board;
