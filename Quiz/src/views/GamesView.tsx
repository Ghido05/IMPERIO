import { useState, useEffect } from 'react';
import SlideCanvas from '../components/SlideCanvas';
import type { Slide } from '../App';
import { ScoreProvider } from '../context/ScoreContext';
import { computeIsBuzzerActiveFromStorage } from '../lib/webSerial';

export default function GamesView() {
  const [activeSlide, setActiveSlide] = useState<Slide | null>(null);
  const [nadiaSetup, setNadiaSetup] = useState<any>(null);
  const [isBuzzerActive, setIsBuzzerActive] = useState<boolean>(() => computeIsBuzzerActiveFromStorage());

  useEffect(() => {
    const updateBuzzer = () => {
      setIsBuzzerActive(computeIsBuzzerActiveFromStorage());
    };
    updateBuzzer();
    window.addEventListener('storage', updateBuzzer);
    window.addEventListener('local-storage-update', updateBuzzer);
    const interval = setInterval(updateBuzzer, 250);
    return () => {
      window.removeEventListener('storage', updateBuzzer);
      window.removeEventListener('local-storage-update', updateBuzzer);
      clearInterval(interval);
    };
  }, [activeSlide]);

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
        setIsBuzzerActive(computeIsBuzzerActiveFromStorage());
      });
      return unsubscribe;
    }
  }, []);

  return (
    <ScoreProvider>
      <div className="fixed inset-0 bg-black overflow-hidden">
        {/* Indicatore sempre visibile stato pulsantiera (Verde = Attiva, Rosso = Non attiva) */}
        <div
          className="fixed top-4 right-4 z-[150] pointer-events-none flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/70 border border-white/15 backdrop-blur-md shadow-lg"
          title={isBuzzerActive ? 'Pulsantiera attiva' : 'Pulsantiera bloccata / non attiva'}
        >
          <span
            className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${
              isBuzzerActive
                ? 'bg-emerald-500 shadow-[0_0_14px_#10b981] animate-pulse'
                : 'bg-red-500 shadow-[0_0_12px_#ef4444]'
            }`}
          />
        </div>

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
