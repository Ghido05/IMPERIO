import { useState, useEffect } from 'react';
import { 
  connectSerial, 
  disconnectSerial, 
  subscribeSerialStatus, 
  subscribeSerialData, 
  sendSerialReset 
} from '../lib/webSerial';
interface WebSerialManagerProps {
  activeSlideId: string;
  activeSlideType: string;
}

export default function WebSerialManager({ activeSlideId, activeSlideType }: WebSerialManagerProps) {
  const [connected, setConnected] = useState(false);
  const [assignedTeam, setAssignedTeam] = useState<string | null>(null);
  const [bookedTeam, setBookedTeam] = useState<string | null>(null);

  // 1. Subscribe to serial connection status changes
  useEffect(() => {
    const unsubscribe = subscribeSerialStatus((status) => {
      setConnected(status);
    });
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
    } else {
      await connectSerial();
    }
  };

  return (
    <div className="flex items-center gap-2 bg-[#1e1e1e] border border-white/10 px-2.5 py-1 rounded-md shrink-0 select-none">
      <div className="flex items-center gap-1.5">
        <span 
          className={`w-2 h-2 rounded-full ${
            connected 
              ? 'bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse' 
              : 'bg-red-500'
          }`} 
        />
        <span className="text-[10px] font-bold uppercase text-white/70">
          Wi-Fi: {connected ? 'OK' : 'OFF'}
        </span>
      </div>
      <button
        type="button"
        onClick={handleConnectionToggle}
        className={`px-1.5 py-0.5 text-[9px] font-black uppercase rounded transition-all cursor-pointer ${
          connected 
            ? 'text-red-400 bg-red-950/20 hover:bg-red-950/40 border border-red-900/30' 
            : 'text-emerald-400 bg-emerald-950/20 hover:bg-emerald-950/40 border border-emerald-900/30'
        }`}
        title={connected ? "Scollega la pulsantiera Wi-Fi" : "Connetti alla pulsantiera Wi-Fi ESP32"}
      >
        {connected ? 'Scollega' : 'Collega'}
      </button>
    </div>
  );
}
