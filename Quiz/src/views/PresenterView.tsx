import { useState, useEffect } from 'react';
import SlideCanvas from '../components/SlideCanvas';
import SlideThumbnail from '../components/SlideThumbnail';
import ResizableSidebar from '../components/ResizableSidebar';
import GameSelector from '../components/GameSelector';
import StructuredJsonEditor from '../components/StructuredJsonEditor';
import WelcomeScreen from '../components/WelcomeScreen';
import PresenterPreviewPanel from '../components/PresenterPreviewPanel';
import ScoreAssigner from '../components/ScoreAssigner';
import { ScoreProvider } from '../context/ScoreContext';
import { cloneDefaultData } from '../lib/defaultGameData';
import { getGameMeta } from '../lib/gameMeta';
import { saveRecentProject, type RecentProject } from '../lib/recentProjects';
import { useResizablePanel } from '../hooks/useResizablePanel';
import { Slide, SlideType } from '../App';
import ClassificaGenerale_Board from '../ClassificaGenerale_Board';
import { useSyncedState } from '../hooks/useSyncedState';

type PresenterViewMode = 'welcome' | 'editor';

export default function PresenterView() {
  const [viewMode, setViewMode] = useState<PresenterViewMode>('welcome');
  const [presentationName, setPresentationName] = useState('Presentazione senza titolo');
  const [slides, setSlides] = useState<Slide[]>([{ id: '1', type: 'empty' }]);
  const [activeSlideId, setActiveSlideId] = useState('1');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [activeRevealed, setActiveRevealed] = useSyncedState<Record<number, boolean>>(`playstate_${activeSlideId}_revealed`, {});
  const [activePointsAssigned, setActivePointsAssigned] = useSyncedState<Record<number, number>>(`playstate_${activeSlideId}_points`, {});
  const [activeLatestClue, setActiveLatestClue] = useSyncedState<number>(`playstate_${activeSlideId}_latest`, 0);

  const rightPanel = useResizablePanel({
    initialWidth: 320,
    minWidth: 260,
    maxWidth: 520,
    storageKey: 'imperio_presenter_panel_right',
    initialCollapsed: true,
  });

  // Broadcast state changes to other windows
  useEffect(() => {
    const isElectron = (window as any).electron !== undefined;
    if (isElectron && viewMode === 'editor') {
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
  }, [presentationName]);

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

  const handleGameSelect = (type: SlideType) => {
    setSlides(
      slides.map((s) =>
        s.id === activeSlideId ? { ...s, type, data: cloneDefaultData(type) } : s,
      ),
    );
  };

  const handleSlideDataChange = (newData: unknown) => {
    setSlides(slides.map((s) => (s.id === activeSlideId ? { ...s, data: newData } : s)));
  };

  const addSlide = () => {
    const id = Date.now().toString();
    setSlides([...slides, { id, type: 'empty' }]);
    setActiveSlideId(id);
  };


  const deleteSlide = (id: string) => {
    const newSlides = slides.filter(s => s.id !== id);
    setSlides(newSlides);
    
    if (activeSlideId === id) {
      const deletedIndex = slides.findIndex(s => s.id === id);
      if (newSlides.length > 0) {
        const nextActiveIdx = Math.max(0, deletedIndex - 1);
        setActiveSlideId(newSlides[nextActiveIdx].id);
      } else {
        const newId = Date.now().toString();
        setSlides([{ id: newId, type: 'empty' }]);
        setActiveSlideId(newId);
      }
    }
  };

  const handleMoveSlide = (fromIndex: number | null, toIndex: number) => {
    if (fromIndex === null || fromIndex === toIndex) return;
    const newSlides = [...slides];
    const [removed] = newSlides.splice(fromIndex, 1);
    newSlides.splice(toIndex, 0, removed);
    setSlides(newSlides);
  };

  return (
    <ScoreProvider>
      <div className="flex flex-col h-screen w-full bg-[#191919] text-white overflow-hidden font-sans">
        <header className="h-10 flex items-center px-4 border-b border-white/10 bg-[#2b2b2b] shrink-0 gap-4">
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
                  <SlideCanvas slide={activeSlide} interactive viewportMode="none" />
                ) : null}
              </PresenterPreviewPanel>

              <PresenterPreviewPanel title="Punteggi">
                <ClassificaGenerale_Board />
              </PresenterPreviewPanel>
            </div>

             {/* Bottom Area: Timeline like PPT */}
             <div className="h-48 bg-[#2b2b2b] border-t border-white/10 flex flex-col shrink-0">
                 <div className="flex items-center px-4 py-2 border-b border-white/10 justify-between">
                    <span className="text-xs font-semibold text-white/60">Linea del Tempo (Diapositive)</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => rightPanel.setCollapsed((c) => !c)}
                        className={`py-1 px-3 text-[11px] font-semibold rounded border transition-colors ${
                          rightPanel.collapsed
                            ? 'border-[#d24726] text-[#d24726] bg-[#d24726]/10'
                            : 'border-white/15 text-white/60 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        {rightPanel.collapsed ? '◀ Proprietà' : 'Proprietà ▶'}
                      </button>
                      <button
                        type="button"
                        onClick={addSlide}
                        className="py-1 px-3 text-[11px] font-semibold rounded bg-white/10 hover:bg-white/15 border border-white/10"
                      >
                        + Aggiungi Diapositiva
                      </button>
                    </div>
                 </div>
                <div className="flex-1 flex flex-row overflow-x-auto overflow-y-hidden p-3 gap-3">
                   {slides.map((slide, index) => {
                     const isDragging = draggedIndex === index;
                     const isOver = dragOverIndex === index;
                     const isBefore = draggedIndex !== null && index < draggedIndex;

                     return (
                       <div 
                         key={slide.id} 
                         draggable
                         onClick={() => setActiveSlideId(slide.id)}
                         onDragStart={(e) => {
                           setDraggedIndex(index);
                           e.dataTransfer.effectAllowed = 'move';
                           e.currentTarget.style.opacity = '0.4';
                         }}
                         onDragEnd={(e) => {
                           setDraggedIndex(null);
                           setDragOverIndex(null);
                           e.currentTarget.style.opacity = '1';
                         }}
                         onDragOver={(e) => {
                           e.preventDefault();
                           if (draggedIndex !== index) {
                             setDragOverIndex(index);
                           }
                         }}
                         onDragLeave={() => {
                           setDragOverIndex(prev => prev === index ? null : prev);
                         }}
                         onDrop={(e) => {
                           e.preventDefault();
                           if (draggedIndex !== null && draggedIndex !== index) {
                             handleMoveSlide(draggedIndex, index);
                           }
                           setDraggedIndex(null);
                           setDragOverIndex(null);
                         }}
                         className={`h-full flex flex-col items-center justify-between p-2 rounded bg-white/5 border transition-all shrink-0 w-44 relative cursor-grab active:cursor-grabbing ${
                           activeSlideId === slide.id ? 'border-[#c75a3a]/40 bg-[#c75a3a]/5' : 'border-white/5'
                         } ${isDragging ? 'opacity-40 border-dashed border-white/20' : ''}`}
                       >
                         {/* Slide Thumbnail wrapper to disable pointer events so drag starts on the outer card */}
                         <div className="w-full flex-1 min-h-0 flex items-center justify-center pointer-events-none">
                           <SlideThumbnail
                             slide={slide}
                             index={index}
                             isActive={activeSlideId === slide.id}
                             onClick={() => {}}
                           />
                         </div>
                         
                         <div className="flex items-center justify-end w-full mt-2 pt-1 border-t border-white/5 shrink-0">
                           <button
                             type="button"
                             onClick={(e) => {
                               e.stopPropagation();
                               deleteSlide(slide.id);
                             }}
                             className="w-6 h-6 rounded flex items-center justify-center bg-red-950/40 hover:bg-red-900/60 border border-red-800/40 text-red-200 text-[10px] font-bold transition-colors"
                             title="Elimina diapositiva"
                           >
                             🗑
                           </button>
                         </div>

                         {/* Drop Insertion Indicator Line */}
                         {isOver && draggedIndex !== null && (
                           <div 
                             className={`absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] z-50 ${
                               isBefore ? '-left-2' : '-right-2'
                             }`}
                           />
                         )}
                       </div>
                     );
                   })}
                </div>
             </div>
          </main>

          {/* Right Panel: Properties */}
          {!rightPanel.collapsed && (
            <ResizableSidebar
              side="right"
              width={rightPanel.width}
              collapsed={false}
              onToggleCollapse={() => rightPanel.setCollapsed(true)}
              onResizeStart={rightPanel.onResizeStart}
              collapseLabel="Mostra proprietà"
            >
              <div className="flex items-center justify-between p-3 border-b border-white/10 shrink-0">
                <h2 className="text-sm font-bold">Proprietà diapositiva</h2>
                <button
                  type="button"
                  onClick={() => rightPanel.setCollapsed(true)}
                  className="w-7 h-7 rounded hover:bg-white/10 text-white/50 hover:text-white text-sm"
                  title="Nascondi proprietà"
                >
                  ›
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 flex flex-col min-h-0">
                {activeSlide && activeSlide.type !== 'empty' && (
                  <button
                    type="button"
                    onClick={() => handleGameSelect('empty')}
                    className="mb-4 w-full py-2 px-3 rounded bg-red-950/40 hover:bg-red-900/60 border border-red-800/40 text-red-200 text-xs font-semibold transition-all shrink-0"
                  >
                    🔄 Cambia tipo di gioco
                  </button>
                )}
                {activeSlide?.type === 'empty' ? (
                  <div>
                    <p className="text-xs text-white/50 mb-3">
                      Scegli il tipo di gioco per questa diapositiva.
                    </p>
                    <GameSelector onSelect={handleGameSelect} compact />
                  </div>
                ) : activeSlide ? (
                  <StructuredJsonEditor
                    gameType={activeSlide.type}
                    data={activeSlide.data}
                    onChange={handleSlideDataChange}
                  />
                ) : null}
              </div>
            </ResizableSidebar>
          )}
        </div>
      </div>
    </ScoreProvider>
  );
}