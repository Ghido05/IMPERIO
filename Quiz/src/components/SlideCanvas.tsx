import { useState, useEffect, useMemo, type CSSProperties } from 'react';
import { GameDataProvider } from '../context/GameDataContext';
import type { Slide } from '../App';
import { cloneDefaultData } from '../lib/defaultGameData';
import SlideRenderer from './SlideRenderer';
import StageViewport from './StageViewport';
import { STAGE_H, STAGE_W, type StageMode } from '../hooks/useStageBox';
import MilleEUnaNadiaBoard from './MilleEUnaNadiaBoard';
import { useSyncedState } from '../hooks/useSyncedState';
import type { NadiaSetup, NadiaQuestionItem, QuizSetupState } from '../views/QuizSetupView';
import { sendSerialReset } from '../lib/webSerial';

interface SlideCanvasProps {
  slide: Slide;
  interactive?: boolean;
  className?: string;
  mode?: 'full' | 'thumbnail';
  thumbWidth?: number;
  /** fill = finestra esterna; fit = contenitore 16:9; none = solo canvas 1920×1080 (dentro PresenterPreviewPanel) */
  viewportMode?: StageMode | 'none';
  revealAll?: boolean;
  nadiaSetup?: NadiaSetup;
  isPresenter?: boolean;
}

export default function SlideCanvas({
  slide,
  interactive = true,
  className = '',
  mode = 'full',
  thumbWidth = 128,
  viewportMode = 'fit',
  revealAll = false,
  nadiaSetup,
  isPresenter = false,
}: SlideCanvasProps) {
  const [, setTick] = useState(0);
  const [localSetup, setLocalSetup] = useState<QuizSetupState | null>(() => {
    try {
      const saved = localStorage.getItem('imperio_quiz_setup_config_v1');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Stati sincronizzati per Mille e una Nadia
  const [nadiaActive] = useSyncedState<boolean>('playstate_nadia_active', false);
  const [nadiaQuestionId] = useSyncedState<string>('playstate_nadia_question_id', '');
  const [nadiaSolutionShown] = useSyncedState<boolean>('playstate_nadia_solution_shown', false);
  const [nadiaBookedTeam, setNadiaBookedTeam] = useSyncedState<number | null>('playstate_nadia_booked_team', null);
  const [nadiaAssignedTeam] = useSyncedState<number | null>('playstate_nadia_assigned_team', null);
  const [nadiaShuffledOrder] = useSyncedState<[number, number, number]>(
    `playstate_nadia_order_${nadiaQuestionId}`,
    [0, 1, 2]
  );


  useEffect(() => {
    if (!nadiaSetup) {
      try {
        const saved = localStorage.getItem('imperio_quiz_setup_config_v1');
        if (saved) {
          setLocalSetup(JSON.parse(saved));
        }
      } catch (e) {
        console.error('Errore lettura setup in SlideCanvas:', e);
      }
    }
  }, [nadiaSetup]);

  const effectiveNadiaSetup = useMemo<NadiaSetup | null>(() => {
    if (nadiaSetup) return nadiaSetup;
    if (localSetup?.nadia) return localSetup.nadia;
    return null;
  }, [nadiaSetup, localSetup]);

  const effectiveNadiaQuestion = useMemo<NadiaQuestionItem | null>(() => {
    if (!effectiveNadiaSetup?.domande || effectiveNadiaSetup.domande.length === 0) {
      return null;
    }
    const found = effectiveNadiaSetup.domande.find((d) => d.id === nadiaQuestionId);
    return found || effectiveNadiaSetup.domande[0];
  }, [effectiveNadiaSetup, nadiaQuestionId]);

  useEffect(() => {
    const handleLoaded = () => {
      setTick(t => t + 1);
    };
    window.addEventListener('idb-file-loaded', handleLoaded);
    return () => window.removeEventListener('idb-file-loaded', handleLoaded);
  }, []);

  if (slide.type === 'empty') {
    if (mode === 'thumbnail') {
      const h = (thumbWidth * 9) / 16;
      return (
        <div
          className={`bg-[#1a1a1a] ${className}`}
          style={{ width: thumbWidth, height: h }}
        />
      );
    }
    return (
      <div className={`w-full h-full ${className}`}>
        <div className="w-full h-full flex flex-col items-center justify-center bg-[#1a1a1a] border border-white/10">
          <div className="w-16 h-12 border-2 border-dashed border-white/20 rounded mb-3" />
          <p className="text-white/40 text-sm font-medium">Diapositiva vuota</p>
          <p className="text-white/25 text-xs mt-1">Scegli un gioco dal pannello a destra</p>
        </div>
      </div>
    );
  }

  const data = {
    ...((slide.data as any) ?? cloneDefaultData(slide.type)),
    slideId: slide.id,
  };

  if (mode === 'thumbnail') {
    const thumbScale = thumbWidth / STAGE_W;
    const thumbHeight = (thumbWidth * 9) / 16;
    const stageStyle: CSSProperties = {
      width: STAGE_W,
      height: STAGE_H,
      transform: `scale(${thumbScale})`,
      transformOrigin: 'top left',
    };

    return (
      <div
        className={`overflow-hidden bg-black ${className}`}
        style={{ width: thumbWidth, height: thumbHeight }}
      >
        <div className="pointer-events-none" style={stageStyle}>
          <GameDataProvider key={slide.id} data={data}>
            <SlideRenderer key={slide.id} type={slide.type} interactive={false} revealAll={revealAll} />
          </GameDataProvider>
        </div>
      </div>
    );
  }

  const shouldShowNadia = nadiaActive && effectiveNadiaSetup && effectiveNadiaQuestion;

  const stageContent = (
    <GameDataProvider key={slide.id} data={data}>
      <div
        className={interactive ? 'relative' : 'relative pointer-events-none'}
        style={{ width: STAGE_W, height: STAGE_H }}
      >
        <SlideRenderer key={slide.id} type={slide.type} interactive={interactive} revealAll={revealAll} />
        {shouldShowNadia && (
          <MilleEUnaNadiaBoard
            nadiaSetup={effectiveNadiaSetup}
            question={effectiveNadiaQuestion}
            shuffledOrder={nadiaShuffledOrder}
            solutionShown={nadiaSolutionShown}
            isPresenter={isPresenter}
            bookedTeam={nadiaBookedTeam}
            assignedTeam={nadiaAssignedTeam}
            teamNames={localSetup?.punteggi?.nomiSquadre || ['SQUADRA 1', 'SQUADRA 2', 'SQUADRA 3']}
            onCancelBooking={() => {
              setNadiaBookedTeam(null);
              sendSerialReset();
            }}
          />
        )}
      </div>
    </GameDataProvider>
  );

  if (viewportMode === 'none') {
    return <div className={`w-full h-full ${className}`}>{stageContent}</div>;
  }

  return (
    <div className={`w-full h-full ${className}`}>
      <StageViewport interactive={interactive} mode={viewportMode}>
        {stageContent}
      </StageViewport>
    </div>
  );
}
