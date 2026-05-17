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
  const [scores, setScores] = useState<number[]>([0, 0, 0]);
  const [bonuses, setBonuses] = useState<boolean[][]>([
    [false, false, false],
    [false, false, false],
    [false, false, false]
  ]);

  // Load from localStorage on init
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const { scores: savedScores, bonuses: savedBonuses } = JSON.parse(saved);
        if (savedScores) setScores(savedScores);
        if (savedBonuses) setBonuses(savedBonuses);
      } catch (e) {
        console.error("Failed to parse saved scores", e);
      }
    }
  }, []);

  // Save to localStorage whenever scores or bonuses change
  useEffect(() => {
    const state = { scores, bonuses };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    console.log("Scores saved to localStorage:", state);
  }, [scores, bonuses]);

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
    setScores([0, 0, 0]);
    setBonuses([
      [false, false, false],
      [false, false, false],
      [false, false, false]
    ]);
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
