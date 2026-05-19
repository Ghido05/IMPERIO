import type { SlideType } from '../App';
import defaultImgData from '../data/Il mio nome è nessuno_img_Data.json';
import defaultMusicData from '../data/Il mio nome è nessuno_musicale_Data.json';
import defaultClassificaData from '../data/Gioco classifica_Data.json';
import defaultClassificaMusicaleData from '../data/Gioco classifica musicale_Data.json';
import defaultCruciverbaData from '../data/Gioco cruciverba_Data.json';
import defaultFraseTempoData from '../data/Gioco frasetempo_Data.json';
import defaultPasswordData from '../data/Gioco password_Data.json';

export const defaultGameDataMap: Record<Exclude<SlideType, 'empty'>, unknown> = {
  img: defaultImgData,
  music: defaultMusicData,
  classifica: defaultClassificaData,
  classifica_musicale: defaultClassificaMusicaleData,
  cruciverba: defaultCruciverbaData,
  gioco_frase_tempo: defaultFraseTempoData,
  password_squadre: defaultPasswordData,
  password_prescelti: defaultPasswordData,
  classifica_generale: {},
};

export function cloneDefaultData(type: SlideType): unknown {
  if (type === 'empty' || type === 'classifica_generale') {
    return type === 'classifica_generale' ? {} : undefined;
  }
  return JSON.parse(JSON.stringify(defaultGameDataMap[type]));
}
