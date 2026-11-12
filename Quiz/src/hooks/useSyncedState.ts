import { useState, useEffect, useCallback } from 'react';

export function useSyncedState<T>(key: string, initialValue: T): [T, (val: T | ((prev: T) => T)) => void] {
  const parseValue = useCallback((val: any): T => {
    if (val === null || val === undefined || val === 'null' || val === '') {
      return initialValue;
    }
    if (typeof val === 'string') {
      try {
        const parsed = JSON.parse(val);
        return parsed === null && initialValue !== null ? initialValue : parsed;
      } catch {
        return val as unknown as T;
      }
    }
    return val;
  }, [initialValue]);

  const [state, setState] = useState<T>(() => {
    const saved = localStorage.getItem(key);
    return parseValue(saved);
  });

  const [prevKey, setPrevKey] = useState(key);
  if (key !== prevKey) {
    setPrevKey(key);
    const saved = localStorage.getItem(key);
    setState(parseValue(saved));
  }

  // Synchronize state changes across windows and inside the same window
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key) {
        setState(parseValue(e.newValue));
      }
    };

    const handleLocalUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.key === key) {
        setState(parseValue(customEvent.detail.value));
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
          setState(parseValue(ipcState.localStorageUpdate.value));
        }
      });
    }

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('local-storage-update', handleLocalUpdate);
      if (unsubscribe) unsubscribe();
    };
  }, [key, parseValue]);

  const setSyncedState = useCallback((newValue: T | ((prev: T) => T)) => {
    setState(prev => {
      const resolvedValue = typeof newValue === 'function' 
        ? (newValue as (prev: T) => T)(prev) 
        : newValue;
      
      setTimeout(() => {
        const stringified = JSON.stringify(resolvedValue);
        localStorage.setItem(key, stringified);
        
        // Notify other instances in the same window
        window.dispatchEvent(new CustomEvent('local-storage-update', {
          detail: { key, value: stringified }
        }));
      }, 0);
      
      return resolvedValue;
    });
  }, [key]);

  return [state, setSyncedState];
}
