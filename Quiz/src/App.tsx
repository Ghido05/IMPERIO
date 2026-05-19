import { useState, useEffect } from 'react';
import Sandbox from './Sandbox';
import GameSelector from './components/GameSelector';
import StructuredJsonEditor from './components/StructuredJsonEditor';
import WelcomeScreen from './components/WelcomeScreen';
import SlideThumbnail from './components/SlideThumbnail';
import SlideCanvas from './components/SlideCanvas';
import ResizableSidebar from './components/ResizableSidebar';
import { ScoreProvider } from './context/ScoreContext';
import { cloneDefaultData } from './lib/defaultGameData';
import { getGameMeta } from './lib/gameMeta';
import { saveRecentProject, type RecentProject } from './lib/recentProjects';
import { useResizablePanel } from './hooks/useResizablePanel';

export type SlideType =
  | 'empty'
  | 'img'
  | 'music'
  | 'classifica'
  | 'classifica_musicale'
  | 'cruciverba'
  | 'gioco_frase_tempo'
  | 'password_squadre'
  | 'password_prescelti'
  | 'classifica_generale';

export interface Slide {
  id: string;
  type: SlideType;
  data?: unknown;
}

type AppView = 'welcome' | 'editor';

function App() {
  const [isSandbox, setIsSandbox] = useState(false);
  const [appView, setAppView] = useState<AppView>('welcome');
  const [presentationName, setPresentationName] = useState('Presentazione senza titolo');
  const [slides, setSlides] = useState<Slide[]>([{ id: '1', type: 'empty' }]);
  const [activeSlideId, setActiveSlideId] = useState('1');
  const [zoom, setZoom] = useState(100);

  const leftPanel = useResizablePanel({
    initialWidth: 168,
    minWidth: 140,
    maxWidth: 280,
    storageKey: 'imperio_panel_left',
  });

  const rightPanel = useResizablePanel({
    initialWidth: 320,
    minWidth: 260,
    maxWidth: 520,
    storageKey: 'imperio_panel_right',
  });

  useEffect(() => {
    const isElectron = (window as any).electron !== undefined;
    const urlParams = new URLSearchParams(window.location.search);
    const forceSandbox = urlParams.get('sandbox') === 'true';

    if (!isElectron || forceSandbox) {
      setIsSandbox(true);
    }

    if (isElectron) {
      const electron = (window as any).electron;

      electron.onNewRequested(() => {
        if (confirm('Vuoi creare una nuova presentazione? I dati non salvati andranno persi.')) {
          setAppView('welcome');
          setSlides([{ id: '1', type: 'empty' }]);
          setActiveSlideId('1');
          setPresentationName('Presentazione senza titolo');
        }
      });

      electron.onFileOpened((data: Slide[]) => {
        if (data && Array.isArray(data)) {
          setSlides(data);
          if (data.length > 0) setActiveSlideId(data[0].id);
          setAppView('editor');
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

  if (isSandbox) {
    return <Sandbox />;
  }

  if (appView === 'welcome') {
    return (
      <WelcomeScreen
        onCreateBlank={() => {
          const id = Date.now().toString();
          setSlides([{ id, type: 'empty' }]);
          setActiveSlideId(id);
          setPresentationName('Presentazione senza titolo');
          setAppView('editor');
        }}
        onOpenRecent={(project: RecentProject) => {
          setSlides(project.slides);
          setActiveSlideId(project.slides[0]?.id ?? '1');
          setPresentationName(project.name);
          setAppView('editor');
        }}
      />
    );
  }

  const activeSlide = slides.find((s) => s.id === activeSlideId);
  const activeIndex = slides.findIndex((s) => s.id === activeSlideId);

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
            onClick={() => setAppView('welcome')}
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
            title={rightPanel.collapsed ? 'Mostra proprietà' : 'Nascondi proprietà'}
          >
            {rightPanel.collapsed ? '◀ Proprietà' : 'Proprietà ▶'}
          </button>
          <span className="text-[10px] text-white/40 uppercase tracking-wider hidden sm:inline">
            Modellazione
          </span>
        </header>

        <div className="flex flex-1 min-h-0 relative">
          <ResizableSidebar
            side="left"
            width={leftPanel.width}
            collapsed={leftPanel.collapsed}
            onToggleCollapse={() => leftPanel.setCollapsed((c) => !c)}
            onResizeStart={leftPanel.onResizeStart}
            collapseLabel="Mostra diapositive"
          >
            <div className="flex items-center justify-between px-2 py-2 border-b border-white/10 shrink-0">
              <button
                type="button"
                onClick={addSlide}
                className="flex-1 py-1 text-[11px] font-semibold rounded bg-white/10 hover:bg-white/15 border border-white/10"
              >
                + Nuova
              </button>
              <button
                type="button"
                onClick={() => leftPanel.setCollapsed(true)}
                className="ml-1 w-7 h-7 shrink-0 rounded hover:bg-white/10 text-white/50 hover:text-white text-sm"
                title="Nascondi diapositive"
              >
                ‹
              </button>
            </div>
            <div className="flex-1 overflow-y-auto overflow-x-hidden py-2 px-1.5 space-y-1 min-h-0">
              {slides.map((slide, index) => (
                <SlideThumbnail
                  key={slide.id}
                  slide={slide}
                  index={index}
                  isActive={activeSlideId === slide.id}
                  onClick={() => setActiveSlideId(slide.id)}
                />
              ))}
            </div>
          </ResizableSidebar>

          <main className="flex-1 flex flex-col min-w-0 bg-[#404040]">
            <div className="flex-1 p-6 flex items-center justify-center overflow-auto">
              <div
                className="relative shadow-2xl bg-black"
                style={{
                  width: 'min(100%, calc((100vh - 120px) * 16 / 9))',
                  aspectRatio: '16 / 9',
                  transform: `scale(${zoom / 100})`,
                  transformOrigin: 'center center',
                }}
              >
                {activeSlide && <SlideCanvas slide={activeSlide} interactive />}
              </div>
            </div>

            <footer className="h-7 flex items-center justify-between px-4 bg-[#2b2b2b] border-t border-white/10 text-[11px] text-white/60 shrink-0">
              <span>
                Diapositiva {activeIndex + 1} di {slides.length}
                {activeSlide && activeSlide.type !== 'empty' && (
                  <span className="ml-3 text-white/40">
                    · {getGameMeta(activeSlide.type)?.shortTitle}
                  </span>
                )}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(50, z - 10))}
                  className="px-1 hover:text-white"
                >
                  −
                </button>
                <span className="w-10 text-center tabular-nums">{zoom}%</span>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(150, z + 10))}
                  className="px-1 hover:text-white"
                >
                  +
                </button>
              </div>
            </footer>
          </main>

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

          {rightPanel.collapsed && (
            <button
              type="button"
              onClick={() => rightPanel.setCollapsed(false)}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-8 py-6 rounded-l-md bg-[#2b2b2b] border border-r-0 border-white/15 text-white/70 hover:text-white hover:bg-[#363636] text-xs shadow-lg"
              title="Apri proprietà"
            >
              ‹
            </button>
          )}
        </div>
      </div>
    </ScoreProvider>
  );
}

export default App;
