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
import FinaleSquadreBoard from '../FinaleSquadre_Board';
import ScenettaBoard from '../ScenettaBoard';
import VideoBoard from '../VideoBoard';
import MappaTorneoBoard from '../MappaTorneoBoard';
import SpiegazioneFasiBoard from '../SpiegazioneFasiBoard';
import SpiegazioneBox1Board from '../SpiegazioneBox1Board';
import SpiegazioneBox2Board from '../SpiegazioneBox2Board';
import SpiegazioneBox3Board from '../SpiegazioneBox3Board';
import SpiegazioneBox4Board from '../SpiegazioneBox4Board';
import SpiegazioneBox5Board from '../SpiegazioneBox5Board';

interface SlideRendererProps {
  type: SlideType;
  interactive?: boolean;
  revealAll?: boolean;
  isPresenter?: boolean;
}

export default function SlideRenderer({ type, interactive = true, revealAll = false, isPresenter = false }: SlideRendererProps) {
  return (
    <>
      <style>{`.min-h-screen { min-height: 1080px !important; height: 1080px !important; }`}</style>
      {type === 'img' && <ImgBoard interactive={interactive} revealAll={revealAll} isPresenter={isPresenter} />}
      {type === 'music' && <MusicBoard interactive={interactive} revealAll={revealAll} isPresenter={isPresenter} />}
      {type === 'classifica' && <ClassificaBoard interactive={interactive} revealAll={revealAll} isPresenter={isPresenter} />}
      {type === 'classifica_musicale' && <ClassificaMusicaleBoard interactive={interactive} revealAll={revealAll} isPresenter={isPresenter} />}
      {type === 'cruciverba' && <CruciverbaBoard interactive={interactive} revealAll={revealAll} />}
      {type === 'gioco_frase_tempo' && <GiocoFraseTempoBoard interactive={interactive} revealAll={revealAll} />}
      {type === 'password_squadre' && <PasswordSquadreBoard interactive={interactive} revealAll={revealAll} />}
      {type === 'password_prescelti' && <PasswordPresceltiBoard interactive={interactive} />}
      {type === 'classifica_generale' && <ClassificaGeneraleBoard />}
      {type === 'finale_squadre' && <FinaleSquadreBoard />}
      {type === 'scenetta' && <ScenettaBoard interactive={interactive} revealAll={revealAll} />}
      {type === 'video' && <VideoBoard interactive={interactive} revealAll={revealAll} isPresenter={isPresenter} />}
      {type === 'mappa_torneo' && <MappaTorneoBoard interactive={interactive} revealAll={revealAll} isPresenter={isPresenter} />}
      {type === 'spiegazione_fasi' && <SpiegazioneFasiBoard interactive={interactive} revealAll={revealAll} isPresenter={isPresenter} />}
      {type === 'spiegazione_box1' && <SpiegazioneBox1Board interactive={interactive} revealAll={revealAll} isPresenter={isPresenter} />}
      {type === 'spiegazione_box2' && <SpiegazioneBox2Board interactive={interactive} revealAll={revealAll} isPresenter={isPresenter} />}
      {type === 'spiegazione_box3' && <SpiegazioneBox3Board interactive={interactive} revealAll={revealAll} isPresenter={isPresenter} />}
      {type === 'spiegazione_box4' && <SpiegazioneBox4Board interactive={interactive} revealAll={revealAll} isPresenter={isPresenter} />}
      {type === 'spiegazione_box5' && <SpiegazioneBox5Board interactive={interactive} revealAll={revealAll} isPresenter={isPresenter} />}
    </>
  );
}
