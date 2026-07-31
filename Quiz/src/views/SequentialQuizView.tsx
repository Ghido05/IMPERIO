import React, { useState, useEffect } from 'react';
import SlideCanvas from '../components/SlideCanvas';
import ClassificaGenerale_Board from '../ClassificaGenerale_Board';
import PresenterPreviewPanel from '../components/PresenterPreviewPanel';
import ScoreAssigner from '../components/ScoreAssigner';
import { ScoreProvider } from '../context/ScoreContext';
import { Slide } from '../App';
import {
  QuizSetupState,
  getDefaultSetupState,
  createDefaultGioco1Question,
  createDefaultGioco2Question,
} from './QuizSetupView';
import { loadSetupStateDb } from '../lib/quizDb';
import { useSyncedState } from '../hooks/useSyncedState';
import { cloneDefaultData } from '../lib/defaultGameData';

export function getSlideForBoxQuestion(
  setupState: QuizSetupState,
  boxNum: number,
  questionNum: number
): Slide {
  if (boxNum === 1) {
    const q1 = setupState.gioco1?.questions?.[questionNum] || createDefaultGioco1Question();
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
        sfondo: '',
      };
      return { id: `box1_q${questionNum}`, type: 'music', data };
    } else {
      const data = {
        sfondo: '',
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
          categoria: '',
          anno: '',
        },
        griglia: { colonne: 10, righe: 10, puntoFocale: { colonna: 5, riga: 5 } },
      };
      return { id: `box1_q${questionNum}`, type: 'img', data };
    }
  }

  if (boxNum === 2) {
    const q2 = setupState.gioco2?.questions?.[questionNum] || createDefaultGioco2Question();
    if (q2.tipo === 'canzone') {
      const data = {
        titolo: q2.canzone.titolo || 'Classifica Musicale',
        sfondo: '',
        immagineSegreta: '',
        soluzioneTesto: q2.canzone.info ? `${q2.canzone.titolo} - ${q2.canzone.info}` : q2.canzone.titolo || 'Soluzione',
        canzoneFinale: q2.canzone.soluzioneAudio || '',
        elementi: [0, 1, 2, 3, 4, 5, 6].map((i) => ({
          posizione: i + 1,
          testo: q2.canzone.risposte[i] || `Strumento ${i + 1}`,
          audio: q2.canzone.audioFiles[i] || '',
          frase: q2.canzone.indizi[i] || '',
        })),
      };
      return { id: `box2_q${questionNum}`, type: 'classifica_musicale', data };
    } else {
      const data = {
        titolo: q2.immagine.soluzioneTesto || 'Classifica Immagine',
        sfondo: '',
        immagineSegreta: q2.immagine.immagineJpg || '',
        audio: q2.immagine.soluzioneAudio || '',
        elementi: (q2.immagine.lista10 || []).map((txt, i) => ({
          posizione: i + 1,
          testo: txt || `Voce ${i + 1}`,
        })),
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
        bussolotti: defaultData.manches[num - 1]?.bussolotti || {
          immagine_premio: "/Icone/premio_bonus.png",
          posizione_premio_2_posto: 0,
          posizione_premio_3_posto: 4
        }
      };
    }).filter(Boolean);

    const data = {
      manches: setupManches.length > 0 ? setupManches : defaultData.manches
    };
    return { id: 'password_squadre', type: 'password_squadre', data };
  }

  if (boxNum === 4) {
    return { id: 'gioco_frase_tempo', type: 'gioco_frase_tempo', data: cloneDefaultData('gioco_frase_tempo') };
  }

  if (boxNum === 5) {
    return { id: 'cruciverba', type: 'cruciverba', data: cloneDefaultData('cruciverba') };
  }

  return { id: `box${boxNum}_q${questionNum}`, type: 'empty' };
}

interface SequentialQuizViewProps {
  onGoToSetup: () => void;
}

export default function SequentialQuizView({ onGoToSetup }: SequentialQuizViewProps) {
  const [setupState, setSetupState] = useState<QuizSetupState>(getDefaultSetupState());
  const [activeBox, setActiveBox] = useState<number>(1);
  const [activeQuestion, setActiveQuestion] = useState<number>(1);

  const slideId = `box${activeBox}_q${activeQuestion}`;
  const [activeRevealed] = useSyncedState<Record<number, boolean>>(`playstate_${slideId}_revealed`, {});
  const [activePointsAssigned, setActivePointsAssigned] = useSyncedState<Record<number, number>>(`playstate_${slideId}_points`, {});
  const [activeLatestClue] = useSyncedState<number>(`playstate_${slideId}_latest`, 0);

  // Load configuration from IndexedDB & LocalStorage on mount
  useEffect(() => {
    async function loadData() {
      const fromDb = await loadSetupStateDb();
      if (fromDb) {
        setSetupState(fromDb);
      } else {
        const saved = localStorage.getItem('imperio_quiz_setup_config_v1');
        if (saved) {
          try {
            setSetupState(JSON.parse(saved));
          } catch (e) {
            console.error('Error parsing local setup:', e);
          }
        }
      }
    }
    loadData();
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

  // Forward keyboard events (game control keys) to other windows
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }
      if (e.metaKey || e.ctrlKey) return;

      const isElectron = (window as any).electron !== undefined;
      if (isElectron) {
        (window as any).electron.broadcastState({
          forwardedKey: {
            key: e.key,
            code: e.code,
            keyCode: e.keyCode,
            shiftKey: e.shiftKey,
            altKey: e.altKey,
          },
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const maxQuestionsForBox = activeBox === 1 ? 10 : activeBox === 2 ? 6 : 1;

  const handleNext = () => {
    if (activeQuestion < maxQuestionsForBox) {
      setActiveQuestion(activeQuestion + 1);
    } else if (activeBox < 5) {
      setActiveBox(activeBox + 1);
      setActiveQuestion(1);
    }
  };

  const handlePrev = () => {
    if (activeQuestion > 1) {
      setActiveQuestion(activeQuestion - 1);
    } else if (activeBox > 1) {
      const prevBox = activeBox - 1;
      const prevMax = prevBox === 1 ? 10 : prevBox === 2 ? 6 : 1;
      setActiveBox(prevBox);
      setActiveQuestion(prevMax);
    }
  };

  return (
    <ScoreProvider>
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
          </div>

          {/* Active Box Selector */}
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((boxNum) => (
              <button
                key={boxNum}
                type="button"
                onClick={() => {
                  setActiveBox(boxNum);
                  setActiveQuestion(1);
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
            <span className="text-xs font-semibold text-white/50">Seleziona Domanda:</span>
            <div className="flex items-center gap-1.5 overflow-x-auto py-1">
              {Array.from({ length: maxQuestionsForBox }, (_, i) => i + 1).map((qNum) => (
                <button
                  key={qNum}
                  type="button"
                  onClick={() => setActiveQuestion(qNum)}
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
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 min-h-0 bg-[#0d0d0f]">
          <PresenterPreviewPanel title={`BOX ${activeBox} — Domanda #${activeQuestion}`}>
            <SlideCanvas
              slide={
                activeSlide.type === 'password_squadre'
                  ? { ...activeSlide, type: 'password_prescelti' }
                  : activeSlide
              }
              interactive
              viewportMode="none"
            />
          </PresenterPreviewPanel>

          <PresenterPreviewPanel title="Punteggi & Classifica Squadre">
            <ClassificaGenerale_Board />
          </PresenterPreviewPanel>
        </div>
      </div>
    </ScoreProvider>
  );
}
