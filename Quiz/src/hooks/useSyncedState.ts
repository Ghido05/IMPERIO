import { useState, useEffect, useCallback, useRef } from 'react';

export function useSyncedState<T>(key: string, initialValue: T): [T, (val: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => {
    const saved = localStorage.getItem(key);
    if (saved !== null) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return initialValue;
      }
    }
    return initialValue;
  });

  const [prevKey, setPrevKey] = useState(key);
  if (key !== prevKey) {
    setPrevKey(key);
    const saved = localStorage.getItem(key);
    let newValue = initialValue;
    if (saved !== null) {
      try {
        newValue = JSON.parse(saved);
      } catch (e) {
        newValue = initialValue;
      }
    }
    setState(newValue);
  }

  // Synchronize state changes across windows and inside the same window
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          setState(JSON.parse(e.newValue));
        } catch (err) {
          console.error(err);
        }
      }
    };

    const handleLocalUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.key === key) {
        try {
          setState(JSON.parse(customEvent.detail.value));
        } catch (err) {
          console.error(err);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('local-storage-update', handleLocalUpdate);

    const isElectron = (window as any).electron !== undefined;
    let unsubscribe: (() => void) | undefined;
    if (isElectron) {
      const electron = (window as any).electron;
      unsubscribe = electron.onStateUpdate((ipcState: any) => {
        if (ipcState && ipcState.localStorageUpdate && ipcState.localStorageUpdate.key === key) {
          try {
            setState(JSON.parse(ipcState.localStorageUpdate.value));
          } catch (err) {
            console.error(err);
          }
        }
      });
    }

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('local-storage-update', handleLocalUpdate);
      if (unsubscribe) unsubscribe();
    };
  }, [key]);

  const setSyncedState = useCallback((newValue: T | ((prev: T) => T)) => {
    setState(prev => {
      const resolvedValue = typeof newValue === 'function' 
        ? (newValue as (prev: T) => T)(prev) 
        : newValue;
      
      const stringified = JSON.stringify(resolvedValue);
      localStorage.setItem(key, stringified);
      
      // Notify other instances in the same window
      window.dispatchEvent(new CustomEvent('local-storage-update', {
        detail: { key, value: stringified }
      }));
      
      return resolvedValue;
    });
  }, [key]);

  return [state, setSyncedState];
}
