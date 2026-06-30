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

  const keyRef = useRef(key);
  keyRef.current = key;

  const initialValueRef = useRef(initialValue);
  initialValueRef.current = initialValue;

  // Automatically update state when key changes (e.g. switching slides)
  useEffect(() => {
    const saved = localStorage.getItem(key);
    if (saved !== null) {
      try {
        setState(JSON.parse(saved));
      } catch (e) {
        setState(initialValueRef.current);
      }
    } else {
      setState(initialValueRef.current);
    }
  }, [key]);

  // Synchronize state changes across windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === keyRef.current && e.newValue !== null) {
        try {
          setState(JSON.parse(e.newValue));
        } catch (err) {
          console.error(err);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);

    const isElectron = (window as any).electron !== undefined;
    let unsubscribe: (() => void) | undefined;
    if (isElectron) {
      const electron = (window as any).electron;
      unsubscribe = electron.onStateUpdate((ipcState: any) => {
        if (ipcState && ipcState.localStorageUpdate && ipcState.localStorageUpdate.key === keyRef.current) {
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
      if (unsubscribe) unsubscribe();
    };
  }, [key]);

  const setSyncedState = useCallback((newValue: T | ((prev: T) => T)) => {
    const currentKey = keyRef.current;
    setState(prev => {
      const resolvedValue = typeof newValue === 'function' 
        ? (newValue as (prev: T) => T)(prev) 
        : newValue;
      
      localStorage.setItem(currentKey, JSON.stringify(resolvedValue));
      return resolvedValue;
    });
  }, []);

  return [state, setSyncedState];
}
