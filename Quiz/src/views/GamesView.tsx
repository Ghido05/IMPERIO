import { useState, useEffect } from 'react';
import SlideCanvas from '../components/SlideCanvas';
import type { Slide } from '../App';
import { ScoreProvider } from '../context/ScoreContext';

export default function GamesView() {
  const [activeSlide, setActiveSlide] = useState<Slide | null>(null);

  useEffect(() => {
    const isElectron = (window as any).electron !== undefined;
    if (isElectron) {
      const unsubscribe = (window as any).electron.onStateUpdate((state: { activeSlide?: Slide | null, forwardedKey?: any }) => {
        if (state.activeSlide !== undefined) {
          setActiveSlide(state.activeSlide);
        }
        if (state.forwardedKey) {
          const k = state.forwardedKey;
          const event = new KeyboardEvent('keydown', {
            key: k.key,
            code: k.code,
            bubbles: true,
            cancelable: true,
          });
          
          // Inject code and keycode properties for React & legacy event handlers
          Object.defineProperty(event, 'keyCode', { value: k.keyCode });
          Object.defineProperty(event, 'which', { value: k.keyCode });
          
          window.dispatchEvent(event);
        }
      });
      return unsubscribe;
    }
  }, []);

  return (
    <ScoreProvider>
      <div className="fixed inset-0 bg-black overflow-hidden">
        {activeSlide ? (
          <SlideCanvas slide={activeSlide} interactive />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/50 text-2xl font-bold">
            In attesa della presentazione...
          </div>
        )}
      </div>
    </ScoreProvider>
  );
}
