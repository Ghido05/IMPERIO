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
  'g01m05s01basso_nordsudovestest.mp3': '/Audio/strumenti/g01m05s01basso_nordsudovestest.mp3',
  'g01m05s02chitarra_nordsudovestest.mp3': '/Audio/strumenti/g01m05s02chitarra_nordsudovestest.mp3',
  'g01m05s03piano_nordsudovestest.mp3': '/Audio/strumenti/g01m05s03piano_nordsudovestest.mp3',
  'g01m05s04base_nordsudovestest.mp3': '/Audio/strumenti/g01m05s04base_nordsudovestest.mp3',
  'g01m05s05trombe_nordsudovestest.mp3': '/Audio/strumenti/g01m05s05trombe_nordsudovestest.mp3',
  '1_2_Tuttoperunaragione_Benji.mp3': '/Audio/strumenti/1_2_Tuttoperunaragione_Benji.mp3',
  '1_8_thinkabouttheway.mp3': '/Audio/strumenti/1_8_thinkabouttheway.mp3',
  '4_7_Pedro_Carra.mp3': '/Audio/stacchetto/4_7_Pedro_Carra.mp3',
  // Audio Spiegazione Box 0 - 4 (nella cartella Spiegazioni)
  'spiegazione_fasi_audio.mp3': '/Audio/Spiegazioni/spiegazione_fasi_audio.mp3',
  '#4 Spiegazione.mp3': '/Audio/Spiegazioni/spiegazione_fasi_audio.mp3',
  '4 Spiegazione.mp3': '/Audio/Spiegazioni/spiegazione_fasi_audio.mp3',
  'Spiegazione_box1.mp3': '/Audio/Spiegazioni/Spiegazione_box1.mp3',
  'spiegazione_box1.mp3': '/Audio/Spiegazioni/Spiegazione_box1.mp3',
  'spiegazione_box1_audio.wav': '/Audio/Spiegazioni/Spiegazione_box1.mp3',
  'spiegazione_box1_audio.m4a': '/Audio/Spiegazioni/Spiegazione_box1.mp3',
  'spiegazione_box1_audio.mp3': '/Audio/Spiegazioni/Spiegazione_box1.mp3',
  'Spiegazione_box2.mp3': '/Audio/Spiegazioni/Spiegazione_box2.mp3',
  'spiegazione_box2.mp3': '/Audio/Spiegazioni/Spiegazione_box2.mp3',
  'Spiegazione_box3.mp3': '/Audio/Spiegazioni/Spiegazione_box3.mp3',
  'spiegazione_box3.mp3': '/Audio/Spiegazioni/Spiegazione_box3.mp3',
  'Spiegazione_box4.mp3': '/Audio/Spiegazioni/Spiegazione_box4.mp3',
  'spiegazione_box4.mp3': '/Audio/Spiegazioni/Spiegazione_box4.mp3',
  // Audio Soluzioni
  'g01m01soluzione.mp3': '/Audio/soluzioni a conferma/g01m01soluzione.mp3',
  'g01m03soluzione.mp3': '/Audio/soluzioni a conferma/g01m03soluzione.mp3',
  'g01m05soluzione.mp3': '/Audio/soluzioni a conferma/g01m05soluzione.mp3',
  'g01m07soluzione.mp3': '/Audio/soluzioni a conferma/g01m07soluzione.mp3',
  'g02m01soluzione.mp3': '/Audio/soluzioni a conferma/g02m01soluzione.mp3',
  'g02m03soluzione.mp3': '/Audio/soluzioni a conferma/g02m03soluzione.mp3',
  'g02m05soluzione.mp3': '/Audio/soluzioni a conferma/g02m05soluzione.mp3',
  // Immagini e Icone nessuno_img / sfondi
  '1_2_telemaco.jpeg': '/Icone/sfondi/1_2_telemaco.jpeg',
  '1_3_telemaco.jpeg': '/Icone/sfondi/1_2_telemaco.jpeg',
  '1_8_tajmahal.jpg': '/Icone/sfondi/1_8_tajmahal.jpg',
  '2_2_faraonamitrata.jpeg': '/Icone/sfondi/2_2_faraonamitrata.jpeg',
  'faraona.jpeg': '/Icone/sfondi/2_2_faraonamitrata.jpeg',
  '3_1_superereoi.png': '/Icone/sfondi/3_1_superereoi.png',
  '3_2_dolci.png': '/Icone/sfondi/3_2_dolci.png',
  'images.jpeg': '/Icone/sfondi/1_2_telemaco.jpeg',
  '4_1_route66.jpg': '/Icone/sfondi/4_1_route66.jpg',
  '4_2_digaAssuan.jpg': '/Icone/sfondi/4_2_digaAssuan.jpg',
  '4_2_digaassuan.jpg': '/Icone/sfondi/4_2_digaAssuan.jpg',
  '4_3_ArtemisIII.jpg': '/Icone/sfondi/4_3_ArtemisIII.jpg',
  '4_4_archimede.jpg': '/Icone/sfondi/4_4_archimede.jpg',
  '4_6_Livingstone.jpg': '/Icone/sfondi/4_6_Livingstone.jpg',
  '4_7_Ugolino.jpg': '/Icone/sfondi/4_7_Ugolino.jpg',
  'Prova.png': '/Icone/sfondi/Prova.png',
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
  // Icone Classifica Musicale (BOX 2)
  'batteria.svg': '/Icone/classifica_musicale/batteria.svg',
  'basso.svg': '/Icone/classifica_musicale/basso.svg',
  'chitarra_acustica.svg': '/Icone/classifica_musicale/chitarra_acustica.svg',
  'chitarra_elettrica.svg': '/Icone/classifica_musicale/chitarra_elettrica.svg',
  'pianoforte.svg': '/Icone/classifica_musicale/pianoforte.svg',
  'sintetizzatore.svg': '/Icone/classifica_musicale/sintetizzatore.svg',
  'archi.svg': '/Icone/classifica_musicale/archi.svg',
  'voce.svg': '/Icone/classifica_musicale/voce.svg',
  'flauto.svg': '/Icone/classifica_musicale/flauto.svg',
  'tromba.svg': '/Icone/classifica_musicale/tromba.svg',
  'sassofono.svg': '/Icone/classifica_musicale/sassofono.svg',
  'organo.svg': '/Icone/classifica_musicale/organo.svg',
  'musica_default.svg': '/Icone/classifica_musicale/musica_default.svg',
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
  // Sfondi Nadia
  '1001Nadia.jpg': '/Icone/sfondi/1001Nadia.jpg',
  '1001Nadia.jpeg': '/Icone/sfondi/1001Nadia.jpg',
  // Sfondi e Finale
  'sfondo_finale_acqua.jpg': '/sfondo_finale_acqua.jpg',
  'sfondo_finale_default.jpg': '/sfondo_finale_default.jpg',
  'sfondo_box1_foresta_musicale.jpg': '/Icone/sfondi/sfondo_box1_foresta_musicale.jpg',
  'sfondo_box2_cristalli.jpg': '/Icone/sfondi/sfondo_box2_cristalli.jpg',
  'sfondo_box3_forzieri.jpg': '/Icone/sfondi/sfondo_box3_forzieri.jpg',
  'sfondo_generale_torneo.jpg': '/Icone/sfondi/sfondo_generale_torneo.jpg',
  'trofeo_vittoria.png': '/Icone/finale/trofeo_vittoria.png',
  'coppa.png': '/coppa.png',
  // Sfondi Password
  'password1.png': '/Icone/Sfondi Password/password1.png',
  'password2.png': '/Icone/Sfondi Password/password2.png',
  'exterior_00.webp': '/Icone/exterior_00.webp',
  'spiegazione_box1_ambientazione.jpg': '/Mappa/spiegazione_box1_ambientazione.jpg',
  'imperio_island_map.jpg': '/Mappa/imperio_island_map.jpg',
};

export function findKnownPublicAsset(rawNameOrPath: string | undefined | null): string | null {
  if (!rawNameOrPath || typeof rawNameOrPath !== 'string') return null;
  let clean = rawNameOrPath.trim();

  // Se è già un percorso valido con cartelle (es. Icone/..., Audio/..., ecc.)
  // e NON è un idb:// o data:, non deve essere riscritto a meno che non sia un path non esistente noto!
  if (!clean.startsWith('idb://') && !clean.startsWith('data:')) {
    if (clean.includes('exterior_00.webp')) return '/Icone/exterior_00.webp';
    if (clean.includes('4_1_route66')) return '/Icone/sfondi/4_1_route66.jpg';
    if (clean.includes('4_2_digaAssuan') || clean.includes('4_2_digaassuan')) return '/Icone/sfondi/4_2_digaAssuan.jpg';
    if (clean.includes('4_3_ArtemisIII') || clean.includes('4_3_artemis')) return '/Icone/sfondi/4_3_ArtemisIII.jpg';
    if (clean.includes('4_6_Livingstone') || clean.includes('4_6_livingstone')) return '/Icone/sfondi/4_6_Livingstone.jpg';
    if (clean.includes('4_7_Ugolino') || clean.includes('4_7_ugolino')) return '/Icone/sfondi/4_7_Ugolino.jpg';
    if (clean.includes('4_7_Pedro_Carra') || clean.includes('4_7_pedro_carra')) return '/Audio/stacchetto/4_7_Pedro_Carra.mp3';
    if (clean.includes('spiegazione_box1_ambientazione') || clean.includes('ambientazione')) return '/Mappa/spiegazione_box1_ambientazione.jpg';
    if (clean.toLowerCase().includes('spiegazione_box1') && (clean.endsWith('.m4a') || clean.endsWith('.mp3') || clean.endsWith('.wav'))) return '/Audio/Spiegazioni/Spiegazione_box1.mp3';
    if (clean.toLowerCase().includes('spiegazione_box2') && (clean.endsWith('.m4a') || clean.endsWith('.mp3') || clean.endsWith('.wav'))) return '/Audio/Spiegazioni/Spiegazione_box2.mp3';
    if (clean.toLowerCase().includes('spiegazione_box3') && (clean.endsWith('.m4a') || clean.endsWith('.mp3') || clean.endsWith('.wav'))) return '/Audio/Spiegazioni/Spiegazione_box3.mp3';
    if (clean.toLowerCase().includes('spiegazione_box4') && (clean.endsWith('.m4a') || clean.endsWith('.mp3') || clean.endsWith('.wav'))) return '/Audio/Spiegazioni/Spiegazione_box4.mp3';
    if (clean.includes('spiegazione_fasi_audio')) return '/Audio/Spiegazioni/spiegazione_fasi_audio.mp3';
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
    if (obj.includes('1001Nadia')) {
      return '/Icone/sfondi/1001Nadia.jpg' as unknown as T;
    }
    if (obj.includes('4_1_route66')) return '/Icone/sfondi/4_1_route66.jpg' as unknown as T;
    if (obj.includes('4_2_digaAssuan') || obj.includes('4_2_digaassuan')) return '/Icone/sfondi/4_2_digaAssuan.jpg' as unknown as T;
    if (obj.includes('4_3_ArtemisIII') || obj.includes('4_3_artemis')) return '/Icone/sfondi/4_3_ArtemisIII.jpg' as unknown as T;
    if (obj.includes('4_6_Livingstone') || obj.includes('4_6_livingstone')) return '/Icone/sfondi/4_6_Livingstone.jpg' as unknown as T;
    if (obj.includes('4_7_Ugolino') || obj.includes('4_7_ugolino')) return '/Icone/sfondi/4_7_Ugolino.jpg' as unknown as T;
    if (obj.includes('spiegazione_box1_ambientazione') || (obj.includes('spiegazione_box1') && (obj.endsWith('.jpg') || obj.endsWith('.png')))) return '/Mappa/spiegazione_box1_ambientazione.jpg' as unknown as T;
    if (obj.toLowerCase().includes('spiegazione_box1') && (obj.endsWith('.m4a') || obj.endsWith('.mp3') || obj.endsWith('.wav'))) return '/Audio/Spiegazioni/Spiegazione_box1.mp3' as unknown as T;
    if (obj.toLowerCase().includes('spiegazione_box2') && (obj.endsWith('.m4a') || obj.endsWith('.mp3') || obj.endsWith('.wav'))) return '/Audio/Spiegazioni/Spiegazione_box2.mp3' as unknown as T;
    if (obj.toLowerCase().includes('spiegazione_box3') && (obj.endsWith('.m4a') || obj.endsWith('.mp3') || obj.endsWith('.wav'))) return '/Audio/Spiegazioni/Spiegazione_box3.mp3' as unknown as T;
    if (obj.toLowerCase().includes('spiegazione_box4') && (obj.endsWith('.m4a') || obj.endsWith('.mp3') || obj.endsWith('.wav'))) return '/Audio/Spiegazioni/Spiegazione_box4.mp3' as unknown as T;
    if (obj.includes('spiegazione_fasi_audio')) return '/Audio/Spiegazioni/spiegazione_fasi_audio.mp3' as unknown as T;
    if (obj.includes('exterior_00.webp')) return '/Icone/exterior_00.webp' as unknown as T;
    if (obj.includes('g01m05s01basso')) return '/Audio/strumenti/g01m05s01basso_nordsudovestest.mp3' as unknown as T;
    if (obj.includes('g01m05s02chitarra')) return '/Audio/strumenti/g01m05s02chitarra_nordsudovestest.mp3' as unknown as T;
    if (obj.includes('g01m05s03piano')) return '/Audio/strumenti/g01m05s03piano_nordsudovestest.mp3' as unknown as T;
    if (obj.includes('g01m05s04base')) return '/Audio/strumenti/g01m05s04base_nordsudovestest.mp3' as unknown as T;
    if (obj.includes('g01m05s05trombe')) return '/Audio/strumenti/g01m05s05trombe_nordsudovestest.mp3' as unknown as T;
    if (obj.includes('g01m05soluzione')) return '/Audio/soluzioni a conferma/g01m05soluzione.mp3' as unknown as T;
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

  // Reindirizzamento garantito per lo sfondo unico di Nadia (con cache-buster)
  if (trimmed.includes('1001Nadia')) {
    trimmed = '/Icone/sfondi/1001Nadia.jpg?v=1920_v2';
  }

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

