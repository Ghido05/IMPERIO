import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useGameData } from './context/GameDataContext';
import { useSyncedState } from './hooks/useSyncedState';

const FraseConTempo_Board: React.FC<{ interactive?: boolean }> = ({ interactive = true }) => {
  const phrasesData = useGameData();
  const slideId = phrasesData.slideId ?? 'sandbox';

  // Active phrase index
  const [index] = useSyncedState(`playstate_${slideId}_index`, 0);

  // Phrase list from configuration or defaults
  const phraseList = phrasesData.frasi ?? [];

  // Construct a unique prefix for this specific phrase index to preserve state individually
  const phrasePrefix = `playstate_${slideId}_p${index}`;

  // Synced states specific to the current phrase index
  const [tokens, setTokens] = useSyncedState<string[]>(`${phrasePrefix}_tokens`, []);
  const [revealed, setRevealed] = useSyncedState<boolean>(`${phrasePrefix}_revealed`, false);
  const [auctionValue, setAuctionValue] = useSyncedState<number>(`${phrasePrefix}_auction_value`, 10);
  const [calledLetters, setCalledLetters] = useSyncedState<string[]>(`${phrasePrefix}_called_letters`, []);

  // Local states
  const [targetTokens, setTargetTokens] = useState<string[]>([]);
  const [strikeActive, setStrikeActive] = useState(false);
  const prevAuctionValue = useRef(auctionValue);

  // Trigger gavel strike animation when auction value changes
  useEffect(() => {
    if (auctionValue !== prevAuctionValue.current) {
      prevAuctionValue.current = auctionValue;
      setStrikeActive(true);
      const timer = setTimeout(() => setStrikeActive(false), 350);
      return () => clearTimeout(timer);
    }
  }, [auctionValue]);

  const initGame = useCallback((idx: number) => {
    if (phraseList.length === 0) {
      setTargetTokens([]);
      return;
    }
    const frase = phraseList[idx % phraseList.length].toUpperCase();
    const targets: string[] = [];
    let i = 0;
    while (i < frase.length) {
      const c = frase[i];
      if (i + 1 < frase.length && frase[i + 1] === "'") {
        targets.push(c + "'");
        i += 2;
      } else {
        targets.push(c);
        i += 1;
      }
    }
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
    const initialTokens = targets.map(t => (/[A-Z]/.test(t[0]) ? '_' : t));
    localStorage.setItem(`${phrasePrefix}_tokens`, JSON.stringify(initialTokens));
    localStorage.setItem(`${phrasePrefix}_called_letters`, JSON.stringify([]));

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

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (
      document.activeElement?.tagName === 'INPUT' ||
      document.activeElement?.tagName === 'TEXTAREA'
    ) {
      return;
    }

    if (e.metaKey || e.ctrlKey) return;

    // S / Enter to show solution
    if (e.key === 'Enter' || e.key.toUpperCase() === 'S') {
      setRevealed(true);
      setTokens([...targetTokens]);
      return;
    }

    // Backspace / Delete to clear/reset tokens
    if (e.key === 'Backspace' || e.key === 'Delete') {
      const initialTokens = targetTokens.map(t => (/[A-Z]/.test(t[0]) ? '_' : t));
      setTokens(initialTokens);
      setCalledLetters([]);
      setAuctionValue(10);
      return;
    }

    // Keyboard numbers and arrows for manual movement
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

    // Guessed letter
    if (!revealed) {
      const key = e.key.toUpperCase();
      if (key.length === 1 && /[A-Z]/.test(key)) {
        // If this letter was already called, do nothing
        if (calledLetters.includes(key)) return;

        // Add to called letters
        setCalledLetters(prev => [...prev, key]);

        // Consonant check: B, C, D, F, G, H, J, K, L, M, N, P, Q, R, S, T, V, W, X, Y, Z
        const isCons = /[B-DF-HJ-NP-TV-Z]/.test(key);

        // If it's a consonant, decrement auction value by 1 (even if it's incorrect)
        if (isCons) {
          setAuctionValue(prev => Math.max(1, prev - 1));
        }

        // Reveal the character in the phrase if it exists
        setTokens(prev => prev.map((t, i) => (targetTokens[i][0] === key ? targetTokens[i] : t)));
      }
    }
  }, [targetTokens, revealed, tokens, calledLetters, setTokens, setCalledLetters, setAuctionValue, setRevealed]);

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

  return (
    <div className="relative w-full min-h-screen bg-black text-white flex items-center justify-center overflow-hidden select-none">
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
      `}</style>

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

        {/* Called Letters list */}
        {calledLetters.length > 0 && (
          <div className="flex items-center gap-2 mb-4 animate-fade-in bg-zinc-900/60 border border-white/5 px-4 py-1.5 rounded-full text-xs">
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

        {/* Descending Auction Bar */}
        <div className="w-[90%] max-w-[1200px] mb-6">
          <div className="grid grid-cols-10 gap-2.5 w-full">
            {auctionSteps.map((step) => {
              const isActive = auctionValue === step;
              return (
                <button
                  key={step}
                  disabled={!interactive}
                  onClick={() => {
                    if (interactive) {
                      setAuctionValue(step);
                    }
                  }}
                  className={`relative py-3 rounded-xl border flex flex-col items-center justify-center transition-all duration-300 select-none
                    ${isActive
                      ? 'bg-gradient-to-b from-amber-400 to-yellow-500 border-yellow-300 ring-4 ring-yellow-400/50 text-black scale-110 z-10 shadow-[0_0_20px_rgba(234,179,8,0.7)]'
                      : 'bg-zinc-900/80 border-zinc-700/80 hover:border-zinc-500 text-zinc-400 hover:text-white hover:bg-zinc-800'
                    }`}
                >
                  <span className="text-2xl font-black">{step}</span>
                  <span className={`text-[10px] font-black ${isActive ? 'text-black/80' : 'text-zinc-500'}`}>
                    {step} pt
                  </span>
                  {isActive && (
                    <span className="absolute -top-3 text-[9px] font-black bg-black text-amber-400 px-2 py-0.5 rounded-full uppercase tracking-wider border border-amber-400 animate-pulse">
                      OFFERTA
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Interactive Auction Dashboard Panel */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-[90%] max-w-[1000px] bg-zinc-950/80 border border-white/10 rounded-2xl p-8 shadow-2xl backdrop-blur-md items-center">
          
          {/* Column 1: Auction Motifs Info */}
          <div className="flex flex-col gap-5 justify-center pr-4 border-r border-white/5">
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-indigo-950/50 rounded-lg border border-indigo-500/30">
                <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                </svg>
              </div>
              <div className="text-left">
                <h3 className="text-sm font-black uppercase text-indigo-400 tracking-wider">Asta a Ribasso</h3>
                <p className="text-xs text-white/50 leading-tight">Chiamata dell'offerta attiva da 10 a 1.</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-emerald-950/50 rounded-lg border border-emerald-500/30">
                <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-left">
                <h3 className="text-sm font-black uppercase text-emerald-400 tracking-wider">Chiamata Lettere</h3>
                <p className="text-xs text-white/50 leading-tight">Ogni consonante chiamata (giusta o sbagliata) riduce l'asta di 1.</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-amber-950/50 rounded-lg border border-amber-500/30">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6 text-amber-400">
                  <line x1="12" y1="14" x2="12" y2="22" strokeLinecap="round" />
                  <circle cx="12" cy="8" r="6" fill="#1e1b4b" stroke="#d97706" />
                  <path d="M12 5.5v5M9.5 8h5" strokeLinecap="round" />
                </svg>
              </div>
              <div className="text-left">
                <h3 className="text-sm font-black uppercase text-amber-400 tracking-wider">Offerta Attiva</h3>
                <p className="text-xs text-white/50 leading-tight">Muoviti premendo 0-9 o le frecce della tastiera.</p>
              </div>
            </div>
          </div>

          {/* Column 2: Animated Auction Gavel (Strikes downwards, pivot on the left) */}
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
            
            {/* Active Bid Display */}
            <div className="absolute bottom-[-15px] bg-yellow-400/10 border border-yellow-400/30 px-4 py-1 rounded-full animate-pulse text-[11px] font-black uppercase text-yellow-400 tracking-wider">
              Offerta Corrente: {auctionValue}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default FraseConTempo_Board;
