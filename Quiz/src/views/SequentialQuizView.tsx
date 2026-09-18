import { useState, useEffect, useRef } from 'react';
import SlideCanvas from '../components/SlideCanvas';
import ClassificaGenerale_Board from '../ClassificaGenerale_Board';
import PresenterPreviewPanel from '../components/PresenterPreviewPanel';
import QRCode from 'qrcode';
import { ScoreProvider, useScores } from '../context/ScoreContext';
import type { Slide } from '../App';
import { normalizeFraseTempoItem } from '../lib/fraseTempoUtils';
import {
  getDefaultSetupState,
  createDefaultGioco1Question,
  createDefaultGioco2Question,
} from './QuizSetupView';
import type { QuizSetupState } from './QuizSetupView';
import { loadSetupStateDb } from '../lib/quizDb';
import { useSyncedState } from '../hooks/useSyncedState';
import { cloneDefaultData } from '../lib/defaultGameData';
import { triggerFadeOutBroadcast } from '../lib/audioTracker';
import WebSerialManager from '../components/WebSerialManager';
import { sendSerialReset } from '../lib/webSerial';
import { sanitizeSetupStateWithKnownAssets, assetUrl } from '../lib/assetUrl';

export function getSlideForBoxQuestion(
  setupState: QuizSetupState,
  boxNum: number,
  questionNum: number
): Slide {
  if (boxNum === 1) {
    const q1 = setupState.gioco1?.questions?.[questionNum] || createDefaultGioco1Question();
    const sf = q1.sfondo || setupState.gioco1?.sfondoGenerale || '';
    if (q1.tipo === 'canzone') {
      const data = {
        indizi: [
          { id: 1, color: '#009200', text: q1.canzone.indizi[0] || '' },
          { id: 2, color: '#FF0000', text: q1.canzone.indizi[1] || '' },
          { id: 3, color: '#0000FF', text: q1.canzone.indizi[2] || '' },
          { id: 4, color: '#FE7507', text: q1.canzone.indizi[3] || '' },
        ],
        strumenti: [
          {
            step: 1,
            nome: 'Strumento 1',
            icona: 'nessuno_musicale/Icona di base.svg',
            audio: q1.canzone.audioFiles[0] || '',
            posizione: 'top-[33.98%] left-[1.87%]',
          },
          {
            step: 3,
            nome: 'Strumento 2',
            icona: 'nessuno_musicale/Icona di base.svg',
            audio: q1.canzone.audioFiles[1] || '',
            posizione: 'top-[49.25%] left-[21.09%]',
          },
          {
            step: 5,
            nome: 'Strumento 3',
            icona: 'nessuno_musicale/Icona di base.svg',
            audio: q1.canzone.audioFiles[2] || '',
            posizione: 'top-[18.56%] left-[48.12%]',
          },
          {
            step: 7,
            nome: 'Strumento 4',
            icona: 'nessuno_musicale/Icona di base.svg',
            audio: q1.canzone.audioFiles[3] || '',
            posizione: 'top-[49.25%] left-[71.87%]',
          },
          {
            step: 9,
            nome: 'Strumento 5',
            icona: 'nessuno_musicale/Icona di base.svg',
            audio: q1.canzone.audioFiles[4] || '',
            posizione: 'top-[79.94%] left-[91.51%]',
          },
        ],
        soluzione: {
          titolo: q1.canzone.titolo || 'Titolo',
          artista: '',
          anno: q1.canzone.anno || '',
          audio: q1.canzone.soluzioneAudio || '',
        },
        sfondo: sf,
        notePresentatore: q1.notePresentatore || '',
      };
      return { id: `box1_q${questionNum}`, type: 'music', data };
    } else {
      const data = {
        sfondo: sf,
        immagineSegreta: q1.immagine.immagineJpg || '',
        audio: q1.immagine.confermaAudio || '',
        indizi: [
          { step: 1, testo: q1.immagine.indizi[0] || '', colore: '#fe7507', icona: '/Icone/nessuno_img/Icona indizio.svg' },
          { step: 2, testo: q1.immagine.indizi[1] || '', colore: '#fe7507', icona: '/Icone/nessuno_img/Icona indizio.svg' },
          { step: 3, testo: q1.immagine.indizi[2] || '', colore: '#fe7507', icona: '/Icone/nessuno_img/Icona indizio.svg' },
          { step: 4, testo: q1.immagine.indizi[3] || '', colore: '#fe7507', icona: '/Icone/nessuno_img/Icona indizio.svg' },
        ],
        soluzione: {
          titolo: q1.immagine.soluzione || 'Soluzione Immagine',
          categoria: q1.immagine.categoria || '',
          anno: '',
        },
        griglia: { colonne: 10, righe: 10, puntoFocale: { colonna: 5, riga: 5 } },
        notePresentatore: q1.notePresentatore || '',
      };
      return { id: `box1_q${questionNum}`, type: 'img', data };
    }
  }

  if (boxNum === 2) {
    const q2 = setupState.gioco2?.questions?.[questionNum] || createDefaultGioco2Question();
    const sf = q2.sfondo || setupState.gioco2?.sfondoGenerale || '';
    if (q2.tipo === 'canzone') {
      const data = {
        titolo: q2.canzone.domanda || q2.canzone.titolo || 'Classifica Musicale',
        sfondo: sf,
        immagineSegreta: '',
        soluzioneTesto: q2.canzone.titolo || 'Soluzione',
        soluzione: {
          titolo: q2.canzone.titolo || 'Soluzione',
          artista: q2.canzone.artista || '',
          anno: q2.canzone.info || '',
        },
        canzoneFinale: q2.canzone.soluzioneAudio || '',
        elementi: [0, 1, 2, 3, 4, 5, 6].map((i) => ({
          posizione: i + 1,
          testo: q2.canzone.risposte[i] || `Strumento ${i + 1}`,
          audio: q2.canzone.audioFiles[i] || '',
          frase: q2.canzone.indizi[i] || '',
        })),
        notePresentatore: q2.notePresentatore || '',
      };
      return { id: `box2_q${questionNum}`, type: 'classifica_musicale', data };
    } else {
      const data = {
        titolo: q2.immagine.domanda || q2.immagine.soluzioneTesto || 'Classifica Immagine',
        sfondo: sf,
        immagineSegreta: q2.immagine.immagineJpg || '',
        audio: q2.immagine.soluzioneAudio || '',
        elementi: (q2.immagine.lista10 || []).map((txt, i) => ({
          posizione: i + 1,
          testo: txt || `Voce ${i + 1}`,
        })),
        notePresentatore: q2.notePresentatore || '',
      };
      return { id: `box2_q${questionNum}`, type: 'classifica', data };
    }
  }

  if (boxNum === 3) {
    const defaultData = cloneDefaultData('password_squadre') as any;
    const setupManches = [1, 2, 3].map((num) => {
      const q = setupState.gioco3?.questions?.[num];
      if (!q) return null;
      return {
        sfondo: q.sfondo || `/Password/password${num}.png`,
        musicaIntro: q.musicaIntro || '',
        squadra1: [q.squadra1[0].parola, q.squadra1[1].parola, q.squadra1[2].parola].map(w => w.toUpperCase()),
        squadra2: [q.squadra2[0].parola, q.squadra2[1].parola, q.squadra2[2].parola].map(w => w.toUpperCase()),
        squadra3: [q.squadra3[0].parola, q.squadra3[1].parola, q.squadra3[2].parola].map(w => w.toUpperCase()),
        altre: [q.parolaBomba, q.paroleNulle[0], q.paroleNulle[1]].map(w => w.toUpperCase()),
        suggerimenti_turni: [
          [
            [q.squadra1[0].indizi[0], q.squadra1[0].indizi[1]],
            [q.squadra2[0].indizi[0], q.squadra2[0].indizi[1]],
            [q.squadra3[0].indizi[0], q.squadra3[0].indizi[1]],
          ],
          [
            [q.squadra1[1].indizi[0], q.squadra1[1].indizi[1]],
            [q.squadra2[1].indizi[0], q.squadra2[1].indizi[1]],
            [q.squadra3[1].indizi[0], q.squadra3[1].indizi[1]],
          ],
          [
            [q.squadra1[2].indizi[0], q.squadra1[2].indizi[1]],
            [q.squadra2[2].indizi[0], q.squadra2[2].indizi[1]],
            [q.squadra3[2].indizi[0], q.squadra3[2].indizi[1]],
          ]
        ],
        bussolotti: (() => {
          const oldB = defaultData.manches[num - 1]?.bussolotti || {
            immagine_premio: "/Icone/premio_bonus.png",
            posizione_premio_2_posto: 0,
            posizione_premio_3_posto: 4
          };

          const immagine_premio = q.bussolotti?.immagine_premio || oldB.immagine_premio || "/Icone/premio_bonus.png";
          
          let schede_2_posto = q.bussolotti?.schede_2_posto;
          if (!schede_2_posto) {
            schede_2_posto = ['vuoto', 'vuoto', 'vuoto'];
            const pos2 = oldB.posizione_premio_2_posto ?? 0;
            schede_2_posto[pos2] = 'bonus';
          }

          let schede_3_posto = q.bussolotti?.schede_3_posto;
          if (!schede_3_posto) {
            schede_3_posto = ['vuoto', 'vuoto', 'vuoto', 'vuoto', 'bonus'];
            const pos3 = oldB.posizione_premio_3_posto ?? 4;
            schede_3_posto[pos3] = 'bonus';
          }

          const immagine_premio_squadra1 = q.bussolotti?.immagine_premio_squadra1 || oldB.immagine_premio_squadra1 || '';
          const immagine_premio_squadra2 = q.bussolotti?.immagine_premio_squadra2 || oldB.immagine_premio_squadra2 || '';
          const immagine_premio_squadra3 = q.bussolotti?.immagine_premio_squadra3 || oldB.immagine_premio_squadra3 || '';

          return {
            immagine_premio,
            immagine_premio_squadra1,
            immagine_premio_squadra2,
            immagine_premio_squadra3,
            schede_2_posto,
            schede_3_posto
          };
        })(),
        notePresentatore: q.notePresentatore || '',
      };
    }).filter(Boolean);

    const data = {
      manches: setupManches.length > 0 ? setupManches : defaultData.manches,
      notePresentatore: setupState.gioco3?.questions?.[questionNum]?.notePresentatore || '',
    };
    return { id: 'password_squadre', type: 'password_squadre', data };
  }

  if (boxNum === 4) {
    const defaultData = cloneDefaultData('gioco_frase_tempo') as any;
    const frasi = (setupState.gioco4?.frasi && setupState.gioco4.frasi.length > 0)
      ? setupState.gioco4.frasi.map(frase => {
          const item = normalizeFraseTempoItem(frase);
          return {
            ...item,
            sfondo: item.sfondo || setupState.gioco4.sfondoGenerale || ''
          };
        })
      : defaultData.frasi.map((frase: any) => {
          const item = normalizeFraseTempoItem(frase);
          return {
            ...item,
            sfondo: item.sfondo || setupState.gioco4.sfondoGenerale || ''
          };
        });
    return { 
      id: `box4_q${questionNum}`, 
      type: 'gioco_frase_tempo', 
      data: { ...defaultData, frasi, currentPhraseIndex: questionNum - 1 } 
    };
  }

  if (boxNum === 5) {
    return {
      id: 'finale_squadre',
      type: 'finale_squadre',
      data: {
        title: (setupState as any).gioco5?.titolo || 'Finale Squadre',
        subtitle: (setupState as any).gioco5?.sottotitolo || 'Box 5',
        sfondo: (setupState as any).gioco5?.sfondoGenerale || '/sfondo_finale_acqua.jpg',
        numeroDomande: (setupState as any).gioco5?.numeroDomande || 15
      }
    };
  }

  return { id: `box${boxNum}_q${questionNum}`, type: 'empty' };
}

interface SequentialQuizViewProps {
  onGoToSetup: () => void;
}

export default function SequentialQuizView({ onGoToSetup }: SequentialQuizViewProps) {
  return (
    <ScoreProvider>
      <SequentialQuizContent onGoToSetup={onGoToSetup} />
    </ScoreProvider>
  );
}

function SequentialQuizContent({ onGoToSetup }: SequentialQuizViewProps) {
  const { addScore } = useScores();
  const [setupState, setSetupState] = useState<QuizSetupState>(getDefaultSetupState());
  const [showLegend, setShowLegend] = useState(false);
  const [activeBox, setActiveBox] = useState<number>(1);
  const [activeQuestion, setActiveQuestion] = useState<number>(1);
  const [showIpadModal, setShowIpadModal] = useState(false);
  const [serverUrl, setServerUrl] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [ipadStatus, setIpadStatus] = useState({ ipadConnected: false, ipadCount: 0 });

  // Get server URL and listen to iPad connection status from main process
  useEffect(() => {
    const isElectron = (window as any).electron !== undefined;
    if (isElectron) {
      const electron = (window as any).electron;
      electron.getServerUrl().then((url: string) => {
        setServerUrl(url);
      });

      const unsubscribe = electron.onIpadConnectionStatus((status: { ipadConnected: boolean; ipadCount: number }) => {
        setIpadStatus(status);
      });
      return unsubscribe;
    }
  }, []);

  // Generate QR Code when server URL is available
  useEffect(() => {
    if (serverUrl) {
      QRCode.toDataURL(`${serverUrl}/?mode=ipad`, { width: 256, margin: 2 })
        .then(url => {
          setQrCodeDataUrl(url);
        })
        .catch(err => {
          console.error("Error generating QR code:", err);
        });
    }
  }, [serverUrl]);

  const [, setActivePhraseIndex] = useSyncedState<number>(`playstate_gioco_frase_tempo_index`, 0);
  const [maximizedPanel, setMaximizedPanel] = useState<'none' | 'left' | 'right'>('none');

  const [, setPasswordManche] = useState<number>(() => {
    const stored = localStorage.getItem('password_current_manche');
    return stored ? parseInt(stored) : 0;
  });

  useEffect(() => {
    const handleStorageChange = () => {
      const stored = localStorage.getItem('password_current_manche');
      if (stored !== null) {
        const mancheVal = parseInt(stored);
        setPasswordManche(mancheVal);
        if (activeBox === 3 && activeQuestion !== mancheVal + 1) {
          setActiveQuestion(mancheVal + 1);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('local-storage-update', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('local-storage-update', handleStorageChange);
    };
  }, [activeBox, activeQuestion]);

  // Sincronizza activeQuestion -> password_current_manche quando si cliccano i quadratini nel BOX 3
  useEffect(() => {
    if (activeBox === 3) {
      const targetManche = activeQuestion - 1;
      const stored = localStorage.getItem('password_current_manche');
      const currentStoredManche = stored ? parseInt(stored) : 0;
      if (currentStoredManche !== targetManche) {
        handlePasswordMancheSelect(targetManche);
      }
    }
  }, [activeBox, activeQuestion]);

  const handlePasswordMancheSelect = (mancheIndex: number) => {
    setPasswordManche(mancheIndex);
    localStorage.setItem('password_current_manche', mancheIndex.toString());

    const turnSeq = mancheIndex === 0 ? [1, 2, 3] : mancheIndex === 1 ? [2, 3, 1] : [3, 1, 2];
    
    // Team
    const savedTeam = localStorage.getItem(`password_current_team_m${mancheIndex}`) || turnSeq[0].toString();
    localStorage.setItem('password_current_team', savedTeam);

    // Round
    const savedRound = localStorage.getItem(`password_current_round_m${mancheIndex}`) || '1';
    localStorage.setItem('password_current_round', savedRound);

    // Excluded
    const savedExcluded = localStorage.getItem(`password_excluded_teams_m${mancheIndex}`) || JSON.stringify([]);
    localStorage.setItem('password_excluded_teams', savedExcluded);

    // Winners
    const savedWinners = localStorage.getItem(`password_winners_order_m${mancheIndex}`) || JSON.stringify([]);
    localStorage.setItem('password_winners_order', savedWinners);

    // Suggestion
    const savedSugg = localStorage.getItem(`password_chosen_suggestion_m${mancheIndex}`) || '';
    localStorage.setItem('password_chosen_suggestion', savedSugg);

    // Bussolotti
    const savedBStatus = localStorage.getItem(`password_bussolotti_status_m${mancheIndex}`) || JSON.stringify({ 1: 'pending', 2: 'pending', 3: 'pending' });
    localStorage.setItem('password_bussolotti_status', savedBStatus);
    const savedBActive = localStorage.getItem(`password_active_bussolotti_m${mancheIndex}`) || 'null';
    localStorage.setItem('password_active_bussolotti', savedBActive);

    // Grid
    const savedGrid = localStorage.getItem(`password_grid_state_m${mancheIndex}`);
    if (savedGrid) {
      localStorage.setItem('password_grid_state', savedGrid);
    } else {
      localStorage.removeItem('password_grid_state');
    }

    // Dispatch degli eventi per aggiornare la finestra corrente
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('local-storage-update', {
      detail: { key: 'password_current_manche', value: mancheIndex.toString() }
    }));

    // Broadcast per le altre finestre (Electron)
    if ((window as any).electron?.broadcastState) {
      const keysToBroadcast = [
        'password_current_manche',
        'password_current_team',
        'password_current_round',
        'password_excluded_teams',
        'password_winners_order',
        'password_chosen_suggestion',
        'password_bussolotti_status',
        'password_active_bussolotti',
        'password_grid_state',
        `password_grid_state_m${mancheIndex}`,
        `password_current_team_m${mancheIndex}`,
        `password_current_round_m${mancheIndex}`,
        `password_excluded_teams_m${mancheIndex}`,
        `password_winners_order_m${mancheIndex}`,
        `password_chosen_suggestion_m${mancheIndex}`,
        `password_bussolotti_status_m${mancheIndex}`,
        `password_active_bussolotti_m${mancheIndex}`
      ];
      keysToBroadcast.forEach(k => {
        const val = localStorage.getItem(k);
        (window as any).electron.broadcastState({
          localStorageUpdate: { key: k, value: val }
        });
      });
    }
  };

  useEffect(() => {
    localStorage.setItem('playstate_active_box', activeBox.toString());
    localStorage.setItem('playstate_active_question', activeQuestion.toString());
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'playstate_active_box',
      newValue: activeBox.toString()
    }));
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'playstate_active_question',
      newValue: activeQuestion.toString()
    }));
  }, [activeBox, activeQuestion]);

  // Load configuration from Shared File, IndexedDB & LocalStorage on mount
  useEffect(() => {
    async function loadData() {
      const isElectron = (window as any).electron !== undefined;
      let loaded: any = null;
      if (isElectron) {
        try {
          const fromSharedFile = await (window as any).electron.readSetupFile();
          if (fromSharedFile) {
            loaded = fromSharedFile;
          }
        } catch (err) {
          console.warn('Errore lettura dev setup file:', err);
        }
      }
      if (!loaded) {
        const fromDb = await loadSetupStateDb();
        if (fromDb) {
          loaded = fromDb;
        } else {
          const saved = localStorage.getItem('imperio_quiz_setup_config_v1');
          if (saved) {
            try {
              loaded = JSON.parse(saved);
            } catch (e) {
              console.error('Error parsing local setup:', e);
            }
          }
        }
      }
      if (loaded) {
        setSetupState(sanitizeSetupStateWithKnownAssets(loaded));
      }
    }
    loadData();

    // Listen for storage changes to reload setup
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'imperio_quiz_setup_config_v1') {
        loadData();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // Listen for custom broadcast updates (Electron)
    const isElectron = (window as any).electron !== undefined;
    let unsubscribe: (() => void) | undefined;
    if (isElectron) {
      unsubscribe = (window as any).electron.onStateUpdate((state: any) => {
        if (state && state.setupStateUpdate) {
          setSetupState(sanitizeSetupStateWithKnownAssets(state.setupStateUpdate));
        }
      });
    }

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const activeSlide = getSlideForBoxQuestion(setupState, activeBox, activeQuestion);

  // Broadcast current active slide to GamesView (Public screen)
  useEffect(() => {
    const isElectron = (window as any).electron !== undefined;
    if (isElectron) {
      (window as any).electron.broadcastState({
        activeSlideId: activeSlide.id,
        activeSlide,
      });
    }
  }, [activeSlide, activeBox, activeQuestion]);



  // Stati per Mille e una Nadia
  const [nadiaActive, setNadiaActive] = useSyncedState<boolean>('playstate_nadia_active', false);
  const [, setNadiaQuestionId] = useSyncedState<string>('playstate_nadia_question_id', '');
  const [nadiaStep, setNadiaStep] = useSyncedState<number>('playstate_nadia_step', 0);
  const [nadiaSolutionShown, setNadiaSolutionShown] = useSyncedState<boolean>('playstate_nadia_solution_shown', false);
  const [nadiaBookedTeam, setNadiaBookedTeam] = useSyncedState<number | null>('playstate_nadia_booked_team', null);
  const [nadiaAssignedTeam, setNadiaAssignedTeam] = useSyncedState<number | null>('playstate_nadia_assigned_team', null);
  const [, setNadiaErrorTrigger] = useSyncedState<number>('playstate_nadia_error_trigger', 0);
  const nadiaAudioRef = useRef<HTMLAudioElement | null>(null);

  const teamNames = setupState.punteggi?.nomiSquadre || ['SQUADRA 1', 'SQUADRA 2', 'SQUADRA 3'];

  // Trova se per lo slot corrente (Box + Domanda/Frase) c'è una domanda di Nadia assegnata
  const currentSlotQuestionNum = activeQuestion;
  const nadiaQuestionForCurrentSlot = (setupState.nadia?.domande || []).find(
    (d) => d.targetBox === activeBox && d.targetQuestion === currentSlotQuestionNum
  );

  const triggerNadiaError = () => {
    const timestamp = Date.now();
    setNadiaErrorTrigger(timestamp);
  };

  const playNadiaJingle = (isExit = false) => {
    if (!setupState.nadia?.musicaStacchetto) return;
    try {
      if (nadiaAudioRef.current) {
        nadiaAudioRef.current.pause();
        nadiaAudioRef.current.currentTime = 0;
      }
      const audio = new Audio(assetUrl(setupState.nadia.musicaStacchetto));
      nadiaAudioRef.current = audio;
      audio.play().catch((err) => console.log(`Autoplay stacchetto ${isExit ? 'uscita' : 'ingresso'}:`, err));
    } catch (e) {
      console.warn('Errore esecuzione stacchetto audio:', e);
    }
  };

  const handleAssignNadiaPoints = (teamNum: number) => {
    if (nadiaAssignedTeam !== null) return;
    // Quando c'è Mille e una Nadia la risposta corretta dà SEMPRE 1000 punti
    addScore(teamNum - 1, 1000);
    setNadiaAssignedTeam(teamNum);
    setNadiaBookedTeam(null);
    setNadiaSolutionShown(true);
    sendSerialReset();
  };

  const handleResetNadiaPoints = () => {
    if (nadiaAssignedTeam !== null) {
      addScore(nadiaAssignedTeam - 1, -1000);
      setNadiaAssignedTeam(null);
      setNadiaBookedTeam(null);
      sendSerialReset();
    }
  };

  const handleCancelNadiaBooking = (withError = false) => {
    if (withError) {
      triggerNadiaError();
    }
    setNadiaBookedTeam(null);
    sendSerialReset();
  };

  const handleBookTeamNadia = (teamNum: number) => {
    if (nadiaAssignedTeam === null && nadiaBookedTeam === null) {
      setNadiaBookedTeam(teamNum);
    }
  };

  const handleTriggerNadia = () => {
    if (!nadiaQuestionForCurrentSlot) return;
    const qId = nadiaQuestionForCurrentSlot.id;
    const orderKey = `playstate_nadia_order_${qId}`;

    // Calcoliamo la permutazione [0, 1, 2] se non già memorizzata
    let order = [0, 1, 2];
    const saved = localStorage.getItem(orderKey);
    if (!saved) {
      // Fisher-Yates shuffle casuale
      order = [0, 1, 2].sort(() => Math.random() - 0.5);
      localStorage.setItem(orderKey, JSON.stringify(order));
      window.dispatchEvent(new CustomEvent('local-storage-update', {
        detail: { key: orderKey, value: JSON.stringify(order) }
      }));
      if ((window as any).electron?.broadcastState) {
        (window as any).electron.broadcastState({
          localStorageUpdate: { key: orderKey, value: JSON.stringify(order) }
        });
      }
    }

    setNadiaQuestionId(qId);
    setNadiaStep(0);
    setNadiaSolutionShown(false);
    setNadiaBookedTeam(null);
    setNadiaAssignedTeam(null);
    setNadiaActive(true);
    sendSerialReset();
    playNadiaJingle(false);
  };

  const handleCloseNadia = (playExitSound = true) => {
    if (playExitSound) {
      playNadiaJingle(true);
    }
    setNadiaActive(false);
    setNadiaStep(0);
    setNadiaSolutionShown(false);
    setNadiaBookedTeam(null);
    setNadiaAssignedTeam(null);
    sendSerialReset();
  };

  // Scorciatoie da tastiera per Nadia
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }
      if (nadiaActive) {
        if (e.key === '1') {
          if (nadiaBookedTeam === null && nadiaAssignedTeam === null) {
            handleBookTeamNadia(1);
          }
        } else if (e.key === '2') {
          if (nadiaBookedTeam === null && nadiaAssignedTeam === null) {
            handleBookTeamNadia(2);
          }
        } else if (e.key === '3') {
          if (nadiaBookedTeam === null && nadiaAssignedTeam === null) {
            handleBookTeamNadia(3);
          }
        } else if (e.key === 'ArrowRight') {
          // Freccia Destra: fa apparire le possibili risposte per dare a tutti lo stesso tempo
          e.preventDefault();
          if (nadiaStep === 0) {
            setNadiaStep(1);
          }
        } else if (e.key === 'ArrowLeft') {
          // Freccia Sinistra: permette di tornare indietro a solo domanda se non svelata
          e.preventDefault();
          if (nadiaStep === 1 && !nadiaSolutionShown) {
            setNadiaStep(0);
          }
        } else if (e.key === 's' || e.key === 'S' || e.key === 'Enter') {
          setNadiaSolutionShown((prev) => !prev);
        } else if (e.key === 'e' || e.key === 'E' || e.key === 'x' || e.key === 'X') {
          // Segnala Errore con grande X rossa + scossa
          handleCancelNadiaBooking(true);
        } else if (e.key === 'Escape') {
          if (nadiaBookedTeam !== null) {
            handleCancelNadiaBooking(true);
          } else {
            handleCloseNadia(true);
          }
        } else if (e.key === 'm' || e.key === 'M') {
          playNadiaJingle(false);
        } else if (e.key === 'Backspace') {
          if (nadiaBookedTeam !== null) {
            handleCancelNadiaBooking(true);
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nadiaActive, nadiaStep, setNadiaStep, nadiaBookedTeam, nadiaAssignedTeam, nadiaSolutionShown, setNadiaSolutionShown]);

  const numBox4Questions = Math.max(1, (setupState.gioco4?.frasi && setupState.gioco4.frasi.length > 0) ? setupState.gioco4.frasi.length : 2);
  const maxQuestionsForBox = activeBox === 1 ? 10 : activeBox === 2 ? 6 : activeBox === 3 ? 3 : activeBox === 4 ? numBox4Questions : 1;

  const handleNext = () => {
    sendSerialReset();
    if (nadiaActive) {
      handleCloseNadia(true);
    }
    if (activeQuestion < maxQuestionsForBox) {
      const nextQ = activeQuestion + 1;
      setActiveQuestion(nextQ);
      if (activeBox === 4) {
        setActivePhraseIndex(nextQ - 1);
      }
    } else if (activeBox < 5) {
      const nextB = activeBox + 1;
      setActiveBox(nextB);
      setActiveQuestion(1);
      if (nextB === 4) {
        setActivePhraseIndex(0);
      }
    }
  };

  const handlePrev = () => {
    sendSerialReset();
    if (nadiaActive) {
      handleCloseNadia(true);
    }
    if (activeQuestion > 1) {
      const prevQ = activeQuestion - 1;
      setActiveQuestion(prevQ);
      if (activeBox === 4) {
        setActivePhraseIndex(prevQ - 1);
      }
    } else if (activeBox > 1) {
      const prevBox = activeBox - 1;
      const prevMax = prevBox === 1 ? 10 : prevBox === 2 ? 6 : prevBox === 3 ? 3 : prevBox === 4 ? numBox4Questions : 1;
      setActiveBox(prevBox);
      setActiveQuestion(prevMax);
      if (prevBox === 4) {
        setActivePhraseIndex(prevMax - 1);
      }
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#121214] text-white overflow-hidden font-sans">
        {/* Navigation Header */}
        <header className="h-14 flex items-center px-6 border-b border-white/10 bg-[#18181b] shrink-0 justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onGoToSetup}
              className="text-xs font-semibold bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-lg border border-white/15 transition-all flex items-center gap-1.5 text-white"
            >
              ⚙️ Setup Pagina 0
            </button>
            <div className="h-4 w-px bg-white/15" />
            <h1 className="text-sm font-bold text-white tracking-wide">
              IMPERIO — Vista Sequenziale Squadre
            </h1>
            <div className="h-4 w-px bg-white/15" />
            <button
              type="button"
              onClick={triggerFadeOutBroadcast}
              className="px-2.5 py-1 text-[11px] font-semibold text-amber-400 bg-amber-950/20 hover:bg-amber-950/40 border border-amber-900/30 hover:border-amber-800/50 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
              title="Sfuma gradualmente tutte le tracce audio attive"
            >
              🎵 Sfuma Audio
            </button>
            <button
              type="button"
              onClick={() => setShowLegend(true)}
              className="px-2.5 py-1 text-[11px] font-semibold text-blue-400 bg-blue-950/20 hover:bg-blue-950/40 border border-blue-900/30 hover:border-blue-800/50 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
              title="Legenda dei tasti rapidi"
            >
              ⌨️ Legenda
            </button>
            <div className="h-4 w-px bg-white/15" />
            <button
              type="button"
              onClick={() => setShowIpadModal(true)}
              className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${
                ipadStatus.ipadConnected 
                  ? 'bg-emerald-600/10 hover:bg-emerald-600/20 border-emerald-500/30 text-emerald-400' 
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/70'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${ipadStatus.ipadConnected ? 'bg-emerald-500 animate-pulse' : 'bg-white/40'}`} />
              📱 iPad: {ipadStatus.ipadConnected ? `${ipadStatus.ipadCount} Connesso` : 'Disconnesso'}
            </button>
            <div className="h-4 w-px bg-white/15" />
            <WebSerialManager activeSlideId={activeSlide.id} activeSlideType={activeSlide.type} />
          </div>

          {/* Active Box Selector */}
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((boxNum) => (
              <button
                key={boxNum}
                type="button"
                onClick={() => {
                  sendSerialReset();
                  if (nadiaActive) {
                    handleCloseNadia(true);
                  }
                  setActiveBox(boxNum);
                  setActiveQuestion(1);
                  if (boxNum === 4) {
                    setActivePhraseIndex(0);
                  }
                }}
                className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all ${
                  activeBox === boxNum
                    ? 'bg-[#d24726] border-[#d24726] text-white shadow-lg shadow-[#d24726]/30'
                    : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                BOX {boxNum}
              </button>
            ))}
          </div>
        </header>

        {/* Question Selector Sub-Header */}
        <div className="h-12 bg-[#1c1c21] border-b border-white/10 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            {activeBox === 4 ? (
              <>
                <span className="text-xs font-semibold text-white/50">Seleziona Frase:</span>
                <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                  {Array.from({ length: maxQuestionsForBox }, (_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        sendSerialReset();
                        if (nadiaActive) {
                          handleCloseNadia(true);
                        }
                        setActivePhraseIndex(idx);
                        setActiveQuestion(idx + 1);
                      }}
                      className={`w-7 h-7 text-xs font-bold rounded-md flex items-center justify-center transition-all ${
                        activeQuestion === idx + 1
                          ? 'bg-amber-500 text-black shadow'
                          : 'bg-white/5 hover:bg-white/10 text-white/70 border border-white/5'
                      }`}
                    >
                      #{idx + 1}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <span className="text-xs font-semibold text-white/50">Seleziona Domanda:</span>
                <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                  {Array.from({ length: maxQuestionsForBox }, (_, i) => i + 1).map((qNum) => (
                    <button
                      key={qNum}
                      type="button"
                      onClick={() => {
                        sendSerialReset();
                        if (nadiaActive) {
                          handleCloseNadia(true);
                        }
                        setActiveQuestion(qNum);
                      }}
                      className={`w-7 h-7 text-xs font-bold rounded-md flex items-center justify-center transition-all ${
                        activeQuestion === qNum
                          ? 'bg-amber-500 text-black shadow'
                          : 'bg-white/5 hover:bg-white/10 text-white/70 border border-white/5'
                      }`}
                    >
                      #{qNum}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrev}
              disabled={activeBox === 1 && activeQuestion === 1}
              className="px-3 py-1 text-xs font-semibold bg-white/10 hover:bg-white/15 disabled:opacity-30 rounded text-white border border-white/10 transition-all"
            >
              ◀ Precedente
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="px-4 py-1 text-xs font-bold bg-[#d24726] hover:bg-[#e85a38] rounded text-white shadow transition-all"
            >
              Prossima Domanda ▶
            </button>
          </div>
        </div>

        {/* Main 16:9 Viewport Area */}
        <div className={`flex-1 gap-4 p-4 min-h-0 bg-[#0d0d0f] ${maximizedPanel === 'none' ? 'grid grid-cols-1 lg:grid-cols-2' : 'flex'}`}>
          {(maximizedPanel === 'none' || maximizedPanel === 'left') && (
            <PresenterPreviewPanel
              title={`BOX ${activeBox} — Domanda #${activeQuestion}`}
              onToggleMaximize={() => setMaximizedPanel(maximizedPanel === 'left' ? 'none' : 'left')}
              isMaximized={maximizedPanel === 'left'}
              footer={
                nadiaQuestionForCurrentSlot ? (
                  !nadiaActive ? (
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleTriggerNadia}
                        className="px-5 py-2 text-xs font-black rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-400 hover:via-orange-400 hover:to-rose-400 text-black shadow-lg shadow-amber-500/30 border border-amber-300 transition-all flex items-center gap-2 cursor-pointer transform hover:scale-[1.02] active:scale-[0.98] animate-pulse"
                      >
                        <span className="text-sm">✨</span>
                        <span>Richiama Mille e una Nadia</span>
                      </button>
                    </div>
                  ) : (
                    <div className="bg-[#18181b]/95 border border-white/20 rounded-2xl p-2.5 shadow-2xl backdrop-blur-md flex flex-col gap-2 max-w-2xl w-full">
                      {/* Sezione Stato / Prenotazione / Assegnazione */}
                      {nadiaBookedTeam !== null && nadiaAssignedTeam === null ? (
                        /* Squadra Prenotata al Buzzer */
                        <div className="flex items-center justify-between gap-3 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl">
                          <div className="flex items-center gap-2">
                            <span className="text-base animate-pulse">⚡</span>
                            <span className={`text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded border ${
                              nadiaBookedTeam === 1
                                ? 'bg-red-500/20 text-red-300 border-red-500/50'
                                : nadiaBookedTeam === 2
                                ? 'bg-blue-500/20 text-blue-300 border-blue-500/50'
                                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                            }`}>
                              {teamNames[nadiaBookedTeam - 1] || `Squadra ${nadiaBookedTeam}`} Prenotata
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Tasto Risposta Corretta: la squadra prenotata riceve i punti e vince */}
                            <button
                              type="button"
                              onClick={() => handleAssignNadiaPoints(nadiaBookedTeam)}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-lg shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                              <span>✓ Risposta Corretta</span>
                            </button>

                            {/* Tasto Errata / Annulla Prenotazione */}
                            <button
                              type="button"
                              onClick={() => handleCancelNadiaBooking(true)}
                              className="px-2.5 py-1 bg-red-600/30 hover:bg-red-600 text-red-200 hover:text-white border border-red-500/40 text-xs font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                              title="Risposta errata: mostra X di errore e annulla la prenotazione (Esc / E / X)"
                            >
                              <span>✕ Risposta Errata / Sblocca</span>
                              <kbd className="text-[9px] bg-black/40 px-1 py-0.5 rounded opacity-70">Esc</kbd>
                            </button>
                          </div>
                        </div>
                      ) : nadiaAssignedTeam !== null ? (
                        /* Risposta Convalidata */
                        <div className="flex items-center justify-between gap-3 bg-emerald-950/40 border border-emerald-500/40 px-3 py-1.5 rounded-xl">
                          <div className="flex items-center gap-2">
                            <span className="text-base">🏆</span>
                            <span className="text-xs font-black text-emerald-300 uppercase tracking-wider">
                              Risposta Corretta Convalidata: {teamNames[nadiaAssignedTeam - 1] || `Squadra ${nadiaAssignedTeam}`}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={handleResetNadiaPoints}
                            className="px-2.5 py-1 text-white/50 hover:text-red-400 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer"
                          >
                            ↩ Annulla
                          </button>
                        </div>
                      ) : (
                        /* Nessuno Prenotato: Tasti Rapidi per Testare la Prenotazione */
                        <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-black uppercase text-amber-400/80 mr-1 flex items-center gap-1">
                              <span>⚡</span> Test Prenota:
                            </span>
                            {[1, 2, 3].map((tNum) => (
                              <button
                                key={tNum}
                                type="button"
                                onClick={() => handleBookTeamNadia(tNum)}
                                className={`px-2.5 py-1 rounded text-[11px] font-black border transition-all cursor-pointer flex items-center gap-1 ${
                                  tNum === 1
                                    ? 'bg-red-500/15 hover:bg-red-500/30 text-red-300 border-red-500/30'
                                    : tNum === 2
                                    ? 'bg-blue-500/15 hover:bg-blue-500/30 text-blue-300 border-blue-500/30'
                                    : 'bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/30'
                                }`}
                              >
                                <span>{teamNames[tNum - 1] || `S${tNum}`}</span>
                                <kbd className="text-[9px] bg-black/40 px-1 rounded opacity-70">{tNum}</kbd>
                              </button>
                            ))}
                          </div>
                          <span className="text-[11px] text-white/40 italic">
                            In attesa di prenotazione al buzzer...
                          </span>
                        </div>
                      )}

                      {/* Barra Inferiore Controlli (Rivelazione risposte, Soluzione, Stacchetto, Chiudi) */}
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/10 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] font-black text-amber-300 uppercase tracking-wider flex items-center gap-1 mr-1">
                            <span>✨</span> Mille e una Nadia
                          </span>

                          {/* Pulsante Mostra / Nascondi Risposte A, B, C */}
                          {nadiaStep === 0 ? (
                            <button
                              type="button"
                              onClick={() => setNadiaStep(1)}
                              className="px-3 py-1 text-xs font-black rounded-lg bg-gradient-to-r from-amber-400 to-yellow-300 hover:from-amber-300 hover:to-yellow-200 text-black shadow-lg shadow-amber-500/40 border border-amber-300 transition-all flex items-center gap-1.5 cursor-pointer animate-pulse"
                              title="Mostra le 3 opzioni di risposta contemporaneamente (Freccia Destra ▶)"
                            >
                              <span>▶ Mostra Risposte A, B, C</span>
                              <kbd className="text-[10px] bg-black/40 text-white px-1.5 py-0.5 rounded">▶</kbd>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setNadiaStep(0)}
                              className="px-2.5 py-1 text-xs font-bold rounded-lg bg-white/10 hover:bg-white/15 text-white/70 border border-white/15 transition-all flex items-center gap-1 cursor-pointer"
                              title="Torna a mostrare solo la domanda (Freccia Sinistra ◀)"
                            >
                              <span>◀ Solo Domanda</span>
                              <kbd className="text-[9px] bg-black/40 px-1 py-0.5 rounded">◀</kbd>
                            </button>
                          )}

                          {/* Tasto Svela Soluzione */}
                          <button
                            type="button"
                            onClick={() => setNadiaSolutionShown((prev) => !prev)}
                            className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${
                              nadiaSolutionShown
                                ? 'bg-emerald-600 text-white border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                                : 'bg-white/5 hover:bg-white/10 text-white/80 border-white/10'
                            }`}
                          >
                            <span>{nadiaSolutionShown ? '✓ Risposta Svelata' : '👁️ Svela Risposta Corretta'}</span>
                            <kbd className="text-[9px] bg-black/40 px-1 py-0.5 rounded border border-white/20">S</kbd>
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Tasto Riascolta Stacchetto */}
                          {setupState.nadia?.musicaStacchetto && (
                            <button
                              type="button"
                              onClick={() => playNadiaJingle(false)}
                              className="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition-all flex items-center gap-1 cursor-pointer"
                              title="Riproduci stacchetto musicale (M)"
                            >
                              <span>🎵 Stacchetto</span>
                              <kbd className="text-[9px] bg-black/40 px-1 py-0.5 rounded opacity-70">M</kbd>
                            </button>
                          )}

                          {/* Tasto Chiudi Nadia */}
                          <button
                            type="button"
                            onClick={() => handleCloseNadia(true)}
                            className="px-2.5 py-1 text-xs font-bold rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 transition-all flex items-center gap-1 cursor-pointer"
                            title="Chiudi Mille e una Nadia e torna al gioco (Esc)"
                          >
                            <span>✕ Chiudi Nadia</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                ) : null
              }
            >
              <SlideCanvas
                slide={
                  activeSlide.type === 'password_squadre'
                    ? { ...activeSlide, type: 'password_prescelti' }
                    : activeSlide
                }
                interactive
                viewportMode="none"
                nadiaSetup={setupState.nadia}
                isPresenter={true}
              />
            </PresenterPreviewPanel>
          )}

          {(maximizedPanel === 'none' || maximizedPanel === 'right') && (
            <PresenterPreviewPanel
              title="Punteggi & Classifica Squadre"
              onToggleMaximize={() => setMaximizedPanel(maximizedPanel === 'right' ? 'none' : 'right')}
              isMaximized={maximizedPanel === 'right'}
            >
              <ClassificaGenerale_Board />
            </PresenterPreviewPanel>
          )}
        </div>

        {showLegend && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#1e1e24] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <header className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-[#282830]">
              <div className="flex items-center gap-2">
                <span className="text-xl">⌨️</span>
                <h2 className="text-lg font-bold text-white tracking-wide">Legenda Tasti Rapidi e Scorciatoie</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowLegend(false)}
                className="text-white/60 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-all text-sm font-semibold cursor-pointer"
              >
                Chiudi ✕
              </button>
            </header>
            
            <div className="p-6 overflow-y-auto space-y-6 text-sm text-white/80">
              <p className="text-xs text-white/50 border-b border-white/5 pb-2">
                Le scorciatoie da tastiera vengono catturate nella schermata del Relatore (purché non si stia digitando in un campo di testo) e inoltrate automaticamente allo Schermo Pubblico.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Gruppo 1: Comandi Generali */}
                <div className="space-y-3 bg-white/5 p-4 rounded-xl border border-white/5">
                  <h3 className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                    ⚙️ Controlli Generali (Tutti i Giochi)
                  </h3>
                  <ul className="space-y-2.5">
                    <li className="flex items-start justify-between gap-4">
                      <span>Mostra Soluzione / Auto-svelamento</span>
                      <kbd className="px-2 py-0.5 bg-neutral-800 text-white rounded border border-neutral-700 text-xs font-mono font-bold shrink-0">S</kbd>
                    </li>
                    <li className="flex items-start justify-between gap-4">
                      <span>Mostra Soluzione / Salta Step</span>
                      <kbd className="px-2 py-0.5 bg-neutral-800 text-white rounded border border-neutral-700 text-xs font-mono font-bold shrink-0">Invio</kbd>
                    </li>
                    <li className="flex items-start justify-between gap-4">
                      <span>Segnala Errore (Effetto Scossa)</span>
                      <kbd className="px-2 py-0.5 bg-neutral-800 text-white rounded border border-neutral-700 text-xs font-mono font-bold shrink-0">E</kbd>
                    </li>
                    <li className="flex items-start justify-between gap-4">
                      <span>Segnala Errore (Alternativo)</span>
                      <kbd className="px-2 py-0.5 bg-neutral-800 text-white rounded border border-neutral-700 text-xs font-mono font-bold shrink-0">X</kbd>
                    </li>
                  </ul>
                </div>

                {/* Gruppo 2: Box 1 (Musica & Immagine) */}
                <div className="space-y-3 bg-white/5 p-4 rounded-xl border border-white/5">
                  <h3 className="text-xs font-black uppercase text-blue-400 tracking-wider flex items-center gap-1.5">
                    🎵 Box 1 — Musica & Immagine
                  </h3>
                  <ul className="space-y-2.5">
                    <li className="flex items-start justify-between gap-4">
                      <span>Avanza step (rivela indizio/strumento/tassello)</span>
                      <kbd className="px-2 py-0.5 bg-neutral-800 text-white rounded border border-neutral-700 text-xs font-mono font-bold shrink-0">▶ Freccia Destra</kbd>
                    </li>
                    <li className="flex items-start justify-between gap-4">
                      <span>Regredisci step (nascondi/annulla)</span>
                      <kbd className="px-2 py-0.5 bg-neutral-800 text-white rounded border border-neutral-700 text-xs font-mono font-bold shrink-0">◀ Freccia Sinistra</kbd>
                    </li>
                    <li className="flex items-start justify-between gap-4">
                      <span>Riproduci/Pausa audio di sottofondo (Immagine)</span>
                      <kbd className="px-2 py-0.5 bg-neutral-800 text-white rounded border border-neutral-700 text-xs font-mono font-bold shrink-0">M</kbd>
                    </li>
                  </ul>
                </div>

                {/* Gruppo 3: Box 2 (Classifica & Classifica Musicale) */}
                <div className="space-y-3 bg-white/5 p-4 rounded-xl border border-white/5">
                  <h3 className="text-xs font-black uppercase text-green-400 tracking-wider flex items-center gap-1.5">
                    📊 Box 2 — Classifiche
                  </h3>
                  <ul className="space-y-2.5">
                    <li className="flex items-start justify-between gap-4">
                      <span>Rivela indizio specifico (1 a 9) e assegna punti</span>
                      <kbd className="px-2 py-0.5 bg-neutral-800 text-white rounded border border-neutral-700 text-xs font-mono font-bold shrink-0">1 - 9</kbd>
                    </li>
                    <li className="flex items-start justify-between gap-4">
                      <span>Rivela indizio 10 e assegna punti</span>
                      <kbd className="px-2 py-0.5 bg-neutral-800 text-white rounded border border-neutral-700 text-xs font-mono font-bold shrink-0">0</kbd>
                    </li>
                    <li className="flex items-start justify-between gap-4">
                      <span>Mostra/Nascondi Titolo o Argomento</span>
                      <kbd className="px-2 py-0.5 bg-neutral-800 text-white rounded border border-neutral-700 text-xs font-mono font-bold shrink-0">T</kbd>
                    </li>
                    <li className="flex items-start justify-between gap-4">
                      <span>Play/Pause audio (Classifica) o Riavvia stems (Musicale)</span>
                      <kbd className="px-2 py-0.5 bg-neutral-800 text-white rounded border border-neutral-700 text-xs font-mono font-bold shrink-0">M</kbd>
                    </li>
                  </ul>
                </div>

                {/* Gruppo 4: Gioco 4 Frase Tempo */}
                <div className="space-y-3 bg-white/5 p-4 rounded-xl border border-white/5">
                  <h3 className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                    🔤 Box 4 — Frase con Tempo
                  </h3>
                  <ul className="space-y-2.5">
                    <li className="flex items-start justify-between gap-4">
                      <span>Inserisci lettera nella frase</span>
                      <kbd className="px-2 py-0.5 bg-neutral-800 text-white rounded border border-neutral-700 text-xs font-mono font-bold shrink-0">A - Z</kbd>
                    </li>
                    <li className="flex items-start justify-between gap-4">
                      <span>Scopri soluzione (Vittoria asta)</span>
                      <kbd className="px-2 py-0.5 bg-neutral-800 text-white rounded border border-neutral-700 text-xs font-mono font-bold shrink-0">Invio</kbd>
                    </li>
                    <li className="flex items-start justify-between gap-4">
                      <span>Segnala Errore squadra (Bonus agli altri)</span>
                      <kbd className="px-2 py-0.5 bg-neutral-800 text-white rounded border border-neutral-700 text-xs font-mono font-bold shrink-0">\</kbd>
                    </li>
                    <li className="flex items-start justify-between gap-4">
                      <span>Imposta offerta asta / Frecce</span>
                      <kbd className="px-2 py-0.5 bg-neutral-800 text-white rounded border border-neutral-700 text-xs font-mono font-bold shrink-0">0 - 9 / ▲▼</kbd>
                    </li>
                    <li className="flex items-start justify-between gap-4">
                      <span>Resetta frase corrente</span>
                      <kbd className="px-2 py-0.5 bg-neutral-800 text-white rounded border border-neutral-700 text-xs font-mono font-bold shrink-0">Canc / Backspace</kbd>
                    </li>
                  </ul>
                </div>

                {/* Gruppo 5: Altri moduli */}
                <div className="space-y-3 bg-white/5 p-4 rounded-xl border border-white/5">
                  <h3 className="text-xs font-black uppercase text-purple-400 tracking-wider flex items-center gap-1.5">
                    🧩 Box 3 Password & Altri Moduli
                  </h3>
                  <ul className="space-y-2.5">
                    <li className="flex items-start justify-between gap-4">
                      <span>Seleziona bussolotto (Password Squadre)</span>
                      <kbd className="px-2 py-0.5 bg-neutral-800 text-white rounded border border-neutral-700 text-xs font-mono font-bold shrink-0">1 - 5</kbd>
                    </li>
                    <li className="flex items-start justify-between gap-4">
                      <span>Avvia/Ferma musica di sottofondo</span>
                      <kbd className="px-2 py-0.5 bg-neutral-800 text-white rounded border border-neutral-700 text-xs font-mono font-bold shrink-0">M</kbd>
                    </li>
                  </ul>
                </div>

                {/* Gruppo 6: Mille e una Nadia */}
                <div className="space-y-3 bg-gradient-to-br from-amber-500/10 to-orange-500/10 p-4 rounded-xl border border-amber-500/20 md:col-span-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase text-amber-300 tracking-wider flex items-center gap-1.5">
                      ✨ Mille e una Nadia (Risposta Esatta: SEMPRE 1.000 pt)
                    </h3>
                    <span className="text-[10px] font-bold text-amber-300/80 bg-amber-400/20 px-2 py-0.5 rounded-full border border-amber-400/30">
                      Buzzer Hardware ESP32 & iPad abilitati
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="flex items-center justify-between gap-2 bg-black/30 p-2.5 rounded-lg border border-white/5">
                      <span className="text-xs">Prenota Squadra</span>
                      <kbd className="px-2 py-0.5 bg-neutral-800 text-amber-300 rounded border border-neutral-700 text-xs font-mono font-bold shrink-0">1 - 3</kbd>
                    </div>
                    <div className="flex items-center justify-between gap-2 bg-black/30 p-2.5 rounded-lg border border-white/5">
                      <span className="text-xs">Svela Risposta Corretta</span>
                      <kbd className="px-2 py-0.5 bg-neutral-800 text-amber-300 rounded border border-neutral-700 text-xs font-mono font-bold shrink-0">S / Invio</kbd>
                    </div>
                    <div className="flex items-center justify-between gap-2 bg-black/30 p-2.5 rounded-lg border border-white/5">
                      <span className="text-xs">Sblocca Buzzer / Errata</span>
                      <kbd className="px-2 py-0.5 bg-neutral-800 text-amber-300 rounded border border-neutral-700 text-xs font-mono font-bold shrink-0">Esc / Canc</kbd>
                    </div>
                    <div className="flex items-center justify-between gap-2 bg-black/30 p-2.5 rounded-lg border border-white/5">
                      <span className="text-xs">Riascolta Stacchetto</span>
                      <kbd className="px-2 py-0.5 bg-neutral-800 text-amber-300 rounded border border-neutral-700 text-xs font-mono font-bold shrink-0">M</kbd>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <footer className="px-6 py-4 border-t border-white/10 bg-[#19191e] flex justify-end">
              <button
                type="button"
                onClick={() => setShowLegend(false)}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-lg transition-all cursor-pointer shadow-lg shadow-blue-500/10"
              >
                Ho Capito
              </button>
            </footer>
          </div>
        </div>
      )}

      {showIpadModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#1e1e24] border border-white/10 rounded-2xl w-full max-w-md flex flex-col shadow-2xl overflow-hidden p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>📱</span> Connessione iPad
              </h3>
              <button
                type="button"
                onClick={() => setShowIpadModal(false)}
                className="text-white/60 hover:text-white text-sm font-semibold cursor-pointer"
              >
                Chiudi ✕
              </button>
            </div>

            <div className="flex flex-col items-center text-center space-y-4">
              <p className="text-xs text-white/60">
                Inquadra questo QR Code con la fotocamera dell'iPad (o di un altro dispositivo) connesso alla stessa rete Wi-Fi del Mac.
              </p>

              {qrCodeDataUrl ? (
                <div className="bg-white p-4 rounded-xl shadow-inner border border-white/15">
                  <img src={qrCodeDataUrl} alt="QR Code per iPad" className="w-48 h-48" />
                </div>
              ) : (
                <div className="w-48 h-48 flex items-center justify-center bg-slate-800 rounded-xl text-xs text-white/40">
                  Generazione QR Code...
                </div>
              )}

              <div className="w-full bg-slate-800 p-3 rounded-lg border border-slate-700">
                <span className="text-[10px] text-white/40 uppercase block mb-1 font-black">URL del Server</span>
                <code className="text-xs text-yellow-400 font-mono select-all break-all">
                  {serverUrl ? `${serverUrl}/?mode=ipad` : 'Ricerca in corso...'}
                </code>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className={`w-2.5 h-2.5 rounded-full ${ipadStatus.ipadConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                <span className="text-white/70">
                  Stato: {ipadStatus.ipadConnected ? `Connesso (${ipadStatus.ipadCount} dispositivo/i)` : 'Nessun iPad rilevato'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIpadModal(false)}
              className="mt-6 w-full py-2.5 bg-slate-700 hover:bg-slate-650 text-white text-xs font-bold rounded-lg transition-all cursor-pointer"
            >
              Fatto
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
