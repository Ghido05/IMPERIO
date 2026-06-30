import { useState, useEffect } from 'react';
import Sandbox from './Sandbox';
import PresenterView from './views/PresenterView';
import GamesView from './views/GamesView';
import ScoresView from './views/ScoresView';

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

function App() {
  const [mode, setMode] = useState<string | null>(null);
  const [isSandbox, setIsSandbox] = useState(false);

  // Sync localStorage changes across Electron windows (specifically for the password board)
  useEffect(() => {
    const isElectron = (window as any).electron !== undefined;
    if (!isElectron) return;

    const electron = (window as any).electron;
    const originalSetItem = Storage.prototype.setItem;

    // Override setItem to broadcast modifications for password and general game playstates
    Storage.prototype.setItem = function (key: string, value: string) {
      originalSetItem.call(this, key, value);
      if (key.startsWith('password_') || key.startsWith('playstate_')) {
        electron.broadcastState({
          localStorageUpdate: { key, value }
        });
      }
    };

    // Receive modifications from other windows and trigger local storage listeners
    const handleStateUpdate = (state: any) => {
      if (state && state.localStorageUpdate) {
        const { key, value } = state.localStorageUpdate;
        if (key.startsWith('password_') || key.startsWith('playstate_')) {
          originalSetItem.call(localStorage, key, value);
          const event = new StorageEvent('storage', {
            key,
            newValue: value,
            storageArea: localStorage,
          });
          window.dispatchEvent(event);
        }
      }
    };

    const unsubscribe = electron.onStateUpdate(handleStateUpdate);

    return () => {
      Storage.prototype.setItem = originalSetItem;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const forceSandbox = urlParams.get('sandbox') === 'true';
    const currentMode = urlParams.get('mode');

    if (forceSandbox) {
      setIsSandbox(true);
    } else if (currentMode) {
      setMode(currentMode);
    } else {
      // Default to presenter if no mode is specified (e.g. standard browser open without params)
      setMode('presenter');
    }
  }, []);

  if (isSandbox) {
    return <Sandbox />;
  }

  if (mode === 'presenter') {
    return <PresenterView />;
  }

  if (mode === 'games') {
    return <GamesView />;
  }

  if (mode === 'scores') {
    return <ScoresView />;
  }

  // Fallback
  return <div className="text-white">Caricamento...</div>;
}

export default App;