import { dataURItoBlob, getLargeFile } from './idbStore';

export const idbBlobUrlCache = new Map<string, string>();
export const idbNameCache = new Map<string, string>();

export async function preloadAllLargeFiles(): Promise<void> {
  try {
    const { initDB, getLargeFile } = await import('./idbStore');
    const db = await initDB();
    const transaction = db.transaction('large_files', 'readonly');
    const store = transaction.objectStore('large_files');
    const keysRequest = store.getAllKeys();
    
    await new Promise<void>((resolve, reject) => {
      keysRequest.onsuccess = async () => {
        const keys = keysRequest.result as string[];
        for (const key of keys) {
          try {
            const val = await getLargeFile(key);
            if (val && val.startsWith('data:')) {
              const blob = dataURItoBlob(val);
              const blobUrl = URL.createObjectURL(blob);
              idbBlobUrlCache.set(`idb://${key}`, blobUrl);
              
              // Load the original filename if we stored it
              const first100 = val.substring(0, 100);
              const name = localStorage.getItem('filename_' + first100) || 'File locale';
              idbNameCache.set(`idb://${key}`, name);
            }
          } catch (err) {
            console.error(`Error preloading key ${key}:`, err);
          }
        }
        resolve();
      };
      keysRequest.onerror = () => reject(keysRequest.error);
    });
  } catch (e) {
    console.error('Failed to preload IndexedDB files:', e);
  }
}

/**
 * Risolve asset in public/ sia in dev (http) sia in IMPERIO.app (file://).
 * I path assoluti tipo "/Icone/..." non funzionano in Electron: servono path relativi a index.html.
 */
export function assetUrl(path: string | undefined | null): string {
  if (!path) return '';
  let trimmed = path.trim();
  if (trimmed.startsWith('idb://')) {
    const cached = idbBlobUrlCache.get(trimmed);
    if (cached) return cached;

    // Caricamento lazy e asincrono da IndexedDB
    const key = trimmed.replace('idb://', '');
    if (!(window as any)[`loading_${trimmed}`]) {
      (window as any)[`loading_${trimmed}`] = true;
      getLargeFile(key).then((val) => {
        if (val && val.startsWith('data:')) {
          const blob = dataURItoBlob(val);
          const blobUrl = URL.createObjectURL(blob);
          idbBlobUrlCache.set(trimmed, blobUrl);
          
          const first100 = val.substring(0, 100);
          const name = localStorage.getItem('filename_' + first100) || 'File locale';
          idbNameCache.set(trimmed, name);
          
          window.dispatchEvent(new CustomEvent('idb-file-loaded', { detail: { path: trimmed } }));
        }
      }).catch(err => {
        console.error("Errore nel caricamento lazy da IndexedDB per la chiave:", key, err);
      }).finally(() => {
        delete (window as any)[`loading_${trimmed}`];
      });
    }
    return '';
  }
  if (trimmed.startsWith('data:')) {
    trimmed = trimmed.replace(/\s+/g, '');
    return trimmed;
  }
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }
  const base = import.meta.env.BASE_URL || './';
  const relative = trimmed.replace(/^\.?\//, '');
  return `${base}${relative}`;
}

/** Per background-image CSS (gestisce spazi nel path) */
export function assetUrlCss(path: string | undefined | null): string {
  const url = assetUrl(path);
  if (!url) return 'none';
  return `url("${url.replace(/"/g, '\\"')}")`;
}

