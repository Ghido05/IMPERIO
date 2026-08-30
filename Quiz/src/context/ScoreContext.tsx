import React, { createContext, useContext, useState, useEffect } from 'react';

interface ScoreContextType {
  scores: number[];
  bonuses: boolean[][];
  addScore: (teamIndex: number, points: number) => void;
  setScore: (teamIndex: number, points: number) => void;
  toggleBonus: (teamIndex: number, bonusIndex: number) => void;
  resetAll: () => void;
}

const ScoreContext = createContext<ScoreContextType | undefined>(undefined);

const STORAGE_KEY = 'imperio_quiz_scores';

export const ScoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [scores, setScores] = useState<number[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.scores) return parsed.scores;
      } catch (e) {
        console.error("Failed to parse saved scores", e);
      }
    }
    return [0, 0, 0];
  });
  const [bonuses, setBonuses] = useState<boolean[][]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.bonuses) {
          return parsed.bonuses.map((row: boolean[]) => {
            if (row.length > 3) return row.slice(0, 3);
            if (row.length < 3) return [...row, ...Array(3 - row.length).fill(false)];
            return row;
          });
        }
      } catch (e) {
        console.error("Failed to parse saved bonuses", e);
      }
    }
    return [
      [false, false, false],
      [false, false, false],
      [false, false, false]
    ];
  });

  // Load from localStorage on init and listen for changes from other windows
  useEffect(() => {
    const loadFromStorage = () => {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const { scores: savedScores, bonuses: savedBonuses } = JSON.parse(saved);
          if (savedScores) setScores(savedScores);
          if (savedBonuses) {
            // Assicuriamoci che ogni riga abbia 3 elementi
            const normalizedBonuses = savedBonuses.map((row: boolean[]) => {
              if (row.length > 3) return row.slice(0, 3);
              if (row.length < 3) return [...row, ...Array(3 - row.length).fill(false)];
              return row;
            });
            setBonuses(normalizedBonuses);
          }
        } catch (e) {
          console.error("Failed to parse saved scores", e);
        }
      }
    };

    loadFromStorage();

    const handleStorageChange = (e: any) => {
      const key = e.key || (e.detail && e.detail.key);
      const newValue = e.newValue !== undefined ? e.newValue : (e.detail && e.detail.value);

      if (key === STORAGE_KEY && newValue) {
        try {
          const { scores: savedScores, bonuses: savedBonuses } = JSON.parse(newValue);
          if (savedScores) setScores(savedScores);
          if (savedBonuses) {
            const normalizedBonuses = savedBonuses.map((row: boolean[]) => {
              if (row.length > 3) return row.slice(0, 3);
              if (row.length < 3) return [...row, ...Array(3 - row.length).fill(false)];
              return row;
            });
            setBonuses(normalizedBonuses);
          }
        } catch (err) {
          console.error("Error parsing storage change", err);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('local-storage-update', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('local-storage-update', handleStorageChange);
    };
  }, []);



  const saveToStorage = (newScores: number[], newBonuses: boolean[][]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ scores: newScores, bonuses: newBonuses }));
  };

  const addScore = (teamIndex: number, points: number) => {
    setScores(prev => {
      const newScores = [...prev];
      newScores[teamIndex] += points;
      saveToStorage(newScores, bonuses);
      return newScores;
    });
  };

  const setScore = (teamIndex: number, points: number) => {
    setScores(prev => {
      const newScores = [...prev];
      newScores[teamIndex] = points;
      saveToStorage(newScores, bonuses);
      return newScores;
    });
  };

  const toggleBonus = (teamIndex: number, bonusIndex: number) => {
    setBonuses(prev => {
      const newBonuses = prev.map(row => [...row]);
      newBonuses[teamIndex][bonusIndex] = !newBonuses[teamIndex][bonusIndex];
      saveToStorage(scores, newBonuses);
      return newBonuses;
    });
  };

  const resetAll = () => {
    const newScores = [0, 0, 0];
    const newBonuses = [
      [false, false, false],
      [false, false, false],
      [false, false, false]
    ];
    setScores(newScores);
    setBonuses(newBonuses);
    saveToStorage(newScores, newBonuses);
  };

  return (
    <ScoreContext.Provider value={{ scores, bonuses, addScore, setScore, toggleBonus, resetAll }}>
      {children}
    </ScoreContext.Provider>
  );
};

export const useScores = () => {
  const context = useContext(ScoreContext);
  if (context === undefined) {
    throw new Error('useScores must be used within a ScoreProvider');
  }
  return context;
};
