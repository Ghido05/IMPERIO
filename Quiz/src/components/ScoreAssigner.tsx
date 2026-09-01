import React, { useState, useEffect } from 'react';
import { useScores } from '../context/ScoreContext';
import { formatScoreNumber, getTeamName } from '../lib/formatUtils';

interface ScoreAssignerProps {
  points: number;
  onAssigned?: (teamNum: number) => void;
  className?: string;
}

const ScoreAssigner: React.FC<ScoreAssignerProps> = ({ points, onAssigned, className = "" }) => {
  const { addScore } = useScores();
  const [teamNames, setTeamNames] = useState<string[]>(['SQUADRA 1', 'SQUADRA 2', 'SQUADRA 3']);

  useEffect(() => {
    const saved = localStorage.getItem('imperio_quiz_setup_config_v1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed?.punteggi?.nomiSquadre) {
          setTeamNames(parsed.punteggi.nomiSquadre);
        }
      } catch {}
    }
  }, []);

  const handleAssign = (teamIdx: number) => {
    addScore(teamIdx, points);
    if (onAssigned) onAssigned(teamIdx + 1);
  };

  return (
    <div className={`flex gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 ${className}`}>
      {[1, 2, 3].map((num, i) => {
        const label = teamNames[i] ? teamNames[i] : `S${num}`;
        return (
          <button
            key={num}
            onClick={() => handleAssign(i)}
            className={`px-6 py-2 rounded-full font-black text-white text-lg transition-all hover:scale-110 active:scale-95 shadow-lg border-2 border-white/20 cursor-pointer
              ${num === 1 ? 'bg-red-600 hover:bg-red-500' : num === 2 ? 'bg-blue-600 hover:bg-blue-500' : 'bg-green-600 hover:bg-green-500'}
            `}
          >
            +{formatScoreNumber(points)} {label}
          </button>
        );
      })}
    </div>
  );
};

export const CompactScoreAssigner: React.FC<ScoreAssignerProps> = ({ points, onAssigned, className = "" }) => {
  const { addScore } = useScores();
  const [teamNames, setTeamNames] = useState<string[]>(['SQUADRA 1', 'SQUADRA 2', 'SQUADRA 3']);

  useEffect(() => {
    const saved = localStorage.getItem('imperio_quiz_setup_config_v1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed?.punteggi?.nomiSquadre) {
          setTeamNames(parsed.punteggi.nomiSquadre);
        }
      } catch {}
    }
  }, []);

  const handleAssign = (teamIdx: number) => {
    addScore(teamIdx, points);
    if (onAssigned) onAssigned(teamIdx + 1);
  };

  return (
    <div className={`flex gap-1 animate-in fade-in duration-300 ${className}`}>
      {[1, 2, 3].map((num, i) => (
        <button
          key={num}
          onClick={() => handleAssign(i)}
          title={`+${formatScoreNumber(points)} a ${getTeamName(teamNames, num)}`}
          className={`w-6 h-6 rounded-full font-black text-white text-[10px] transition-all hover:scale-125 active:scale-90 shadow-md border border-white/40 cursor-pointer
            ${num === 1 ? 'bg-red-600' : num === 2 ? 'bg-blue-600' : 'bg-green-600'}
          `}
        >
          {num}
        </button>
      ))}
    </div>
  );
};

export default ScoreAssigner;

