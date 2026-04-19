import { useState, useEffect } from 'react';
import ImgBoard from './Il mio nome è nessuno_img_Board';
import MusicBoard from './Il mio nome è nessuno_musicale_Board';

function App() {
  const [game, setGame] = useState<'img' | 'music'>('img');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('game') === 'musica') {
      setGame('music');
    } else {
      setGame('img');
    }
  }, []);

  return (
    <>
      {game === 'img' ? <ImgBoard /> : <MusicBoard />}
      
      {/* Piccolo selettore rapido in alto a sinistra (opzionale, solo per debug) */}
      <div className="fixed top-2 left-2 z-[1000] opacity-20 hover:opacity-100 transition-opacity flex gap-2">
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
      </div>
    </>
  );
}

export default App;