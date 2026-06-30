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
  interactive?: boolean;
}

export default function SlideRenderer({ type, interactive = true }: SlideRendererProps) {
  return (
    <>
      <style>{`.min-h-screen { min-height: 1080px !important; height: 1080px !important; }`}</style>
      {type === 'img' && <ImgBoard interactive={interactive} />}
      {type === 'music' && <MusicBoard interactive={interactive} />}
      {type === 'classifica' && <ClassificaBoard interactive={interactive} />}
      {type === 'classifica_musicale' && <ClassificaMusicaleBoard interactive={interactive} />}
      {type === 'cruciverba' && <CruciverbaBoard interactive={interactive} />}
      {type === 'gioco_frase_tempo' && <GiocoFraseTempoBoard interactive={interactive} />}
      {type === 'password_squadre' && <PasswordSquadreBoard interactive={interactive} />}
      {type === 'password_prescelti' && <PasswordPresceltiBoard interactive={interactive} />}
      {type === 'classifica_generale' && <ClassificaGeneraleBoard />}
    </>
  );
}
