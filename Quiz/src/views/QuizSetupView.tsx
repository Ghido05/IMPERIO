import React, { useState, useEffect } from 'react';

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
}

// Data types for Box 2 (Gioco 2)
export interface Gioco2CanzoneData {
  audioFiles: string[]; // 7 mp3 files for instruments
  risposte: string[];   // 7 answers list
  indizi: string[];     // clues / text list
  soluzioneAudio: string; // solution mp3
  titolo: string;       // title
  info: string;         // info details
}

export interface Gioco2ImmagineData {
  lista10: string[];     // 10 answers/clues list
  immagineJpg: string;   // jpg image
  soluzioneAudio: string; // solution mp3
  soluzioneTesto: string; // solution text
}

export interface Gioco2Question {
  tipo: 'canzone' | 'immagine';
  canzone: Gioco2CanzoneData;
  immagine: Gioco2ImmagineData;
}

export interface BoxGenericSetup {
  titolo: string;
  note: string;
}

export interface QuizSetupState {
  gioco1: {
    selectedQuestion: number;
    questions: Record<number, Gioco1Question>;
  };
  gioco2: {
    selectedQuestion: number;
    questions: Record<number, Gioco2Question>;
  };
  gioco3: BoxGenericSetup;
  gioco4: BoxGenericSetup;
  gioco5: BoxGenericSetup;
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
  };
}

export function createDefaultGioco2Question(): Gioco2Question {
  return {
    tipo: 'canzone',
    canzone: {
      audioFiles: ['', '', '', '', '', '', ''],
      risposte: ['', '', '', '', '', '', ''],
      indizi: ['', '', '', '', '', '', ''],
      soluzioneAudio: '',
      titolo: '',
      info: '',
    },
    immagine: {
      lista10: ['', '', '', '', '', '', '', '', '', ''],
      immagineJpg: '',
      soluzioneAudio: '',
      soluzioneTesto: '',
    },
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

  return {
    gioco1: {
      selectedQuestion: 1,
      questions: q1,
    },
    gioco2: {
      selectedQuestion: 1,
      questions: q2,
    },
    gioco3: { titolo: 'Gioco 3', note: 'Modulo Gioco 3 (in arrivo)' },
    gioco4: { titolo: 'Gioco 4', note: 'Modulo Gioco 4 (in arrivo)' },
    gioco5: { titolo: 'Gioco 5', note: 'Modulo Gioco 5 (in arrivo)' },
  };
}

interface QuizSetupViewProps {
  onStartQuiz?: () => void;
}

export default function QuizSetupView({ onStartQuiz }: QuizSetupViewProps) {
  const [state, setState] = useState<QuizSetupState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Ensure structure matches defaults
        const def = getDefaultSetupState();
        return {
          gioco1: {
            selectedQuestion: parsed.gioco1?.selectedQuestion || 1,
            questions: { ...def.gioco1.questions, ...parsed.gioco1?.questions },
          },
          gioco2: {
            selectedQuestion: parsed.gioco2?.selectedQuestion || 1,
            questions: { ...def.gioco2.questions, ...parsed.gioco2?.questions },
          },
          gioco3: parsed.gioco3 || def.gioco3,
          gioco4: parsed.gioco4 || def.gioco4,
          gioco5: parsed.gioco5 || def.gioco5,
        };
      }
    } catch (e) {
      console.error('Error loading setup state:', e);
    }
    return getDefaultSetupState();
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSave = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      // Broadcast if in Electron environment
      if ((window as any).electron?.broadcastState) {
        (window as any).electron.broadcastState({
          localStorageUpdate: {
            key: STORAGE_KEY,
            value: JSON.stringify(state),
          },
        });
      }
      showToast('✅ Configurazioni salvate con successo!');
    } catch (e) {
      console.error('Failed to save setup:', e);
      showToast('❌ Errore durante il salvataggio dei dati');
    }
  };

  // Helper for reading uploaded files as base64 data URLs
  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    onLoad: (result: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        onLoad(event.target.result as string);
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

  return (
    <div className="h-screen w-full bg-[#121214] text-slate-100 font-sans flex flex-col overflow-y-auto selection:bg-[#d24726] selection:text-white">
      {/* Toast alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-[#d24726] text-white px-5 py-3 rounded-lg shadow-xl font-medium flex items-center gap-2 animate-bounce">
          {toastMessage}
        </div>
      )}

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

        <div className="flex items-center gap-3">
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
                  <h3 className="text-lg font-bold text-white">BOX 1 — Primo Gioco</h3>
                  <p className="text-[11px] text-slate-400">Modulo "Il mio nome è nessuno"</p>
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
                  <h3 className="text-lg font-bold text-white">BOX 2 — Secondo Gioco</h3>
                  <p className="text-[11px] text-slate-400">Modulo Classifica & Classifica Musicale</p>
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

            {/* Dynamic Form based on Type */}
            {currentQ2.tipo === 'canzone' ? (
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider">
                  <span>🎵 Setup Modalità Canzone (7 Strumenti / Risposte)</span>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Titolo:
                    </label>
                    <input
                      type="text"
                      placeholder="Es. Modà - Come un Pittore"
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

        {/* Remaining Boxes: Box 3, Box 4, Box 5 Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          
          {/* BOX 3 */}
          <div className="bg-[#1c1c21] rounded-2xl border border-white/10 p-5 flex flex-col justify-between opacity-80 hover:opacity-100 transition-opacity">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-extrabold flex items-center justify-center text-xs">
                    3
                  </span>
                  <h3 className="text-base font-bold text-white">BOX 3 — Terzo Gioco</h3>
                </div>
                <span className="px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Modulo 3
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {state.gioco3.note}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-white/5 text-[10px] text-slate-500">
              Box 3 pronto per la configurazione dei giochi successivi.
            </div>
          </div>

          {/* BOX 4 */}
          <div className="bg-[#1c1c21] rounded-2xl border border-white/10 p-5 flex flex-col justify-between opacity-80 hover:opacity-100 transition-opacity">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-purple-500/20 border border-purple-500/40 text-purple-400 font-extrabold flex items-center justify-center text-xs">
                    4
                  </span>
                  <h3 className="text-base font-bold text-white">BOX 4 — Quarto Gioco</h3>
                </div>
                <span className="px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  Modulo 4
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {state.gioco4.note}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-white/5 text-[10px] text-slate-500">
              Box 4 pronto per la configurazione dei giochi successivi.
            </div>
          </div>

          {/* BOX 5 */}
          <div className="bg-[#1c1c21] rounded-2xl border border-white/10 p-5 flex flex-col justify-between opacity-80 hover:opacity-100 transition-opacity">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400 font-extrabold flex items-center justify-center text-xs">
                    5
                  </span>
                  <h3 className="text-base font-bold text-white">BOX 5 — Quinto Gioco</h3>
                </div>
                <span className="px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Modulo 5
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {state.gioco5.note}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-white/5 text-[10px] text-slate-500">
              Box 5 pronto per la configurazione dei giochi successivi.
            </div>
          </div>

        </div>

      </main>

      {/* Bottom Save Action Footer */}
      <footer className="border-t border-white/10 bg-[#18181b] p-4 flex items-center justify-between max-w-7xl w-full mx-auto mt-8 rounded-t-xl">
        <div className="text-xs text-slate-400">
          Tutti i file caricati e le impostazioni vengono salvati in modo permanente.
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
