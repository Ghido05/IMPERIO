import { useState } from 'react';
import { ScoreProvider } from './context/ScoreContext';
import { GameDataProvider } from './context/GameDataContext';
import ImgBoard from './Il mio nome è nessuno_img_Board';
import MusicBoard from './Il mio nome è nessuno_musicale_Board';
import ClassificaBoard from './Gioco classifica_Board';
import ClassificaMusicaleBoard from './Gioco classifica musicale_Board';
import CruciverbaBoard from './Gioco cruciverba_Board';
import GiocoFraseTempoBoard from './Gioco frasetempo_Board';
import PasswordSquadreBoard from './Gioco password_squadre_Board';
import PasswordPresceltiBoard from './Gioco password_prescelti_Board';
import ClassificaGeneraleBoard from './ClassificaGenerale_Board';

import defaultImgData from './data/Il mio nome è nessuno_img_Data.json';
import defaultMusicData from './data/Il mio nome è nessuno_musicale_Data.json';
import defaultClassificaData from './data/Gioco classifica_Data.json';
import defaultClassificaMusicaleData from './data/Gioco classifica musicale_Data.json';
import defaultCruciverbaData from './data/Gioco cruciverba_Data.json';
import defaultFraseTempoData from './data/Gioco frasetempo_Data.json';
import defaultPasswordData from './data/Gioco password_Data.json';

const defaultGameDataMap: Record<string, any> = {
  img: defaultImgData,
  music: defaultMusicData,
  classifica: defaultClassificaData,
  classifica_musicale: defaultClassificaMusicaleData,
  cruciverba: defaultCruciverbaData,
  gioco_frase_tempo: defaultFraseTempoData,
  password_squadre: defaultPasswordData,
  password_prescelti: defaultPasswordData,
  classifica_generale: {}, // Non ha JSON
};

function App() {
  const [game, setGame] = useState<'img' | 'music' | 'classifica' | 'classifica_musicale' | 'cruciverba' | 'gioco_frase_tempo' | 'password_squadre' | 'password_prescelti' | 'classifica_generale'>(() => {
    const params = new URLSearchParams(window.location.search);
    const gameParam = params.get('game');
    if (gameParam === 'musica') return 'music';
    if (gameParam === 'classifica') return 'classifica';
    if (gameParam === 'classifica_musicale') return 'classifica_musicale';
    if (gameParam === 'cruciverba') return 'cruciverba';
    if (gameParam === 'gioco_frase_tempo') return 'gioco_frase_tempo';
    if (gameParam === 'password_squadre') return 'password_squadre';
    if (gameParam === 'password_prescelti') return 'password_prescelti';
    if (gameParam === 'classifica_generale') return 'classifica_generale';
    return 'img';
  });

  const changeGame = (newGame: typeof game) => {
    setGame(newGame);
    // Aggiorna l'URL senza ricaricare la pagina
    const url = new URL(window.location.href);
    if (newGame === 'img') {
      url.searchParams.delete('game');
    } else {
      const paramMap: Record<string, string> = {
        'music': 'musica',
        'classifica': 'classifica',
        'classifica_musicale': 'classifica_musicale',
        'cruciverba': 'cruciverba',
        'gioco_frase_tempo': 'gioco_frase_tempo',
        'password_squadre': 'password_squadre',
        'password_prescelti': 'password_prescelti',
        'classifica_generale': 'classifica_generale'
      };
      url.searchParams.set('game', paramMap[newGame] || newGame);
    }
    window.history.pushState({}, '', url);
  };

  const isProjecting = new URLSearchParams(window.location.search).get('project') === 'true';

  return (
    <ScoreProvider>
      <GameDataProvider data={defaultGameDataMap[game]}>
        {game === 'img' && <ImgBoard />}
        {game === 'music' && <MusicBoard />}
        {game === 'classifica' && <ClassificaBoard />}
        {game === 'classifica_musicale' && <ClassificaMusicaleBoard />}
        {game === 'cruciverba' && <CruciverbaBoard />}
        {game === 'gioco_frase_tempo' && <GiocoFraseTempoBoard />}
        {game === 'password_squadre' && <PasswordSquadreBoard />}
        {game === 'password_prescelti' && <PasswordPresceltiBoard />}
        {game === 'classifica_generale' && <ClassificaGeneraleBoard />}
      </GameDataProvider>
      
      {/* Piccolo selettore rapido in alto a sinistra - Nascosto in modalità proiezione */}
      {!isProjecting && (
        <div className="fixed top-2 left-2 z-[1000] opacity-20 hover:opacity-100 transition-opacity flex flex-wrap gap-2 max-w-2xl">
          <button 
            onClick={() => changeGame('img')}
            className={`px-3 py-1 rounded text-xs font-bold ${game === 'img' ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-400'}`}
          >
            IMMAGINE
          </button>
          <button 
            onClick={() => changeGame('music')}
            className={`px-3 py-1 rounded text-xs font-bold ${game === 'music' ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-400'}`}
          >
            MUSICA
          </button>
          <button 
            onClick={() => changeGame('classifica')}
            className={`px-3 py-1 rounded text-xs font-bold ${game === 'classifica' ? 'bg-purple-500 text-white' : 'bg-gray-800 text-gray-400'}`}
          >
            CLASSIFICA
          </button>
          <button 
            onClick={() => changeGame('classifica_musicale')}
            className={`px-3 py-1 rounded text-xs font-bold ${game === 'classifica_musicale' ? 'bg-indigo-500 text-white' : 'bg-gray-800 text-gray-400'}`}
          >
            CLASS. MUSICALE
          </button>
          <button 
            onClick={() => changeGame('cruciverba')}
            className={`px-3 py-1 rounded text-xs font-bold ${game === 'cruciverba' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400'}`}
          >
            CRUCIVERBA
          </button>
          <button 
            onClick={() => changeGame('gioco_frase_tempo')}
            className={`px-3 py-1 rounded text-xs font-bold ${game === 'gioco_frase_tempo' ? 'bg-cyan-600 text-white' : 'bg-gray-800 text-gray-400'}`}
          >
            G. FRASE TEMPO
          </button>
          <button 
            onClick={() => changeGame('password_squadre')}
            className={`px-3 py-1 rounded text-xs font-bold ${game === 'password_squadre' ? 'bg-pink-600 text-white' : 'bg-gray-800 text-gray-400'}`}
          >
            PASS. SQUADRE
          </button>
          <button 
            onClick={() => changeGame('password_prescelti')}
            className={`px-3 py-1 rounded text-xs font-bold ${game === 'password_prescelti' ? 'bg-fuchsia-600 text-white' : 'bg-gray-800 text-gray-400'}`}
          >
            PASS. PRESCELTI
          </button>
          <button 
            onClick={() => window.open('?game=classifica_generale&project=true', '_blank', 'width=1280,height=720')}
            className="px-3 py-1 rounded text-xs font-bold bg-yellow-500 text-black hover:bg-yellow-400"
            title="Apri classifica in una nuova finestra per proiezione"
          >
            PROIETTA ↗
          </button>
        </div>
      )}
    </ScoreProvider>
  );
}

export default App;
