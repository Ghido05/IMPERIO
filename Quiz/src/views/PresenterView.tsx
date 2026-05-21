import { useState, useEffect } from 'react';
import SlideCanvas from '../components/SlideCanvas';
import SlideThumbnail from '../components/SlideThumbnail';
import ResizableSidebar from '../components/ResizableSidebar';
import GameSelector from '../components/GameSelector';
import StructuredJsonEditor from '../components/StructuredJsonEditor';
import WelcomeScreen from '../components/WelcomeScreen';
import ScaledPreview from '../components/ScaledPreview';
import { ScoreProvider } from '../context/ScoreContext';
import { cloneDefaultData } from '../lib/defaultGameData';
import { getGameMeta } from '../lib/gameMeta';
import { saveRecentProject, type RecentProject } from '../lib/recentProjects';
import { useResizablePanel } from '../hooks/useResizablePanel';
import { Slide, SlideType } from '../App';
import ClassificaGenerale_Board from '../ClassificaGenerale_Board';

type PresenterViewMode = 'welcome' | 'editor';

export default function PresenterView() {
  const [viewMode, setViewMode] = useState<PresenterViewMode>('welcome');
  const [presentationName, setPresentationName] = useState('Presentazione senza titolo');
  const [slides, setSlides] = useState<Slide[]>([{ id: '1', type: 'empty' }]);
  const [activeSlideId, setActiveSlideId] = useState('1');

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
          <button
            type="button"
            onClick={() => rightPanel.setCollapsed((c) => !c)}
            className={`text-xs px-2 py-1 rounded border transition-colors ${
              rightPanel.collapsed
                ? 'border-[#d24726] text-[#d24726] bg-[#d24726]/10'
                : 'border-white/15 text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            {rightPanel.collapsed ? '◀ Proprietà' : 'Proprietà ▶'}
          </button>
          <span className="text-[10px] text-white/40 uppercase tracking-wider hidden sm:inline">
            Modellazione Relatore
          </span>
        </header>

        <div className="flex flex-1 min-h-0 relative">
          <main className="flex-1 flex flex-col min-w-0 bg-[#404040]">
            {/* Top Area: Previews */}
            <div className="flex-1 flex flex-row p-4 gap-4 overflow-hidden">
              {/* Top Left: Game Preview */}
              <div className="flex-1 bg-black rounded-xl overflow-hidden shadow-2xl relative flex flex-col">
                <div className="bg-[#2b2b2b] text-center text-xs py-1 text-white/50 border-b border-white/10 shrink-0">Anteprima Gioco</div>
                <div className="flex-1 relative">
                  {activeSlide && <SlideCanvas slide={activeSlide} interactive />}
                </div>
              </div>
              
              {/* Top Right: Scores Preview */}
              <div className="flex-1 bg-black rounded-xl overflow-hidden shadow-2xl relative flex flex-col">
                <div className="bg-[#2b2b2b] text-center text-xs py-1 text-white/50 border-b border-white/10 shrink-0">Punteggi</div>
                <div className="flex-1 relative">
                  <ScaledPreview interactive={false}>
                    <ClassificaGenerale_Board />
                  </ScaledPreview>
                </div>
              </div>
            </div>

            {/* Bottom Area: Timeline like PPT */}
            <div className="h-48 bg-[#2b2b2b] border-t border-white/10 flex flex-col shrink-0">
               <div className="flex items-center px-4 py-2 border-b border-white/10 justify-between">
                  <span className="text-xs font-semibold text-white/60">Linea del Tempo (Diapositive)</span>
                  <button
                    type="button"
                    onClick={addSlide}
                    className="py-1 px-3 text-[11px] font-semibold rounded bg-white/10 hover:bg-white/15 border border-white/10"
                  >
                    + Nuova Diapositiva
                  </button>
               </div>
               <div className="flex-1 flex flex-row overflow-x-auto overflow-y-hidden p-3 gap-2">
                  {slides.map((slide, index) => (
                    <div key={slide.id} className="h-full flex flex-col items-center gap-1 shrink-0 w-48">
                      <div className="flex-1 w-full">
                        <SlideThumbnail
                          slide={slide}
                          index={index}
                          isActive={activeSlideId === slide.id}
                          onClick={() => setActiveSlideId(slide.id)}
                        />
                      </div>
                    </div>
                  ))}
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