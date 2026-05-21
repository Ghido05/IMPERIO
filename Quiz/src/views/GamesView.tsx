import { useState, useEffect } from 'react';
import SlideCanvas from '../components/SlideCanvas';
import { Slide } from '../App';
import { ScoreProvider } from '../context/ScoreContext';

export default function GamesView() {
  const [activeSlide, setActiveSlide] = useState<Slide | null>(null);
  
  useEffect(() => {
    const isElectron = (window as any).electron !== undefined;
    if (isElectron) {
      (window as any).electron.onStateUpdate((state: { activeSlide: Slide | null }) => {
        setActiveSlide(state.activeSlide);
      });
    }
  }, []);

  return (
    <ScoreProvider>
      <div className="w-full h-screen bg-black flex items-center justify-center overflow-hidden">
        {activeSlide ? (
          <div className="w-full h-full max-w-[100vw] max-h-[100vh] flex items-center justify-center">
             <div style={{ width: 'min(100%, calc(100vh * 16 / 9))', aspectRatio: '16/9' }} className="relative bg-[#191919]">
                <SlideCanvas slide={activeSlide} interactive={true} />
             </div>
          </div>
        ) : (
          <div className="text-white/50 text-2xl font-bold">In attesa della presentazione...</div>
        )}
      </div>
    </ScoreProvider>
  );
}