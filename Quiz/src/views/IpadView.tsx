import { useState, useEffect } from 'react';
import PasswordPresceltiBoard from '../Gioco password_prescelti_Board';
import { GameDataProvider } from '../context/GameDataContext';
import { cloneDefaultData } from '../lib/defaultGameData';
import type { Slide } from '../App';

export default function IpadView() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [wsConnected, setWsConnected] = useState(false);

  // Sync state over WebSocket
  useEffect(() => {
    const wsPort = window.location.port === '5173' ? '3001' : window.location.port;
    const socketUrl = `ws://${window.location.hostname}:${wsPort}/ws`;
    
    console.log(`iPad connecting to WebSocket: ${socketUrl}`);
    let ws = new WebSocket(socketUrl);
    let reconnectTimeout: any;

    const originalSetItem = Storage.prototype.setItem;
    const originalRemoveItem = Storage.prototype.removeItem;

    // Setup local storage override to send changes to Mac
    Storage.prototype.setItem = function (key: string, value: string) {
      originalSetItem.call(this, key, value);
      if (key.startsWith('password_') || key.startsWith('playstate_')) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'local-storage-update',
            data: { key, value }
          }));
        }
      }
    };

    Storage.prototype.removeItem = function (key: string) {
      originalRemoveItem.call(this, key);
      if (key.startsWith('password_') || key.startsWith('playstate_')) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'local-storage-update',
            data: { key, value: null }
          }));
        }
      }
    };

    function connect() {
      ws.onopen = () => {
        console.log('Connected to Mac Server');
        setWsConnected(true);
        ws.send(JSON.stringify({ type: 'request-state' }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          
          if (msg.type === 'init-state') {
            const { slides: serverSlides, localStorage: serverLocalStorage } = msg.data;
            if (serverSlides) {
              setSlides(serverSlides);
            }
            if (serverLocalStorage) {
              Object.entries(serverLocalStorage).forEach(([key, value]) => {
                if (key.startsWith('password_') || key.startsWith('playstate_')) {
                  if (value === null || value === undefined) {
                    originalRemoveItem.call(localStorage, key);
                  } else {
                    originalSetItem.call(localStorage, key, value as string);
                  }
                }
              });
              
              // Notify components of local storage update
              window.dispatchEvent(new Event('storage'));
              window.dispatchEvent(new CustomEvent('local-storage-update'));
            }
          } else if (msg.type === 'state-update') {
            const { slides: serverSlides } = msg.data;
            if (serverSlides) {
              setSlides(serverSlides);
            }
          } else if (msg.type === 'local-storage-update') {
            const { key, value } = msg.data;
            if (key.startsWith('password_') || key.startsWith('playstate_')) {
              if (value === null || value === undefined) {
                originalRemoveItem.call(localStorage, key);
              } else {
                originalSetItem.call(localStorage, key, value);
              }
              
              // Dispatch events to trigger useSyncedState hook re-renders
              const storageEvent = new StorageEvent('storage', {
                key,
                newValue: value,
                storageArea: localStorage,
              });
              window.dispatchEvent(storageEvent);
              
              window.dispatchEvent(new CustomEvent('local-storage-update', {
                detail: { key, value }
              }));
            }
          }
        } catch (err) {
          console.error('Error parsing WS message:', err);
        }
      };

      ws.onclose = () => {
        console.log('Disconnected from Mac Server, reconnecting...');
        setWsConnected(false);
        reconnectTimeout = setTimeout(() => {
          ws = new WebSocket(socketUrl);
          connect();
        }, 2000);
      };

      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        ws.close();
      };
    }

    connect();

    return () => {
      ws.close();
      clearTimeout(reconnectTimeout);
      Storage.prototype.setItem = originalSetItem;
      Storage.prototype.removeItem = originalRemoveItem;
    };
  }, []);

  // Find the password_prescelti slide in the presentation to extract its configured questions
  const presceltiSlide = slides.find(s => s.type === 'password_prescelti');
  const gameData = {
    ...((presceltiSlide?.data as any) ?? cloneDefaultData('password_prescelti')),
    slideId: presceltiSlide?.id ?? 'password_prescelti'
  };

  return (
    <div className="w-full min-h-screen bg-slate-900 text-white flex flex-col">
      {/* Top Connection Indicator */}
      <div className="bg-slate-950 px-4 py-2 flex justify-between items-center text-xs border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${wsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
          <span className="font-semibold text-slate-400">
            {wsConnected ? 'CONNESSO AL MAC' : 'DISCONNESSO — TENTATIVO DI RICONNESSIONE...'}
          </span>
        </div>
        <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px] hidden sm:inline">
          IMPERIO VII iPad Client
        </span>
      </div>

      <div className="flex-1 w-full overflow-y-auto">
        <GameDataProvider data={gameData}>
          <PasswordPresceltiBoard interactive={true} ipadMode={true} />
        </GameDataProvider>
      </div>
    </div>
  );
}
