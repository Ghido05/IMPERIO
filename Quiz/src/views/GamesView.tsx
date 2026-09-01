import { useState, useEffect } from 'react';
import SlideCanvas from '../components/SlideCanvas';
import type { Slide } from '../App';
import { ScoreProvider } from '../context/ScoreContext';

export default function GamesView() {
  const [activeSlide, setActiveSlide] = useState<Slide | null>(null);

  useEffect(() => {
    const isElectron = (window as any).electron !== undefined;
    if (isElectron) {
      const unsubscribe = (window as any).electron.onStateUpdate((state: { activeSlide?: Slide | null }) => {
        if (state.activeSlide !== undefined) {
          setActiveSlide(state.activeSlide);
        }
      });
      return unsubscribe;
    }
  }, []);

  return (
    <ScoreProvider>
      <div className="fixed inset-0 bg-black overflow-hidden">
        {activeSlide ? (
          <SlideCanvas
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
