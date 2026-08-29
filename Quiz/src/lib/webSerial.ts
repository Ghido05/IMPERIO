// WebSocket Manager for ESP32 Wi-Fi Buzzer Integration
// Replaces the Web Serial API with a WebSocket connection to the ESP32 at 192.168.1.65:81
// Maintains the exact same interface to avoid breaking existing React bindings.

let ws: WebSocket | null = null;
let isOpened = false;
let shouldReconnect = false;
const statusListeners = new Set<(connected: boolean) => void>();
const dataListeners = new Set<(line: string) => void>();

const WS_URL = 'ws://192.168.1.65:81';

function notifyStatus(status: boolean) {
  isOpened = status;
  statusListeners.forEach((listener) => listener(status));
}

function notifyData(line: string) {
  dataListeners.forEach((listener) => listener(line));
}

export async function connectSerial(): Promise<boolean> {
  if (isOpened || ws) {
    return true;
  }

  shouldReconnect = true;
  return new Promise((resolve) => {
    try {
      console.log(`Connessione WebSocket a ${WS_URL}...`);
      ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        console.log('WebSocket connesso con successo!');
        notifyStatus(true);
        resolve(true);
      };

      ws.onmessage = (event) => {
        const trimmed = event.data?.trim();
        if (trimmed) {
          console.log('Messaggio ricevuto via WebSocket:', trimmed);
          notifyData(trimmed);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket chiuso.');
        notifyStatus(false);
        ws = null;
        if (shouldReconnect) {
          console.log('Riconnessione automatica in corso tra 3 secondi...');
          setTimeout(() => {
            if (shouldReconnect) connectSerial();
          }, 3000);
        }
        resolve(false);
      };

      ws.onerror = (error) => {
        console.error('Errore WebSocket:', error);
        notifyStatus(false);
        resolve(false);
      };
    } catch (e) {
      console.error('Errore durante la creazione del WebSocket:', e);
      notifyStatus(false);
      resolve(false);
    }
  });
}

export async function disconnectSerial() {
  shouldReconnect = false;
  if (ws) {
    ws.close();
    ws = null;
  }
  notifyStatus(false);
}

export async function sendSerialReset() {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.warn('WebSocket non connesso o non pronto per il Reset.');
    return;
  }

  try {
    ws.send('R');
    console.log('Inviato comando di sblocco pulsantiera via WebSocket (R)');
  } catch (error) {
    console.error("Errore nell'invio del comando di sblocco via WebSocket:", error);
  }
}

export function isSerialConnected(): boolean {
  return isOpened;
}

export function subscribeSerialStatus(callback: (connected: boolean) => void): () => void {
  statusListeners.add(callback);
  callback(isOpened);
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
