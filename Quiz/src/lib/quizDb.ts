// IndexedDB storage manager to store large MP3 audio files & images without LocalStorage quota limitations

const DB_NAME = 'ImperioQuizDB_v2';
const DB_VERSION = 1;
const STORE_NAME = 'setupData';

export async function openQuizDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveSetupStateDb(state: any): Promise<void> {
  try {
    const db = await openQuizDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(state, 'currentSetup');
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Error saving state to IndexedDB:', err);
    throw err;
  }
}

export async function loadSetupStateDb(): Promise<any | null> {
  try {
    const db = await openQuizDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get('currentSetup');
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Error loading state from IndexedDB:', err);
    return null;
  }
}
