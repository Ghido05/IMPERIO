import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  connectSerial, 
  disconnectSerial, 
  subscribeSerialStatus, 
  sendSerialReset,
  getBuzzerIp,
  setBuzzerIp,
  checkHardwareStatus,
  pauseOrStopSearch,
  resumeOrStartSearch,
  isSearchPaused,
  startBuzzerFastPolling,
  stopBuzzerFastPolling,
  isBuzzerPollingActive,
  type BookingTeam
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
  const [, setRetryCount] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [customIp, setCustomIp] = useState(getBuzzerIp());
  const [assignedTeam, setAssignedTeam] = useState<string | null>(null);
  const [bookedTeam, setBookedTeam] = useState<string | null>(null);
  const [teamNames, setTeamNames] = useState<string[]>(['Squadra Rossa', 'Squadra Blu', 'Squadra Verde']);
  const [isUnlocking, setIsUnlocking] = useState(false);

  // Feedback immediato (0ms) per il clic dell'utente
  const [localSearching, setLocalSearching] = useState(false);
  const [searchFeedback, setSearchFeedback] = useState<'idle' | 'success' | 'failed'>('idle');
  const searchFeedbackTimer = useRef<any>(null);

  // Feedback esplicito per la verifica nel modal impostazioni
  const [modalStatus, setModalStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle');
  const [modalMessage, setModalMessage] = useState<string>('');

  const isActuallySearching = isSearching || localSearching;

  // Load team names from setup config
  useEffect(() => {
    const saved = localStorage.getItem('imperio_quiz_setup_config_v1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed?.punteggi?.nomiSquadre && Array.isArray(parsed.punteggi.nomiSquadre)) {
          setTeamNames(parsed.punteggi.nomiSquadre);
        }
      } catch {}
    }
  }, []);

  // 1. Subscribe to connection status changes and auto-connect on mount
  useEffect(() => {
    const unsubscribe = subscribeSerialStatus((status, ip, searching, paused, retries) => {
      setConnected(status);
      setBuzzerIpState(ip);
      setCustomIp(ip);
      setIsSearching(searching);
      setIsPaused(paused);
      setRetryCount(retries);
    });

    if (!isSearchPaused()) {
      connectSerial();
    }

    return unsubscribe;
  }, []);

  // 2. Reset buzzer hardware on slide transition (calls /sblocca)
  useEffect(() => {
    if (activeSlideId) {
      console.log(`[WebSerialManager] Cambio slide a ${activeSlideId}: reset/sblocco hardware`);
      sendSerialReset();
    }
  }, [activeSlideId]);

  // 3. Callback when a buzzer is pressed
  const handleBookingEvent = useCallback((teamColor: BookingTeam, playerNum: number) => {
    if (!activeSlideId) return;

    const bookedKey = `playstate_${activeSlideId}_booked_team`;
    const assignedKey = `playstate_${activeSlideId}_assigned_team`;
    
    let currentBooked = localStorage.getItem(bookedKey);
    let currentAssigned = localStorage.getItem(assignedKey);

    if (currentBooked === 'null' || currentBooked === '') currentBooked = null;
    if (currentAssigned === 'null' || currentAssigned === '') currentAssigned = null;

    // Solo il primo a prenotarsi vince il turno (se non già prenotato o con punti assegnati)
    if (!currentBooked && !currentAssigned) {
      const stepKey = `playstate_${activeSlideId}_step`;
      const currentStep = parseInt(localStorage.getItem(stepKey) || '0');

      const lockKey = `playstate_${activeSlideId}_locked_step`;
      localStorage.setItem(bookedKey, playerNum.toString());
      localStorage.setItem(lockKey, currentStep.toString());

      // Trigger local dispatch
      window.dispatchEvent(new CustomEvent('local-storage-update', {
        detail: { key: bookedKey, value: playerNum.toString() }
      }));
      window.dispatchEvent(new CustomEvent('local-storage-update', {
        detail: { key: lockKey, value: currentStep.toString() }
      }));

      // Standard storage event
      window.dispatchEvent(new StorageEvent('storage', {
        key: bookedKey,
        newValue: playerNum.toString()
      }));
      window.dispatchEvent(new StorageEvent('storage', {
        key: lockKey,
        newValue: currentStep.toString()
      }));

      // Electron IPC broadcast
      if ((window as any).electron?.broadcastState) {
        (window as any).electron.broadcastState({
          localStorageUpdate: { key: bookedKey, value: playerNum.toString() }
        });
        (window as any).electron.broadcastState({
          localStorageUpdate: { key: lockKey, value: currentStep.toString() }
        });
      }

      setBookedTeam(playerNum.toString());
      console.log(`[WebSerialManager] Registrata prenotazione squadra ${teamColor.toUpperCase()} (${playerNum}) per ${activeSlideId} a step ${currentStep}`);
    }
  }, [activeSlideId]);

  // 4. Gestione Polling Rapido (/leggi) quando il quiz è pronto per ricevere prenotazioni
  useEffect(() => {
    if (!activeSlideId) {
      stopBuzzerFastPolling();
      return;
    }

    // Identifica se la slide corrente supporta prenotazioni buzzer
    const isPrenotazioneGame = 
      activeSlideType === 'img' || 
      activeSlideType === 'music' || 
      activeSlideId.startsWith('box1_') || 
      activeSlideType === 'gioco_frase_tempo';

    const hasActiveBooking = (bookedTeam !== null && bookedTeam !== 'null' && bookedTeam !== '') ||
                            (assignedTeam !== null && assignedTeam !== 'null' && assignedTeam !== '');

    // Se il quiz è pronto: gioco abilitato, hardware non in pausa, nessuna prenotazione attiva
    if (isPrenotazioneGame && !hasActiveBooking && !isPaused) {
      startBuzzerFastPolling(handleBookingEvent, 120);
    } else {
      stopBuzzerFastPolling();
    }

    return () => {
      stopBuzzerFastPolling();
    };
  }, [activeSlideId, activeSlideType, bookedTeam, assignedTeam, isPaused, handleBookingEvent]);

  // 5. Monitoraggio continuo di reset prenotazione per inviare /sblocca
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
      
      // Se avevamo una prenotazione e ora viene rimossa (diventa null), sblocchiamo la pulsantiera fisica
      if (hadBooking && !hasBooking) {
        console.log('[WebSerialManager] Prenotazione azzerata: invio sblocco hardware');
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
  }, [activeSlideId, bookedTeam, assignedTeam]);

  // Cleanup timer feedback on unmount
  useEffect(() => {
    return () => {
      if (searchFeedbackTimer.current) {
        clearTimeout(searchFeedbackTimer.current);
      }
    };
  }, []);

  // Sblocco manuale e riarmo hardware
  const handleManualUnlock = async () => {
    setIsUnlocking(true);
    await sendSerialReset();
    if (activeSlideId) {
      const bookedKey = `playstate_${activeSlideId}_booked_team`;
      localStorage.removeItem(bookedKey);
      window.dispatchEvent(new CustomEvent('local-storage-update', {
        detail: { key: bookedKey, value: null }
      }));
      window.dispatchEvent(new StorageEvent('storage', {
        key: bookedKey,
        newValue: null
      }));
      if ((window as any).electron?.broadcastState) {
        (window as any).electron.broadcastState({
          localStorageUpdate: { key: bookedKey, value: null }
        });
      }
    }
    setBookedTeam(null);
    setIsUnlocking(false);
  };

  // Cerca / Connetti / Scollega con feedback immediato a 0ms
  const handleSearchOrToggle = async () => {
    if (searchFeedbackTimer.current) {
      clearTimeout(searchFeedbackTimer.current);
      searchFeedbackTimer.current = null;
    }

    if (connected) {
      setSearchFeedback('idle');
      await disconnectSerial();
    } else {
      // Feedback immediato nel frame del clic
      setLocalSearching(true);
      setSearchFeedback('idle');
      try {
        const ok = await connectSerial(customIp.trim(), true);
        setLocalSearching(false);
        if (ok) {
          setSearchFeedback('success');
          searchFeedbackTimer.current = setTimeout(() => setSearchFeedback('idle'), 2500);
        } else {
          setSearchFeedback('failed');
          searchFeedbackTimer.current = setTimeout(() => setSearchFeedback('idle'), 3000);
        }
      } catch (_e) {
        setLocalSearching(false);
        setSearchFeedback('failed');
        searchFeedbackTimer.current = setTimeout(() => setSearchFeedback('idle'), 3000);
      }
    }
  };

  // Verifica diretta e test nel modal impostazioni
  const handleModalVerify = async () => {
    setModalStatus('testing');
    const target = customIp.trim() || '192.168.1.142';
    setModalMessage(`Verifica su http://${target}/status...`);
    try {
      const ok = await checkHardwareStatus(2500);
      if (ok) {
        setModalStatus('ok');
        setModalMessage(`✅ Hardware ESP32 risponde correttamente (HTTP 200)!`);
        await connectSerial(target, true);
      } else {
        setModalStatus('fail');
        setModalMessage(`❌ Nessuna risposta da http://${target}. Verifica alimentazione e Wi-Fi.`);
      }
    } catch (err: any) {
      setModalStatus('fail');
      setModalMessage(`❌ Errore connessione: ${err?.message || 'timeout'}`);
    }
  };

  const handleSaveAndConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (customIp.trim()) {
      setBuzzerIp(customIp.trim());
      setShowSettings(false);
      setLocalSearching(true);
      setSearchFeedback('idle');
      try {
        const ok = await connectSerial(customIp.trim(), true);
        setLocalSearching(false);
        setSearchFeedback(ok ? 'success' : 'failed');
        searchFeedbackTimer.current = setTimeout(() => setSearchFeedback('idle'), ok ? 2500 : 3000);
      } catch (_e) {
        setLocalSearching(false);
        setSearchFeedback('failed');
        searchFeedbackTimer.current = setTimeout(() => setSearchFeedback('idle'), 3000);
      }
    }
  };

  // Determina nome e colore della squadra attualmente prenotata
  const bookedNum = bookedTeam ? parseInt(bookedTeam, 10) : null;
  const bookedLabel = bookedNum 
    ? (teamNames[bookedNum - 1] || (bookedNum === 1 ? 'Squadra Rossa' : bookedNum === 2 ? 'Squadra Blu' : 'Squadra Verde'))
    : null;

  return (
    <>
      <div className="flex items-center gap-2 bg-[#1e1e1e] border border-white/10 px-2.5 py-1 rounded-md shrink-0 select-none">
        {/* Badge Stato Hardware */}
        <div 
          className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => {
            setShowSettings(true);
            setModalStatus('idle');
            setModalMessage('');
          }}
          title={`Pulsantiera Hardware ESP32: ${connected ? 'Connessa' : isActuallySearching ? 'Ricerca in corso...' : 'Disconnessa'} (http://${buzzerIp})`}
        >
          <span 
            className={`w-2.5 h-2.5 rounded-full transition-colors duration-300 ${
              connected 
                ? 'bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse' 
                : isActuallySearching
                ? 'bg-amber-400 shadow-[0_0_8px_#f59e0b] animate-ping'
                : 'bg-red-500 shadow-[0_0_6px_#ef4444]'
            }`} 
          />
          <span className={`text-[10px] font-bold uppercase tracking-wider ${
            isActuallySearching ? 'text-amber-300 animate-pulse font-black' : 'text-white/80'
          }`}>
            {connected 
              ? 'HARDWARE: OK' 
              : isActuallySearching 
              ? 'HARDWARE: CERCO...' 
              : 'HARDWARE: OFF'}
          </span>
        </div>

        {/* Notifica visiva squadra prenotata nella barra superiore */}
        {bookedNum && (
          <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border shadow-md animate-pulse ${
            bookedNum === 1
              ? 'bg-red-950/80 text-red-300 border-red-500/50 shadow-red-950/50'
              : bookedNum === 2
              ? 'bg-blue-950/80 text-blue-300 border-blue-500/50 shadow-blue-950/50'
              : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50 shadow-emerald-950/50'
          }`}>
            <span>⚡ {bookedLabel}</span>
          </div>
        )}

        {/* Pulsante Sblocca Hardware Rapido */}
        <button
          type="button"
          onClick={handleManualUnlock}
          disabled={isUnlocking}
          className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition-all cursor-pointer disabled:opacity-50 active:scale-95 flex items-center gap-1"
          title="Invia comando /sblocca per riarmare la pulsantiera hardware"
        >
          {isUnlocking ? (
            <>
              <svg className="animate-spin w-2.5 h-2.5 text-amber-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
              <span>Sblocco...</span>
            </>
          ) : (
            <span>🔓 Sblocca</span>
          )}
        </button>

        {/* Pulsante Cerca / Connetti / Scollega con Feedback Istantaneo */}
        <button
          type="button"
          onClick={handleSearchOrToggle}
          disabled={isActuallySearching}
          className={`px-2 py-0.5 text-[9px] font-black uppercase rounded transition-all cursor-pointer flex items-center gap-1 active:scale-95 select-none ${
            isActuallySearching
              ? 'text-amber-200 bg-amber-500/30 border border-amber-400/80 shadow-[0_0_10px_rgba(245,158,11,0.4)] animate-pulse cursor-wait'
              : searchFeedback === 'success'
              ? 'text-emerald-100 bg-emerald-600/50 border border-emerald-400 shadow-[0_0_10px_#10b981]'
              : searchFeedback === 'failed'
              ? 'text-red-100 bg-red-600/50 border border-red-400 shadow-[0_0_10px_#ef4444]'
              : connected 
              ? 'text-slate-300 hover:text-red-300 bg-white/5 hover:bg-red-950/30 border border-white/10 hover:border-red-900/40' 
              : 'text-emerald-300 hover:text-emerald-200 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 hover:border-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.2)]'
          }`}
          title={
            isActuallySearching 
              ? "Ricerca hardware ESP32 in corso..." 
              : searchFeedback === 'success'
              ? "Hardware connesso con successo!"
              : searchFeedback === 'failed'
              ? "Nessun hardware trovato all'indirizzo IP"
              : connected 
              ? "Hardware connesso. Clicca per scollegare" 
              : "Clicca per avviare la ricerca dell'hardware ESP32"
          }
        >
          {isActuallySearching ? (
            <>
              <svg className="animate-spin w-2.5 h-2.5 text-amber-200" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
              <span>Cerco...</span>
            </>
          ) : searchFeedback === 'success' ? (
            <span>✓ Trovato!</span>
          ) : searchFeedback === 'failed' ? (
            <span>✕ Non trovato</span>
          ) : connected ? (
            <span>Scollega</span>
          ) : (
            <span>🔍 Cerca</span>
          )}
        </button>

        {/* Pulsante Ingranaggio Impostazioni */}
        <button
          type="button"
          onClick={() => {
            setShowSettings(true);
            setModalStatus('idle');
            setModalMessage('');
          }}
          className="text-white/40 hover:text-white/90 text-xs transition-colors cursor-pointer p-0.5 active:scale-95"
          title="Impostazioni Hardware ESP32"
        >
          ⚙️
        </button>
      </div>

      {showSettings && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-[#1e1e1e] border border-white/20 rounded-xl p-5 max-w-sm w-full shadow-2xl text-left">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>📶</span> Connessione Hardware ESP32
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
                  Indirizzo IP Hardware ESP32:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={customIp}
                    onChange={(e) => setCustomIp(e.target.value)}
                    placeholder="192.168.1.142"
                    className="flex-1 bg-black/40 border border-white/20 rounded px-2.5 py-1.5 text-xs text-white font-mono focus:outline-hidden focus:border-emerald-500"
                  />
                  <span className="text-xs text-white/40 font-mono">/status</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-2 bg-black/30 rounded border border-white/5">
                <div>
                  <div className="text-[11px] font-bold text-white">Verifica automatica</div>
                  <div className="text-[10px] text-white/50">Polling rapido /leggi e verifica periodica /status</div>
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
                <p>• Polling rapido: <strong>http://{customIp}/leggi</strong> (120ms)</p>
                <p>• Reset prenotazione: <strong>http://{customIp}/sblocca</strong></p>
                <p>• Controllo stato: <strong>http://{customIp}/status</strong></p>
                <p>• Polling attivo ora: <strong className={isBuzzerPollingActive() ? 'text-amber-300' : 'text-white/40'}>{isBuzzerPollingActive() ? 'Sì (in attesa di buzz)' : 'No (in pausa/prenotato)'}</strong></p>
                <p>• Stato attuale: <span className={connected ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>{connected ? 'Hardware Connesso' : 'Hardware Disconnesso'}</span></p>
              </div>

              {/* Feedback immediato test connessione modal */}
              {modalStatus !== 'idle' && (
                <div className={`text-xs p-2.5 rounded border flex items-center gap-2 ${
                  modalStatus === 'testing' 
                    ? 'bg-amber-950/40 border-amber-500/40 text-amber-300 animate-pulse'
                    : modalStatus === 'ok'
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                    : 'bg-red-950/40 border-red-500/40 text-red-300'
                }`}>
                  {modalStatus === 'testing' && (
                    <svg className="animate-spin w-3.5 h-3.5 text-amber-300 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                    </svg>
                  )}
                  <span>{modalMessage}</span>
                </div>
              )}

              <div className="flex items-center justify-between gap-2 pt-2">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleModalVerify}
                    disabled={modalStatus === 'testing' || isActuallySearching}
                    className="px-2.5 py-1.5 bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/40 rounded text-xs font-semibold cursor-pointer disabled:opacity-50 active:scale-95 flex items-center gap-1.5"
                  >
                    {modalStatus === 'testing' || isActuallySearching ? (
                      <>
                        <svg className="animate-spin w-3 h-3 text-blue-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                        </svg>
                        <span>Verifico...</span>
                      </>
                    ) : (
                      <span>🔄 Verifica</span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleManualUnlock}
                    disabled={isUnlocking}
                    className="px-2.5 py-1.5 bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 border border-amber-500/40 rounded text-xs font-semibold cursor-pointer disabled:opacity-50 active:scale-95 flex items-center gap-1"
                  >
                    {isUnlocking ? (
                      <>
                        <svg className="animate-spin w-2.5 h-2.5 text-amber-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                        </svg>
                        <span>Sblocco...</span>
                      </>
                    ) : (
                      <span>🔓 Sblocca</span>
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowSettings(false)}
                    className="px-3 py-1.5 text-white/60 hover:text-white text-xs cursor-pointer"
                  >
                    Chiudi
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold shadow-xs cursor-pointer active:scale-95"
                  >
                    Salva & Verifica
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

