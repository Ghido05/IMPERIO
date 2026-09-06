import { useState, useEffect, Component, type ErrorInfo, type ReactNode } from 'react';
import PasswordPresceltiBoard from '../Gioco password_prescelti_Board';
import { GameDataProvider } from '../context/GameDataContext';
import { cloneDefaultData } from '../lib/defaultGameData';
import type { Slide } from '../App';
import SlideCanvas from '../components/SlideCanvas';
import { ScoreProvider, useScores } from '../context/ScoreContext';
import { formatScoreNumber } from '../lib/formatUtils';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class IpadErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in iPad View:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-slate-900 border border-red-500/30 rounded-2xl p-8 max-w-lg shadow-2xl">
            <span className="text-4xl mb-4 block">⚠️</span>
            <h1 className="text-xl font-bold text-red-400 mb-2">Si è verificato un errore su iPad</h1>
            <p className="text-xs text-slate-400 mb-4 font-mono break-all">
              {this.state.error?.message || 'Errore di rendering.'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg transition-all cursor-pointer"
            >
              Ricarica Pagina
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function IpadContent() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [activeSlide, setActiveSlide] = useState<Slide | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [setupState, setSetupState] = useState<any>(null);
  const [bookedTeam, setBookedTeam] = useState<number | null>(null);

  const { scores } = useScores();

  // Carica configurazione setup per i nomi squadre reattivamente
  useEffect(() => {
    const loadSetup = () => {
      const saved = localStorage.getItem('imperio_quiz_setup_config_v1');
      if (saved) {
        try {
          setSetupState(JSON.parse(saved));
        } catch (e) {
          console.error('Error parsing setup state in iPad:', e);
        }
      }
    };

    loadSetup();
    
    const handleStorageChange = (e: any) => {
      const key = e.key || (e.detail && e.detail.key);
      if (key === 'imperio_quiz_setup_config_v1') {
        loadSetup();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('local-storage-update', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('local-storage-update', handleStorageChange);
    };
  }, []);

  const teamNames = setupState?.punteggi?.nomiSquadre || ['SQUADRA 1', 'SQUADRA 2', 'SQUADRA 3'];

  useEffect(() => {
    const checkBooking = () => {
      const currentSlideId = activeSlide?.id ?? 'password_prescelti';
      const currentSlideType = activeSlide?.type;
      
      const activeBoxVal = localStorage.getItem('playstate_active_box') || '1';
      const activeQuestionVal = localStorage.getItem('playstate_active_question') || '1';
      const activeBox = parseInt(activeBoxVal, 10);
      const activeQuestion = parseInt(activeQuestionVal, 10);

      // Se siamo nei giochi password (Box 3), la squadra di turno attiva è definita da password_current_team
      if (
        currentSlideType === 'password_prescelti' || 
        currentSlideType === 'password_squadre' || 
        activeBox === 3
      ) {
        const val = localStorage.getItem('password_current_team');
        if (val && val !== 'null') {
          setBookedTeam(parseInt(val, 10));
        } else {
          setBookedTeam(null);
        }
        return;
      }

      // Se siamo nel box 2 (giochi a classifica / classifica musicale)
      if (activeBox === 2 || (currentSlideId && currentSlideId.startsWith('box2_'))) {
        const val = localStorage.getItem('playstate_box2_active_team_idx');
        if (val && val !== 'null') {
          setBookedTeam(parseInt(val, 10) + 1);
          return;
        }

        const starterVal = localStorage.getItem('playstate_box2_starter_idx');
        if (starterVal && starterVal !== 'null') {
          const starter = parseInt(starterVal, 10);
          const questionStarterIdx = (starter + (activeQuestion - 1)) % 3;
          setBookedTeam(questionStarterIdx + 1);
          return;
        }

        if (scores && scores.length > 0) {
          let lowestIdx = 0;
          for (let i = 1; i < scores.length; i++) {
            if (Number(scores[i]) < Number(scores[lowestIdx])) {
              lowestIdx = i;
            }
          }
          const questionStarterIdx = (lowestIdx + (activeQuestion - 1)) % 3;
          setBookedTeam(questionStarterIdx + 1);
        } else {
          setBookedTeam(null);
        }
        return;
      }

      // Se siamo nel box 4 (Frase con tempo)
      if (activeBox === 4 || (currentSlideId && currentSlideId.includes('frase'))) {
        const winTeamVal = localStorage.getItem(`playstate_box4_winning_team`);
        if (winTeamVal && winTeamVal !== 'null') {
          setBookedTeam(parseInt(winTeamVal, 10) + 1);
          return;
        }
        const buzzerVal = localStorage.getItem(`playstate_box4_booked_team`) || localStorage.getItem(`playstate_box4_q1_booked_team`);
        if (buzzerVal && buzzerVal !== 'null') {
          setBookedTeam(parseInt(buzzerVal, 10));
          return;
        }
        setBookedTeam(null);
        return;
      }

      const key = `playstate_${currentSlideId}_booked_team`;
      const val = localStorage.getItem(key);
      if (val && val !== 'null') {
        setBookedTeam(parseInt(val, 10));
      } else {
        const box1ActiveQ = localStorage.getItem('playstate_active_question') || '1';
        const box1Key = `playstate_box1_q${box1ActiveQ}_booked_team`;
        const box1Val = localStorage.getItem(box1Key);
        if (box1Val && box1Val !== 'null') {
          setBookedTeam(parseInt(box1Val, 10));
        } else {
          setBookedTeam(null);
        }
      }
    };

    checkBooking();

    const handleStorage = () => {
      checkBooking();
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('local-storage-update', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('local-storage-update', handleStorage);
    };
  }, [activeSlide, scores]);

  const isS1Booked = bookedTeam === 1;
  const isS2Booked = bookedTeam === 2;
  const isS3Booked = bookedTeam === 3;

  // Sync state over WebSocket
  useEffect(() => {
    const wsPort = (window.location.port === '5173' || !window.location.port) ? '3001' : window.location.port;
    const socketUrl = `ws://${window.location.hostname}:${wsPort}/ws`;
    
    console.log(`iPad connecting to WebSocket: ${socketUrl}`);
    let ws: WebSocket | null = null;
    let reconnectTimeout: any;

    const originalSetItem = Storage.prototype.setItem;
    const originalRemoveItem = Storage.prototype.removeItem;

    const isIncomingSyncKey = (key: string) => {
      return (
        key.startsWith('password_') || 
        key.startsWith('playstate_') || 
        key.startsWith('note_presentatore_') ||
        key === 'imperio_quiz_scores' || 
        key === 'imperio_quiz_setup_config_v1'
      );
    };

    const isOutgoingSyncKey = (key: string) => {
      return (
        key.startsWith('password_') || 
        key.startsWith('playstate_') || 
        key.startsWith('note_presentatore_') ||
        key === 'imperio_quiz_setup_config_v1'
      );
    };

    // Setup local storage override to send changes to Mac
    Storage.prototype.setItem = function (key: string, value: string) {
      originalSetItem.call(this, key, value);
      if (isOutgoingSyncKey(key)) {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'local-storage-update',
            data: { key, value }
          }));
        }
      }
    };

    Storage.prototype.removeItem = function (key: string) {
      originalRemoveItem.call(this, key);
      if (isOutgoingSyncKey(key)) {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'local-storage-update',
            data: { key, value: null }
          }));
        }
      }
    };

    function connect() {
      try {
        ws = new WebSocket(socketUrl);
      } catch (err) {
        console.error('Failed to instantiate WebSocket:', err);
        reconnectTimeout = setTimeout(connect, 2000);
        return;
      }

      ws.onopen = () => {
        console.log('Connected to Mac Server');
        setWsConnected(true);
        if (ws) ws.send(JSON.stringify({ type: 'request-state' }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          
          if (msg.type === 'init-state') {
            const { slides: serverSlides, localStorage: serverLocalStorage, activeSlide: serverActiveSlide } = msg.data;
            if (serverSlides) {
              setSlides(serverSlides);
            }
            if (serverActiveSlide !== undefined) {
              setActiveSlide(serverActiveSlide);
            }
            if (serverLocalStorage) {
              Object.entries(serverLocalStorage).forEach(([key, value]) => {
                if (isIncomingSyncKey(key)) {
                  if (value === null || value === undefined) {
                    originalRemoveItem.call(localStorage, key);
                  } else {
                    originalSetItem.call(localStorage, key, value as string);
                  }

                  try {
                    const storageEvent = new StorageEvent('storage', {
                      key,
                      newValue: value === undefined ? null : (value as string | null),
                      storageArea: localStorage,
                    });
                    window.dispatchEvent(storageEvent);
                  } catch (e) {
                    try {
                      const event = document.createEvent('StorageEvent');
                      (event as any).initStorageEvent('storage', false, false, key, null, value === undefined ? null : (value as string | null), window.location.href, localStorage);
                      window.dispatchEvent(event);
                    } catch (err) {
                      // ignore
                    }
                  }

                  try {
                    window.dispatchEvent(new CustomEvent('local-storage-update', {
                      detail: { key, value }
                    }));
                  } catch (e) {
                    // ignore
                  }
                }
              });
              
              try {
                window.dispatchEvent(new Event('storage'));
              } catch (e) {
                // ignore
              }
              try {
                window.dispatchEvent(new CustomEvent('local-storage-update', {
                  detail: { key: 'all' }
                }));
              } catch (e) {
                // ignore
              }
            }
          } else if (msg.type === 'state-update') {
            const { slides: serverSlides, activeSlide: serverActiveSlide } = msg.data;
            if (serverSlides) {
              setSlides(serverSlides);
            }
            if (serverActiveSlide !== undefined) {
              setActiveSlide(serverActiveSlide);
            }
          } else if (msg.type === 'local-storage-update') {
            const { key, value } = msg.data;
            if (isIncomingSyncKey(key)) {
              if (value === null || value === undefined) {
                originalRemoveItem.call(localStorage, key);
              } else {
                originalSetItem.call(localStorage, key, value);
              }
              
              try {
                const storageEvent = new StorageEvent('storage', {
                  key,
                  newValue: value,
                  storageArea: localStorage,
                });
                window.dispatchEvent(storageEvent);
              } catch (e) {
                try {
                  const event = document.createEvent('StorageEvent');
                  (event as any).initStorageEvent('storage', false, false, key, null, value, window.location.href, localStorage);
                  window.dispatchEvent(event);
                } catch (err) {
                  // ignore
                }
              }
              
              try {
                window.dispatchEvent(new CustomEvent('local-storage-update', {
                  detail: { key, value }
                }));
              } catch (e) {
                // ignore
              }
            }
          }
        } catch (err) {
          console.error('Error parsing WS message:', err);
        }
      };

      ws.onclose = () => {
        console.log('Disconnected from Mac Server, reconnecting...');
        setWsConnected(false);
        reconnectTimeout = setTimeout(connect, 2000);
      };

      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        if (ws) {
          try { ws.close(); } catch(e){}
        }
      };
    }

    connect();

    return () => {
      if (ws) {
        try { ws.close(); } catch(e){}
      }
      clearTimeout(reconnectTimeout);
      Storage.prototype.setItem = originalSetItem;
      Storage.prototype.removeItem = originalRemoveItem;
    };
  }, []);

  // Trova la slide password_prescelti all'interno del progetto per caricarne i dati
  const presceltiSlide = slides.find(s => s.type === 'password_prescelti');
  const presceltiData = {
    ...((presceltiSlide?.data as any) ?? cloneDefaultData('password_prescelti')),
    slideId: presceltiSlide?.id ?? 'password_prescelti'
  };

  // Nel Gioco 3 (Password), l'iPad deve SEMPRE mostrare la visuale dei Prescelti / Conduttore
  const isPasswordGame = activeSlide?.type === 'password_squadre' || activeSlide?.type === 'password_prescelti';

  // Determina se mostrare un altro gioco con soluzioni (tutti gli altri giochi tranne password, empty e classifica)
  const showSolutionGames = activeSlide && 
    !isPasswordGame && 
    activeSlide.type !== 'empty' && 
    activeSlide.type !== 'classifica_generale';

  let mainContent = null;

  if (isPasswordGame && activeSlide) {
    const passwordData = {
      ...((activeSlide.data as any) ?? presceltiData),
      slideId: activeSlide.id ?? presceltiData.slideId
    };
    mainContent = (
      <GameDataProvider data={passwordData}>
        <PasswordPresceltiBoard interactive={true} ipadMode={true} />
      </GameDataProvider>
    );
  } else if (showSolutionGames && activeSlide) {
    mainContent = (
      <div className="w-full h-full flex items-center justify-center bg-black">
        <SlideCanvas slide={activeSlide} interactive={false} revealAll={true} />
      </div>
    );
  } else {
    mainContent = (
      <GameDataProvider data={presceltiData}>
        <PasswordPresceltiBoard interactive={true} ipadMode={true} />
      </GameDataProvider>
    );
  }

  // Calcolo dinamico del contesto per le Note del Presentatore (per ogni gioco e per ogni manche/domanda/frase)
  const activeBoxVal = localStorage.getItem('playstate_active_box') || '1';
  const activeQuestionVal = localStorage.getItem('playstate_active_question') || '1';
  const activeBox = parseInt(activeBoxVal, 10);
  const activeQuestion = parseInt(activeQuestionVal, 10);
  const currentSlideId = activeSlide?.id ?? '';

  const getActiveNoteContext = () => {
    // 1. Box 1: Il mio nome è nessuno (Domande 1-10)
    if (activeBox === 1 || currentSlideId.startsWith('box1_')) {
      const qNum = currentSlideId.startsWith('box1_q')
        ? parseInt(currentSlideId.replace('box1_q', ''), 10) || activeQuestion
        : activeQuestion;
      const note = setupState?.gioco1?.questions?.[qNum]?.notePresentatore ?? '';
      return {
        box: 1,
        question: qNum,
        label: `GIOCO 1 — Domanda ${qNum}`,
        note,
        saveKey: { game: 'gioco1' as const, qNum }
      };
    }

    // 2. Box 2: Classifica (Domande 1-6)
    if (activeBox === 2 || currentSlideId.startsWith('box2_')) {
      const qNum = currentSlideId.startsWith('box2_q')
        ? parseInt(currentSlideId.replace('box2_q', ''), 10) || activeQuestion
        : activeQuestion;
      const note = setupState?.gioco2?.questions?.[qNum]?.notePresentatore ?? '';
      return {
        box: 2,
        question: qNum,
        label: `GIOCO 2 — Domanda ${qNum}`,
        note,
        saveKey: { game: 'gioco2' as const, qNum }
      };
    }

    // 3. Box 3: Password (Manche 1-3)
    if (isPasswordGame || activeBox === 3) {
      const mancheStored = localStorage.getItem('password_current_manche');
      const mancheIdx = mancheStored ? parseInt(mancheStored, 10) : (activeQuestion - 1);
      const mancheNum = Math.min(Math.max(mancheIdx + 1, 1), 3);
      const note = setupState?.gioco3?.questions?.[mancheNum]?.notePresentatore ?? '';
      return {
        box: 3,
        question: mancheNum,
        label: `GIOCO 3 — Manche ${mancheNum}`,
        note,
        saveKey: { game: 'gioco3' as const, qNum: mancheNum }
      };
    }

    // 4. Box 4: Frase Tempo
    if (activeBox === 4 || currentSlideId.includes('frase')) {
      const storedIdx = localStorage.getItem(`playstate_${currentSlideId}_index`) ||
                        localStorage.getItem('playstate_gioco_frase_tempo_index') ||
                        localStorage.getItem('playstate_box4_index') || '0';
      const phraseIdx = parseInt(storedIdx, 10) || 0;
      const frasi = setupState?.gioco4?.frasi || [];
      const note = frasi[phraseIdx]?.notePresentatore ?? setupState?.gioco4?.notePresentatore ?? '';
      return {
        box: 4,
        question: phraseIdx + 1,
        label: `GIOCO 4 — Frase ${phraseIdx + 1}`,
        note,
        saveKey: { game: 'gioco4' as const, phraseIdx }
      };
    }

    // Fallback: da activeSlide data
    const dataNote = (activeSlide?.data as any)?.notePresentatore || '';
    return {
      box: activeBox,
      question: activeQuestion,
      label: activeSlide?.id || 'Note Presentatore',
      note: dataNote,
      saveKey: null
    };
  };

  const noteContext = getActiveNoteContext();
  const [noteText, setNoteText] = useState<string>('');
  const [isEditingNote, setIsEditingNote] = useState<boolean>(false);

  // Sincronizza il testo della nota quando cambia slide, manche o configurazione
  useEffect(() => {
    if (!isEditingNote) {
      setNoteText(noteContext.note || '');
    }
  }, [noteContext.label, noteContext.note, isEditingNote]);

  const handleNoteSave = () => {
    setIsEditingNote(false);
    if (!noteContext.saveKey || !setupState) return;

    const newSetup = JSON.parse(JSON.stringify(setupState));
    if (noteContext.saveKey.game === 'gioco1') {
      if (!newSetup.gioco1) newSetup.gioco1 = { questions: {} };
      if (!newSetup.gioco1.questions) newSetup.gioco1.questions = {};
      if (!newSetup.gioco1.questions[noteContext.saveKey.qNum]) {
        newSetup.gioco1.questions[noteContext.saveKey.qNum] = {};
      }
      newSetup.gioco1.questions[noteContext.saveKey.qNum].notePresentatore = noteText;
    } else if (noteContext.saveKey.game === 'gioco2') {
      if (!newSetup.gioco2) newSetup.gioco2 = { questions: {} };
      if (!newSetup.gioco2.questions) newSetup.gioco2.questions = {};
      if (!newSetup.gioco2.questions[noteContext.saveKey.qNum]) {
        newSetup.gioco2.questions[noteContext.saveKey.qNum] = {};
      }
      newSetup.gioco2.questions[noteContext.saveKey.qNum].notePresentatore = noteText;
    } else if (noteContext.saveKey.game === 'gioco3') {
      if (!newSetup.gioco3) newSetup.gioco3 = { questions: {} };
      if (!newSetup.gioco3.questions) newSetup.gioco3.questions = {};
      if (!newSetup.gioco3.questions[noteContext.saveKey.qNum]) {
        newSetup.gioco3.questions[noteContext.saveKey.qNum] = {};
      }
      newSetup.gioco3.questions[noteContext.saveKey.qNum].notePresentatore = noteText;
    } else if (noteContext.saveKey.game === 'gioco4') {
      if (!newSetup.gioco4) newSetup.gioco4 = { frasi: [] };
      if (!newSetup.gioco4.frasi) newSetup.gioco4.frasi = [];
      const pIdx = (noteContext.saveKey as any).phraseIdx;
      if (newSetup.gioco4.frasi[pIdx]) {
        if (typeof newSetup.gioco4.frasi[pIdx] === 'string') {
          newSetup.gioco4.frasi[pIdx] = { testo: newSetup.gioco4.frasi[pIdx], notePresentatore: noteText };
        } else {
          newSetup.gioco4.frasi[pIdx].notePresentatore = noteText;
        }
      }
    }

    setSetupState(newSetup);
    try {
      localStorage.setItem('imperio_quiz_setup_config_v1', JSON.stringify(newSetup));
    } catch (e) {
      console.warn('Errore salvataggio localStorage iPad:', e);
    }
  };

  return (
    <div className="w-full h-screen bg-slate-950 text-white flex flex-col overflow-hidden font-sans select-none">
      {/* CSS per Animazione di Lampeggio Buzzer Conduttore */}
      <style>{`
        @keyframes ipad-blink {
          0%, 100% { 
            opacity: 1; 
            filter: brightness(1.35) contrast(1.1); 
            box-shadow: inset 0 0 30px rgba(255, 255, 255, 0.8), 0 0 30px rgba(255, 255, 255, 0.5);
          }
          50% { 
            opacity: 0.5; 
            filter: brightness(0.8) contrast(0.9);
            box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.5);
          }
        }
        .animate-ipad-blink {
          animation: ipad-blink 0.7s infinite ease-in-out;
        }
      `}</style>

      {/* ========================================================================= */}
      {/* 1. SEZIONE SUPERIORE: Box Punteggi e Squadre (20% altezza, 100% larghezza) */}
      {/* ========================================================================= */}
      <div className="w-full h-[20vh] grid grid-cols-3 border-b-2 border-slate-800 bg-slate-950 shrink-0 select-none relative z-20 overflow-hidden">
        {/* Pillola discreta per lo stato di connessione */}
        <div className="absolute top-2 right-2 z-30 pointer-events-none flex items-center gap-1.5 bg-black/60 backdrop-blur px-2.5 py-0.5 rounded-full border border-white/10 text-[9px] font-semibold text-slate-300">
          <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
          <span>{wsConnected ? 'LIVE' : 'OFFLINE'}</span>
        </div>

        {/* Squadra 3 (Verde) */}
        <div 
          className={`h-full flex flex-col items-center justify-center border-r border-slate-950/40 p-2 sm:p-3 transition-all duration-300 ${
            isS3Booked 
              ? 'bg-emerald-500 text-white animate-ipad-blink z-10 border-4 border-white shadow-2xl' 
              : 'bg-emerald-950/70 text-emerald-100 hover:bg-emerald-900/80'
          }`}
        >
          <span className={`text-[11px] sm:text-xs md:text-sm font-black uppercase tracking-widest leading-none mb-1.5 transition-colors ${isS3Booked ? 'text-white' : 'text-emerald-400'}`}>
            🟢 {teamNames[2] || 'SQUADRA 3'}
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl sm:text-5xl md:text-6xl font-black leading-none tabular-nums tracking-tight">
              {formatScoreNumber(scores?.[2] ?? 0)}
            </span>
            <span className={`text-xs sm:text-sm md:text-base font-black ${isS3Booked ? 'text-white' : 'text-emerald-400'}`}>PT</span>
          </div>
          {isS3Booked && (
            <span className="mt-1 px-2 py-0.5 rounded bg-white text-emerald-900 text-[10px] font-black uppercase tracking-wider animate-bounce">
              Buzzer Prenotato!
            </span>
          )}
        </div>

        {/* Squadra 2 (Blu) */}
        <div 
          className={`h-full flex flex-col items-center justify-center border-r border-slate-950/40 p-2 sm:p-3 transition-all duration-300 ${
            isS2Booked 
              ? 'bg-blue-500 text-white animate-ipad-blink z-10 border-4 border-white shadow-2xl' 
              : 'bg-blue-950/70 text-blue-100 hover:bg-blue-900/80'
          }`}
        >
          <span className={`text-[11px] sm:text-xs md:text-sm font-black uppercase tracking-widest leading-none mb-1.5 transition-colors ${isS2Booked ? 'text-white' : 'text-blue-400'}`}>
            🔵 {teamNames[1] || 'SQUADRA 2'}
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl sm:text-5xl md:text-6xl font-black leading-none tabular-nums tracking-tight">
              {formatScoreNumber(scores?.[1] ?? 0)}
            </span>
            <span className={`text-xs sm:text-sm md:text-base font-black ${isS2Booked ? 'text-white' : 'text-blue-400'}`}>PT</span>
          </div>
          {isS2Booked && (
            <span className="mt-1 px-2 py-0.5 rounded bg-white text-blue-900 text-[10px] font-black uppercase tracking-wider animate-bounce">
              Buzzer Prenotato!
            </span>
          )}
        </div>

        {/* Squadra 1 (Rosso) */}
        <div 
          className={`h-full flex flex-col items-center justify-center p-2 sm:p-3 transition-all duration-300 ${
            isS1Booked 
              ? 'bg-red-500 text-white animate-ipad-blink z-10 border-4 border-white shadow-2xl' 
              : 'bg-red-950/70 text-red-100 hover:bg-red-900/80'
          }`}
        >
          <span className={`text-[11px] sm:text-xs md:text-sm font-black uppercase tracking-widest leading-none mb-1.5 transition-colors ${isS1Booked ? 'text-white' : 'text-red-400'}`}>
            🔴 {teamNames[0] || 'SQUADRA 1'}
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl sm:text-5xl md:text-6xl font-black leading-none tabular-nums tracking-tight">
              {formatScoreNumber(scores?.[0] ?? 0)}
            </span>
            <span className={`text-xs sm:text-sm md:text-base font-black ${isS1Booked ? 'text-white' : 'text-red-400'}`}>PT</span>
          </div>
          {isS1Booked && (
            <span className="mt-1 px-2 py-0.5 rounded bg-white text-red-900 text-[10px] font-black uppercase tracking-wider animate-bounce">
              Buzzer Prenotato!
            </span>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SEZIONE CENTRALE: Grafica del Gioco con Soluzioni (70% altezza con scroll) */}
      {/* ========================================================================= */}
      <div className="w-full h-[70vh] overflow-y-auto overflow-x-hidden relative bg-black flex flex-col items-center justify-center p-1 sm:p-2 shrink-0 touch-pan-y">
        {mainContent}
      </div>

      {/* ========================================================================= */}
      {/* 3. SEZIONE INFERIORE: Note del Presentatore (10% altezza con scroll) */}
      {/* ========================================================================= */}
      <div className="w-full h-[10vh] border-t-2 border-slate-800 bg-[#141418] px-3 py-1.5 shrink-0 flex flex-col overflow-y-auto select-text touch-pan-y">
        <div className="flex items-center justify-between text-[11px] font-bold text-amber-400 mb-1 shrink-0">
          <span className="flex items-center gap-1.5">
            <span>📝 NOTE PRESENTATORE</span>
            <span className="text-[10px] text-slate-400 font-normal">({noteContext.label})</span>
          </span>
          <span className="text-[9px] text-slate-500 font-mono">
            {isEditingNote ? '✎ In modifica...' : 'Tocca per modificare • Scorri se lungo'}
          </span>
        </div>
        <textarea
          value={noteText}
          onChange={(e) => {
            setNoteText(e.target.value);
            setIsEditingNote(true);
          }}
          onBlur={handleNoteSave}
          placeholder="Nessuna nota per questa manche. Tocca qui per inserire o modificare appunti per il conduttore..."
          className="w-full flex-1 min-h-[32px] bg-black/40 border border-white/10 rounded px-2.5 py-1 text-xs text-amber-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-400/80 resize-none font-sans leading-relaxed"
        />
      </div>
    </div>
  );
}

export default function IpadView() {
  return (
    <IpadErrorBoundary>
      <ScoreProvider>
        <IpadContent />
      </ScoreProvider>
    </IpadErrorBoundary>
  );
}
