import { useState, useEffect, useRef } from 'react';
import SlideCanvas from '../components/SlideCanvas';
import WelcomeScreen from '../components/WelcomeScreen';
import QuizSetupView, { 
  QuizSetupState, 
  getDefaultSetupState, 
  createDefaultGioco1Question, 
  createDefaultGioco2Question 
} from './QuizSetupView';
import SequentialQuizView from './SequentialQuizView';
import PresenterPreviewPanel from '../components/PresenterPreviewPanel';
import ScoreAssigner from '../components/ScoreAssigner';
import { ScoreProvider } from '../context/ScoreContext';
import { cloneDefaultData } from '../lib/defaultGameData';
import { saveRecentProject, type RecentProject } from '../lib/recentProjects';
import { Slide } from '../App';
import ClassificaGenerale_Board from '../ClassificaGenerale_Board';
import { useSyncedState } from '../hooks/useSyncedState';

type PresenterViewMode = 'setup' | 'quiz' | 'welcome' | 'editor';

// Helper function to build slides dynamically from setup configuration
function buildSlidesFromSetup(setup: QuizSetupState): Slide[] {
  const gioco1Slides = Array.from({ length: 10 }, (_, idx) => {
    const num = idx + 1;
    const q = setup.gioco1.questions[num] || createDefaultGioco1Question();
    if (q.tipo === 'canzone') {
      const defaultData = cloneDefaultData('music') as any;
      const mappedData = {
        ...defaultData,
        indizi: [
          { ...defaultData.indizi[0], text: q.canzone.indizi[0] || defaultData.indizi[0].text },
          { ...defaultData.indizi[1], text: q.canzone.indizi[1] || defaultData.indizi[1].text },
          { ...defaultData.indizi[2], text: q.canzone.indizi[2] || defaultData.indizi[2].text },
          { ...defaultData.indizi[3], text: q.canzone.indizi[3] || defaultData.indizi[3].text },
        ],
        strumenti: defaultData.strumenti.map((str: any, sIdx: number) => ({
          ...str,
          audio: q.canzone.audioFiles[sIdx] || str.audio
        })),
        soluzione: {
          ...defaultData.soluzione,
          titolo: q.canzone.titolo || defaultData.soluzione.titolo,
          artista: q.canzone.anno ? `Anno ${q.canzone.anno}` : defaultData.soluzione.artista,
          anno: q.canzone.anno || defaultData.soluzione.anno,
          audio: q.canzone.soluzioneAudio || defaultData.soluzione.audio
        }
      };
      return {
        id: `gioco1_${num}`,
        type: 'music' as const,
        data: mappedData
      };
    } else {
      const defaultData = cloneDefaultData('img') as any;
      const mappedData = {
        ...defaultData,
        immagineSegreta: q.immagine.immagineJpg || defaultData.immagineSegreta,
        indizi: defaultData.indizi.map((ind: any, iIdx: number) => ({
          ...ind,
          testo: q.immagine.indizi[iIdx] || ind.testo
        })),
        confermaAudio: q.immagine.confermaAudio || defaultData.confermaAudio,
        soluzione: {
          ...defaultData.soluzione,
          titolo: q.immagine.soluzione || defaultData.soluzione.titolo
        }
      };
      return {
        id: `gioco1_${num}`,
        type: 'img' as const,
        data: mappedData
      };
    }
  });

  const gioco2Slides = Array.from({ length: 6 }, (_, idx) => {
    const num = idx + 1;
    const q = setup.gioco2.questions[num] || createDefaultGioco2Question();
    if (q.tipo === 'canzone') {
      const defaultData = cloneDefaultData('classifica_musicale') as any;
      const mappedData = {
        ...defaultData,
        elementi: defaultData.elementi.map((el: any, i: number) => ({
          ...el,
          testo: q.canzone.risposte[i] || el.testo,
          frase: q.canzone.indizi[i] || el.frase,
          audio: q.canzone.audioFiles[i] || el.audio
        })),
        soluzioneTesto: q.canzone.titolo || defaultData.soluzioneTesto,
        canzoneFinale: q.canzone.soluzioneAudio || defaultData.canzoneFinale,
        titolo: q.canzone.titolo || defaultData.titolo
      };
      return {
        id: `gioco2_${num}`,
        type: 'classifica_musicale' as const,
        data: mappedData
      };
    } else {
      const defaultData = cloneDefaultData('classifica') as any;
      const mappedData = {
        ...defaultData,
        immagineSegreta: q.immagine.immagineJpg || defaultData.immagineSegreta,
        audio: q.immagine.soluzioneAudio || defaultData.audio,
        soluzioneTesto: q.immagine.soluzioneTesto || defaultData.soluzioneTesto,
        elementi: defaultData.elementi.map((el: any, i: number) => ({
          ...el,
          testo: q.immagine.lista10[i] || el.testo
        }))
      };
      return {
        id: `gioco2_${num}`,
        type: 'classifica' as const,
        data: mappedData
      };
    }
  });
  const defaultPasswordData = cloneDefaultData('password_squadre') as any;
  const setupManches = [1, 2, 3].map((num) => {
    const q = setup.gioco3?.questions?.[num];
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
      bussolotti: defaultPasswordData.manches[num - 1]?.bussolotti || {
        immagine_premio: "/Icone/premio_bonus.png",
        posizione_premio_2_posto: 0,
        posizione_premio_3_posto: 4
      }
    };
  }).filter(Boolean);

  const mappedPasswordData = {
    manches: setupManches.length > 0 ? setupManches : defaultPasswordData.manches
  };

  const staticSlides: Slide[] = [
    {
      id: 'cruciverba',
      type: 'cruciverba',
      data: cloneDefaultData('cruciverba')
    },
    {
      id: 'gioco_frase_tempo',
      type: 'gioco_frase_tempo',
      data: cloneDefaultData('gioco_frase_tempo')
    },
    {
      id: 'password_squadre',
      type: 'password_squadre',
      data: mappedPasswordData
    },
    {
      id: 'password_prescelti',
      type: 'password_prescelti',
      data: mappedPasswordData
    },
    {
      id: 'classifica_generale',
      type: 'classifica_generale',
      data: {}
    }
  ];

  return [...gioco1Slides, ...gioco2Slides, ...staticSlides];
}

export default function PresenterView() {
  const [viewMode, setViewMode] = useState<PresenterViewMode>('setup');
  const [presentationName, setPresentationName] = useState('Presentazione senza titolo');
  const [slides, setSlides] = useState<Slide[]>([]);
  const [activeSlideId, setActiveSlideId] = useState('');
  const [activeRevealed, setActiveRevealed] = useSyncedState<Record<number, boolean>>(`playstate_${activeSlideId}_revealed`, {});
  const [activePointsAssigned, setActivePointsAssigned] = useSyncedState<Record<number, number>>(`playstate_${activeSlideId}_points`, {});
  const [activeLatestClue, setActiveLatestClue] = useSyncedState<number>(`playstate_${activeSlideId}_latest`, 0);
  const lastForwardTimeRef = useRef<number>(0);

  // Generate slides when viewMode turns to 'editor'
  useEffect(() => {
    if (viewMode === 'editor') {
      try {
        const saved = localStorage.getItem('imperio_quiz_setup_config_v1');
        let setupState: QuizSetupState;
        if (saved) {
          setupState = JSON.parse(saved);
        } else {
          setupState = getDefaultSetupState();
        }
        
        const generated = buildSlidesFromSetup(setupState);
        setSlides(generated);
        if (generated.length > 0) {
          // Keep active slide if still valid, otherwise reset to first
          if (!activeSlideId || !generated.some(s => s.id === activeSlideId)) {
            setActiveSlideId(generated[0].id);
          }
        }
      } catch (e) {
        console.error('Errore nel caricamento delle impostazioni setup:', e);
      }
    }
  }, [viewMode]);

  // Broadcast state changes to other windows
  useEffect(() => {
    const isElectron = (window as any).electron !== undefined;
    if (isElectron && viewMode === 'editor' && slides.length > 0 && activeSlideId) {
      const activeSlide = slides.find(s => s.id === activeSlideId) || null;
      (window as any).electron.broadcastState({
        slides,
        activeSlideId,
        activeSlide
      });
    }
  }, [slides, activeSlideId, viewMode]);

  // Forward keyboard events (game control keys) to other windows (GamesView)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't forward if typing in an input/textarea
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      // Ignore system shortcuts (like Cmd+R, Cmd+Option+I, etc.)
      if (e.metaKey || e.ctrlKey) {
        return;
      }

      // Throttle key events to prevent duplicate forwarding within 250ms
      const now = Date.now();
      if (now - lastForwardTimeRef.current < 250) {
        return;
      }
      lastForwardTimeRef.current = now;

      const isElectron = (window as any).electron !== undefined;
      if (isElectron && viewMode === 'editor') {
        (window as any).electron.broadcastState({
          forwardedKey: {
            key: e.key,
            code: e.code,
            keyCode: e.keyCode,
            shiftKey: e.shiftKey,
            altKey: e.altKey,
          }
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode]);

  useEffect(() => {
    const isElectron = (window as any).electron !== undefined;
    if (isElectron) {
      const electron = (window as any).electron;

      electron.onNewRequested(() => {
        if (confirm('Vuoi creare una nuova presentazione? I dati non salvati andranno persi.')) {
          setViewMode('welcome');
          setSlides([{ id: '1', type: 'empty' }]);
          setActiveSlideId('1');
          setPresentationName('Presentazione senza titolo');
        }
      });

      electron.onFileOpened((data: Slide[]) => {
        if (data && Array.isArray(data)) {
          setSlides(data);
          if (data.length > 0) setActiveSlideId(data[0].id);
          setViewMode('editor');
          setPresentationName('Presentazione aperta');
        }
      });
    }
  }, []);

  const slidesRef = (window as any)._slidesRef || { current: slides };
  slidesRef.current = slides;
  (window as any)._slidesRef = slidesRef;

  useEffect(() => {
    const isElectron = (window as any).electron !== undefined;
    if (isElectron && !(window as any)._saveListenerAdded) {
      (window as any).electron.onSaveRequested(async () => {
        const currentSlides = (window as any)._slidesRef.current as Slide[];
        const res = await (window as any).electron.saveFile(currentSlides);
        if (res?.success) {
          saveRecentProject(presentationName, currentSlides);
          console.log('Salvato:', res.filePath);
        } else if (!res?.canceled) {
          alert('Errore durante il salvataggio');
        }
      });
      (window as any)._saveListenerAdded = true;
    }
  }, [presentationName, slides]);

  if (viewMode === 'setup') {
    return <QuizSetupView onStartQuiz={() => setViewMode('quiz')} />;
  }

  if (viewMode === 'quiz') {
    return <SequentialQuizView onGoToSetup={() => setViewMode('setup')} />;
  }

  if (viewMode === 'welcome') {
    return (
      <WelcomeScreen
        onCreateBlank={() => {
          const id = Date.now().toString();
          setSlides([{ id, type: 'empty' }]);
          setActiveSlideId(id);
          setPresentationName('Presentazione senza titolo');
          setViewMode('editor');
        }}
        onOpenRecent={(project: RecentProject) => {
          setSlides(project.slides);
          setActiveSlideId(project.slides[0]?.id ?? '1');
          setPresentationName(project.name);
          setViewMode('editor');
        }}
      />
    );
  }

  const activeSlide = slides.find((s) => s.id === activeSlideId);

  const getPreviewFooter = () => {
    if (!activeSlide) return undefined;

    if (activeSlide.type === 'img') {
      return <ScoreAssigner points={3000} />;
    }

    if (activeSlide.type === 'classifica' || activeSlide.type === 'classifica_musicale') {
      if (activeLatestClue === 0) return undefined;
      
      const assignedTeam = activePointsAssigned[activeLatestClue];
      if (assignedTeam === 1 || assignedTeam === 2 || assignedTeam === 3) {
        return undefined;
      }

      const points = activeSlide.type === 'classifica'
        ? (activeLatestClue <= 5 ? 1000 : activeLatestClue <= 8 ? 2000 : activeLatestClue === 9 ? 3000 : 5000)
        : (activeLatestClue <= 4 ? 1000 : activeLatestClue <= 6 ? 2000 : 3000);

      return (
        <div className="flex flex-col items-center gap-1.5 w-full bg-[#1b1b1b]/50 p-2 rounded border border-white/5 animate-in fade-in duration-300">
          <span className="text-[10px] text-white/50 font-black uppercase tracking-wider">
            Assegna Punti (Indizio {activeLatestClue}):
          </span>
          <ScoreAssigner 
            points={points} 
            onAssigned={(teamNum) => {
              setActivePointsAssigned(prev => ({ ...prev, [activeLatestClue]: teamNum }));
            }}
          />
        </div>
      );
    }

    return undefined;
  };

  const goToNextSlide = () => {
    const currentIndex = slides.findIndex(s => s.id === activeSlideId);
    if (currentIndex !== -1 && currentIndex < slides.length - 1) {
      setActiveSlideId(slides[currentIndex + 1].id);
    }
  };

  const goToPrevSlide = () => {
    const currentIndex = slides.findIndex(s => s.id === activeSlideId);
    if (currentIndex !== -1 && currentIndex > 0) {
      setActiveSlideId(slides[currentIndex - 1].id);
    }
  };

  const handleResetPlaystate = () => {
    if (!activeSlideId) return;
    if (confirm("Vuoi azzerare lo stato di gioco di questa slide? Tutti gli elementi svelati, punti e timer verranno ripristinati.")) {
      const isPasswordGame = activeSlideId.includes('password');
      const defaultValues: Record<string, any> = {
        step: 0,
        auto: false,
        revealed: {},
        points: {},
        latest: 0,
        level: 0,
        word: 0,
        revealed_coords: [],
        index: 0,
        time: 30.0,
        running: false,
        marker: null
      };

      Object.entries(defaultValues).forEach(([subKey, defaultVal]) => {
        const key = `playstate_${activeSlideId}_${subKey}`;
        const stringified = JSON.stringify(defaultVal);
        localStorage.setItem(key, stringified);
        
        window.dispatchEvent(new CustomEvent('local-storage-update', {
          detail: { key, value: stringified }
        }));
        
        if ((window as any).electron?.broadcastState) {
          (window as any).electron.broadcastState({
            localStorageUpdate: { key, value: stringified }
          });
        }
      });

      if (isPasswordGame) {
        const pwdKeys = [
          'password_current_manche',
          'password_current_team',
          'password_chosen_suggestion',
          'password_excluded_teams',
          'password_winners_order',
          'password_bussolotti_manche',
          'password_bussolotti_status',
          'password_active_bussolotti',
          'password_grid_state'
        ];
        pwdKeys.forEach(key => {
          localStorage.removeItem(key);
          window.dispatchEvent(new CustomEvent('local-storage-update', {
            detail: { key, value: null }
          }));
          if ((window as any).electron?.broadcastState) {
            (window as any).electron.broadcastState({
              localStorageUpdate: { key, value: null }
            });
          }
        });
      }

      window.dispatchEvent(new StorageEvent('storage'));
    }
  };

  const getFriendlyGameTitle = (slide: Slide | undefined) => {
    if (!slide) return "Nessun gioco selezionato";
    
    if (slide.id.startsWith('gioco1_')) {
      const num = slide.id.replace('gioco1_', '');
      const typeLabel = slide.type === 'music' ? 'Musica' : 'Immagine';
      const detail = (slide.data as any)?.soluzione?.titolo || '';
      return `Box 1 — Domanda ${num} (${typeLabel})${detail ? `: ${detail}` : ''}`;
    }
    
    if (slide.id.startsWith('gioco2_')) {
      const num = slide.id.replace('gioco2_', '');
      const typeLabel = slide.type === 'classifica_musicale' ? 'Classifica Mus.' : 'Classifica';
      const detail = (slide.data as any)?.soluzioneTesto || (slide.data as any)?.titolo || '';
      return `Box 2 — Domanda ${num} (${typeLabel})${detail ? `: ${detail}` : ''}`;
    }

    switch (slide.type) {
      case 'finale_squadre':
        return "Box 5 — Finale Squadre";
      case 'gioco_frase_tempo':
        return "Box 4 — Frase Tempo";
      case 'password_squadre':
        return "Box 3 — Password (Squadre)";
      case 'password_prescelti':
        return "Box 3 — Password (Prescelti)";
      case 'classifica_generale':
        return "Classifica Generale Finale";
      default:
        return slide.type;
    }
  };

  const getFriendlyGameDescription = (slide: Slide | undefined) => {
    if (!slide) return "";
    if (slide.id.startsWith('gioco1_')) {
      return slide.type === 'music' 
        ? "Ascolto strumenti progressivo ed indizi" 
        : "Scoperta tasselli griglia e indizi visivi";
    }
    if (slide.id.startsWith('gioco2_')) {
      return slide.type === 'classifica_musicale'
        ? "Rivelazione 7 strumenti per comporre il brano"
        : "Classifica di 10 elementi ordinati per valore";
    }
    switch (slide.type) {
      case 'finale_squadre':
        return "Finale a squadre con dado, eliminazioni e domande";
      case 'gioco_frase_tempo':
        return "Indovina la frase nascosta entro 30 secondi";
      case 'password_squadre':
        return "Sfida a griglia tra squadre con bussolotti finali";
      case 'password_prescelti':
        return "Sfida a rotazione tra i prescelti delle squadre";
      case 'classifica_generale':
        return "Punteggio complessivo e premiazione squadre";
      default:
        return "";
    }
  };

  const getDropdownGameLabel = (slide: Slide) => {
    if (slide.id.startsWith('gioco1_')) {
      const num = slide.id.replace('gioco1_', '');
      const detail = (slide.data as any)?.soluzione?.titolo || '';
      return `B1 Q${num} (${slide.type === 'music' ? 'Musica' : 'Img'})${detail ? ` - ${detail}` : ''}`;
    }
    if (slide.id.startsWith('gioco2_')) {
      const num = slide.id.replace('gioco2_', '');
      const detail = (slide.data as any)?.soluzioneTesto || (slide.data as any)?.titolo || '';
      return `B2 Q${num} (${slide.type === 'classifica_musicale' ? 'Class. Mus' : 'Class.'})${detail ? ` - ${detail}` : ''}`;
    }
    switch (slide.type) {
      case 'finale_squadre':
        return "B5 - Finale Squadre";
      case 'gioco_frase_tempo':
        return "B4 - Frase Tempo";
      case 'password_squadre':
        return "B3 - Password Squadre";
      case 'password_prescelti':
        return "B3 - Password Prescelti";
      case 'classifica_generale':
        return "Classifica Finale";
      default:
        return slide.type;
    }
  };

  return (
    <ScoreProvider>
      <div className="flex flex-col h-screen w-full bg-[#191919] text-white overflow-hidden font-sans">
        <header className="h-10 flex items-center px-4 border-b border-white/10 bg-[#2b2b2b] shrink-0 gap-4">
          <button
            type="button"
            onClick={() => setViewMode('setup')}
            className="text-xs font-semibold text-[#d24726] bg-[#d24726]/10 hover:bg-[#d24726]/20 border border-[#d24726]/30 px-2.5 py-1 rounded transition-all"
          >
            ⚙️ Pagina 0: Setup
          </button>
          <button
            type="button"
            onClick={() => setViewMode('welcome')}
            className="text-xs text-white/60 hover:text-white px-2 py-1 rounded hover:bg-white/10"
          >
            ← Home
          </button>
          <span className="text-sm font-medium truncate flex-1">{presentationName}</span>
          <span className="text-[10px] text-white/40 uppercase tracking-wider hidden sm:inline">
            Modellazione Relatore
          </span>
        </header>

        <div className="flex flex-1 min-h-0 relative">
          <main className="flex-1 flex flex-col min-w-0 bg-[#404040]">
            {/* Top Area: Previews */}
            <div className="flex-1 grid grid-cols-2 gap-4 p-4 overflow-hidden min-h-0">
              <PresenterPreviewPanel
                title="Anteprima Gioco"
                footer={getPreviewFooter()}
              >
                {activeSlide ? (
                  <SlideCanvas
                    slide={
                      activeSlide.type === 'password_squadre'
                        ? { ...activeSlide, type: 'password_prescelti' }
                        : activeSlide
                    }
                    interactive={
                      activeSlide.type === 'password_squadre' ||
                      activeSlide.type === 'password_prescelti'
                    }
                    viewportMode="none"
                  />
                ) : null}
              </PresenterPreviewPanel>

              <PresenterPreviewPanel title="Punteggi">
                <ClassificaGenerale_Board />
              </PresenterPreviewPanel>
            </div>

            {/* Bottom Area: Premium Game Controls */}
            <div className="h-28 bg-[#1e1e1e] border-t border-white/10 flex flex-col shrink-0">
              <div className="flex-1 flex items-center justify-between px-6 py-3 gap-6">
                
                {/* Left section: Current Game Info */}
                <div className="flex flex-col justify-center min-w-[250px] max-w-[320px]">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-full bg-[#d24726]/10 text-[#d24726] border border-[#d24726]/20 animate-pulse">
                      GIOCO CORRENTE
                    </span>
                    <span className="text-[10px] text-white/40 uppercase tracking-widest font-semibold">
                      ({slides.findIndex(s => s.id === activeSlideId) + 1} di {slides.length})
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white tracking-wide truncate">
                    {getFriendlyGameTitle(activeSlide)}
                  </h3>
                  <p className="text-[10px] text-white/50 truncate">
                    {getFriendlyGameDescription(activeSlide)}
                  </p>
                </div>

                {/* Center section: Main Navigation Controls */}
                <div className="flex items-center gap-4 flex-1 justify-center max-w-[600px]">
                  <button
                    type="button"
                    onClick={goToPrevSlide}
                    disabled={slides.findIndex(s => s.id === activeSlideId) === 0}
                    className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-2 shrink-0 cursor-pointer"
                  >
                    ◀ Gioco Prec.
                  </button>

                  <div className="flex-1 min-w-[150px] max-w-[280px]">
                    <select
                      value={activeSlideId}
                      onChange={(e) => setActiveSlideId(e.target.value)}
                      className="w-full bg-[#121212] border border-white/10 hover:border-white/20 rounded-lg px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-[#d24726] transition-all cursor-pointer"
                    >
                      {slides.map((s, idx) => (
                        <option key={s.id} value={s.id}>
                          {idx + 1}. {getDropdownGameLabel(s)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={goToNextSlide}
                    disabled={slides.findIndex(s => s.id === activeSlideId) === slides.length - 1}
                    className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg bg-gradient-to-r from-[#d24726] to-[#e85a38] hover:from-[#e85a38] hover:to-[#f97316] text-white shadow-lg shadow-[#d24726]/10 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-2 shrink-0 cursor-pointer"
                  >
                    Gioco Succ. ▶
                  </button>
                </div>

                {/* Right section: Control Actions */}
                <div className="flex items-center gap-3 min-w-[250px] justify-end">
                  <button
                    type="button"
                    onClick={handleResetPlaystate}
                    className="px-3 py-1.5 text-[11px] font-semibold text-red-400 bg-red-950/20 hover:bg-red-950/40 border border-red-900/30 hover:border-red-800/50 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                    title="Azzera lo stato di gioco per ricominciare da capo"
                  >
                    🔄 Riavvia
                  </button>
                  <div className="h-6 w-px bg-white/10" />
                  <span className="text-[10px] text-white/30 uppercase tracking-widest font-black">
                    IMPERIO VII
                  </span>
                </div>

              </div>
            </div>
          </main>
        </div>
      </div>
    </ScoreProvider>
  );
}
