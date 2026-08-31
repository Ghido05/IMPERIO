import { useState, useEffect, Component, type ErrorInfo, type ReactNode } from 'react';
import PasswordPresceltiBoard from '../Gioco password_prescelti_Board';
import { GameDataProvider } from '../context/GameDataContext';
import { cloneDefaultData } from '../lib/defaultGameData';
import type { Slide } from '../App';
import SlideCanvas from '../components/SlideCanvas';
import { ScoreProvider, useScores } from '../context/ScoreContext';

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

      // Se siamo nei giochi password, la squadra di turno attiva è definita da password_current_team
      if (
        currentSlideType === 'password_prescelti' || 
        currentSlideType === 'password_squadre' || 
        activeBox === 3 || 
        activeBox === 4
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
        key === 'imperio_quiz_scores' || 
        key === 'imperio_quiz_setup_config_v1'
      );
    };

    const isOutgoingSyncKey = (key: string) => {
      return key.startsWith('password_') || key.startsWith('playstate_');
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

  // Determina se mostrare un altro gioco con soluzioni
  const showSolutionGames = activeSlide && 
    activeSlide.type !== 'password_prescelti' && 
    activeSlide.type !== 'empty' && 
    activeSlide.type !== 'classifica_generale';

  let mainContent = null;

  if (showSolutionGames && activeSlide) {
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

  return (
    <div className="w-full h-screen bg-slate-900 text-white flex flex-col overflow-hidden">
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

      {/* Top Connection Indicator (Sottile) */}
      <div className="bg-slate-950 px-4 py-1.5 flex justify-between items-center text-[10px] border-b border-slate-800 shrink-0 select-none">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
          <span className="font-semibold text-slate-400">
            {wsConnected ? 'CONNESSO AL MAC' : 'DISCONNESSO — TENTATIVO DI RICONNESSIONE...'}
          </span>
        </div>
        <span className="text-slate-500 font-bold uppercase tracking-wider text-[8px]">
          IMPERIO VII iPad Client
        </span>
      </div>

      {/* Striscia dei Punteggi Specchiata a Tutto Schermo (Verde / Blu / Rosso) */}
      <div className="w-full grid grid-cols-3 h-20 sm:h-24 border-b border-slate-950 shrink-0 font-sans select-none">
        
        {/* Squadra 3 (Verde) */}
        <div 
          className={`flex flex-col items-center justify-center border-r border-slate-950/40 transition-all duration-300 ${
            isS3Booked 
              ? 'bg-emerald-500 text-white animate-ipad-blink z-10 border-4 border-white' 
              : 'bg-emerald-950/70 text-emerald-100 hover:bg-emerald-900/80'
          }`}
        >
          <span className={`text-[10px] sm:text-xs font-black uppercase tracking-widest leading-none mb-1 transition-colors ${isS3Booked ? 'text-white' : 'text-emerald-400'}`}>
            🟢 {teamNames[2] || 'SQUADRA 3'}
          </span>
          <span className="text-2xl sm:text-4xl font-black leading-none tabular-nums">
            {(scores?.[2] ?? 0).toLocaleString()} <span className={`text-xs sm:text-sm font-black ${isS3Booked ? 'text-white' : 'text-emerald-400'}`}>PT</span>
          </span>
        </div>

        {/* Squadra 2 (Blu) */}
        <div 
          className={`flex flex-col items-center justify-center border-r border-slate-950/40 transition-all duration-300 ${
            isS2Booked 
              ? 'bg-blue-500 text-white animate-ipad-blink z-10 border-4 border-white' 
              : 'bg-blue-950/70 text-blue-100 hover:bg-blue-900/80'
          }`}
        >
          <span className={`text-[10px] sm:text-xs font-black uppercase tracking-widest leading-none mb-1 transition-colors ${isS2Booked ? 'text-white' : 'text-blue-400'}`}>
            🔵 {teamNames[1] || 'SQUADRA 2'}
          </span>
          <span className="text-2xl sm:text-4xl font-black leading-none tabular-nums">
            {(scores?.[1] ?? 0).toLocaleString()} <span className={`text-xs sm:text-sm font-black ${isS2Booked ? 'text-white' : 'text-blue-400'}`}>PT</span>
          </span>
        </div>

        {/* Squadra 1 (Rosso) */}
        <div 
          className={`flex flex-col items-center justify-center transition-all duration-300 ${
            isS1Booked 
              ? 'bg-red-500 text-white animate-ipad-blink z-10 border-4 border-white' 
              : 'bg-red-950/70 text-red-100 hover:bg-red-900/80'
          }`}
        >
          <span className={`text-[10px] sm:text-xs font-black uppercase tracking-widest leading-none mb-1 transition-colors ${isS1Booked ? 'text-white' : 'text-red-400'}`}>
            🔴 {teamNames[0] || 'SQUADRA 1'}
          </span>
          <span className="text-2xl sm:text-4xl font-black leading-none tabular-nums">
            {(scores?.[0] ?? 0).toLocaleString()} <span className={`text-xs sm:text-sm font-black ${isS1Booked ? 'text-white' : 'text-red-400'}`}>PT</span>
          </span>
        </div>

      </div>

      <div className="flex-1 w-full overflow-hidden relative bg-black flex items-center justify-center">
        {mainContent}
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
