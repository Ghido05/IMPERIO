// WebSocket Manager for ESP32 Wi-Fi Buzzer Integration
// Automatically connects to the ESP32 WebSocket server on port 81.
// Supports auto-discovery via local network subnet scan and manual IP configuration.

let ws: WebSocket | null = null;
let isOpened = false;
let isSearching = false;
let shouldReconnect = false;
let currentBuzzerIp = '192.168.1.97';

type StatusListener = (connected: boolean, ip: string, isSearching: boolean) => void;
const statusListeners = new Set<StatusListener>();
const dataListeners = new Set<(line: string) => void>();

export function getBuzzerIp(): string {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('buzzer_esp32_ip');
    if (saved && saved.trim()) {
      return saved.trim();
    }
  }
  return currentBuzzerIp;
}

export function setBuzzerIp(ip: string): void {
  const cleanIp = ip.trim();
  currentBuzzerIp = cleanIp;
  if (typeof window !== 'undefined') {
    localStorage.setItem('buzzer_esp32_ip', cleanIp);
  }
}

function notifyStatus() {
  const ip = getBuzzerIp();
  statusListeners.forEach((listener) => listener(isOpened, ip, isSearching));
}

function notifyData(line: string) {
  dataListeners.forEach((listener) => listener(line));
}

function trySingleWebSocket(ip: string, timeoutMs = 2000): Promise<WebSocket | null> {
  return new Promise((resolve) => {
    let resolved = false;
    const url = `ws://${ip}:81`;
    console.log(`Tentativo di connessione WebSocket a ${url}...`);

    let socket: WebSocket | null = null;
    try {
      socket = new WebSocket(url);
    } catch (err) {
      return resolve(null);
    }

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        try { socket?.close(); } catch (e) { /* ignore */ }
        resolve(null);
      }
    }, timeoutMs);

    socket.onopen = () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        resolve(socket);
      }
    };

    socket.onerror = () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        resolve(null);
      }
    };

    socket.onclose = () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        resolve(null);
      }
    };
  });
}

function attachSocketListeners(socket: WebSocket, ip: string) {
  ws = socket;
  isOpened = true;
  isSearching = false;
  setBuzzerIp(ip);
  notifyStatus();

  socket.onmessage = (event) => {
    const trimmed = event.data?.trim();
    if (trimmed) {
      console.log('Messaggio ricevuto dalla pulsantiera Wi-Fi:', trimmed);
      notifyData(trimmed);
    }
  };

  socket.onclose = () => {
    console.log('Connessione WebSocket con la pulsantiera chiusa.');
    isOpened = false;
    ws = null;
    notifyStatus();

    if (shouldReconnect) {
      console.log('Riconnessione automatica in corso tra 3 secondi...');
      setTimeout(() => {
        if (shouldReconnect && !isOpened) {
          connectSerial();
        }
      }, 3000);
    }
  };

  socket.onerror = (error) => {
    console.error('Errore WebSocket pulsantiera:', error);
  };
}

export async function connectSerial(targetIp?: string): Promise<boolean> {
  if (isOpened && ws && ws.readyState === WebSocket.OPEN) {
    return true;
  }

  shouldReconnect = true;
  isSearching = true;
  notifyStatus();

  const ipToTry = (targetIp || getBuzzerIp()).trim();

  // 1. Prova prima l'IP specificato o salvato
  const firstAttempt = await trySingleWebSocket(ipToTry, 1800);
  if (firstAttempt) {
    attachSocketListeners(firstAttempt, ipToTry);
    console.log(`Pulsantiera Wi-Fi connessa con successo a ${ipToTry}:81!`);
    return true;
  }

  console.warn(`Impossibile connettersi all'IP ${ipToTry}:81. Avvio scansione automatica della rete...`);

  // 2. Se in ambiente Electron, avvia scansione automatica della sottorete per porta 81
  if (typeof window !== 'undefined' && (window as any).electron?.findBuzzerIp) {
    try {
      const foundIp = await (window as any).electron.findBuzzerIp(ipToTry);
      if (foundIp && foundIp !== ipToTry) {
        console.log(`Pulsantiera trovata sulla rete all'indirizzo ${foundIp}! Connessione in corso...`);
        const secondAttempt = await trySingleWebSocket(foundIp, 2000);
        if (secondAttempt) {
          attachSocketListeners(secondAttempt, foundIp);
          console.log(`Pulsantiera Wi-Fi connessa a ${foundIp}:81 (IP aggiornato e salvato)!`);
          return true;
        }
      }
    } catch (scanErr) {
      console.error('Errore durante la scansione della rete:', scanErr);
    }
  }

  isSearching = false;
  isOpened = false;
  notifyStatus();

  // Se la riconnessione automatica è attiva, riprova dopo una breve pausa
  if (shouldReconnect) {
    setTimeout(() => {
      if (shouldReconnect && !isOpened) {
        connectSerial();
      }
    }, 4000);
  }

  return false;
}

export async function searchAndConnectBuzzer(): Promise<boolean> {
  if (typeof window !== 'undefined' && (window as any).electron?.findBuzzerIp) {
    isSearching = true;
    notifyStatus();
    try {
      const foundIp = await (window as any).electron.findBuzzerIp();
      if (foundIp) {
        return await connectSerial(foundIp);
      }
    } catch (e) {
      console.error(e);
    } finally {
      isSearching = false;
      notifyStatus();
    }
  }
  return await connectSerial();
}

export async function disconnectSerial() {
  shouldReconnect = false;
  isSearching = false;
  if (ws) {
    try {
      ws.close();
    } catch (e) { /* ignore */ }
    ws = null;
  }
  isOpened = false;
  notifyStatus();
}

export async function sendSerialReset() {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.warn('Pulsantiera non connessa o non pronta per il Reset.');
    return;
  }

  try {
    ws.send('R');
    console.log('Inviato comando di sblocco pulsantiera via Wi-Fi (R)');
  } catch (error) {
    console.error("Errore nell'invio del comando di sblocco:", error);
  }
}

export function isSerialConnected(): boolean {
  return isOpened;
}

export function subscribeSerialStatus(callback: StatusListener): () => void {
  statusListeners.add(callback);
  callback(isOpened, getBuzzerIp(), isSearching);
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
