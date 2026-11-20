import { useSyncExternalStore } from 'react';
import { computeIsBuzzerActiveFromStorage } from '../lib/webSerial';

function subscribeBuzzerState(onStoreChange: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }
  window.addEventListener('storage', onStoreChange);
  window.addEventListener('local-storage-update', onStoreChange);
  const interval = window.setInterval(onStoreChange, 250);
  return () => {
    window.removeEventListener('storage', onStoreChange);
    window.removeEventListener('local-storage-update', onStoreChange);
    window.clearInterval(interval);
  };
}

function getBuzzerSnapshot(): boolean {
  return computeIsBuzzerActiveFromStorage();
}

function getBuzzerServerSnapshot(): boolean {
  return false;
}

/**
 * Monitora in tempo reale lo stato di attivazione della pulsantiera da localStorage.
 */
export function useBuzzerActive(): boolean {
  return useSyncExternalStore(
    subscribeBuzzerState,
    getBuzzerSnapshot,
    getBuzzerServerSnapshot,
  );
}
