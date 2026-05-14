import { useState } from 'react';
import ImgBoard from './Il mio nome è nessuno_img_Board';
import MusicBoard from './Il mio nome è nessuno_musicale_Board';
import ClassificaBoard from './Gioco classifica_Board';
import ClassificaMusicaleBoard from './Gioco classifica musicale_Board';
import CruciverbaBoard from './Gioco cruciverba_Board';
import GiocoFraseTempoBoard from './Gioco frasetempo_Board';
import PasswordSquadreBoard from './Gioco password_squadre_Board';
import PasswordPresceltiBoard from './Gioco password_prescelti_Board';
import BussolottiBoard from './Gioco bussolotti_Board';

function App() {
  const [game] = useState<'img' | 'music' | 'classifica' | 'classifica_musicale' | 'cruciverba' | 'gioco_frase_tempo' | 'password_squadre' | 'password_prescelti' | 'bussolotti'>(() => {
    const params = new URLSearchParams(window.location.search);
    const gameParam = params.get('game');
    if (gameParam === 'musica') return 'music';
    if (gameParam === 'classifica') return 'classifica';
    if (gameParam === 'classifica_musicale') return 'classifica_musicale';
    if (gameParam === 'cruciverba') return 'cruciverba';
    if (gameParam === 'gioco_frase_tempo') return 'gioco_frase_tempo';
    if (gameParam === 'password_squadre') return 'password_squadre';
    if (gameParam === 'password_prescelti') return 'password_prescelti';
    if (gameParam === 'bussolotti') return 'bussolotti';
    return 'img';
  });

  return (
    <>
      {game === 'img' && <ImgBoard />}
      {game === 'music' && <MusicBoard />}
      {game === 'classifica' && <ClassificaBoard />}
      {game === 'classifica_musicale' && <ClassificaMusicaleBoard />}
      {game === 'cruciverba' && <CruciverbaBoard />}
      {game === 'gioco_frase_tempo' && <GiocoFraseTempoBoard />}
      {game === 'password_squadre' && <PasswordSquadreBoard />}
      {game === 'password_prescelti' && <PasswordPresceltiBoard />}
      {game === 'bussolotti' && <BussolottiBoard />}
      
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
        <button 
          onClick={() => { window.location.href = '/?game=password_squadre'; }}
          className={`px-3 py-1 rounded text-xs font-bold ${game === 'password_squadre' ? 'bg-pink-600 text-white' : 'bg-gray-800 text-gray-400'}`}
        >
          PASS. SQUADRE
        </button>
        <button 
          onClick={() => { window.location.href = '/?game=password_prescelti'; }}
          className={`px-3 py-1 rounded text-xs font-bold ${game === 'password_prescelti' ? 'bg-fuchsia-600 text-white' : 'bg-gray-800 text-gray-400'}`}
        >
          PASS. PRESCELTI
        </button>
        <button 
          onClick={() => { window.location.href = '/?game=bussolotti'; }}
          className={`px-3 py-1 rounded text-xs font-bold ${game === 'bussolotti' ? 'bg-gray-500 text-white' : 'bg-gray-800 text-gray-400'}`}
        >
          BUSSOLOTTI
        </button>
      </div>
    </>
  );
}

export default App;
