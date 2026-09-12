import { dataURItoBlob, getLargeFile } from './idbStore';

export const idbBlobUrlCache = new Map<string, string>();
export const idbNameCache = new Map<string, string>();

export const KNOWN_PUBLIC_ASSETS: Record<string, string> = {
  // Audio Strumenti
  'g01m07s01 elettronico - payphone.mp3': '/Audio/strumenti/g01m07s01 elettronico - payphone.mp3',
  'g01m07s02 chitarra - payphone.mp3': '/Audio/strumenti/g01m07s02 chitarra - payphone.mp3',
  'g01m07s03 piano - payphone.mp3': '/Audio/strumenti/g01m07s03 piano - payphone.mp3',
  'g01m07s04 basso - payphone.mp3': '/Audio/strumenti/g01m07s04 basso - payphone.mp3',
  'g01m07s05 flauto - payphone.mp3': '/Audio/strumenti/g01m07s05 flauto - payphone.mp3',
  'g02m01s01 batteria - ossessione.mp3': '/Audio/strumenti/g02m01s01 batteria - ossessione.mp3',
  'g02m01s02basso-ossessione.mp3': '/Audio/strumenti/g02m01s02basso-ossessione.mp3',
  'g02m01s03 chitarra acustica 1 e elettronica.mp3': '/Audio/strumenti/g02m01s03 chitarra acustica 1 e elettronica.mp3',
  'g02m01s04chitarra.mp3': '/Audio/strumenti/g02m01s04chitarra.mp3',
  'g02m01s05 classic elettric piano.mp3': '/Audio/strumenti/g02m01s05 classic elettric piano.mp3',
  'g02m01s06-coro.mp3': '/Audio/strumenti/g02m01s06-coro.mp3',
  'g02m01s07-tastiera.mp3': '/Audio/strumenti/g02m01s07-tastiera.mp3',
  'g02m03s01 violino.mp3': '/Audio/strumenti/g02m03s01 violino.mp3',
  'g02m03s02 basso.mp3': '/Audio/strumenti/g02m03s02 basso.mp3',
  'g02m03s03 chitarra acustica siamo uguali.mp3': '/Audio/strumenti/g02m03s03 chitarra acustica siamo uguali.mp3',
  'g02m03s04 elettrico siamo uguali.mp3': '/Audio/strumenti/g02m03s04 elettrico siamo uguali.mp3',
  'g02m03s05 piano siamo uguali.mp3': '/Audio/strumenti/g02m03s05 piano siamo uguali.mp3',
  'g02m03s06 tastiera siamo uguali.mp3': '/Audio/strumenti/g02m03s06 tastiera siamo uguali.mp3',
  'g02m03s07fluato siamo uguali.mp3': '/Audio/strumenti/g02m03s07fluato siamo uguali.mp3',
  'g02m05s01 batteria.mp3': '/Audio/strumenti/g02m05s01 batteria.mp3',
  'g02m05s02 tastiera.mp3': '/Audio/strumenti/g02m05s02 tastiera.mp3',
  'g02m05s03 basso.mp3': '/Audio/strumenti/g02m05s03 basso.mp3',
  'g02m05s04 tastiera2.mp3': '/Audio/strumenti/g02m05s04 tastiera2.mp3',
  'g02m05s05 ottone.mp3': '/Audio/strumenti/g02m05s05 ottone.mp3',
  'g02m05s06 soft square lead .mp3': '/Audio/strumenti/g02m05s06 soft square lead .mp3',
  'g02m05s07 organo dontstop.mp3': '/Audio/strumenti/g02m05s07 organo dontstop.mp3',
  // Audio Soluzioni
  'g01m07soluzione.mp3': '/Audio/soluzioni a conferma/g01m07soluzione.mp3',
  'g02m01soluzione.mp3': '/Audio/soluzioni a conferma/g02m01soluzione.mp3',
  'g02m03soluzione.mp3': '/Audio/soluzioni a conferma/g02m03soluzione.mp3',
  'g02m05soluzione.mp3': '/Audio/soluzioni a conferma/g02m05soluzione.mp3',
  // Immagini e Icone nessuno_img
  '1_3_telemaco.jpeg': '/Icone/nessuno_img/1_3_telemaco.jpeg',
  'images.jpeg': '/Icone/nessuno_img/1_3_telemaco.jpeg',
  '4_1_route66.jpg': '/Icone/nessuno_img/4_1_route66.jpg',
  '4_2_digaAssuan.jpg': '/Icone/nessuno_img/4_2_digaAssuan.jpg',
  '4_2_digaassuan.jpg': '/Icone/nessuno_img/4_2_digaAssuan.jpg',
  '4_3_ArtemisIII.jpg': '/Icone/nessuno_img/4_3_ArtemisIII.jpg',
  'Prova.png': '/Icone/nessuno_img/Prova.png',
  'Cornice immagine.svg': '/Icone/nessuno_img/Cornice immagine.svg',
  'Categoria.svg': '/Icone/nessuno_img/Categoria.svg',
  'Indizio.svg': '/Icone/nessuno_img/Indizio.svg',
  'Icona indizio.svg': '/Icone/nessuno_img/Icona indizio.svg',
  // Icone nessuno_musicale (Gioco 1 e Classifica Musicale)
  'Pentagramma.svg': '/Icone/nessuno_musicale/Pentagramma.svg',
  'Primo indizio.svg': '/Icone/nessuno_musicale/Primo indizio.svg',
  'Secondo indizio.svg': '/Icone/nessuno_musicale/Secondo indizio.svg',
  'Terzo indizio.svg': '/Icone/nessuno_musicale/Terzo indizio.svg',
  'Quarto indizio.svg': '/Icone/nessuno_musicale/Quarto indizio.svg',
  'Nota1.svg': '/Icone/nessuno_musicale/Nota1.svg',
  'Nota2.svg': '/Icone/nessuno_musicale/Nota2.svg',
  'Nota3.svg': '/Icone/nessuno_musicale/Nota3.svg',
  'Nota4.svg': '/Icone/nessuno_musicale/Nota4.svg',
  'Chitarra.svg': '/Icone/nessuno_musicale/Chitarra.svg',
  'Chitarra elettrica.svg': '/Icone/nessuno_musicale/Chitarra elettrica.svg',
  'Batteria.svg': '/Icone/nessuno_musicale/Batteria.svg',
  'Violino.svg': '/Icone/nessuno_musicale/Violino.svg',
  'Flauto.svg': '/Icone/nessuno_musicale/Flauto.svg',
  'Icona di base.svg': '/Icone/nessuno_musicale/Icona di base.svg',
  // Icone Bonus
  'porto_scudo_verde.png': '/Icone/Bonus/porto_scudo_verde.png',
  'porto_arco_rosso.png': '/Icone/Bonus/porto_arco_rosso.png',
  'porto_frecce_verde.png': '/Icone/Bonus/porto_frecce_verde.png',
  'porto_frecce_blu.png': '/Icone/Bonus/porto_frecce_blu.png',
  'porto_scudo_blu.png': '/Icone/Bonus/porto_scudo_blu.png',
  'porto_scudo_grigio.png': '/Icone/Bonus/porto_scudo_grigio.png',
  'porto_arco_grigio.png': '/Icone/Bonus/porto_arco_grigio.png',
  'porto_arco_blu.png': '/Icone/Bonus/porto_arco_blu.png',
  'porto_arco_verde.png': '/Icone/Bonus/porto_arco_verde.png',
  'porto_frecce_rosso.png': '/Icone/Bonus/porto_frecce_rosso.png',
  'porto_scudo_rosso.png': '/Icone/Bonus/porto_scudo_rosso.png',
  'porto_frecce_grigio.png': '/Icone/Bonus/porto_frecce_grigio.png',
  // Sfondi
  'sfondo_finale_acqua.jpg': '/sfondo_finale_acqua.jpg',
  'sfondo_finale_default.jpg': '/sfondo_finale_default.jpg',
};

export function findKnownPublicAsset(rawNameOrPath: string | undefined | null): string | null {
  if (!rawNameOrPath || typeof rawNameOrPath !== 'string') return null;
  let clean = rawNameOrPath.trim();

  // Se è già un percorso valido con cartelle (es. Icone/..., Audio/..., ecc.)
  // e NON è un idb:// o data:, non deve essere riscritto!
  if (!clean.startsWith('idb://') && !clean.startsWith('data:')) {
    if (clean.includes('/') || clean.includes('\\')) {
      return null;
    }
  }

  if (clean.startsWith('idb://')) {
    const match = clean.match(/[?&]name=([^&]+)/);
    if (match) {
      try {
        clean = decodeURIComponent(match[1]);
      } catch {
        clean = match[1];
      }
    } else {
      clean = clean.replace('idb://', '').split('?')[0];
    }
  }
  const parts = clean.split(/[/\\]/);
  const fileName = parts[parts.length - 1];
  if (KNOWN_PUBLIC_ASSETS[fileName]) {
    return KNOWN_PUBLIC_ASSETS[fileName];
  }
  const lowerFileName = fileName.toLowerCase();
  for (const [key, p] of Object.entries(KNOWN_PUBLIC_ASSETS)) {
    if (key.toLowerCase() === lowerFileName) {
      return p;
    }
  }

  return null;
}

export function sanitizeSetupStateWithKnownAssets<T>(obj: T): T {
  if (!obj) return obj;
  if (typeof obj === 'string') {
    if (obj.startsWith('idb://')) {
      const known = findKnownPublicAsset(obj);
      if (known) return known as unknown as T;
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeSetupStateWithKnownAssets(item)) as unknown as T;
  }
  if (typeof obj === 'object') {
    const result: any = {};
    for (const [k, v] of Object.entries(obj)) {
      result[k] = sanitizeSetupStateWithKnownAssets(v);
    }
    return result;
  }
  return obj;
}

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

  // Fallback istantaneo a file locali noti nel repository
  const knownAsset = findKnownPublicAsset(trimmed);
  if (knownAsset) {
    trimmed = knownAsset;
  }

  if (trimmed.startsWith('idb://')) {
    const cached = idbBlobUrlCache.get(trimmed);
    if (cached) return cached;

    // Caricamento lazy e asincrono da IndexedDB
    const cleanKey = trimmed.replace('idb://', '').split('?')[0];
    const cleanIdbUrl = `idb://${cleanKey}`;
    const cachedClean = idbBlobUrlCache.get(cleanIdbUrl);
    if (cachedClean) {
      idbBlobUrlCache.set(trimmed, cachedClean);
      
      // Assicura che anche la cache dei nomi abbia questa voce
      if (!idbNameCache.has(trimmed)) {
        const match = trimmed.match(/[?&]name=([^&]+)/);
        const name = match ? decodeURIComponent(match[1]) : (idbNameCache.get(cleanIdbUrl) || 'File locale');
        idbNameCache.set(trimmed, name);
      }
      return cachedClean;
    }

    if (!(window as any)[`loading_${trimmed}`]) {
      (window as any)[`loading_${trimmed}`] = true;
      getLargeFile(cleanKey).then((val) => {
        if (val && val.startsWith('data:')) {
          const blob = dataURItoBlob(val);
          const blobUrl = URL.createObjectURL(blob);
          idbBlobUrlCache.set(trimmed, blobUrl);
          
          // Estrai il nome dal query parameter o usa localStorage come fallback
          let name = 'File locale';
          const match = trimmed.match(/[?&]name=([^&]+)/);
          if (match) {
            name = decodeURIComponent(match[1]);
          } else {
            const first100 = val.substring(0, 100);
            name = localStorage.getItem('filename_' + first100) || 'File locale';
          }
          idbNameCache.set(trimmed, name);
          
          window.dispatchEvent(new CustomEvent('idb-file-loaded', { detail: { path: trimmed } }));
        }
      }).catch(err => {
        console.error("Errore nel caricamento lazy da IndexedDB per la chiave:", cleanKey, err);
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

