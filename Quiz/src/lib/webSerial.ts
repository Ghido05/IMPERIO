// Hardware Connection Manager for ESP32 Integration (HTTP GET /status, /leggi, /sblocca)
// Periodically checks connection status to http://192.168.1.142/status every 2.5s.
// When quiz is ready to receive bookings, runs rapid polling (120ms) to /leggi.
// Emits sound and stops polling upon booking, and sends /sblocca on reset/slide navigation.

export const FIXED_BUZZER_IP = '192.168.1.142';
export const ESP32_STATUS_URL = `http://${FIXED_BUZZER_IP}/status`;

let isOpened = false;
let isSearching = false;
let currentBuzzerIp = FIXED_BUZZER_IP;
let retryCount = 0;
export const MAX_RETRIES = 2;
let isPaused = false;
let pollTimer: any = null;

// Fast polling state for /leggi
let isFastPollingActive = false;
let fastPollTimer: any = null;
let isPollInFlight = false;

if (typeof window !== 'undefined') {
  isPaused = localStorage.getItem('buzzer_search_paused') === 'true';
  const savedIp = localStorage.getItem('buzzer_esp32_ip');
  currentBuzzerIp = savedIp?.trim() || FIXED_BUZZER_IP;
}

export type StatusListener = (
  connected: boolean, 
  ip: string, 
  isSearching: boolean, 
  isPaused: boolean, 
  retryCount: number
) => void;

export type BookingTeam = 'rossa' | 'blu' | 'verde';
export type BookingCallback = (teamColor: BookingTeam, teamNum: number) => void;

const statusListeners = new Set<StatusListener>();
const dataListeners = new Set<(line: string) => void>();
let activeBookingCallback: BookingCallback | null = null;

export function getBuzzerIp(): string {
  return currentBuzzerIp;
}

export function setBuzzerIp(ip: string): void {
  const cleanIp = ip.trim() || FIXED_BUZZER_IP;
  currentBuzzerIp = cleanIp;
  if (typeof window !== 'undefined') {
    localStorage.setItem('buzzer_esp32_ip', cleanIp);
  }
}

export function isSearchPaused(): boolean {
  return isPaused;
}

export function getRetryCount(): number {
  return retryCount;
}

function notifyStatus() {
  const ip = getBuzzerIp();
  statusListeners.forEach((listener) => 
    listener(isOpened, ip, isSearching, isPaused, retryCount)
  );
}

export function notifyData(line: string) {
  dataListeners.forEach((listener) => listener(line));
}

/**
 * Esegue una richiesta GET all'endpoint http://<ip>/status con timeout
 */
export async function checkHardwareStatus(timeoutMs = 2000): Promise<boolean> {
  const targetIp = getBuzzerIp();

  // 1. Fallback via Electron IPC (nessuna restrizione CORS o Private Network Access)
  if (typeof window !== 'undefined' && (window as any).electron?.checkEsp32Status) {
    try {
      const ok = await (window as any).electron.checkEsp32Status(targetIp);
      if (ok) return true;
    } catch (_e) {
      // continua con fetch diretta
    }
  }

  // 2. Richiesta fetch diretta con AbortController
  const targetUrl = `http://${targetIp}/status`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(targetUrl, {
      method: 'GET',
      signal: controller.signal,
      cache: 'no-store'
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const text = await res.text();
      if (text.includes('ESP32 CONNESSO') || res.status === 200) {
        return true;
      }
    }
  } catch (_err) {
    clearTimeout(timeoutId);
  }

  return false;
}

/**
 * Legge lo stato della prenotazione hardware (GET http://<ip>/leggi)
 * Restituisce 'rossa', 'blu', 'verde', 'nessuna', oppure null se irraggiungibile.
 */
export async function readBuzzerReservation(timeoutMs = 400): Promise<string | null> {
  const targetIp = getBuzzerIp();

  // 1. Electron IPC nativo per la massima affidabilità e zero CORS
  if (typeof window !== 'undefined' && (window as any).electron?.esp32Leggi) {
    try {
      const res = await (window as any).electron.esp32Leggi(targetIp);
      if (typeof res === 'string' && res.length > 0) {
        if (!isOpened) {
          isOpened = true;
          notifyStatus();
        }
        return res.trim().toLowerCase();
      }
    } catch (_e) {
      // fallback a fetch
    }
  }

  // 2. Fetch browser standard
  const targetUrl = `http://${targetIp}/leggi`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(targetUrl, {
      method: 'GET',
      signal: controller.signal,
      cache: 'no-store'
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const text = await res.text();
      if (!isOpened) {
        isOpened = true;
        notifyStatus();
      }
      return text.trim().toLowerCase();
    }
  } catch (_err) {
    clearTimeout(timeoutId);
  }

  return null;
}

/**
 * Invia comando di sblocco all'hardware ESP32 (GET http://<ip>/sblocca)
 * Riporta la prenotazione hardware a 'nessuna' e la riarma.
 */
export async function sendSerialReset(timeoutMs = 1500): Promise<boolean> {
  const targetIp = getBuzzerIp();
  console.log(`[ESP32] Invio sblocco hardware verso http://${targetIp}/sblocca...`);

  // 1. Electron IPC nativo
  if (typeof window !== 'undefined' && (window as any).electron?.esp32Sblocca) {
    try {
      const ok = await (window as any).electron.esp32Sblocca(targetIp);
      if (ok) {
        console.log(`[ESP32] Hardware sbloccato con successo (IPC)`);
        return true;
      }
    } catch (_e) {
      // fallback a fetch
    }
  }

  // 2. Fetch browser standard
  const targetUrl = `http://${targetIp}/sblocca`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(targetUrl, {
      method: 'GET',
      signal: controller.signal,
      cache: 'no-store'
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      console.log(`[ESP32] Hardware sbloccato con successo (fetch 200)`);
      return true;
    }
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn('[ESP32] Errore richiesta /sblocca:', err);
  }

  return false;
}

/**
 * Sintetizza ed emette il suono corretto del buzzer (Web Audio API)
 * con attacco percussivo e accordo squillante tipico da gioco televisivo.
 */
export function playBuzzerSound(team: BookingTeam | string | number) {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    let teamNum = 1;
    if (typeof team === 'string') {
      const t = team.toLowerCase().trim();
      if (t === 'rossa' || t === '1') teamNum = 1;
      else if (t === 'blu' || t === '2') teamNum = 2;
      else if (t === 'verde' || t === '3') teamNum = 3;
    } else if (typeof team === 'number') {
      teamNum = team;
    }

    // 1. Attacco buzzer percussivo (transiente incisivo)
    const oscClick = ctx.createOscillator();
    const gainClick = ctx.createGain();
    oscClick.type = 'sawtooth';
    oscClick.frequency.setValueAtTime(320, now);
    oscClick.frequency.exponentialRampToValueAtTime(70, now + 0.08);
    gainClick.gain.setValueAtTime(0.35, now);
    gainClick.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    oscClick.connect(gainClick);
    gainClick.connect(ctx.destination);
    oscClick.start(now);
    oscClick.stop(now + 0.09);

    // 2. Accordo distintivo squillante (fanfare da game show televisivo)
    // Rossa: 523Hz (C5), 659Hz (E5), 1046Hz (C6)
    // Blu: 587Hz (D5), 740Hz (F#5), 1174Hz (D6)
    // Verde: 659Hz (E5), 830Hz (G#5), 1318Hz (E6)
    const chords: Record<number, number[]> = {
      1: [523.25, 659.25, 1046.50],
      2: [587.33, 739.99, 1174.66],
      3: [659.25, 830.61, 1318.51],
    };
    const freqs = chords[teamNum] || chords[1];

    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx === 0 ? 'sine' : idx === 1 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, now);

      const delay = idx * 0.012;
      const duration = 0.6;
      gain.gain.setValueAtTime(0, now);
      gain.gain.setValueAtTime(0.28 / (idx + 1), now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + delay);
      osc.stop(now + delay + duration + 0.05);
    });

    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 1000);
  } catch (err) {
    console.error('Errore riproduzione suono buzzer:', err);
  }
}

/**
 * Avvia il polling rapido verso /leggi (ogni ~120ms) quando il quiz è pronto a ricevere prenotazioni.
 * Non appena riceve 'rossa', 'blu' o 'verde', blocca il polling, suona ed esegue onBooking.
 */
export function startBuzzerFastPolling(
  onBooking: BookingCallback,
  intervalMs = 120
) {
  activeBookingCallback = onBooking;
  if (isFastPollingActive) return;
  isFastPollingActive = true;
  console.log(`[ESP32 Fast Polling] Avviato polling rapido verso /leggi ogni ${intervalMs}ms`);

  const pollStep = async () => {
    if (!isFastPollingActive) return;

    if (!isPollInFlight) {
      isPollInFlight = true;
      try {
        const result = await readBuzzerReservation(350);
        if (result === 'rossa' || result === 'blu' || result === 'verde') {
          console.log(`[ESP32 Fast Polling] Ricevuta prenotazione valida: ${result.toUpperCase()}`);
          
          // 1. Blocca subito il polling
          stopBuzzerFastPolling();

          const teamNum = result === 'rossa' ? 1 : result === 'blu' ? 2 : 3;

          // 2. Emette il suono corretto
          playBuzzerSound(result);

          // 3. Notifica data listener per compatibilità
          notifyData(`PRENOTATO GIOCATORE ${teamNum}`);

          // 4. Inoltra al callback dell'interfaccia
          if (activeBookingCallback) {
            activeBookingCallback(result as BookingTeam, teamNum);
          }
          return;
        }
      } catch (_err) {
        // Ignora glitch di rete
      } finally {
        isPollInFlight = false;
      }
    }

    if (isFastPollingActive) {
      fastPollTimer = setTimeout(pollStep, intervalMs);
    }
  };

  pollStep();
}

/**
 * Ferma il polling rapido verso /leggi
 */
export function stopBuzzerFastPolling() {
  if (isFastPollingActive || fastPollTimer) {
    console.log('[ESP32 Fast Polling] Polling rapido fermato');
  }
  isFastPollingActive = false;
  if (fastPollTimer) {
    clearTimeout(fastPollTimer);
    fastPollTimer = null;
  }
  isPollInFlight = false;
}

export function isBuzzerPollingActive(): boolean {
  return isFastPollingActive;
}

/**
 * Singola verifica dello stato hardware con notifica immediata dei listener UI
 */
export async function pollHardwareOnce(): Promise<boolean> {
  isSearching = true;
  notifyStatus();

  const connected = await checkHardwareStatus(2000);
  isSearching = false;

  if (isOpened !== connected) {
    isOpened = connected;
    console.log(`[ESP32] Stato connessione hardware: ${connected ? 'Hardware Connesso' : 'Hardware Disconnesso'}`);
  }
  notifyStatus();
  return connected;
}

/**
 * Avvia la verifica dello stato di connessione (GET http://<ip>/status) ogni 2.5 secondi
 */
export function startHardwarePolling(intervalMs = 2500) {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }

  // Controllo immediato all'avvio
  pollHardwareOnce();

  // Polling periodico dello stato
  pollTimer = setInterval(async () => {
    if (!isPaused) {
      // Se il fast polling su /leggi è attivo, possiamo evitare di sovraccaricare l'ESP32 con /status
      if (isFastPollingActive) return;

      const connected = await checkHardwareStatus(2000);
      if (isOpened !== connected) {
        isOpened = connected;
        console.log(`[ESP32] Stato connessione hardware: ${connected ? 'Hardware Connesso' : 'Hardware Disconnesso'}`);
        notifyStatus();
      }
    }
  }, intervalMs);
}

export function stopHardwarePolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  stopBuzzerFastPolling();
  if (isOpened) {
    isOpened = false;
    notifyStatus();
  }
}

export async function connectSerial(_targetIp?: string, isManual = false): Promise<boolean> {
  if (isManual) {
    isPaused = false;
    if (typeof window !== 'undefined') {
      localStorage.setItem('buzzer_search_paused', 'false');
    }
  }

  startHardwarePolling();
  return await pollHardwareOnce();
}

export async function searchAndConnectBuzzer(): Promise<boolean> {
  return await connectSerial(undefined, true);
}

export async function pauseOrStopSearch(): Promise<void> {
  isPaused = true;
  if (typeof window !== 'undefined') {
    localStorage.setItem('buzzer_search_paused', 'true');
  }
  stopHardwarePolling();
}

export async function resumeOrStartSearch(): Promise<boolean> {
  isPaused = false;
  if (typeof window !== 'undefined') {
    localStorage.setItem('buzzer_search_paused', 'false');
  }
  return await connectSerial(undefined, true);
}

export async function disconnectSerial(): Promise<void> {
  await pauseOrStopSearch();
}

export function isSerialConnected(): boolean {
  return isOpened;
}

export function subscribeSerialStatus(callback: StatusListener): () => void {
  statusListeners.add(callback);
  callback(isOpened, getBuzzerIp(), isSearching, isPaused, retryCount);
  return () => {
    statusListeners.delete(callback);
  };
}

export function subscribeSerialData(callback: (line: string) => void): () => void {
  dataListeners.add(callback);
  return () => {
    dataListeners.delete(callback);
  };
}

// Avvio automatico del polling stato all'importazione del modulo se non in pausa
if (typeof window !== 'undefined' && !isPaused) {
  startHardwarePolling();
}
