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
  | 'classifica_generale'
  | 'finale_squadre';

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
    const originalRemoveItem = Storage.prototype.removeItem;

    // Override setItem to broadcast modifications for password and general game playstates
    Storage.prototype.setItem = function (key: string, value: string) {
      originalSetItem.call(this, key, value);
      if (key.startsWith('password_') || key.startsWith('playstate_')) {
        electron.broadcastState({
          localStorageUpdate: { key, value }
        });
      }
    };

    // Override removeItem to broadcast deletions for password and general game playstates
    Storage.prototype.removeItem = function (key: string) {
      originalRemoveItem.call(this, key);
      if (key.startsWith('password_') || key.startsWith('playstate_')) {
        electron.broadcastState({
          localStorageUpdate: { key, value: null }
        });
      }
    };

    // Receive modifications from other windows and trigger local storage listeners
    const handleStateUpdate = async (state: any) => {
      if (state && state.localStorageUpdate) {
        const { key, value } = state.localStorageUpdate;
        if (key.startsWith('password_') || key.startsWith('playstate_')) {
          if (value === null || value === undefined) {
            originalRemoveItem.call(localStorage, key);
          } else {
            originalSetItem.call(localStorage, key, value);
          }
          const event = new StorageEvent('storage', {
            key,
            newValue: value,
            storageArea: localStorage,
          });
          window.dispatchEvent(event);
        }
      }

      if (state && state.newIndexedDBFile) {
        const { id, fileName, base64 } = state.newIndexedDBFile;
        try {
          const { getLargeFile, dataURItoBlob } = await import('./lib/idbStore');
          const { idbBlobUrlCache, idbNameCache } = await import('./lib/assetUrl');
          
          let val = base64;
          if (!val) {
            val = await getLargeFile(id);
          }
          if (val && val.startsWith('data:')) {
            const blob = dataURItoBlob(val);
            const blobUrl = URL.createObjectURL(blob);
            idbBlobUrlCache.set(`idb://${id}`, blobUrl);
            idbNameCache.set(`idb://${id}`, fileName || 'File locale');
            
            window.dispatchEvent(new CustomEvent('idb-file-loaded', { detail: { path: `idb://${id}` } }));
          }
        } catch (err) {
          console.error("Errore nel caricamento asincrono del file IPC:", err);
        }
      }
    };

    const unsubscribe = electron.onStateUpdate(handleStateUpdate);

    return () => {
      Storage.prototype.setItem = originalSetItem;
      Storage.prototype.removeItem = originalRemoveItem;
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
