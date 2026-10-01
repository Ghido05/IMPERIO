import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';

const GameDataContext = createContext<any>(null);

export const GameDataProvider = ({ data, children }: { data: any, children: ReactNode }) => {
  return (
    <GameDataContext.Provider value={data}>
      {children}
    </GameDataContext.Provider>
  );
};

export const useGameData = <T = any,>(): T => {
  const context = useContext(GameDataContext);
  if (context === undefined) {
    throw new Error('useGameData must be used within a GameDataProvider');
  }
  return context as T;
};
