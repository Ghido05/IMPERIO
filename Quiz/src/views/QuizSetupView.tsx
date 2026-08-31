import React, { useState, useEffect } from 'react';
import { idbNameCache } from '../lib/assetUrl';
import { saveSetupStateDb, loadSetupStateDb } from '../lib/quizDb';
import { createDefaultFraseTempoItem, isPhraseLetterToken, normalizeFraseTempoItem, parsePhraseTokens, type FraseTempoItem } from '../lib/fraseTempoUtils';

// Data types for Box 1 (Gioco 1)
export interface Gioco1CanzoneData {
  audioFiles: string[]; // 5 mp3 file paths / base64
  indizi: string[];     // 4 text clues
  soluzioneAudio: string; // mp3 solution
  titolo: string;       // title
  anno: string;         // release year
}

export interface Gioco1ImmagineData {
  immagineJpg: string;   // jpg image url / base64
  indizi: string[];      // 4 text clues
  confermaAudio: string; // confirmation audio mp3
  soluzione: string;     // solution text
}

export interface Gioco1Question {
  tipo: 'canzone' | 'immagine';
  canzone: Gioco1CanzoneData;
  immagine: Gioco1ImmagineData;
  sfondo?: string;
}

// Data types for Box 2 (Gioco 2)
export interface Gioco2CanzoneData {
  domanda: string;      // domanda mostrata nella forma viola sopra la lista
  audioFiles: string[]; // 7 mp3 files for instruments
  risposte: string[];   // 7 answers list
  indizi: string[];     // clues / text list
  soluzioneAudio: string; // solution mp3
  titolo: string;       // title
  artista: string;      // artist
  info: string;         // info details
}

export interface Gioco2ImmagineData {
  domanda: string;      // domanda mostrata nella forma viola sopra la lista
  lista10: string[];     // 10 answers/clues list
  immagineJpg: string;   // jpg image
  soluzioneAudio: string; // solution mp3
  soluzioneTesto: string; // solution text
}

export interface Gioco2Question {
  tipo: 'canzone' | 'immagine';
  canzone: Gioco2CanzoneData;
  immagine: Gioco2ImmagineData;
  sfondo?: string;
}

export interface BoxGenericSetup {
  titolo: string;
  note: string;
}

export interface PunteggiSetup {
  sfondo?: string;
  nomiSquadre: string[];
  iconeBonus?: string[];
}

/** Una parola di squadra + 2 indizi (come Password: round ↔ parola) */
export interface Gioco3TeamWord {
  parola: string;
  indizi: [string, string];
}

/** Una domanda/manche del Gioco 3 (Password) */
export interface Gioco3Question {
  sfondo: string;
  musicaIntro?: string;
  squadra1: [Gioco3TeamWord, Gioco3TeamWord, Gioco3TeamWord];
  squadra2: [Gioco3TeamWord, Gioco3TeamWord, Gioco3TeamWord];
  squadra3: [Gioco3TeamWord, Gioco3TeamWord, Gioco3TeamWord];
  parolaBomba: string;
  /** Come password `altre[1..]` — 2 parole nulle */
  paroleNulle: [string, string];
  bussolotti?: {
    immagine_premio: string;
    immagine_premio_squadra1?: string;
    immagine_premio_squadra2?: string;
    immagine_premio_squadra3?: string;
    schede_2_posto: ('bonus' | 'vuoto' | '2000')[];
    schede_3_posto: ('bonus' | 'vuoto' | '2000' | '1000')[];
  };
}

export interface Gioco4Setup {
  titolo?: string;
  note?: string;
  frasi: FraseTempoItem[];
  sfondoGenerale?: string;
}

export interface QuizSetupState {
  gioco1: {
    selectedQuestion: number;
    questions: Record<number, Gioco1Question>;
    sfondoGenerale?: string;
  };
  gioco2: {
    selectedQuestion: number;
    questions: Record<number, Gioco2Question>;
    sfondoGenerale?: string;
  };
  gioco3: {
    selectedQuestion: number;
    questions: Record<number, Gioco3Question>;
    sfondoGenerale?: string;
  };
  gioco4: Gioco4Setup;
  gioco5: BoxGenericSetup;
  punteggi?: PunteggiSetup;
}

const STORAGE_KEY = 'imperio_quiz_setup_config_v1';

export function createDefaultGioco1Question(): Gioco1Question {
  return {
    tipo: 'canzone',
    canzone: {
      audioFiles: ['', '', '', '', ''],
      indizi: ['', '', '', ''],
      soluzioneAudio: '',
      titolo: '',
      anno: '',
    },
    immagine: {
      immagineJpg: '',
      indizi: ['', '', '', ''],
      confermaAudio: '',
      soluzione: '',
    },
    sfondo: '',
  };
}

export function createDefaultGioco2Question(): Gioco2Question {
  return {
    tipo: 'canzone',
    canzone: {
      domanda: '',
      audioFiles: ['', '', '', '', '', '', ''],
      risposte: ['', '', '', '', '', '', ''],
      indizi: ['', '', '', '', '', '', ''],
      soluzioneAudio: '',
      titolo: '',
      artista: '',
      info: '',
    },
    immagine: {
      domanda: '',
      lista10: ['', '', '', '', '', '', '', '', '', ''],
      immagineJpg: '',
      soluzioneAudio: '',
      soluzioneTesto: '',
    },
    sfondo: '',
  };
}

function createDefaultGioco3TeamWord(): Gioco3TeamWord {
  return { parola: '', indizi: ['', ''] };
}

export function createDefaultGioco3Question(): Gioco3Question {
  return {
    sfondo: '',
    musicaIntro: '',
    squadra1: [createDefaultGioco3TeamWord(), createDefaultGioco3TeamWord(), createDefaultGioco3TeamWord()],
    squadra2: [createDefaultGioco3TeamWord(), createDefaultGioco3TeamWord(), createDefaultGioco3TeamWord()],
    squadra3: [createDefaultGioco3TeamWord(), createDefaultGioco3TeamWord(), createDefaultGioco3TeamWord()],
    parolaBomba: '',
    paroleNulle: ['', ''],
    bussolotti: {
      immagine_premio: '/Icone/premio_bonus.png',
      schede_2_posto: ['bonus', 'vuoto', 'vuoto'],
      schede_3_posto: ['vuoto', 'vuoto', 'vuoto', 'vuoto', 'bonus'],
    }
  };
}

function normalizeGioco3(
  raw: unknown,
  def: QuizSetupState['gioco3']
): QuizSetupState['gioco3'] {
  if (!raw || typeof raw !== 'object') return def;
  const data = raw as any;
  return {
    selectedQuestion: data.selectedQuestion || 1,
    questions: data.questions ? { ...def.questions, ...data.questions } : def.questions,
    sfondoGenerale: data.sfondoGenerale || '',
  };
}

const DEFAULT_FRASI_TEMPO = [
  "IL MATTINO HA L'ORO IN BOCCA",
  "CHI CERCA TROVA",
  "A BUON INTENDITORE POCHE PAROLE",
  "IL GATTO MIAGOLA, IL CANE NO"
];

function normalizeGioco4(raw: any, def: Gioco4Setup): Gioco4Setup {
  if (!raw) return def;
  const frasi = Array.isArray(raw.frasi) && raw.frasi.length > 0
    ? raw.frasi.map(normalizeFraseTempoItem)
    : def.frasi;
  return {
    titolo: raw.titolo || def.titolo,
    note: raw.note || def.note,
    frasi,
    sfondoGenerale: raw.sfondoGenerale || '',
  };
}

function normalizePunteggi(raw: any, def: PunteggiSetup): PunteggiSetup {
  if (!raw) return def;
  let rawIcons = Array.isArray(raw.iconeBonus) ? raw.iconeBonus : [];
  
  const iconeBonus = [
    rawIcons[0] || '',
    rawIcons[1] || '',
    rawIcons[2] || '',
    rawIcons[3] || '',
  ];

  return {
    sfondo: raw.sfondo || '',
    nomiSquadre: Array.isArray(raw.nomiSquadre) && raw.nomiSquadre.length === 3
      ? raw.nomiSquadre
      : def.nomiSquadre,
    iconeBonus,
  };
}

export function getDefaultSetupState(): QuizSetupState {
  const q1: Record<number, Gioco1Question> = {};
  for (let i = 1; i <= 10; i++) {
    q1[i] = createDefaultGioco1Question();
  }

  const q2: Record<number, Gioco2Question> = {};
  for (let i = 1; i <= 6; i++) {
    q2[i] = createDefaultGioco2Question();
  }

  const q3: Record<number, Gioco3Question> = {};
  for (let i = 1; i <= 3; i++) {
    q3[i] = createDefaultGioco3Question();
  }

  return {
    gioco1: {
      selectedQuestion: 1,
      questions: q1,
      sfondoGenerale: '',
    },
    gioco2: {
      selectedQuestion: 1,
      questions: q2,
      sfondoGenerale: '',
    },
    gioco3: {
      selectedQuestion: 1,
      questions: q3,
      sfondoGenerale: '',
    },
    gioco4: {
      titolo: 'Frase Tempo',
      note: 'Inserisci le frasi da indovinare per il gioco Frase Tempo',
      frasi: DEFAULT_FRASI_TEMPO.map((testo) => createDefaultFraseTempoItem(testo)),
      sfondoGenerale: '',
    },
    gioco5: { titolo: 'Gioco 5', note: 'Modulo Gioco 5 (in arrivo)' },
    punteggi: {
      sfondo: '',
      nomiSquadre: ['SQUADRA 1', 'SQUADRA 2', 'SQUADRA 3'],
      iconeBonus: ['', '', '', ''],
    },
  };
}

interface QuizSetupViewProps {
  onStartQuiz?: () => void;
}

export default function QuizSetupView({ onStartQuiz }: QuizSetupViewProps) {
  const [state, setState] = useState<QuizSetupState>(getDefaultSetupState());
  const [missingFiles, setMissingFiles] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function checkMissingFiles() {
      const missing = new Set<string>();
      const idbKeys: string[] = [];
      
      const scanForIdb = (obj: any) => {
        if (typeof obj === 'string' && obj.startsWith('idb://')) {
          idbKeys.push(obj);
        } else if (obj && typeof obj === 'object') {
          for (const key in obj) {
            scanForIdb(obj[key]);
          }
        }
      };
      
      scanForIdb(state);
      
      if (idbKeys.length > 0) {
        try {
          const { getLargeFile } = await import('../lib/idbStore');
          for (const key of idbKeys) {
            const cleanKey = key.replace('idb://', '').split('?')[0];
            const fileData = await getLargeFile(cleanKey);
            if (!fileData) {
              missing.add(key);
            }
          }
        } catch (e) {
          console.error("Errore durante la scansione di IndexedDB:", e);
        }
      }
      
      setMissingFiles(missing);
    }
    
    checkMissingFiles();
  }, [state]);

  const formatBase64Info = (val: string | undefined): { label: string; size: string; name: string } | null => {
    if (!val || typeof val !== 'string' || val.trim() === '') return null;
    
    const trimmed = val.trim();
    
    if (trimmed.startsWith('idb://')) {
      const isMissing = missingFiles.has(trimmed);
      let name = 'File locale';
      try {
        const match = trimmed.match(/[?&]name=([^&]+)/);
        if (match) {
          name = decodeURIComponent(match[1]);
        } else {
          name = idbNameCache.get(trimmed) || idbNameCache.get(trimmed.split('?')[0]) || 'File locale';
        }
      } catch (e) {
        name = idbNameCache.get(trimmed) || idbNameCache.get(trimmed.split('?')[0]) || 'File locale';
      }
      
      let label = '📁 File';
      const lowerName = name.toLowerCase();
      if (lowerName.endsWith('.mp3') || lowerName.endsWith('.wav') || lowerName.endsWith('.ogg')) {
        label = '🎵 Audio';
      } else if (lowerName.endsWith('.png') || lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg') || lowerName.endsWith('.gif') || lowerName.endsWith('.svg')) {
        label = '🖼️ Immagine';
      }
      
      if (isMissing) {
        return { label: '⚠️ ASSENTE', size: 'NON TROVATO LOCALE (ricarica)', name };
      }
      
      return { label, size: 'Pronto', name };
    }
    
    if (trimmed.startsWith('data:')) {
      const match = trimmed.match(/^data:([^;]+);base64,/);
      const mimeType = match ? match[1] : '';
      let label = '📁 File';
      if (mimeType.startsWith('image/')) {
        label = '🖼️ Immagine';
      } else if (mimeType.startsWith('audio/')) {
        label = '🎵 Audio';
      }
      const sizeInKb = Math.round((trimmed.length * 3) / 4 / 1024);
      const sizeStr = sizeInKb >= 1024 
        ? `${(sizeInKb / 1024).toFixed(1)} MB` 
        : `${sizeInKb} KB`;
      
      const first100 = trimmed.substring(0, 100);
      const name = localStorage.getItem('filename_' + first100) || 'File locale';
      return { label, size: sizeStr, name };
    }
    
    // Se è un percorso relativo (es. /Audio/... o /Icone/...)
    let label = '📁 File';
    const lowerVal = trimmed.toLowerCase();
    if (lowerVal.includes('audio') || lowerVal.endsWith('.mp3') || lowerVal.endsWith('.wav')) {
      label = '🎵 Audio';
    } else if (lowerVal.includes('icone') || lowerVal.includes('sfondo') || lowerVal.endsWith('.png') || lowerVal.endsWith('.jpg') || lowerVal.endsWith('.jpeg') || lowerVal.endsWith('.svg')) {
      label = '🖼️ Immagine';
    }
    
    const parts = trimmed.split('/');
    const name = parts[parts.length - 1] || trimmed;
    
    return { label, size: 'Sistema', name };
  };

  useEffect(() => {
    async function loadData() {
      const def = getDefaultSetupState();
      let loadedState: any = null;

      const isElectron = (window as any).electron !== undefined;
      if (isElectron) {
        try {
          const fromSharedFile = await (window as any).electron.readSetupFile();
          if (fromSharedFile) {
            loadedState = fromSharedFile;
            console.log("[Setup] Caricato con successo dal file JSON condiviso.");
          }
        } catch (err) {
          console.warn("[Setup] Impossibile leggere il file setup condiviso:", err);
        }
      }

      if (!loadedState) {
        const fromDb = await loadSetupStateDb();
        if (fromDb) {
          loadedState = fromDb;
          console.log("[Setup] Caricato da IndexedDB locale.");
        }
      }

      if (!loadedState) {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          try {
            loadedState = JSON.parse(saved);
            console.log("[Setup] Caricato da LocalStorage locale.");
          } catch (e) {
            console.error('[Setup] Error parsing LocalStorage setup state:', e);
          }
        }
      }

      if (loadedState) {
        setState({
          gioco1: {
            selectedQuestion: loadedState.gioco1?.selectedQuestion || 1,
            questions: { ...def.gioco1.questions, ...loadedState.gioco1?.questions },
            sfondoGenerale: loadedState.gioco1?.sfondoGenerale || '',
          },
          gioco2: {
            selectedQuestion: loadedState.gioco2?.selectedQuestion || 1,
            questions: { ...def.gioco2.questions, ...loadedState.gioco2?.questions },
            sfondoGenerale: loadedState.gioco2?.sfondoGenerale || '',
          },
          gioco3: normalizeGioco3(loadedState.gioco3, def.gioco3),
          gioco4: normalizeGioco4(loadedState.gioco4, def.gioco4),
          gioco5: loadedState.gioco5 || def.gioco5,
          punteggi: normalizePunteggi(loadedState.punteggi, def.punteggi!),
        });
      }
    }
    loadData();
  }, []);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleGioco4FraseChange = (idx: number, val: string) => {
    setState(prev => {
      const newFrasi = [...(prev.gioco4?.frasi || [])];
      const current = normalizeFraseTempoItem(newFrasi[idx] || '');
      // Cambiando la frase, le posizioni selezionate non sono più affidabili.
      newFrasi[idx] = { ...current, testo: val, lettereVisibili: [] };
      return {
        ...prev,
        gioco4: {
          ...prev.gioco4,
          frasi: newFrasi,
        },
      };
    });
  };

  const handleAddGioco4Frase = () => {
    setState(prev => ({
      ...prev,
      gioco4: {
        ...prev.gioco4,
        frasi: [...(prev.gioco4?.frasi || []), createDefaultFraseTempoItem()],
      },
    }));
  };

  const handleGioco4BackgroundChange = (idx: number, sfondo: string) => {
    setState(prev => {
      const frasi = [...(prev.gioco4?.frasi || [])];
      frasi[idx] = { ...normalizeFraseTempoItem(frasi[idx] || ''), sfondo };
      return { ...prev, gioco4: { ...prev.gioco4, frasi } };
    });
  };

  const handleGioco4IndizioChange = (idx: number, indizio: string) => {
    setState(prev => {
      const frasi = [...(prev.gioco4?.frasi || [])];
      frasi[idx] = { ...normalizeFraseTempoItem(frasi[idx] || ''), indizio };
      return { ...prev, gioco4: { ...prev.gioco4, frasi } };
    });
  };

  const handleGioco4BonusChange = (idx: number, bonus: string) => {
    setState(prev => {
      const frasi = [...(prev.gioco4?.frasi || [])];
      frasi[idx] = { ...normalizeFraseTempoItem(frasi[idx] || ''), bonus };
      return { ...prev, gioco4: { ...prev.gioco4, frasi } };
    });
  };

  const handleGioco4PuntiChange = (idx: number, punti: number) => {
    setState(prev => {
      const frasi = [...(prev.gioco4?.frasi || [])];
      frasi[idx] = { ...normalizeFraseTempoItem(frasi[idx] || ''), punti };
      return { ...prev, gioco4: { ...prev.gioco4, frasi } };
    });
  };

  const toggleGioco4VisibleLetter = (idx: number, tokenIndex: number) => {
    setState(prev => {
      const frasi = [...(prev.gioco4?.frasi || [])];
      const item = normalizeFraseTempoItem(frasi[idx] || '');
      const visible = new Set(item.lettereVisibili || []);
      if (visible.has(tokenIndex)) visible.delete(tokenIndex); else visible.add(tokenIndex);
      frasi[idx] = { ...item, lettereVisibili: [...visible].sort((a, b) => a - b) };
      return { ...prev, gioco4: { ...prev.gioco4, frasi } };
    });
  };

  const handleRemoveGioco4Frase = (idx: number) => {
    setState(prev => ({
      ...prev,
      gioco4: {
        ...prev.gioco4,
        frasi: (prev.gioco4?.frasi || []).filter((_, i) => i !== idx),
      },
    }));
  };

  const handleResetSession = () => {
    if (confirm("Sei sicuro di voler azzerare tutti gli stati interattivi dei giochi (step svelati, timer, parole indovinate) e tutti i punteggi delle squadre? I contenuti del setup (canzoni, immagini, definizioni) non verranno persi.")) {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          if (
            key.startsWith('playstate_') || 
            key.startsWith('password_') || 
            key === 'imperio_quiz_scores'
          ) {
            keysToRemove.push(key);
          }
        }
      }
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        window.dispatchEvent(new StorageEvent('storage', { key, newValue: null }));
        if ((window as any).electron?.broadcastState) {
          (window as any).electron.broadcastState({
            localStorageUpdate: { key, value: null }
          });
        }
      });
      showToast('🔄 Stati dei giochi e punteggi azzerati!');
    }
  };

  const handleSave = async () => {
    try {
      await saveSetupStateDb(state);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (e) {
        console.warn('LocalStorage limit reached, saved safely to IndexedDB:', e);
      }
      
      const isElectron = (window as any).electron !== undefined;
      if (isElectron) {
        try {
          await (window as any).electron.writeSetupFile(state);
          console.log("[Setup] Salvato con successo nel file JSON condiviso.");
        } catch (err) {
          console.error("[Setup] Errore nel salvataggio su file condiviso:", err);
        }
      }

      if ((window as any).electron?.broadcastState) {
        (window as any).electron.broadcastState({
          setupStateUpdate: state,
        });
      }
      showToast('✅ Configurazioni salvate e sincronizzate nel file di progetto!');
    } catch (e) {
      console.error('Failed to save setup:', e);
      showToast('❌ Errore durante il salvataggio dei dati');
    }
  };

  // Helper for reading uploaded files and storing them to IndexedDB
  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    onLoad: (resultKey: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      if (event.target?.result) {
        const base64 = event.target.result as string;
        const id = 'file_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
        
        try {
          const { setLargeFile } = await import('../lib/idbStore');
          await setLargeFile(id, base64);
          
          const { dataURItoBlob } = await import('../lib/idbStore');
          const blob = dataURItoBlob(base64);
          const blobUrl = URL.createObjectURL(blob);
          const { idbBlobUrlCache, idbNameCache } = await import('../lib/assetUrl');
          
          const resultKey = `idb://${id}?name=${encodeURIComponent(file.name)}`;
          
          // Memorizza sia la chiave completa sia quella pulita per compatibilità
          idbBlobUrlCache.set(resultKey, blobUrl);
          idbNameCache.set(resultKey, file.name);
          idbBlobUrlCache.set(`idb://${id}`, blobUrl);
          idbNameCache.set(`idb://${id}`, file.name);
          
          const first100 = base64.substring(0, 100);
          localStorage.setItem('filename_' + first100, file.name);
          
          const isElectron = (window as any).electron !== undefined;
          if (isElectron) {
            (window as any).electron.broadcastState({
              newIndexedDBFile: { id, fileName: file.name, base64 }
            });
          }
          
          onLoad(resultKey);
        } catch (err) {
          console.error("Errore nel salvataggio del file su IndexedDB:", err);
          showToast("❌ Errore durante il caricamento del file");
        }
      }
    };
    reader.readAsDataURL(file);
  };

  // Box 1 Question & Data getters/setters
  const currentQ1Num = state.gioco1.selectedQuestion;
  const currentQ1 = state.gioco1.questions[currentQ1Num] || createDefaultGioco1Question();

  const updateQ1 = (updater: (prev: Gioco1Question) => Gioco1Question) => {
    setState((prev) => ({
      ...prev,
      gioco1: {
        ...prev.gioco1,
        questions: {
          ...prev.gioco1.questions,
          [currentQ1Num]: updater(prev.gioco1.questions[currentQ1Num] || createDefaultGioco1Question()),
        },
      },
    }));
  };

  // Box 2 Question & Data getters/setters
  const currentQ2Num = state.gioco2.selectedQuestion;
  const currentQ2 = state.gioco2.questions[currentQ2Num] || createDefaultGioco2Question();

  const updateQ2 = (updater: (prev: Gioco2Question) => Gioco2Question) => {
    setState((prev) => ({
      ...prev,
      gioco2: {
        ...prev.gioco2,
        questions: {
          ...prev.gioco2.questions,
          [currentQ2Num]: updater(prev.gioco2.questions[currentQ2Num] || createDefaultGioco2Question()),
        },
      },
    }));
  };

  const currentQ3Num = state.gioco3?.selectedQuestion || 1;
  const rawQ3 = state.gioco3?.questions?.[currentQ3Num] || createDefaultGioco3Question();
  const currentQ3: Gioco3Question = {
    ...createDefaultGioco3Question(),
    ...rawQ3,
    bussolotti: {
      ...createDefaultGioco3Question().bussolotti!,
      ...(rawQ3.bussolotti || {})
    }
  };

  const updateQ3 = (updater: (prev: Gioco3Question) => Gioco3Question) => {
    setState((prev) => {
      const gioco3 = normalizeGioco3(prev.gioco3, getDefaultSetupState().gioco3);
      return {
        ...prev,
        gioco3: {
          ...gioco3,
          questions: {
            ...gioco3.questions,
            [currentQ3Num]: updater(gioco3.questions[currentQ3Num] || createDefaultGioco3Question()),
          },
        },
      };
    });
  };

  const updateSquadraWord = (
    squadraKey: 'squadra1' | 'squadra2' | 'squadra3',
    wordIdx: number,
    patch: Partial<Gioco3TeamWord>
  ) => {
    updateQ3((prev) => {
      const words = [...prev[squadraKey]] as Gioco3Question[typeof squadraKey];
      words[wordIdx] = { ...words[wordIdx], ...patch, indizi: patch.indizi ?? words[wordIdx].indizi };
      return { ...prev, [squadraKey]: words };
    });
  };

  const updateSquadraIndizio = (
    squadraKey: 'squadra1' | 'squadra2' | 'squadra3',
    wordIdx: number,
    indizioIdx: 0 | 1,
    value: string
  ) => {
    updateQ3((prev) => {
      const words = [...prev[squadraKey]] as Gioco3Question[typeof squadraKey];
      const indizi = [...words[wordIdx].indizi] as [string, string];
      indizi[indizioIdx] = value;
      words[wordIdx] = { ...words[wordIdx], indizi };
      return { ...prev, [squadraKey]: words };
    });
  };

  const teamMeta: { key: 'squadra1' | 'squadra2' | 'squadra3'; label: string; accent: string }[] = [
    { key: 'squadra1', label: 'Squadra 1', accent: 'border-sky-500/40 text-sky-400' },
    { key: 'squadra2', label: 'Squadra 2', accent: 'border-rose-500/40 text-rose-400' },
    { key: 'squadra3', label: 'Squadra 3', accent: 'border-amber-500/40 text-amber-400' },
  ];

  return (
    <div className="h-screen w-full bg-[#121214] text-slate-100 font-sans flex flex-col overflow-y-auto selection:bg-[#d24726] selection:text-white">
      {/* Top Navigation Header */}
      <header className="h-16 border-b border-white/10 bg-[#18181b]/80 backdrop-blur px-6 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#d24726] to-[#f97316] flex items-center justify-center font-bold text-white shadow-md shadow-[#d24726]/30">
            P0
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
              IMPERIO — Pagina 0: Setup Quiz
            </h1>
            <p className="text-xs text-white/50">Carica e gestisci i contenuti dei giochi prima di avviare il quiz</p>
          </div>
        </div>

        <div className="relative flex items-center gap-3">
          {onStartQuiz && (
            <button
              type="button"
              onClick={onStartQuiz}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-white/10 hover:bg-white/15 text-white border border-white/15 transition-all"
            >
              ▶ Vai al Quiz / Relatore
            </button>
          )}



          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 text-xs font-bold rounded-lg bg-gradient-to-r from-[#d24726] to-[#e85a38] hover:from-[#e85a38] hover:to-[#f97316] text-white shadow-lg shadow-[#d24726]/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            Salva Impostazioni
          </button>

          {toastMessage && (
            <div className="absolute top-[calc(100%+8px)] right-0 z-50 bg-[#d24726]/90 backdrop-blur-md text-white px-4 py-2 rounded-lg shadow-lg text-xs font-medium flex items-center gap-2 border border-white/10 whitespace-nowrap animate-pulse">
              {toastMessage}
            </div>
          )}
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-8">
        
        {/* Header Title Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/5 p-6 rounded-2xl border border-white/10 backdrop-blur">
          <div>
            <h2 className="text-xl font-bold text-white">Configurazione Moduli Gioco</h2>
            <p className="text-xs text-slate-400 mt-1">
              Imposta le 5 sezioni di gioco. Seleziona le domande ed imposta audio, immagini, indizi e soluzioni.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/40 uppercase tracking-wider font-semibold">Stato:</span>
            <span className="px-3 py-1 text-xs rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-medium">
              Pronto per la modifica
            </span>
          </div>
        </div>

        {/* 5 Boxes Container Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* ==================== BOX 1: GIOCO 1 ==================== */}
          <div className="bg-[#1c1c21] rounded-2xl border border-white/10 p-6 flex flex-col shadow-xl space-y-5">
            {/* Box 1 Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-[#d24726]/20 border border-[#d24726]/40 text-[#d24726] font-extrabold flex items-center justify-center text-sm">
                  1
                </span>
                <div>
                  <h3 className="text-lg font-bold text-white">GIOCO 1 - Il mio nome è nessuno</h3>
                  <p className="text-[11px] text-slate-400">Modulo 10 domande</p>
                </div>
              </div>
              <span className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider rounded bg-[#d24726]/10 text-[#d24726] border border-[#d24726]/20">
                10 Domande
              </span>
            </div>

            {/* Controls Bar: Question & Type Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white/5 p-4 rounded-xl border border-white/5">
              {/* Question Selector (1 to 10) */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Seleziona Domanda (1 - 10):
                </label>
                <select
                  value={currentQ1Num}
                  onChange={(e) =>
                    setState((prev) => ({
                      ...prev,
                      gioco1: {
                        ...prev.gioco1,
                        selectedQuestion: Number(e.target.value),
                      },
                    }))
                  }
                  className="w-full bg-[#141417] border border-white/15 rounded-lg px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-[#d24726]"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <option key={n} value={n}>
                      Domanda #{n}
                    </option>
                  ))}
                </select>
              </div>

              {/* Type Selector ("canzone" | "immagine") */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Tipo di Domanda:
                </label>
                <select
                  value={currentQ1.tipo}
                  onChange={(e) =>
                    updateQ1((prev) => ({
                      ...prev,
                      tipo: e.target.value as 'canzone' | 'immagine',
                    }))
                  }
                  className="w-full bg-[#141417] border border-white/15 rounded-lg px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-[#d24726]"
                >
                  <option value="canzone">🎵 Canzone</option>
                  <option value="immagine">🖼️ Immagine</option>
                </select>
              </div>
            </div>

            {/* Sezione Sfondi Box 1 */}
            <div className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-3">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <span>🖼️ Gestione Sfondo</span>
                <span className="text-[10px] text-slate-500 font-normal normal-case">(Generale o specifico per Domanda #{currentQ1Num})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Sfondo Generale */}
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                    Sfondo Generale Box 1:
                  </label>
                  <div className="flex items-center gap-2 bg-[#141417] p-1.5 rounded-lg border border-white/5">
                    {state.gioco1.sfondoGenerale?.startsWith('data:') || state.gioco1.sfondoGenerale?.startsWith('idb://') ? (
                      <div className="flex-1 flex items-center justify-between bg-black/40 border border-white/10 rounded px-2 py-1 text-[11px] text-white">
                        <span className="text-emerald-400 font-medium truncate max-w-[100px]">
                          {formatBase64Info(state.gioco1.sfondoGenerale)?.name || 'Caricato'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setState((prev) => ({ ...prev, gioco1: { ...prev.gioco1, sfondoGenerale: '' } }))}
                          className="text-red-400 hover:text-red-300 font-semibold cursor-pointer text-[10px] bg-transparent border-0"
                        >
                          Rimuovi
                        </button>
                      </div>
                    ) : (
                      <input
                        type="text"
                        placeholder="URL sfondo generale..."
                        value={state.gioco1.sfondoGenerale || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setState((prev) => ({
                            ...prev,
                            gioco1: { ...prev.gioco1, sfondoGenerale: val }
                          }));
                        }}
                        className="flex-1 bg-black/40 border border-white/10 rounded px-2 py-1 text-[11px] text-white placeholder:text-white/30 focus:outline-none focus:border-[#d24726]"
                      />
                    )}
                    <label className="px-2 py-1 text-[10px] font-semibold bg-white/10 hover:bg-white/15 text-white rounded cursor-pointer shrink-0 text-center">
                      🖼️ Sfoglia
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) =>
                          handleFileUpload(e, (base64) =>
                            setState((prev) => ({ ...prev, gioco1: { ...prev.gioco1, sfondoGenerale: base64 } }))
                          )
                        }
                      />
                    </label>
                  </div>
                </div>

                {/* Sfondo Specifico Domanda */}
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                    Sfondo Specifico Domanda #{currentQ1Num}:
                  </label>
                  <div className="flex items-center gap-2 bg-[#141417] p-1.5 rounded-lg border border-white/5">
                    {currentQ1.sfondo?.startsWith('data:') || currentQ1.sfondo?.startsWith('idb://') ? (
                      <div className="flex-1 flex items-center justify-between bg-black/40 border border-white/10 rounded px-2 py-1 text-[11px] text-white">
                        <span className="text-emerald-400 font-medium truncate max-w-[100px]">
                          {formatBase64Info(currentQ1.sfondo)?.name || 'Caricato'}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQ1((prev) => ({ ...prev, sfondo: '' }))}
                          className="text-red-400 hover:text-red-300 font-semibold cursor-pointer text-[10px] bg-transparent border-0"
                        >
                          Rimuovi
                        </button>
                      </div>
                    ) : (
                      <input
                        type="text"
                        placeholder="Vuoto (usa generale)..."
                        value={currentQ1.sfondo || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateQ1((prev) => ({ ...prev, sfondo: val }));
                        }}
                        className="flex-1 bg-black/40 border border-white/10 rounded px-2 py-1 text-[11px] text-white placeholder:text-white/30 focus:outline-none focus:border-[#d24726]"
                      />
                    )}
                    <label className="px-2 py-1 text-[10px] font-semibold bg-white/10 hover:bg-white/15 text-white rounded cursor-pointer shrink-0 text-center">
                      🖼️ Sfoglia
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) =>
                          handleFileUpload(e, (base64) =>
                            updateQ1((prev) => ({ ...prev, sfondo: base64 }))
                          )
                        }
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Dynamic Form based on Type */}
            {currentQ1.tipo === 'canzone' ? (
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-2 text-xs font-bold text-[#d24726] uppercase tracking-wider">
                  <span>🎵 Setup Modalità Canzone</span>
                </div>

                {/* 5 MP3 Audio Files */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-300">
                    5 File Audio MP3 (Indizi Audio / Strumenti):
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    {[0, 1, 2, 3, 4].map((idx) => (
                      <div key={idx} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-[#141417] p-2 rounded-lg border border-white/5">
                        <span className="text-[11px] font-bold text-slate-400 w-20 shrink-0">
                          Audio {idx + 1}:
                        </span>
                        {currentQ1.canzone.audioFiles[idx]?.startsWith('data:') || currentQ1.canzone.audioFiles[idx]?.startsWith('idb://') ? (
                          <div className="flex-1 flex items-center justify-between bg-black/40 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white">
                            <span className="text-emerald-400 font-medium truncate max-w-[200px] sm:max-w-xs">
                              {(() => {
                                const info = formatBase64Info(currentQ1.canzone.audioFiles[idx]);
                                return info ? `${info.label}: ${info.name} (${info.size})` : 'File caricato';
                              })()}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                updateQ1((prev) => {
                                  const newAudios = [...prev.canzone.audioFiles];
                                  newAudios[idx] = '';
                                  return {
                                    ...prev,
                                    canzone: { ...prev.canzone, audioFiles: newAudios },
                                  };
                                });
                              }}
                              className="text-red-400 hover:text-red-300 font-semibold cursor-pointer ml-2 text-[11px] bg-transparent border-0"
                            >
                              Rimuovi
                            </button>
                          </div>
                        ) : (
                          <input
                            type="text"
                            placeholder="Percorso URL / file o seleziona sfoglia →"
                            value={currentQ1.canzone.audioFiles[idx] || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              updateQ1((prev) => {
                                const newAudios = [...prev.canzone.audioFiles];
                                newAudios[idx] = val;
                                return {
                                  ...prev,
                                  canzone: { ...prev.canzone, audioFiles: newAudios },
                                };
                              });
                            }}
                            className="flex-1 bg-black/40 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[#d24726]"
                          />
                        )}
                        <label className="px-3 py-1.5 text-[11px] font-semibold bg-white/10 hover:bg-white/15 text-white rounded cursor-pointer shrink-0 text-center">
                          📁 Sfoglia
                          <input
                            type="file"
                            accept="audio/*"
                            className="hidden"
                            onChange={(e) =>
                              handleFileUpload(e, (base64) => {
                                updateQ1((prev) => {
                                  const newAudios = [...prev.canzone.audioFiles];
                                  newAudios[idx] = base64;
                                  return {
                                    ...prev,
                                    canzone: { ...prev.canzone, audioFiles: newAudios },
                                  };
                                });
                              })
                            }
                          />
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4 Text Clues */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-300">
                    4 Indizi di Testo:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[0, 1, 2, 3].map((idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-[#141417] p-2 rounded-lg border border-white/5">
                        <span className="text-[11px] font-bold text-slate-400 w-16 shrink-0">
                          Indizio {idx + 1}:
                        </span>
                        <input
                          type="text"
                          placeholder={`Testo indizio ${idx + 1}...`}
                          value={currentQ1.canzone.indizi[idx] || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateQ1((prev) => {
                              const newIndizi = [...prev.canzone.indizi];
                              newIndizi[idx] = val;
                              return {
                                ...prev,
                                canzone: { ...prev.canzone, indizi: newIndizi },
                              };
                            });
                          }}
                          className="flex-1 bg-black/40 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[#d24726]"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Song Solution MP3 */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Canzone come Soluzione MP3:
                  </label>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-[#141417] p-2.5 rounded-lg border border-white/5">
                    {currentQ1.canzone.soluzioneAudio?.startsWith('data:') || currentQ1.canzone.soluzioneAudio?.startsWith('idb://') ? (
                      <div className="flex-1 flex items-center justify-between bg-black/40 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white">
                        <span className="text-emerald-400 font-medium truncate max-w-[200px] sm:max-w-xs">
                          {(() => {
                            const info = formatBase64Info(currentQ1.canzone.soluzioneAudio);
                            return info ? `${info.label}: ${info.name} (${info.size})` : 'File caricato';
                          })()}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            updateQ1((prev) => ({
                              ...prev,
                              canzone: { ...prev.canzone, soluzioneAudio: '' },
                            }));
                          }}
                          className="text-red-400 hover:text-red-300 font-semibold cursor-pointer ml-2 text-[11px] bg-transparent border-0"
                        >
                          Rimuovi
                        </button>
                      </div>
                    ) : (
                      <input
                        type="text"
                        placeholder="Percorso URL / file MP3 soluzione..."
                        value={currentQ1.canzone.soluzioneAudio}
                        onChange={(e) =>
                          updateQ1((prev) => ({
                            ...prev,
                            canzone: { ...prev.canzone, soluzioneAudio: e.target.value },
                          }))
                        }
                        className="flex-1 bg-black/40 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[#d24726]"
                      />
                    )}
                    <label className="px-3 py-1.5 text-[11px] font-semibold bg-white/10 hover:bg-white/15 text-white rounded cursor-pointer shrink-0 text-center">
                      📁 Sfoglia MP3
                      <input
                        type="file"
                        accept="audio/*"
                        className="hidden"
                        onChange={(e) =>
                          handleFileUpload(e, (base64) =>
                            updateQ1((prev) => ({
                              ...prev,
                              canzone: { ...prev.canzone, soluzioneAudio: base64 },
                            }))
                          )
                        }
                      />
                    </label>
                  </div>
                </div>

                {/* Title & Release Year */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Titolo della Canzone:
                    </label>
                    <input
                      type="text"
                      placeholder="Es. Il cielo in una stanza"
                      value={currentQ1.canzone.titolo}
                      onChange={(e) =>
                        updateQ1((prev) => ({
                          ...prev,
                          canzone: { ...prev.canzone, titolo: e.target.value },
                        }))
                      }
                      className="w-full bg-[#141417] border border-white/10 rounded px-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[#d24726]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Anno di Uscita:
                    </label>
                    <input
                      type="text"
                      placeholder="Es. 1960"
                      value={currentQ1.canzone.anno}
                      onChange={(e) =>
                        updateQ1((prev) => ({
                          ...prev,
                          canzone: { ...prev.canzone, anno: e.target.value },
                        }))
                      }
                      className="w-full bg-[#141417] border border-white/10 rounded px-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[#d24726]"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                  <span>🖼️ Setup Modalità Immagine</span>
                </div>

                {/* JPG Image Upload */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Immagine JPG:
                  </label>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-[#141417] p-2.5 rounded-lg border border-white/5">
                    {currentQ1.immagine.immagineJpg?.startsWith('data:') || currentQ1.immagine.immagineJpg?.startsWith('idb://') ? (
                      <div className="flex-1 flex items-center justify-between bg-black/40 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white">
                        <span className="text-emerald-400 font-medium truncate max-w-[200px] sm:max-w-xs">
                          {(() => {
                            const info = formatBase64Info(currentQ1.immagine.immagineJpg);
                            return info ? `${info.label}: ${info.name} (${info.size})` : 'File caricato';
                          })()}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            updateQ1((prev) => ({
                              ...prev,
                              immagine: { ...prev.immagine, immagineJpg: '' },
                            }));
                          }}
                          className="text-red-400 hover:text-red-300 font-semibold cursor-pointer ml-2 text-[11px] bg-transparent border-0"
                        >
                          Rimuovi
                        </button>
                      </div>
                    ) : (
                      <input
                        type="text"
                        placeholder="Percorso URL / Immagine JPG..."
                        value={currentQ1.immagine.immagineJpg}
                        onChange={(e) =>
                          updateQ1((prev) => ({
                            ...prev,
                            immagine: { ...prev.immagine, immagineJpg: e.target.value },
                          }))
                        }
                        className="flex-1 bg-black/40 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[#d24726]"
                      />
                    )}
                    <label className="px-3 py-1.5 text-[11px] font-semibold bg-white/10 hover:bg-white/15 text-white rounded cursor-pointer shrink-0 text-center">
                      🖼️ Sfoglia JPG
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) =>
                          handleFileUpload(e, (base64) =>
                            updateQ1((prev) => ({
                              ...prev,
                              immagine: { ...prev.immagine, immagineJpg: base64 },
                            }))
                          )
                        }
                      />
                    </label>
                  </div>
                  {currentQ1.immagine.immagineJpg && (
                    <div className="mt-2 w-20 h-20 rounded border border-white/20 overflow-hidden bg-black flex items-center justify-center">
                      <img
                        src={currentQ1.immagine.immagineJpg}
                        alt="Anteprima JPG"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>

                {/* 4 Text Clues */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-300">
                    4 Indizi:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[0, 1, 2, 3].map((idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-[#141417] p-2 rounded-lg border border-white/5">
                        <span className="text-[11px] font-bold text-slate-400 w-16 shrink-0">
                          Indizio {idx + 1}:
                        </span>
                        <input
                          type="text"
                          placeholder={`Testo indizio ${idx + 1}...`}
                          value={currentQ1.immagine.indizi[idx] || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateQ1((prev) => {
                              const newIndizi = [...prev.immagine.indizi];
                              newIndizi[idx] = val;
                              return {
                                ...prev,
                                immagine: { ...prev.immagine, indizi: newIndizi },
                              };
                            });
                          }}
                          className="flex-1 bg-black/40 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[#d24726]"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Confirmation Audio MP3 */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Canzone MP3 come Conferma:
                  </label>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-[#141417] p-2.5 rounded-lg border border-white/5">
                    {currentQ1.immagine.confermaAudio?.startsWith('data:') || currentQ1.immagine.confermaAudio?.startsWith('idb://') ? (
                      <div className="flex-1 flex items-center justify-between bg-black/40 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white">
                        <span className="text-emerald-400 font-medium truncate max-w-[200px] sm:max-w-xs">
                          {(() => {
                            const info = formatBase64Info(currentQ1.immagine.confermaAudio);
                            return info ? `${info.label}: ${info.name} (${info.size})` : 'File caricato';
                          })()}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            updateQ1((prev) => ({
                              ...prev,
                              immagine: { ...prev.immagine, confermaAudio: '' },
                            }));
                          }}
                          className="text-red-400 hover:text-red-300 font-semibold cursor-pointer ml-2 text-[11px] bg-transparent border-0"
                        >
                          Rimuovi
                        </button>
                      </div>
                    ) : (
                      <input
                        type="text"
                        placeholder="Percorso URL / file MP3 di conferma..."
                        value={currentQ1.immagine.confermaAudio}
                        onChange={(e) =>
                          updateQ1((prev) => ({
                            ...prev,
                            immagine: { ...prev.immagine, confermaAudio: e.target.value },
                          }))
                        }
                        className="flex-1 bg-black/40 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[#d24726]"
                      />
                    )}
                    <label className="px-3 py-1.5 text-[11px] font-semibold bg-white/10 hover:bg-white/15 text-white rounded cursor-pointer shrink-0 text-center">
                      🎵 Sfoglia MP3
                      <input
                        type="file"
                        accept="audio/*"
                        className="hidden"
                        onChange={(e) =>
                          handleFileUpload(e, (base64) =>
                            updateQ1((prev) => ({
                              ...prev,
                              immagine: { ...prev.immagine, confermaAudio: base64 },
                            }))
                          )
                        }
                      />
                    </label>
                  </div>
                </div>

                {/* Solution Text */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Soluzione dell'Immagine:
                  </label>
                  <input
                    type="text"
                    placeholder="Es. Colosseo / Monna Lisa..."
                    value={currentQ1.immagine.soluzione}
                    onChange={(e) =>
                      updateQ1((prev) => ({
                        ...prev,
                        immagine: { ...prev.immagine, soluzione: e.target.value },
                      }))
                    }
                    className="w-full bg-[#141417] border border-white/10 rounded px-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[#d24726]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* ==================== BOX 2: GIOCO 2 ==================== */}
          <div className="bg-[#1c1c21] rounded-2xl border border-white/10 p-6 flex flex-col shadow-xl space-y-5">
            {/* Box 2 Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 font-extrabold flex items-center justify-center text-sm">
                  2
                </span>
                <div>
                  <h3 className="text-lg font-bold text-white">GIOCO 2 - nome gioco</h3>
                  <p className="text-[11px] text-slate-400">Modulo 6 domande</p>
                </div>
              </div>
              <span className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                6 Domande
              </span>
            </div>

            {/* Controls Bar: Question & Type Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white/5 p-4 rounded-xl border border-white/5">
              {/* Question Selector (1 to 6) */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Seleziona Domanda (1 - 6):
                </label>
                <select
                  value={currentQ2Num}
                  onChange={(e) =>
                    setState((prev) => ({
                      ...prev,
                      gioco2: {
                        ...prev.gioco2,
                        selectedQuestion: Number(e.target.value),
                      },
                    }))
                  }
                  className="w-full bg-[#141417] border border-white/15 rounded-lg px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500"
                >
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <option key={n} value={n}>
                      Domanda #{n}
                    </option>
                  ))}
                </select>
              </div>

              {/* Type Selector ("canzone" | "immagine") */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Tipo di Domanda:
                </label>
                <select
                  value={currentQ2.tipo}
                  onChange={(e) =>
                    updateQ2((prev) => ({
                      ...prev,
                      tipo: e.target.value as 'canzone' | 'immagine',
                    }))
                  }
                  className="w-full bg-[#141417] border border-white/15 rounded-lg px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="canzone">🎵 Canzone</option>
                  <option value="immagine">🖼️ Immagine</option>
                </select>
              </div>
            </div>

            {/* Sezione Sfondi Box 2 */}
            <div className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-3">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <span>🖼️ Gestione Sfondo</span>
                <span className="text-[10px] text-slate-500 font-normal normal-case">(Generale o specifico per Domanda #{currentQ2Num})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Sfondo Generale */}
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                    Sfondo Generale Box 2:
                  </label>
                  <div className="flex items-center gap-2 bg-[#141417] p-1.5 rounded-lg border border-white/5">
                    {state.gioco2.sfondoGenerale?.startsWith('data:') || state.gioco2.sfondoGenerale?.startsWith('idb://') ? (
                      <div className="flex-1 flex items-center justify-between bg-black/40 border border-white/10 rounded px-2 py-1 text-[11px] text-white">
                        <span className="text-emerald-400 font-medium truncate max-w-[100px]">
                          {formatBase64Info(state.gioco2.sfondoGenerale)?.name || 'Caricato'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setState((prev) => ({ ...prev, gioco2: { ...prev.gioco2, sfondoGenerale: '' } }))}
                          className="text-red-400 hover:text-red-300 font-semibold cursor-pointer text-[10px] bg-transparent border-0"
                        >
                          Rimuovi
                        </button>
                      </div>
                    ) : (
                      <input
                        type="text"
                        placeholder="URL sfondo generale..."
                        value={state.gioco2.sfondoGenerale || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setState((prev) => ({
                            ...prev,
                            gioco2: { ...prev.gioco2, sfondoGenerale: val }
                          }));
                        }}
                        className="flex-1 bg-black/40 border border-white/10 rounded px-2 py-1 text-[11px] text-white placeholder:text-white/30 focus:outline-none focus:border-indigo-500"
                      />
                    )}
                    <label className="px-2 py-1 text-[10px] font-semibold bg-white/10 hover:bg-white/15 text-white rounded cursor-pointer shrink-0 text-center">
                      🖼️ Sfoglia
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) =>
                          handleFileUpload(e, (base64) =>
                            setState((prev) => ({ ...prev, gioco2: { ...prev.gioco2, sfondoGenerale: base64 } }))
                          )
                        }
                      />
                    </label>
                  </div>
                </div>

                {/* Sfondo Specifico Domanda */}
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                    Sfondo Specifico Domanda #{currentQ2Num}:
                  </label>
                  <div className="flex items-center gap-2 bg-[#141417] p-1.5 rounded-lg border border-white/5">
                    {currentQ2.sfondo?.startsWith('data:') || currentQ2.sfondo?.startsWith('idb://') ? (
                      <div className="flex-1 flex items-center justify-between bg-black/40 border border-white/10 rounded px-2 py-1 text-[11px] text-white">
                        <span className="text-emerald-400 font-medium truncate max-w-[100px]">
                          {formatBase64Info(currentQ2.sfondo)?.name || 'Caricato'}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQ2((prev) => ({ ...prev, sfondo: '' }))}
                          className="text-red-400 hover:text-red-300 font-semibold cursor-pointer text-[10px] bg-transparent border-0"
                        >
                          Rimuovi
                        </button>
                      </div>
                    ) : (
                      <input
                        type="text"
                        placeholder="Vuoto (usa generale)..."
                        value={currentQ2.sfondo || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateQ2((prev) => ({ ...prev, sfondo: val }));
                        }}
                        className="flex-1 bg-black/40 border border-white/10 rounded px-2 py-1 text-[11px] text-white placeholder:text-white/30 focus:outline-none focus:border-indigo-500"
                      />
                    )}
                    <label className="px-2 py-1 text-[10px] font-semibold bg-white/10 hover:bg-white/15 text-white rounded cursor-pointer shrink-0 text-center">
                      🖼️ Sfoglia
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) =>
                          handleFileUpload(e, (base64) =>
                            updateQ2((prev) => ({ ...prev, sfondo: base64 }))
                          )
                        }
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Dynamic Form based on Type */}
            {currentQ2.tipo === 'canzone' ? (
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider">
                  <span>🎵 Setup Modalità Canzone (7 Strumenti / Risposte)</span>
                </div>

                {/* Domanda mostrata nella forma viola sopra la lista */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Domanda della lista:
                  </label>
                  <input
                    type="text"
                    placeholder="Es. Quale strumento senti?"
                    value={currentQ2.canzone.domanda || ''}
                    onChange={(e) =>
                      updateQ2((prev) => ({
                        ...prev,
                        canzone: { ...prev.canzone, domanda: e.target.value },
                      }))
                    }
                    className="w-full bg-[#141417] border border-white/10 rounded px-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* 7 Instrument Audio Files + 7 Answers + 7 Clues */}
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-slate-300">
                    7 File Audio Strumenti, Risposte e Indizi:
                  </label>
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {[0, 1, 2, 3, 4, 5, 6].map((idx) => (
                      <div key={idx} className="bg-[#141417] p-3 rounded-lg border border-white/5 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-indigo-300">
                            Elemento #{idx + 1}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="Risposta (es. Batteria / Chitarra)..."
                            value={currentQ2.canzone.risposte[idx] || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              updateQ2((prev) => {
                                const newR = [...prev.canzone.risposte];
                                newR[idx] = val;
                                return { ...prev, canzone: { ...prev.canzone, risposte: newR } };
                              });
                            }}
                            className="bg-black/40 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-indigo-500"
                          />
                          <input
                            type="text"
                            placeholder="Indizio / Frase..."
                            value={currentQ2.canzone.indizi[idx] || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              updateQ2((prev) => {
                                const newI = [...prev.canzone.indizi];
                                newI[idx] = val;
                                return { ...prev, canzone: { ...prev.canzone, indizi: newI } };
                              });
                            }}
                            className="bg-black/40 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          {currentQ2.canzone.audioFiles[idx]?.startsWith('data:') || currentQ2.canzone.audioFiles[idx]?.startsWith('idb://') ? (
                            <div className="flex-1 flex items-center justify-between bg-black/40 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white">
                              <span className="text-emerald-400 font-medium truncate max-w-[200px] sm:max-w-xs">
                                {(() => {
                                  const info = formatBase64Info(currentQ2.canzone.audioFiles[idx]);
                                  return info ? `${info.label}: ${info.name} (${info.size})` : 'File caricato';
                                })()}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  updateQ2((prev) => {
                                    const newA = [...prev.canzone.audioFiles];
                                    newA[idx] = '';
                                    return { ...prev, canzone: { ...prev.canzone, audioFiles: newA } };
                                  });
                                }}
                                className="text-red-400 hover:text-red-300 font-semibold cursor-pointer ml-2 text-[11px] bg-transparent border-0"
                              >
                                Rimuovi
                              </button>
                            </div>
                          ) : (
                            <input
                              type="text"
                              placeholder="Audio MP3 strumento..."
                              value={currentQ2.canzone.audioFiles[idx] || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                updateQ2((prev) => {
                                  const newA = [...prev.canzone.audioFiles];
                                  newA[idx] = val;
                                  return { ...prev, canzone: { ...prev.canzone, audioFiles: newA } };
                                });
                              }}
                              className="flex-1 bg-black/40 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-indigo-500"
                            />
                          )}
                          <label className="px-3 py-1 text-[11px] font-semibold bg-white/10 hover:bg-white/15 text-white rounded cursor-pointer shrink-0 text-center">
                            📁 Audio
                            <input
                              type="file"
                              accept="audio/*"
                              className="hidden"
                              onChange={(e) =>
                                handleFileUpload(e, (base64) => {
                                  updateQ2((prev) => {
                                    const newA = [...prev.canzone.audioFiles];
                                    newA[idx] = base64;
                                    return { ...prev, canzone: { ...prev.canzone, audioFiles: newA } };
                                  });
                                })
                              }
                            />
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Song Solution MP3 */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Canzone come Soluzione MP3:
                  </label>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-[#141417] p-2.5 rounded-lg border border-white/5">
                    {currentQ2.canzone.soluzioneAudio?.startsWith('data:') || currentQ2.canzone.soluzioneAudio?.startsWith('idb://') ? (
                      <div className="flex-1 flex items-center justify-between bg-black/40 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white">
                        <span className="text-emerald-400 font-medium truncate max-w-[200px] sm:max-w-xs">
                          {(() => {
                            const info = formatBase64Info(currentQ2.canzone.soluzioneAudio);
                            return info ? `${info.label}: ${info.name} (${info.size})` : 'File caricato';
                          })()}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            updateQ2((prev) => ({
                              ...prev,
                              canzone: { ...prev.canzone, soluzioneAudio: '' },
                            }));
                          }}
                          className="text-red-400 hover:text-red-300 font-semibold cursor-pointer ml-2 text-[11px] bg-transparent border-0"
                        >
                          Rimuovi
                        </button>
                      </div>
                    ) : (
                      <input
                        type="text"
                        placeholder="Percorso URL / MP3 canzone finale..."
                        value={currentQ2.canzone.soluzioneAudio}
                        onChange={(e) =>
                          updateQ2((prev) => ({
                            ...prev,
                            canzone: { ...prev.canzone, soluzioneAudio: e.target.value },
                          }))
                        }
                        className="flex-1 bg-black/40 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-indigo-500"
                      />
                    )}
                    <label className="px-3 py-1.5 text-[11px] font-semibold bg-white/10 hover:bg-white/15 text-white rounded cursor-pointer shrink-0 text-center">
                      🎵 Sfoglia MP3
                      <input
                        type="file"
                        accept="audio/*"
                        className="hidden"
                        onChange={(e) =>
                          handleFileUpload(e, (base64) =>
                            updateQ2((prev) => ({
                              ...prev,
                              canzone: { ...prev.canzone, soluzioneAudio: base64 },
                            }))
                          )
                        }
                      />
                    </label>
                  </div>
                </div>

                {/* Title & Info */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Titolo:
                    </label>
                    <input
                      type="text"
                      placeholder="Es. Come un Pittore"
                      value={currentQ2.canzone.titolo}
                      onChange={(e) =>
                        updateQ2((prev) => ({
                          ...prev,
                          canzone: { ...prev.canzone, titolo: e.target.value },
                        }))
                      }
                      className="w-full bg-[#141417] border border-white/10 rounded px-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Artista:
                    </label>
                    <input
                      type="text"
                      placeholder="Es. Modà"
                      value={currentQ2.canzone.artista || ''}
                      onChange={(e) =>
                        updateQ2((prev) => ({
                          ...prev,
                          canzone: { ...prev.canzone, artista: e.target.value },
                        }))
                      }
                      className="w-full bg-[#141417] border border-white/10 rounded px-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Info / Dettagli:
                    </label>
                    <input
                      type="text"
                      placeholder="Es. Album 2012 / Pop Rock"
                      value={currentQ2.canzone.info}
                      onChange={(e) =>
                        updateQ2((prev) => ({
                          ...prev,
                          canzone: { ...prev.canzone, info: e.target.value },
                        }))
                      }
                      className="w-full bg-[#141417] border border-white/10 rounded px-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider">
                  <span>🖼️ Setup Modalità Immagine (Lista di 10)</span>
                </div>

                {/* Domanda mostrata nella forma viola sopra la lista */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Domanda della lista:
                  </label>
                  <input
                    type="text"
                    placeholder="Es. In quale ordine sono classificati?"
                    value={currentQ2.immagine.domanda || ''}
                    onChange={(e) =>
                      updateQ2((prev) => ({
                        ...prev,
                        immagine: { ...prev.immagine, domanda: e.target.value },
                      }))
                    }
                    className="w-full bg-[#141417] border border-white/10 rounded px-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Lista dei 10 */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-300">
                    Lista delle 10 Risposte / Indizi:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-[#141417] p-2 rounded-lg border border-white/5">
                        <span className="text-[11px] font-bold text-slate-400 w-12 shrink-0">
                          #{idx + 1}:
                        </span>
                        <input
                          type="text"
                          placeholder={`Voce ${idx + 1}...`}
                          value={currentQ2.immagine.lista10[idx] || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateQ2((prev) => {
                              const newList = [...prev.immagine.lista10];
                              newList[idx] = val;
                              return {
                                ...prev,
                                immagine: { ...prev.immagine, lista10: newList },
                              };
                            });
                          }}
                          className="flex-1 bg-black/40 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* JPG Image */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Immagine JPG:
                  </label>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-[#141417] p-2.5 rounded-lg border border-white/5">
                    {currentQ2.immagine.immagineJpg?.startsWith('data:') || currentQ2.immagine.immagineJpg?.startsWith('idb://') ? (
                      <div className="flex-1 flex items-center justify-between bg-black/40 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white">
                        <span className="text-emerald-400 font-medium truncate max-w-[200px] sm:max-w-xs">
                          {(() => {
                            const info = formatBase64Info(currentQ2.immagine.immagineJpg);
                            return info ? `${info.label}: ${info.name} (${info.size})` : 'File caricato';
                          })()}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            updateQ2((prev) => ({
                              ...prev,
                              immagine: { ...prev.immagine, immagineJpg: '' },
                            }));
                          }}
                          className="text-red-400 hover:text-red-300 font-semibold cursor-pointer ml-2 text-[11px] bg-transparent border-0"
                        >
                          Rimuovi
                        </button>
                      </div>
                    ) : (
                      <input
                        type="text"
                        placeholder="Percorso URL / Immagine JPG..."
                        value={currentQ2.immagine.immagineJpg}
                        onChange={(e) =>
                          updateQ2((prev) => ({
                            ...prev,
                            immagine: { ...prev.immagine, immagineJpg: e.target.value },
                          }))
                        }
                        className="flex-1 bg-black/40 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-indigo-500"
                      />
                    )}
                    <label className="px-3 py-1.5 text-[11px] font-semibold bg-white/10 hover:bg-white/15 text-white rounded cursor-pointer shrink-0 text-center">
                      🖼️ Sfoglia JPG
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) =>
                          handleFileUpload(e, (base64) =>
                            updateQ2((prev) => ({
                              ...prev,
                              immagine: { ...prev.immagine, immagineJpg: base64 },
                            }))
                          )
                        }
                      />
                    </label>
                  </div>
                  {currentQ2.immagine.immagineJpg && (
                    <div className="mt-2 w-20 h-20 rounded border border-white/20 overflow-hidden bg-black flex items-center justify-center">
                      <img
                        src={currentQ2.immagine.immagineJpg}
                        alt="Anteprima JPG"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>

                {/* Song Solution MP3 */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Canzone come Soluzione MP3:
                  </label>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-[#141417] p-2.5 rounded-lg border border-white/5">
                    {currentQ2.immagine.soluzioneAudio?.startsWith('data:') || currentQ2.immagine.soluzioneAudio?.startsWith('idb://') ? (
                      <div className="flex-1 flex items-center justify-between bg-black/40 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white">
                        <span className="text-emerald-400 font-medium truncate max-w-[200px] sm:max-w-xs">
                          {(() => {
                            const info = formatBase64Info(currentQ2.immagine.soluzioneAudio);
                            return info ? `${info.label}: ${info.name} (${info.size})` : 'File caricato';
                          })()}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            updateQ2((prev) => ({
                              ...prev,
                              immagine: { ...prev.immagine, soluzioneAudio: '' },
                            }));
                          }}
                          className="text-red-400 hover:text-red-300 font-semibold cursor-pointer ml-2 text-[11px] bg-transparent border-0"
                        >
                          Rimuovi
                        </button>
                      </div>
                    ) : (
                      <input
                        type="text"
                        placeholder="Percorso URL / file MP3 soluzione..."
                        value={currentQ2.immagine.soluzioneAudio}
                        onChange={(e) =>
                          updateQ2((prev) => ({
                            ...prev,
                            immagine: { ...prev.immagine, soluzioneAudio: e.target.value },
                          }))
                        }
                        className="flex-1 bg-black/40 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-indigo-500"
                      />
                    )}
                    <label className="px-3 py-1.5 text-[11px] font-semibold bg-white/10 hover:bg-white/15 text-white rounded cursor-pointer shrink-0 text-center">
                      🎵 Sfoglia MP3
                      <input
                        type="file"
                        accept="audio/*"
                        className="hidden"
                        onChange={(e) =>
                          handleFileUpload(e, (base64) =>
                            updateQ2((prev) => ({
                              ...prev,
                              immagine: { ...prev.immagine, soluzioneAudio: base64 },
                            }))
                          )
                        }
                      />
                    </label>
                  </div>
                </div>

                {/* Text Solution */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Soluzione in Testo:
                  </label>
                  <input
                    type="text"
                    placeholder="Testo soluzione finale..."
                    value={currentQ2.immagine.soluzioneTesto}
                    onChange={(e) =>
                      updateQ2((prev) => ({
                        ...prev,
                        immagine: { ...prev.immagine, soluzioneTesto: e.target.value },
                      }))
                    }
                    className="w-full bg-[#141417] border border-white/10 rounded px-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            )}
          </div>

        </div>

        {/* BOX 3 — Password (full width) */}
        <div className="bg-[#1c1c21] rounded-2xl border border-white/10 p-6 flex flex-col shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-extrabold flex items-center justify-center text-sm">
                3
              </span>
              <div>
                <h3 className="text-lg font-bold text-white">BOX 3 — Terzo Gioco</h3>
                <p className="text-[11px] text-slate-400">Modulo Password</p>
              </div>
            </div>
            <span className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              3 Domande
            </span>
          </div>

          {/* Question selector 1–3 */}
          <div className="bg-white/5 p-4 rounded-xl border border-white/5 max-w-xs">
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Seleziona Domanda (1 - 3):
            </label>
            <select
              value={currentQ3Num}
              onChange={(e) =>
                setState((prev) => {
                  const gioco3 = normalizeGioco3(prev.gioco3, getDefaultSetupState().gioco3);
                  return {
                    ...prev,
                    gioco3: {
                      ...gioco3,
                      selectedQuestion: Number(e.target.value),
                    },
                  };
                })
              }
              className="w-full bg-[#141417] border border-white/15 rounded-lg px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-emerald-500"
            >
              {[1, 2, 3].map((n) => (
                <option key={n} value={n}>
                  Domanda #{n}
                </option>
              ))}
            </select>
          </div>

          {/* Sezione Sfondi e Musica Intro Box 3 */}
          <div className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-3">
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <span>🖼️ Gestione Sfondo & 🎵 Musica Intro</span>
              <span className="text-[10px] text-slate-500 font-normal normal-case">(specifici per la Manche #{currentQ3Num})</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Sfondo Specifico Manche */}
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                  Sfondo Manche #{currentQ3Num}:
                </label>
                <div className="flex items-center gap-2 bg-[#141417] p-1.5 rounded-lg border border-white/5">
                  {currentQ3.sfondo?.startsWith('data:') || currentQ3.sfondo?.startsWith('idb://') ? (
                    <div className="flex-1 flex items-center justify-between bg-black/40 border border-white/10 rounded px-2 py-1 text-[11px] text-white">
                      <span className="text-emerald-400 font-medium truncate max-w-[100px]">
                        {formatBase64Info(currentQ3.sfondo)?.name || 'Caricato'}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQ3((prev) => ({ ...prev, sfondo: '' }))}
                        className="text-red-400 hover:text-red-300 font-semibold cursor-pointer text-[10px] bg-transparent border-0"
                      >
                        Rimuovi
                      </button>
                    </div>
                  ) : (
                    <input
                      type="text"
                      placeholder="URL sfondo manche..."
                      value={currentQ3.sfondo || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateQ3((prev) => ({ ...prev, sfondo: val }));
                      }}
                      className="flex-1 bg-black/40 border border-white/10 rounded px-2 py-1 text-[11px] text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500"
                    />
                  )}
                  <label className="px-2 py-1 text-[10px] font-semibold bg-white/10 hover:bg-white/15 text-white rounded cursor-pointer shrink-0 text-center">
                    🖼️ Sfoglia
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        handleFileUpload(e, (base64) =>
                          updateQ3((prev) => ({ ...prev, sfondo: base64 }))
                        )
                      }
                    />
                  </label>
                </div>
              </div>

              {/* Musica Intro Specifico Manche */}
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                  Musica d'Intro Manche #{currentQ3Num}:
                </label>
                <div className="flex items-center gap-2 bg-[#141417] p-1.5 rounded-lg border border-white/5">
                  {currentQ3.musicaIntro?.startsWith('data:') || currentQ3.musicaIntro?.startsWith('idb://') ? (
                    <div className="flex-1 flex items-center justify-between bg-black/40 border border-white/10 rounded px-2 py-1 text-[11px] text-white">
                      <span className="text-emerald-400 font-medium truncate max-w-[100px]">
                        {formatBase64Info(currentQ3.musicaIntro)?.name || 'Caricato'}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQ3((prev) => ({ ...prev, musicaIntro: '' }))}
                        className="text-red-400 hover:text-red-300 font-semibold cursor-pointer text-[10px] bg-transparent border-0"
                      >
                        Rimuovi
                      </button>
                    </div>
                  ) : (
                    <input
                      type="text"
                      placeholder="URL / File audio intro..."
                      value={currentQ3.musicaIntro || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateQ3((prev) => ({ ...prev, musicaIntro: val }));
                      }}
                      className="flex-1 bg-black/40 border border-white/10 rounded px-2 py-1 text-[11px] text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500"
                    />
                  )}
                  <label className="px-2 py-1 text-[10px] font-semibold bg-white/10 hover:bg-white/15 text-white rounded cursor-pointer shrink-0 text-center">
                    📁 Sfoglia MP3
                    <input
                      type="file"
                      accept="audio/*"
                      className="hidden"
                      onChange={(e) =>
                        handleFileUpload(e, (base64) =>
                          updateQ3((prev) => ({ ...prev, musicaIntro: base64 }))
                        )
                      }
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-4">
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <span>🎁 Configurazione Bussolotti Bonus (Manche #{currentQ3Num})</span>
            </div>

            {/* Select bonus per Squadra */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Squadra 1 */}
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                  Bonus Squadra 1 (Rosso):
                </label>
                <select
                  value={currentQ3.bussolotti?.immagine_premio_squadra1 || 'dado'}
                  onChange={(e) => updateQ3((prev) => ({
                    ...prev,
                    bussolotti: { ...prev.bussolotti!, immagine_premio_squadra1: e.target.value }
                  }))}
                  className="w-full bg-[#141417] border border-white/15 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="dado">🎲 Dado</option>
                  <option value="switch">🔄 Switch</option>
                  <option value="arco">🏹 Arco</option>
                  <option value="scudo">🛡️ Scudo</option>
                </select>
              </div>

              {/* Squadra 2 */}
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                  Bonus Squadra 2 (Blu):
                </label>
                <select
                  value={currentQ3.bussolotti?.immagine_premio_squadra2 || 'switch'}
                  onChange={(e) => updateQ3((prev) => ({
                    ...prev,
                    bussolotti: { ...prev.bussolotti!, immagine_premio_squadra2: e.target.value }
                  }))}
                  className="w-full bg-[#141417] border border-white/15 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="dado">🎲 Dado</option>
                  <option value="switch">🔄 Switch</option>
                  <option value="arco">🏹 Arco</option>
                  <option value="scudo">🛡️ Scudo</option>
                </select>
              </div>

              {/* Squadra 3 */}
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                  Bonus Squadra 3 (Verde):
                </label>
                <select
                  value={currentQ3.bussolotti?.immagine_premio_squadra3 || 'arco'}
                  onChange={(e) => updateQ3((prev) => ({
                    ...prev,
                    bussolotti: { ...prev.bussolotti!, immagine_premio_squadra3: e.target.value }
                  }))}
                  className="w-full bg-[#141417] border border-white/15 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="dado">🎲 Dado</option>
                  <option value="switch">🔄 Switch</option>
                  <option value="arco">🏹 Arco</option>
                  <option value="scudo">🛡️ Scudo</option>
                </select>
              </div>
            </div>

            {/* Contenuto Schede */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-white/5">
              {/* Schede 2° Posto (3 schede) */}
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                  Contenuto Schede 2° Posto (3 schede):
                </label>
                <div className="flex gap-2">
                  {[0, 1, 2].map((idx) => (
                    <select
                      key={idx}
                      value={currentQ3.bussolotti?.schede_2_posto?.[idx] || 'vuoto'}
                      onChange={(e) => {
                        const val = e.target.value as any;
                        updateQ3((prev) => {
                          const newSchede = [...(prev.bussolotti?.schede_2_posto || ['bonus', 'vuoto', 'vuoto'])];
                          newSchede[idx] = val;
                          return {
                            ...prev,
                            bussolotti: { ...prev.bussolotti!, schede_2_posto: newSchede as any }
                          };
                        });
                      }}
                      className="flex-1 bg-[#141417] border border-white/15 rounded px-1.5 py-1 text-[11px] text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="bonus">🎁 Bonus</option>
                      <option value="vuoto">❌ Vuoto</option>
                      <option value="2000">💎 2000p</option>
                    </select>
                  ))}
                </div>
              </div>

              {/* Schede 3° Posto (5 schede) */}
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                  Contenuto Schede 3° Posto (5 schede):
                </label>
                <div className="flex gap-1.5">
                  {[0, 1, 2, 3, 4].map((idx) => (
                    <select
                      key={idx}
                      value={currentQ3.bussolotti?.schede_3_posto?.[idx] || 'vuoto'}
                      onChange={(e) => {
                        const val = e.target.value as any;
                        updateQ3((prev) => {
                          const newSchede = [...(prev.bussolotti?.schede_3_posto || ['vuoto', 'vuoto', 'vuoto', 'vuoto', 'bonus'])];
                          newSchede[idx] = val;
                          return {
                            ...prev,
                            bussolotti: { ...prev.bussolotti!, schede_3_posto: newSchede as any }
                          };
                        });
                      }}
                      className="flex-1 bg-[#141417] border border-white/15 rounded px-1 py-1 text-[10px] text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="bonus">🎁 Bonus</option>
                      <option value="vuoto">❌ Vuoto</option>
                      <option value="2000">💎 2000p</option>
                      <option value="1000">🪙 1000p</option>
                    </select>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Team words + 2 indizi each */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {teamMeta.map(({ key, label, accent }) => (
              <div
                key={key}
                className={`rounded-xl border bg-[#141417]/80 p-4 space-y-3 ${accent.split(' ')[0]}`}
              >
                <h4 className={`text-xs font-bold uppercase tracking-wider ${accent.split(' ').slice(1).join(' ')}`}>
                  {label} — 3 parole
                </h4>
                {[0, 1, 2].map((wordIdx) => (
                  <div key={wordIdx} className="space-y-2 bg-black/30 rounded-lg p-3 border border-white/5">
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase">
                      Parola {wordIdx + 1}
                    </label>
                    <input
                      type="text"
                      placeholder={`Parola ${wordIdx + 1}...`}
                      value={currentQ3[key][wordIdx].parola}
                      onChange={(e) =>
                        updateSquadraWord(key, wordIdx, { parola: e.target.value })
                      }
                      className="w-full bg-[#1c1c21] border border-white/10 rounded px-2.5 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5">Indizio 1</label>
                        <input
                          type="text"
                          placeholder="Indizio 1..."
                          value={currentQ3[key][wordIdx].indizi[0]}
                          onChange={(e) =>
                            updateSquadraIndizio(key, wordIdx, 0, e.target.value)
                          }
                          className="w-full bg-[#1c1c21] border border-white/10 rounded px-2 py-1.5 text-[11px] text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5">Indizio 2</label>
                        <input
                          type="text"
                          placeholder="Indizio 2..."
                          value={currentQ3[key][wordIdx].indizi[1]}
                          onChange={(e) =>
                            updateSquadraIndizio(key, wordIdx, 1, e.target.value)
                          }
                          className="w-full bg-[#1c1c21] border border-white/10 rounded px-2 py-1.5 text-[11px] text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Bomba + nulle */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white/5 p-4 rounded-xl border border-white/5">
            <div>
              <label className="block text-xs font-semibold text-red-400 mb-1.5">
                💣 Parola bomba
              </label>
              <input
                type="text"
                placeholder="Parola bomba..."
                value={currentQ3.parolaBomba}
                onChange={(e) =>
                  updateQ3((prev) => ({ ...prev, parolaBomba: e.target.value }))
                }
                className="w-full bg-[#141417] border border-red-500/30 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-red-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Parola nulla 1
              </label>
              <input
                type="text"
                placeholder="Parola nulla 1..."
                value={currentQ3.paroleNulle[0]}
                onChange={(e) =>
                  updateQ3((prev) => ({
                    ...prev,
                    paroleNulle: [e.target.value, prev.paroleNulle[1]],
                  }))
                }
                className="w-full bg-[#141417] border border-white/15 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Parola nulla 2
              </label>
              <input
                type="text"
                placeholder="Parola nulla 2..."
                value={currentQ3.paroleNulle[1]}
                onChange={(e) =>
                  updateQ3((prev) => ({
                    ...prev,
                    paroleNulle: [prev.paroleNulle[0], e.target.value],
                  }))
                }
                className="w-full bg-[#141417] border border-white/15 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* BOX 4 — Frase Tempo (Full Width, BOX 5 rimosso dal setup) */}
        <div className="pt-4">
          <div className="bg-[#1c1c21] rounded-2xl border border-white/10 p-6 flex flex-col gap-5 shadow-lg">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 font-extrabold flex items-center justify-center text-sm shadow-inner">
                  4
                </span>
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    GIOCO 4 - Asta
                  </h3>
                  <p className="text-xs text-slate-400">
                    Inserisci e modifica le frasi misteriose da indovinare.
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                Frase Tempo
              </span>
            </div>

            {/* Sfondo Generale Box 4 */}
            <div className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-3">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <span>🖼️ Sfondo Generale Box 4</span>
                <span className="text-[10px] text-slate-500 font-normal normal-case">(Utilizzato come default per tutte le frasi)</span>
              </div>
              <div className="flex items-center gap-3 bg-[#141417] p-2.5 rounded-lg border border-white/5">
                {state.gioco4.sfondoGenerale?.startsWith('data:') || state.gioco4.sfondoGenerale?.startsWith('idb://') ? (
                  <div className="flex-1 flex items-center justify-between bg-black/40 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white">
                    <span className="text-emerald-400 font-medium truncate max-w-[200px] sm:max-w-xs">
                      {(() => {
                        const info = formatBase64Info(state.gioco4.sfondoGenerale);
                        return info ? `${info.label}: ${info.name} (${info.size})` : 'File caricato';
                      })()}
                    </span>
                    <button
                      type="button"
                      onClick={() => setState((prev) => ({ ...prev, gioco4: { ...prev.gioco4, sfondoGenerale: '' } }))}
                      className="text-red-400 hover:text-red-300 font-semibold cursor-pointer ml-2 text-[11px] bg-transparent border-0"
                    >
                      Rimuovi
                    </button>
                  </div>
                ) : (
                  <input
                    type="text"
                    placeholder="Percorso URL / immagine di sfondo generale per tutte le frasi..."
                    value={state.gioco4.sfondoGenerale || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setState((prev) => ({
                        ...prev,
                        gioco4: { ...prev.gioco4, sfondoGenerale: val }
                      }));
                    }}
                    className="flex-1 bg-black/40 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-500"
                  />
                )}
                <label className="px-3 py-1.5 text-[11px] font-semibold bg-white/10 hover:bg-white/15 text-white rounded cursor-pointer shrink-0 text-center">
                  🖼️ Sfoglia
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      handleFileUpload(e, (base64) =>
                        setState((prev) => ({ ...prev, gioco4: { ...prev.gioco4, sfondoGenerale: base64 } }))
                      )
                    }
                  />
                </label>
              </div>
            </div>

            {/* Lista delle frasi */}
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
              {(state.gioco4?.frasi || []).map((rawFrase, idx) => {
                const frase = normalizeFraseTempoItem(rawFrase);
                const tokens = parsePhraseTokens(frase.testo);
                return (
                <div key={idx} className="bg-[#141417] p-3 rounded-xl border border-white/10 hover:border-cyan-500/30 transition-colors space-y-3">
                  <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-cyan-400/80 w-16 shrink-0">
                    Frase {idx + 1}:
                  </span>
                  <input
                    type="text"
                    value={frase.testo}
                    onChange={(e) => handleGioco4FraseChange(idx, e.target.value)}
                    placeholder={`Inserisci la frase ${idx + 1}...`}
                    className="flex-1 bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-xs text-white uppercase placeholder:normal-case placeholder:text-white/30 focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                  {(state.gioco4?.frasi?.length || 0) > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveGioco4Frase(idx)}
                      className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 border border-red-500/20 transition-colors shrink-0"
                      title="Elimina frase"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-0 md:pl-[76px]">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">Sfondo della frase</label>
                      <div className="flex gap-2">
                        {frase.sfondo?.startsWith('data:') || frase.sfondo?.startsWith('idb://') ? (
                          <div className="flex-1 flex items-center justify-between bg-black/40 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white">
                            <span className="text-emerald-400 font-medium truncate max-w-[150px]">
                              {formatBase64Info(frase.sfondo)?.name || 'Caricato'}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleGioco4BackgroundChange(idx, '')}
                              className="text-red-400 hover:text-red-300 font-semibold cursor-pointer ml-2 text-[10px] bg-transparent border-0"
                            >
                              Rimuovi
                            </button>
                          </div>
                        ) : (
                          <>
                            <input
                              type="text"
                              value={frase.sfondo || ''}
                              onChange={(e) => handleGioco4BackgroundChange(idx, e.target.value)}
                              placeholder="URL o percorso immagine..."
                              className="min-w-0 flex-1 bg-black/40 border border-white/15 rounded-lg px-2.5 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-500"
                            />
                            <label className="px-2.5 py-2 text-[11px] font-semibold bg-white/10 hover:bg-white/15 text-white rounded cursor-pointer shrink-0">
                              🖼️ Sfoglia
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => handleFileUpload(e, (base64) => handleGioco4BackgroundChange(idx, base64))}
                              />
                            </label>
                          </>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">Lettere già visibili</label>
                      <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto">
                        {tokens.map((token, tokenIndex) => token.trim() && isPhraseLetterToken(token) ? (
                          <button
                            key={tokenIndex}
                            type="button"
                            title={`Posizione ${tokenIndex + 1}`}
                            onClick={() => toggleGioco4VisibleLetter(idx, tokenIndex)}
                            className={`w-7 h-7 rounded border text-xs font-black transition-colors ${frase.lettereVisibili?.includes(tokenIndex) ? 'bg-cyan-400 border-cyan-200 text-black' : 'bg-black/40 border-white/15 text-white/60 hover:border-cyan-400/60'}`}
                          >
                            {token[0]}
                          </button>
                        ) : null)}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">Clicca le singole lettere da mostrare all’avvio.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pl-0 md:pl-[76px] pt-2 border-t border-white/5">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">Frase Indizio</label>
                      <input
                        type="text"
                        value={frase.indizio || ''}
                        onChange={(e) => handleGioco4IndizioChange(idx, e.target.value)}
                        placeholder="Es: Ha a che fare col mattino..."
                        className="w-full bg-black/40 border border-white/15 rounded-lg px-2.5 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">Bonus Associato</label>
                      <select
                        value={frase.bonus || ''}
                        onChange={(e) => handleGioco4BonusChange(idx, e.target.value)}
                        className="w-full bg-black/40 border border-white/15 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 transition-colors"
                      >
                        <option value="">❌ Nessun Bonus</option>
                        <option value="dado">🎲 Dado</option>
                        <option value="switch">🔄 Switch</option>
                        <option value="arco">🏹 Arco</option>
                        <option value="scudo">🛡️ Scudo</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">Punti in palio</label>
                      <input
                        type="number"
                        value={frase.punti ?? 1000}
                        onChange={(e) => handleGioco4PuntiChange(idx, parseInt(e.target.value) || 0)}
                        placeholder="Es: 5000"
                        className="w-full bg-black/40 border border-white/15 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 transition-colors"
                      />
                    </div>
                  </div>
                </div>
                );
              })}
            </div>

            {/* Pulsanti azione */}
            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={handleAddGioco4Frase}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 transition-all flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Aggiungi Frase
              </button>

              <span className="text-[11px] text-slate-400">
                Totale: <strong className="text-white">{state.gioco4?.frasi?.length || 0}</strong> frasi salvate
              </span>
            </div>
          </div>
        </div>

        {/* BOX PUNTEGGI — Impostazioni dei Punteggi */}
        <div className="pt-4">
          <div className="bg-[#1c1c21] rounded-2xl border border-white/10 p-6 flex flex-col gap-5 shadow-lg">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400 font-extrabold flex items-center justify-center text-sm shadow-inner">
                  🏆
                </span>
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    IMPOSTAZIONI PUNTEGGI — Tabellone e Classifica
                  </h3>
                  <p className="text-xs text-slate-400">
                    Configura l'aspetto estetico, i nomi delle tre squadre e l'icona per i bonus.
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Punteggi
              </span>
            </div>

            {/* Sfondo Classifica */}
            <div className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-3">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <span>🖼️ Sfondo Classifica</span>
                <span className="text-[10px] text-slate-500 font-normal normal-case">(Immagine per il tabellone generale dei punti)</span>
              </div>
              <div className="flex items-center gap-3 bg-[#141417] p-2.5 rounded-lg border border-white/5">
                {state.punteggi?.sfondo?.startsWith('data:') || state.punteggi?.sfondo?.startsWith('idb://') ? (
                  <div className="flex-1 flex items-center justify-between bg-black/40 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white">
                    <span className="text-emerald-400 font-medium truncate max-w-[200px] sm:max-w-xs">
                      {(() => {
                        const info = formatBase64Info(state.punteggi.sfondo);
                        return info ? `${info.label}: ${info.name} (${info.size})` : 'File caricato';
                      })()}
                    </span>
                    <button
                      type="button"
                      onClick={() => setState((prev) => ({
                        ...prev,
                        punteggi: { ...(prev.punteggi || { nomiSquadre: ['', '', ''] }), sfondo: '' }
                      }))}
                      className="text-red-400 hover:text-red-300 font-semibold cursor-pointer ml-2 text-[11px] bg-transparent border-0"
                    >
                      Rimuovi
                    </button>
                  </div>
                ) : (
                  <input
                    type="text"
                    placeholder="Percorso URL / immagine di sfondo per il tabellone dei punteggi..."
                    value={state.punteggi?.sfondo || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setState((prev) => ({
                        ...prev,
                        punteggi: { ...(prev.punteggi || { nomiSquadre: ['', '', ''] }), sfondo: val }
                      }));
                    }}
                    className="flex-1 bg-black/40 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-amber-500"
                  />
                )}
                <label className="px-3 py-1.5 text-[11px] font-semibold bg-white/10 hover:bg-white/15 text-white rounded cursor-pointer shrink-0 text-center">
                  🖼️ Sfoglia
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      handleFileUpload(e, (base64) =>
                        setState((prev) => ({
                          ...prev,
                          punteggi: { ...(prev.punteggi || { nomiSquadre: ['', '', ''] }), sfondo: base64 }
                        }))
                      )
                    }
                  />
                </label>
              </div>
            </div>

            {/* Nomi delle Squadre */}
            <div className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-3">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                👥 Nomi delle Squadre
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[0, 1, 2].map((idx) => {
                  const colors = [
                    { border: 'focus:border-red-500', label: 'Squadra 1 (Rossa)', placeholder: 'SQUADRA 1' },
                    { border: 'focus:border-blue-500', label: 'Squadra 2 (Blu)', placeholder: 'SQUADRA 2' },
                    { border: 'focus:border-green-500', label: 'Squadra 3 (Verde)', placeholder: 'SQUADRA 3' }
                  ];
                  return (
                    <div key={idx} className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-medium text-slate-400">{colors[idx].label}</label>
                      <input
                        type="text"
                        placeholder={colors[idx].placeholder}
                        value={state.punteggi?.nomiSquadre?.[idx] || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setState((prev) => {
                            const current = prev.punteggi || { nomiSquadre: ['SQUADRA 1', 'SQUADRA 2', 'SQUADRA 3'] };
                            const updatedNames = [...(current.nomiSquadre || ['SQUADRA 1', 'SQUADRA 2', 'SQUADRA 3'])];
                            updatedNames[idx] = val;
                            return {
                              ...prev,
                              punteggi: { ...current, nomiSquadre: updatedNames }
                            };
                          });
                        }}
                        className={`bg-[#141417] border border-white/15 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none ${colors[idx].border} transition-colors`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Icone dei Bonus Generali */}
            <div className="bg-white/5 p-5 rounded-xl border border-white/5 space-y-4">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex flex-col gap-1">
                <span className="flex items-center gap-1.5">🎁 Icone dei 4 Bonus Generali</span>
                <span className="text-[10px] text-slate-500 font-normal normal-case">(Configura le immagini per i 4 bonus: Dado 🎲, Switch 🔄, Arco 🏹, Scudo 🛡️. Saranno applicate a tutte le squadre in Classifica e nei giochi)</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { key: 'dado', label: '1. Dado 🎲', idx: 0 },
                  { key: 'switch', label: '2. Switch 🔄', idx: 1 },
                  { key: 'arco', label: '3. Arco 🏹', idx: 2 },
                  { key: 'scudo', label: '4. Scudo 🛡️', idx: 3 },
                ].map(({ label, idx }) => {
                  const bonusIcon = state.punteggi?.iconeBonus?.[idx] || '';
                  return (
                    <div key={idx} className="bg-[#141417] p-3 rounded-lg border border-white/5 space-y-2">
                      <div className="text-[11px] font-bold text-slate-300">{label}</div>
                      <div className="flex items-center gap-2">
                        {bonusIcon.startsWith('data:') || bonusIcon.startsWith('idb://') ? (
                          <div className="flex-1 flex items-center justify-between bg-black/40 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white">
                            <span className="text-emerald-400 font-medium truncate max-w-[100px]">
                              {formatBase64Info(bonusIcon)?.name || 'Caricato'}
                            </span>
                            <button
                              type="button"
                              onClick={() => setState((prev) => {
                                const current = prev.punteggi || { nomiSquadre: ['', '', ''], iconeBonus: ['', '', '', ''] };
                                const updatedIcons = [...(current.iconeBonus || ['', '', '', ''])];
                                updatedIcons[idx] = '';
                                return {
                                  ...prev,
                                  punteggi: { ...current, iconeBonus: updatedIcons }
                                };
                              })}
                              className="text-red-400 hover:text-red-300 font-semibold cursor-pointer ml-1 text-[10px] bg-transparent border-0"
                            >
                              Rimuovi
                            </button>
                          </div>
                        ) : (
                          <input
                            type="text"
                            placeholder="URL icona..."
                            value={bonusIcon}
                            onChange={(e) => {
                              const val = e.target.value;
                              setState((prev) => {
                                const current = prev.punteggi || { nomiSquadre: ['', '', ''], iconeBonus: ['', '', '', ''] };
                                const updatedIcons = [...(current.iconeBonus || ['', '', '', ''])];
                                updatedIcons[idx] = val;
                                return {
                                  ...prev,
                                  punteggi: { ...current, iconeBonus: updatedIcons }
                                };
                              });
                            }}
                            className="flex-1 bg-black/40 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-amber-500"
                          />
                        )}
                        <label className="px-2.5 py-1.5 text-[10px] font-semibold bg-white/10 hover:bg-white/15 text-white rounded cursor-pointer shrink-0 text-center">
                          🖼️
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) =>
                              handleFileUpload(e, (base64) =>
                                setState((prev) => {
                                  const current = prev.punteggi || { nomiSquadre: ['', '', ''], iconeBonus: ['', '', '', ''] };
                                  const updatedIcons = [...(current.iconeBonus || ['', '', '', ''])];
                                  updatedIcons[idx] = base64;
                                  return {
                                    ...prev,
                                    punteggi: { ...current, iconeBonus: updatedIcons }
                                  };
                                })
                              )
                            }
                          />
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>

      </main>

      {/* Bottom Save Action Footer */}
      <footer className="border-t border-white/10 bg-[#18181b] p-4 flex items-center justify-between max-w-7xl w-full mx-auto mt-8 rounded-t-xl">
        <div className="text-xs text-slate-400 flex flex-col sm:flex-row sm:items-center gap-3">
          <span>Tutti i file caricati e le impostazioni vengono salvati in modo permanente.</span>
          <button
            type="button"
            onClick={handleResetSession}
            className="px-3 py-1.5 text-[10px] font-semibold rounded-lg bg-red-950/40 hover:bg-red-950/60 text-red-400 border border-red-900/40 hover:border-red-800/60 transition-all flex items-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            title="Azzera lo stato di avanzamento e i punteggi dei giochi per ricominciare da capo"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H18V5" />
            </svg>
            Resetta Partita
          </button>
        </div>
        <button
          type="button"
          onClick={handleSave}
          className="px-6 py-2.5 text-xs font-bold rounded-lg bg-gradient-to-r from-[#d24726] to-[#e85a38] hover:from-[#e85a38] hover:to-[#f97316] text-white shadow-lg shadow-[#d24726]/20 transition-all flex items-center gap-2"
        >
          💾 Salva Impostazioni
        </button>
      </footer>
    </div>
  );
}
