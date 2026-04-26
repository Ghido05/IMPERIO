import { useState } from 'react';
import ImgBoard from './Il mio nome è nessuno_img_Board';
import MusicBoard from './Il mio nome è nessuno_musicale_Board';
import ClassificaBoard from './Gioco classifica_Board';
import ClassificaMusicaleBoard from './Gioco classifica musicale_Board';
import PercorsoBoard from './Gioco percorso_Board';
import CruciverbaBoard from './Gioco cruciverba_Board';
import FraseTempoBoard from './Gioco frasetempo_Board';

function App() {
  const [game] = useState<'img' | 'music' | 'classifica' | 'classifica_musicale' | 'percorso' | 'cruciverba' | 'frasetempo'>(() => {
    const params = new URLSearchParams(window.location.search);
    const gameParam = params.get('game');
    if (gameParam === 'musica') return 'music';
    if (gameParam === 'classifica') return 'classifica';
    if (gameParam === 'classifica_musicale') return 'classifica_musicale';
    if (gameParam === 'percorso') return 'percorso';
    if (gameParam === 'cruciverba') return 'cruciverba';
    if (gameParam === 'frasetempo') return 'frasetempo';
    return 'img';
  });

  return (
    <>
      {game === 'img' && <ImgBoard />}
      {game === 'music' && <MusicBoard />}
      {game === 'classifica' && <ClassificaBoard />}
      {game === 'classifica_musicale' && <ClassificaMusicaleBoard />}
      {game === 'percorso' && <PercorsoBoard />}
      {game === 'cruciverba' && <CruciverbaBoard />}
      {game === 'frasetempo' && <FraseTempoBoard />}
      
      {/* Piccolo selettore rapido in alto a sinistra (opzionale, solo per debug) */}
      <div className="fixed top-2 left-2 z-[1000] opacity-20 hover:opacity-100 transition-opacity flex flex-wrap gap-2 max-w-lg">
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
          CLASSIFICA MUS.
        </button>
        <button 
          onClick={() => { window.location.href = '/?game=percorso'; }}
          className={`px-3 py-1 rounded text-xs font-bold ${game === 'percorso' ? 'bg-green-500 text-white' : 'bg-gray-800 text-gray-400'}`}
        >
          PERCORSO
        </button>
        <button 
          onClick={() => { window.location.href = '/?game=cruciverba'; }}
          className={`px-3 py-1 rounded text-xs font-bold ${game === 'cruciverba' ? 'bg-pink-500 text-white' : 'bg-gray-800 text-gray-400'}`}
        >
          CRUCIVERBA
        </button>
        <button 
          onClick={() => { window.location.href = '/?game=frasetempo'; }}
          className={`px-3 py-1 rounded text-xs font-bold ${game === 'frasetempo' ? 'bg-red-500 text-white' : 'bg-gray-800 text-gray-400'}`}
        >
          FRASE TEMPO
        </button>
      </div>
    </>
  );
}

export default App;