import { useState, useEffect } from 'react';
import Sandbox from './Sandbox';
import PresenterView from './views/PresenterView';
import GamesView from './views/GamesView';
import ScoresView from './views/ScoresView';
import IpadView from './views/IpadView';
import { djSoundEngine, type DjPadConfig } from './lib/djSoundEngine';
import {
  LAUNCHPAD_PADS_UPDATED_EVENT,
  LAUNCHPAD_STORAGE_KEY,
  type LaunchpadCommand,
  type LaunchpadPadsUpdatedDetail,
  loadLaunchpadPads,
  mergeRemotePadsWithLocal,
  resolvePadForPlayback,
  sanitizePadsForRemote,
  saveLaunchpadPads,
} from './lib/launchpadSync';

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
  | 'finale_squadre'
  | 'scenetta'
  | 'video'
  | 'mappa_torneo'
  | 'spiegazione_fasi'
  | 'spiegazione_box1'
  | 'spiegazione_box2'
  | 'spiegazione_box3'
  | 'spiegazione_box4'
  | 'spiegazione_box5'
  | 'presentazione_squadre'
  | 'prova_pulsantiera'
  | 'introduzione_nadia';

export interface Slide {
  id: string;
  type: SlideType;
  data?: unknown;
}

function App() {
  const [mode, setMode] = useState<string | null>(null);
  const [isSandbox, setIsSandbox] = useState(false);

  // Reset game states and scores at session startup, preserving setup configuration
  useEffect(() => {
    const hasReset = sessionStorage.getItem('imperio_session_reset_done');
    if (!hasReset) {
      sessionStorage.setItem('imperio_session_reset_done', 'true');
      
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          if (
            key.startsWith('playstate_') || 
            key.startsWith('password_') || 
            key === 'imperio_quiz_scores'
          ) {
            keysToRemove.push(key);
          }
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      console.log('Stati dei giochi e punteggi resettati per la nuova sessione.');
    }
  }, []);

  // Sync localStorage changes across Electron windows (specifically for the password board)
  useEffect(() => {
    const isElectron = (window as any).electron !== undefined;
    if (!isElectron) return;

    const electron = (window as any).electron;
    const originalSetItem = Storage.prototype.setItem;
    const originalRemoveItem = Storage.prototype.removeItem;

    // Override setItem to broadcast modifications for password, game playstates, scores, and setup
    Storage.prototype.setItem = function (key: string, value: string) {
      originalSetItem.call(this, key, value);
      if (
        key.startsWith('password_') || 
        key.startsWith('playstate_') || 
        key === 'imperio_quiz_scores' || 
        key === 'imperio_quiz_setup_config_v1'
      ) {
        electron.broadcastState({
          localStorageUpdate: { key, value }
        });
      }
    };

    // Override removeItem to broadcast deletions for password, game playstates, scores, and setup
    Storage.prototype.removeItem = function (key: string) {
      originalRemoveItem.call(this, key);
      if (
        key.startsWith('password_') || 
        key.startsWith('playstate_') || 
        key === 'imperio_quiz_scores' || 
        key === 'imperio_quiz_setup_config_v1'
      ) {
        electron.broadcastState({
          localStorageUpdate: { key, value: null }
        });
      }
    };

    // Receive modifications from other windows and trigger local storage listeners
    const handleStateUpdate = async (state: any) => {
      if (state && state.localStorageUpdate) {
        const { key, value } = state.localStorageUpdate;
        if (
          key.startsWith('password_') || 
          key.startsWith('playstate_') || 
          key === 'imperio_quiz_scores' || 
          key === 'imperio_quiz_setup_config_v1'
        ) {
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

  // Bridge Launchpad audio and state on the Mac presenter window so remote iPad triggers play on the computer
  useEffect(() => {
    if (mode !== 'presenter' || isSandbox) return;
    interface ElectronLaunchpadApi {
      sendLaunchpadState?: (state: { playingPadIds: string[]; masterVolume: number }) => void;
      sendLaunchpadPads?: (pads: DjPadConfig[]) => void;
      onLaunchpadCommand?: (cb: (cmd: LaunchpadCommand) => void) => () => void;
      onLaunchpadPadsFromRemote?: (cb: (pads: DjPadConfig[]) => void) => () => void;
    }
    const electron = (window as unknown as { electron?: ElectronLaunchpadApi }).electron;
    if (!electron) return;

    let currentPlayingIds = djSoundEngine.getPlayingPadIds();
    let currentVolume = djSoundEngine.getMasterVolume();

    const pushState = () => {
      electron.sendLaunchpadState?.({
        playingPadIds: currentPlayingIds,
        masterVolume: currentVolume,
      });
    };

    const pushPads = () => {
      const sanitized = sanitizePadsForRemote(loadLaunchpadPads());
      electron.sendLaunchpadPads?.(sanitized);
    };

    pushPads();
    pushState();

    const unsubPlaying = djSoundEngine.subscribe((ids) => {
      currentPlayingIds = Array.from(ids);
      pushState();
    });

    const unsubVolume = djSoundEngine.subscribeVolume((vol) => {
      currentVolume = vol;
      pushState();
    });

    const handleLocalPadsUpdated = (e: Event) => {
      const detail = (e as CustomEvent<LaunchpadPadsUpdatedDetail>).detail;
      if (detail?.source === 'local') {
        pushPads();
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === LAUNCHPAD_STORAGE_KEY) {
        pushPads();
      }
    };

    window.addEventListener(LAUNCHPAD_PADS_UPDATED_EVENT, handleLocalPadsUpdated);
    window.addEventListener('storage', handleStorage);

    const unsubCommand = electron.onLaunchpadCommand?.((cmd: LaunchpadCommand) => {
      if (!cmd) return;
      if (cmd.action === 'trigger') {
        const resolved = resolvePadForPlayback(cmd.padId, cmd.pad);
        djSoundEngine.triggerPad(resolved);
      } else if (cmd.action === 'stopPad') {
        djSoundEngine.stopPad(cmd.padId);
      } else if (cmd.action === 'stopAll') {
        djSoundEngine.stopAll();
      } else if (cmd.action === 'setMasterVolume' && typeof cmd.volume === 'number') {
        djSoundEngine.setMasterVolume(cmd.volume);
      }
    });

    const unsubRemotePads = electron.onLaunchpadPadsFromRemote?.((incomingPads: DjPadConfig[]) => {
      if (!Array.isArray(incomingPads) || incomingPads.length !== 12) return;
      const merged = mergeRemotePadsWithLocal(incomingPads, loadLaunchpadPads());
      saveLaunchpadPads(merged, { source: 'remote', notifyEvent: true });

      const sanitized = sanitizePadsForRemote(merged);
      if (JSON.stringify(sanitized) !== JSON.stringify(incomingPads)) {
        electron.sendLaunchpadPads?.(sanitized);
      }
    });

    return () => {
      unsubPlaying();
      unsubVolume();
      window.removeEventListener(LAUNCHPAD_PADS_UPDATED_EVENT, handleLocalPadsUpdated);
      window.removeEventListener('storage', handleStorage);
      unsubCommand?.();
      unsubRemotePads?.();
    };
  }, [mode, isSandbox]);

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

  if (mode === 'ipad') {
    return <IpadView />;
  }

  // Fallback
  return <div className="text-white">Caricamento...</div>;
}

export default App;
