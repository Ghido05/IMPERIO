import { useState, useEffect } from 'react';
import { 
  connectSerial, 
  disconnectSerial, 
  subscribeSerialStatus, 
  subscribeSerialData, 
  sendSerialReset,
  getBuzzerIp,
  setBuzzerIp,
  searchAndConnectBuzzer,
  pauseOrStopSearch,
  resumeOrStartSearch,
  isSearchPaused
} from '../lib/webSerial';

interface WebSerialManagerProps {
  activeSlideId: string;
  activeSlideType: string;
}

export default function WebSerialManager({ activeSlideId, activeSlideType }: WebSerialManagerProps) {
  const [connected, setConnected] = useState(false);
  const [buzzerIp, setBuzzerIpState] = useState(getBuzzerIp());
  const [isSearching, setIsSearching] = useState(false);
  const [isPaused, setIsPaused] = useState(isSearchPaused());
  const [retryCount, setRetryCount] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [customIp, setCustomIp] = useState(getBuzzerIp());
  const [assignedTeam, setAssignedTeam] = useState<string | null>(null);
  const [bookedTeam, setBookedTeam] = useState<string | null>(null);

  // 1. Subscribe to serial connection status changes and auto-connect on mount
  useEffect(() => {
    const unsubscribe = subscribeSerialStatus((status, ip, searching, paused, retries) => {
      setConnected(status);
      setBuzzerIpState(ip);
      setCustomIp(ip);
      setIsSearching(searching);
      setIsPaused(paused);
      setRetryCount(retries);
    });

    // Auto-connect on startup only if not paused
    if (!isSearchPaused()) {
      connectSerial();
    }

    return unsubscribe;
  }, []);

  // 2. Reset buzzer hardware on slide transition
  useEffect(() => {
    if (connected && activeSlideId) {
      sendSerialReset();
    }
  }, [activeSlideId, connected]);

  // 3. Monitor for manual/automatic team reservation resets to trigger hardware unlock
  useEffect(() => {
    if (!activeSlideId) return;

    const checkResets = () => {
      const bookedKey = `playstate_${activeSlideId}_booked_team`;
      const assignedKey = `playstate_${activeSlideId}_assigned_team`;
      
      let currentBooked: string | null = localStorage.getItem(bookedKey);
      let currentAssigned: string | null = localStorage.getItem(assignedKey);
      
      if (currentBooked === 'null' || currentBooked === '') currentBooked = null;
      if (currentAssigned === 'null' || currentAssigned === '') currentAssigned = null;
      
      const hadBooking = (bookedTeam !== null && bookedTeam !== 'null' && bookedTeam !== '') || 
                         (assignedTeam !== null && assignedTeam !== 'null' && assignedTeam !== '');
      const hasBooking = currentBooked !== null || currentAssigned !== null;
      
      // Se avevamo una prenotazione e ora viene rimossa (diventa null), sblocchiamo la pulsantiera
      if (hadBooking && !hasBooking && connected) {
        sendSerialReset();
      }
      
      setBookedTeam(currentBooked);
      setAssignedTeam(currentAssigned);
    };

    checkResets();

    const handleStorage = (e: StorageEvent) => {
      if (
        e.key === `playstate_${activeSlideId}_booked_team` || 
        e.key === `playstate_${activeSlideId}_assigned_team`
      ) {
        checkResets();
      }
    };

    const handleLocalUpdate = (e: any) => {
      if (
        e.detail?.key === `playstate_${activeSlideId}_booked_team` || 
        e.detail?.key === `playstate_${activeSlideId}_assigned_team`
      ) {
        checkResets();
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('local-storage-update', handleLocalUpdate);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('local-storage-update', handleLocalUpdate);
    };
  }, [activeSlideId, bookedTeam, assignedTeam, connected]);

  // 4. Listen for incoming physical buzzer events
  useEffect(() => {
    if (!connected || !activeSlideId) return;

    // We only book players in reservation-based modules (Music/Image, Box 1)
    const isPrenotazioneGame = activeSlideType === 'img' || activeSlideType === 'music';
    if (!isPrenotazioneGame) return;

    const unsubscribe = subscribeSerialData((line) => {
      let playerNum = 0;
      if (line.includes('PRENOTATO GIOCATORE 1')) {
        playerNum = 1;
      } else if (line.includes('PRENOTATO GIOCATORE 2')) {
        playerNum = 2;
      } else if (line.includes('PRENOTATO GIOCATORE 3')) {
        playerNum = 3;
      }

      if (playerNum > 0) {
        const bookedKey = `playstate_${activeSlideId}_booked_team`;
        const assignedKey = `playstate_${activeSlideId}_assigned_team`;
        
        let currentBooked = localStorage.getItem(bookedKey);
        let currentAssigned = localStorage.getItem(assignedKey);

        if (currentBooked === 'null' || currentBooked === '') currentBooked = null;
        if (currentAssigned === 'null' || currentAssigned === '') currentAssigned = null;

        // First one to book wins the turn for this step (if not already booked or points assigned)
        if (!currentBooked && !currentAssigned) {
          const stepKey = `playstate_${activeSlideId}_step`;
          const currentStep = parseInt(localStorage.getItem(stepKey) || '0');

          // Lock step and team in localStorage under booked_team
          const lockKey = `playstate_${activeSlideId}_locked_step`;
          localStorage.setItem(bookedKey, playerNum.toString());
          localStorage.setItem(lockKey, currentStep.toString());

          // Trigger local react-state / localstorage listeners
          window.dispatchEvent(new CustomEvent('local-storage-update', {
            detail: { key: bookedKey, value: playerNum.toString() }
          }));
          window.dispatchEvent(new CustomEvent('local-storage-update', {
            detail: { key: lockKey, value: currentStep.toString() }
          }));

          // Standard storage event for other windows
          window.dispatchEvent(new StorageEvent('storage', {
            key: bookedKey,
            newValue: playerNum.toString()
          }));
          window.dispatchEvent(new StorageEvent('storage', {
            key: lockKey,
            newValue: currentStep.toString()
          }));

          // Broadcast over Electron IPC if available
          if ((window as any).electron?.broadcastState) {
            (window as any).electron.broadcastState({
              localStorageUpdate: { key: bookedKey, value: playerNum.toString() }
            });
            (window as any).electron.broadcastState({
              localStorageUpdate: { key: lockKey, value: currentStep.toString() }
            });
          }

          console.log(`Pulsantiera: Giocatore ${playerNum} si è prenotato per primo a step ${currentStep}`);
        }
      }
    });

    return unsubscribe;
  }, [connected, activeSlideId, activeSlideType]);

  const handleConnectionToggle = async () => {
    if (connected) {
      await disconnectSerial();
    } else if (isSearching) {
      await pauseOrStopSearch();
    } else {
      await resumeOrStartSearch();
    }
  };

  const handleSaveAndConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (customIp.trim()) {
      setBuzzerIp(customIp.trim());
      setShowSettings(false);
      await connectSerial(customIp.trim());
    }
  };

  const handleSearchNetwork = async () => {
    await searchAndConnectBuzzer();
  };

  return (
    <>
      <div className="flex items-center gap-2 bg-[#1e1e1e] border border-white/10 px-2.5 py-1 rounded-md shrink-0 select-none">
        <div 
          className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => setShowSettings(true)}
          title="Clicca per configurare l'indirizzo IP della pulsantiera"
        >
          <span 
            className={`w-2 h-2 rounded-full ${
              connected 
                ? 'bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse' 
                : isSearching
                ? 'bg-amber-400 shadow-[0_0_8px_#f59e0b] animate-ping'
                : isPaused
                ? 'bg-gray-500'
                : 'bg-red-500'
            }`} 
          />
          <span className="text-[10px] font-bold uppercase text-white/70">
            {connected 
              ? `Wi-Fi: OK (${buzzerIp})` 
              : isSearching 
              ? `Ricerca (${retryCount + 1}/2)...` 
              : isPaused
              ? 'Wi-Fi: IN PAUSA'
              : 'Wi-Fi: OFF'}
          </span>
        </div>

        <button
          type="button"
          onClick={handleConnectionToggle}
          className={`px-1.5 py-0.5 text-[9px] font-black uppercase rounded transition-all cursor-pointer ${
            connected 
              ? 'text-red-400 bg-red-950/20 hover:bg-red-950/40 border border-red-900/30' 
              : isSearching
              ? 'text-amber-400 bg-amber-950/20 hover:bg-amber-950/40 border border-amber-900/30'
              : 'text-emerald-400 bg-emerald-950/20 hover:bg-emerald-950/40 border border-emerald-900/30'
          }`}
          title={
            connected 
              ? "Scollega la pulsantiera Wi-Fi" 
              : isSearching 
              ? "Metti in pausa la ricerca automatica" 
              : "Avvia ricerca/connessione pulsantiera"
          }
        >
          {connected ? 'Scollega' : isSearching ? '⏸️ Pausa' : '▶️ Cerca'}
        </button>

        <button
          type="button"
          onClick={() => setShowSettings(true)}
          className="text-white/40 hover:text-white/90 text-xs transition-colors cursor-pointer"
          title="Impostazioni IP Pulsantiera"
        >
          ⚙️
        </button>
      </div>

      {showSettings && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-[#1e1e1e] border border-white/20 rounded-xl p-5 max-w-sm w-full shadow-2xl text-left">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>📶</span> Pulsantiera Wi-Fi (ESP32)
              </h3>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="text-white/50 hover:text-white text-xs px-1.5 py-0.5 rounded cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAndConnect} className="space-y-3">
              <div>
                <label className="text-[11px] font-medium text-white/70 block mb-1">
                  Indirizzo IP Pulsantiera:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={customIp}
                    onChange={(e) => setCustomIp(e.target.value)}
                    placeholder="es. 192.168.1.97"
                    className="flex-1 bg-black/40 border border-white/20 rounded px-2.5 py-1.5 text-xs text-white font-mono focus:outline-hidden focus:border-emerald-500"
                  />
                  <span className="text-xs text-white/40 font-mono">:81</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-2 bg-black/30 rounded border border-white/5">
                <div>
                  <div className="text-[11px] font-bold text-white">Ricerca automatica</div>
                  <div className="text-[10px] text-white/50">Ferma o riattiva i tentativi di ricerca Wi-Fi</div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (isPaused) {
                      await resumeOrStartSearch();
                    } else {
                      await pauseOrStopSearch();
                    }
                  }}
                  className={`px-2 py-1 text-xs font-bold rounded cursor-pointer transition-colors ${
                    isPaused 
                      ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40 hover:bg-amber-600/50' 
                      : 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-600/50'
                  }`}
                >
                  {isPaused ? '▶️ Riattiva' : '⏸️ Metti in Pausa'}
                </button>
              </div>

              <div className="text-[10px] text-white/50 bg-black/20 p-2.5 rounded border border-white/5 space-y-1">
                <p>• La pulsantiera comunica via WebSocket sulla porta <strong>81</strong>.</p>
                <p>• La ricerca automatica effettua fino a <strong>2 tentativi</strong> prima di fermarsi.</p>
                <p>• Se l'indirizzo IP cambia (DHCP del router), clicca <strong>"Scansiona Rete"</strong> per individuarlo automaticamente.</p>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleSearchNetwork}
                  disabled={isSearching}
                  className="px-3 py-1.5 bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/40 rounded text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  {isSearching ? 'Scansione...' : '🔍 Scansiona Rete'}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowSettings(false)}
                    className="px-3 py-1.5 text-white/60 hover:text-white text-xs cursor-pointer"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold shadow-xs cursor-pointer"
                  >
                    Salva & Connetti
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
