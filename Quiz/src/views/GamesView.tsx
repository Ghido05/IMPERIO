import { useState, useEffect } from 'react';
import SlideCanvas from '../components/SlideCanvas';
import type { Slide, SlideType } from '../App';
import { ScoreProvider } from '../context/ScoreContext';
import BuzzerStatusBadge from '../components/BuzzerStatusBadge';
import { useBuzzerActive } from '../hooks/useBuzzerActive';
import { useSyncedState } from '../hooks/useSyncedState';

const BUZZER_SLIDE_TYPES = new Set<SlideType>([
  'prova_pulsantiera',
  'img',
  'music',
  'gioco_frase_tempo',
  'finale_squadre',
]);

export default function GamesView() {
  const [activeSlide, setActiveSlide] = useState<Slide | null>(null);
  const [nadiaSetup, setNadiaSetup] = useState<any>(null);
  const isBuzzerActive = useBuzzerActive();
  const [nadiaActive] = useSyncedState<boolean>('playstate_nadia_active', false);

  const showBuzzerBadge = Boolean(
    nadiaActive || (activeSlide && BUZZER_SLIDE_TYPES.has(activeSlide.type))
  );

  useEffect(() => {
    const isElectron = (window as any).electron !== undefined;
    if (isElectron) {
      const unsubscribe = (window as any).electron.onStateUpdate((state: { activeSlide?: Slide | null, setupStateUpdate?: any, nadiaSetup?: any }) => {
        if (state.activeSlide !== undefined) {
          setActiveSlide(state.activeSlide);
        }
        if (state.nadiaSetup !== undefined) {
          setNadiaSetup(state.nadiaSetup);
        } else if (state.setupStateUpdate?.nadia) {
          setNadiaSetup(state.setupStateUpdate.nadia);
        }
      });
      return unsubscribe;
    }
  }, []);

  return (
    <ScoreProvider>
      <div className="fixed inset-0 bg-black overflow-hidden">
        {/* Indicatore stato pulsantiera: visibile solo durante i giochi con prenotazione o Mille e una Nadia */}
        {showBuzzerBadge && (
          <BuzzerStatusBadge
            isActive={isBuzzerActive}
            variant="viewport"
            className="fixed top-3.5 right-4 z-[150]"
          />
        )}

        {activeSlide ? (
          <SlideCanvas
            nadiaSetup={nadiaSetup}
            slide={
              activeSlide.type === 'password_prescelti'
                ? { ...activeSlide, type: 'password_squadre' }
                : activeSlide
            }
            interactive
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/50 text-2xl font-bold">
            In attesa della presentazione...
          </div>
        )}
      </div>
    </ScoreProvider>
  );
}
