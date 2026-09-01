import React, { createContext, useContext, useState, useEffect } from 'react';

interface ScoreContextType {
  scores: number[];
  bonuses: boolean[][];
  addScore: (teamIndex: number, points: number) => void;
  setScore: (teamIndex: number, points: number) => void;
  toggleBonus: (teamIndex: number, bonusIndex: number) => void;
  awardBonusAndPoints: (teamIndex: number, points: number, bonusIndex?: number) => void;
  resetAll: () => void;
}

const ScoreContext = createContext<ScoreContextType | undefined>(undefined);

const STORAGE_KEY = 'imperio_quiz_scores';

const normalizeScores = (arr: any): number[] => {
  if (!Array.isArray(arr)) return [0, 0, 0];
  return [
    Number(arr[0]) || 0,
    Number(arr[1]) || 0,
    Number(arr[2]) || 0
  ];
};

const normalizeBonuses = (savedBonuses: any): boolean[][] => {
  if (!Array.isArray(savedBonuses)) {
    return [
      [false, false, false, false],
      [false, false, false, false],
      [false, false, false, false]
    ];
  }
  return [0, 1, 2].map((teamIdx) => {
    const row = Array.isArray(savedBonuses[teamIdx]) ? savedBonuses[teamIdx] : [];
    return [
      Boolean(row[0]),
      Boolean(row[1]),
      Boolean(row[2]),
      Boolean(row[3])
    ];
  });
};

interface ScoreData {
  scores: number[];
  bonuses: boolean[][];
}

const getInitialScoreData = (): ScoreData => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      return {
        scores: normalizeScores(parsed.scores),
        bonuses: normalizeBonuses(parsed.bonuses),
      };
    } catch (e) {
      console.error("Failed to parse saved scores", e);
    }
  }
  return {
    scores: [0, 0, 0],
    bonuses: [
      [false, false, false, false],
      [false, false, false, false],
      [false, false, false, false]
    ]
  };
};

export const ScoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<ScoreData>(getInitialScoreData);

  useEffect(() => {
    const loadFromStorage = () => {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setData({
            scores: normalizeScores(parsed.scores),
            bonuses: normalizeBonuses(parsed.bonuses),
          });
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
          const parsed = JSON.parse(newValue);
          setData({
            scores: normalizeScores(parsed.scores),
            bonuses: normalizeBonuses(parsed.bonuses),
          });
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

  const saveToStorage = (newData: ScoreData) => {
    const jsonStr = JSON.stringify(newData);
    localStorage.setItem(STORAGE_KEY, jsonStr);
    window.dispatchEvent(new CustomEvent('local-storage-update', { detail: { key: STORAGE_KEY, value: jsonStr } }));
  };

  const getLatestData = (): ScoreData => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          scores: normalizeScores(parsed.scores),
          bonuses: normalizeBonuses(parsed.bonuses)
        };
      } catch (e) {}
    }
    return data;
  };

  const addScore = (teamIndex: number, points: number) => {
    const baseData = getLatestData();
    const newScores = [...baseData.scores];
    newScores[teamIndex] = (newScores[teamIndex] || 0) + points;
    const next = { scores: newScores, bonuses: baseData.bonuses };
    saveToStorage(next);
    setData(next);
  };

  const setScore = (teamIndex: number, points: number) => {
    const baseData = getLatestData();
    const newScores = [...baseData.scores];
    newScores[teamIndex] = points;
    const next = { scores: newScores, bonuses: baseData.bonuses };
    saveToStorage(next);
    setData(next);
  };

  const toggleBonus = (teamIndex: number, bonusIndex: number) => {
    const baseData = getLatestData();
    const newBonuses = baseData.bonuses.map(row => [...row]);
    newBonuses[teamIndex][bonusIndex] = !newBonuses[teamIndex][bonusIndex];
    const next = { scores: baseData.scores, bonuses: newBonuses };
    saveToStorage(next);
    setData(next);
  };

  const awardBonusAndPoints = (teamIndex: number, points: number, bonusIndex?: number) => {
    const baseData = getLatestData();
    const newScores = [...baseData.scores];
    if (points) {
      newScores[teamIndex] = (newScores[teamIndex] || 0) + points;
    }
    const newBonuses = baseData.bonuses.map(row => [...row]);
    if (bonusIndex !== undefined && bonusIndex >= 0 && bonusIndex < 4) {
      newBonuses[teamIndex][bonusIndex] = true;
    }
    const next = { scores: newScores, bonuses: newBonuses };
    saveToStorage(next);
    setData(next);
  };

  const resetAll = () => {
    const next = {
      scores: [0, 0, 0],
      bonuses: [
        [false, false, false, false],
        [false, false, false, false],
        [false, false, false, false]
      ]
    };
    saveToStorage(next);
    setData(next);
  };

  return (
    <ScoreContext.Provider
      value={{
        scores: data.scores,
        bonuses: data.bonuses,
        addScore,
        setScore,
        toggleBonus,
        awardBonusAndPoints,
        resetAll
      }}
    >
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

