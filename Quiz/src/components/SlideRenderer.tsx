import type { SlideType } from '../App';
import ImgBoard from '../Il mio nome è nessuno_img_Board';
import MusicBoard from '../Il mio nome è nessuno_musicale_Board';
import ClassificaBoard from '../Gioco classifica_Board';
import ClassificaMusicaleBoard from '../Gioco classifica musicale_Board';
import CruciverbaBoard from '../Gioco cruciverba_Board';
import GiocoFraseTempoBoard from '../Gioco frasetempo_Board';
import PasswordSquadreBoard from '../Gioco password_squadre_Board';
import PasswordPresceltiBoard from '../Gioco password_prescelti_Board';
import ClassificaGeneraleBoard from '../ClassificaGenerale_Board';

interface SlideRendererProps {
  type: SlideType;
}

export default function SlideRenderer({ type }: SlideRendererProps) {
  return (
    <>
      <style>{`.min-h-screen { min-height: 1080px !important; }`}</style>
      {type === 'img' && <ImgBoard />}
      {type === 'music' && <MusicBoard />}
      {type === 'classifica' && <ClassificaBoard />}
      {type === 'classifica_musicale' && <ClassificaMusicaleBoard />}
      {type === 'cruciverba' && <CruciverbaBoard />}
      {type === 'gioco_frase_tempo' && <GiocoFraseTempoBoard />}
      {type === 'password_squadre' && <PasswordSquadreBoard />}
      {type === 'password_prescelti' && <PasswordPresceltiBoard />}
      {type === 'classifica_generale' && <ClassificaGeneraleBoard />}
    </>
  );
}
