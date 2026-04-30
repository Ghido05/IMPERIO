import { useState } from 'react';
import ImgBoard from './Il mio nome è nessuno_img_Board';
import MusicBoard from './Il mio nome è nessuno_musicale_Board';
import ClassificaBoard from './Gioco classifica_Board';
import ClassificaMusicaleBoard from './ClassificaMusicale_Board';
import FraseConTempoBoard from './FraseConTempo_Board';
import PercorsoBoard from './Gioco percorso_Board';
import CruciverbaBoard from './Gioco cruciverba_Board';
import GiocoFraseTempoBoard from './Gioco frasetempo_Board';

function App() {
  const [game] = useState<'img' | 'music' | 'classifica' | 'classifica_musicale' | 'frase_tempo' | 'percorso' | 'cruciverba' | 'gioco_frase_tempo'>(() => {
    const params = new URLSearchParams(window.location.search);
    const gameParam = params.get('game');
    if (gameParam === 'musica') return 'music';
    if (gameParam === 'classifica') return 'classifica';
    if (gameParam === 'classifica_musicale') return 'classifica_musicale';
    if (gameParam === 'frase_tempo') return 'frase_tempo';
    if (gameParam === 'percorso') return 'percorso';
    if (gameParam === 'cruciverba') return 'cruciverba';
    if (gameParam === 'gioco_frase_tempo') return 'gioco_frase_tempo';
    return 'img';
  });

  return (
    <>
      {game === 'img' && <ImgBoard />}
      {game === 'music' && <MusicBoard />}
      {game === 'classifica' && <ClassificaBoard />}
      {game === 'classifica_musicale' && <ClassificaMusicaleBoard />}
      {game === 'frase_tempo' && <FraseConTempoBoard />}
      {game === 'percorso' && <PercorsoBoard />}
      {game === 'cruciverba' && <CruciverbaBoard />}
      {game === 'gioco_frase_tempo' && <GiocoFraseTempoBoard />}
      
      {/* Piccolo selettore rapido in alto a sinistra */}
      <div className="fixed top-2 left-2 z-[1000] opacity-20 hover:opacity-100 transition-opacity flex flex-wrap gap-2 max-w-2xl">
        <button 
          onClick={() => { window.location.href = '/'; }}
          className={`px-3 py-1 rounded text-xs font-bold ${game === 'img' ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-400'}`}
        >
          IMMAGINE
        </button>
        <button 
          onClick={() => { window.location.href = '/?game=musica'; }}
          className={`px-3 py-1 rounded text-xs font-bold ${game === 'music' ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-400'}`}
        >
          MUSICA
        </button>
        <button 
          onClick={() => { window.location.href = '/?game=classifica'; }}
          className={`px-3 py-1 rounded text-xs font-bold ${game === 'classifica' ? 'bg-purple-500 text-white' : 'bg-gray-800 text-gray-400'}`}
        >
          CLASSIFICA
        </button>
        <button 
          onClick={() => { window.location.href = '/?game=classifica_musicale'; }}
          className={`px-3 py-1 rounded text-xs font-bold ${game === 'classifica_musicale' ? 'bg-indigo-500 text-white' : 'bg-gray-800 text-gray-400'}`}
        >
          CLASS. MUSICALE
        </button>
        <button 
          onClick={() => { window.location.href = '/?game=frase_tempo'; }}
          className={`px-3 py-1 rounded text-xs font-bold ${game === 'frase_tempo' ? 'bg-yellow-500 text-white' : 'bg-gray-800 text-gray-400'}`}
        >
          FRASE TEMPO
        </button>
        <button 
          onClick={() => { window.location.href = '/?game=percorso'; }}
          className={`px-3 py-1 rounded text-xs font-bold ${game === 'percorso' ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400'}`}
        >
          PERCORSO
        </button>
        <button 
          onClick={() => { window.location.href = '/?game=cruciverba'; }}
          className={`px-3 py-1 rounded text-xs font-bold ${game === 'cruciverba' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400'}`}
        >
          CRUCIVERBA
        </button>
        <button 
          onClick={() => { window.location.href = '/?game=gioco_frase_tempo'; }}
          className={`px-3 py-1 rounded text-xs font-bold ${game === 'gioco_frase_tempo' ? 'bg-cyan-600 text-white' : 'bg-gray-800 text-gray-400'}`}
        >
          G. FRASE TEMPO
        </button>
      </div>
    </>
  );
}

export default App;
