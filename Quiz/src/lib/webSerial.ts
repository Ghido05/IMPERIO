// Web Serial API Manager for ESP32 Buzzer Integration
// Maintains a global serial connection state that persists across React component cycles.

let port: any = null;
let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
let keepReading = true;
let isOpened = false;

const statusListeners = new Set<(connected: boolean) => void>();
const dataListeners = new Set<(line: string) => void>();

function notifyStatus(status: boolean) {
  isOpened = status;
  statusListeners.forEach((listener) => listener(status));
}

function notifyData(line: string) {
  dataListeners.forEach((listener) => listener(line));
}

// Handle physical device unplug
if (typeof navigator !== 'undefined' && 'serial' in navigator) {
  (navigator as any).serial.addEventListener('disconnect', (event: any) => {
    if (event.port === port) {
      console.log('Pulsantiera USB scollegata fisicamente.');
      disconnectSerial();
    }
  });
}

async function readLoop() {
  const decoder = new TextDecoder();
  let buffer = '';

  while (port && port.readable && keepReading) {
    try {
      const activeReader = port.readable.getReader();
      reader = activeReader;
      try {
        while (keepReading) {
          const { value, done } = await activeReader.read();
          if (done) {
            break;
          }
          if (value) {
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed) {
                console.log('Dati ricevuti da seriale:', trimmed);
                notifyData(trimmed);
              }
            }
          }
        }
      } finally {
        activeReader.releaseLock();
        reader = null;
      }
    } catch (error) {
      console.error('Errore nel loop di lettura seriale:', error);
      break;
    }
  }
  notifyStatus(false);
}

export async function connectSerial(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !('serial' in navigator)) {
    alert('La Web Serial API non è supportata da questo browser. Usa Google Chrome, Microsoft Edge o Opera.');
    return false;
  }

  if (isOpened) {
    return true;
  }

  try {
    port = await (navigator as any).serial.requestPort();
    await port.open({ baudRate: 115200 });

    keepReading = true;
    readLoop();
    notifyStatus(true);
    return true;
  } catch (error) {
    console.error('Impossibile connettere la porta seriale:', error);
    notifyStatus(false);
    return false;
  }
}

export async function disconnectSerial() {
  keepReading = false;

  const currentReader = reader;
  if (currentReader) {
    try {
      await currentReader.cancel();
    } catch (e) {
      // Ignora errori di cancellazione durante la disconnessione
    }
  }

  if (port) {
    try {
      await port.close();
    } catch (e) {
      console.error('Errore nella chiusura della porta seriale:', e);
    }
    port = null;
  }

  notifyStatus(false);
}

export async function sendSerialReset() {
  if (!port || !port.writable) {
    console.warn('Porta seriale non connessa o non scrivibile per il Reset.');
    return;
  }

  try {
    const encoder = new TextEncoder();
    const data = encoder.encode('R\n');
    const writer = port.writable.getWriter();
    await writer.write(data);
    writer.releaseLock();
    console.log('Inviato comando di sblocco pulsantiera (R\\n)');
  } catch (error) {
    console.error("Errore nell'invio del comando di sblocco seriale:", error);
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
