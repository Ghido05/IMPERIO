import type { SlideType } from '../App';

export interface GameMeta {
  type: SlideType;
  title: string;
  shortTitle: string;
  description: string;
  color: string;
}

export const GAME_OPTIONS: GameMeta[] = [
  { type: 'img', title: 'Il Mio Nome è Nessuno (Immagine)', shortTitle: 'Immagine', description: 'Indovina il personaggio dalla griglia', color: 'bg-orange-500' },
  { type: 'music', title: 'Il Mio Nome è Nessuno (Musicale)', shortTitle: 'Musicale', description: 'Indovina la canzone dagli indizi', color: 'bg-blue-500' },
  { type: 'classifica', title: 'Classifica', shortTitle: 'Classifica', description: 'Classifica generale a punti', color: 'bg-purple-500' },
  { type: 'classifica_musicale', title: 'Classifica Musicale', shortTitle: 'Class. musicale', description: 'Classifica dei brani', color: 'bg-indigo-500' },
  { type: 'cruciverba', title: 'Cruciverba', shortTitle: 'Cruciverba', description: 'Parole crociate', color: 'bg-red-600' },
  { type: 'gioco_frase_tempo', title: 'Frase nel Tempo', shortTitle: 'Frase tempo', description: 'Indovina la frase a tempo', color: 'bg-cyan-600' },
  { type: 'password_squadre', title: 'Password Squadre', shortTitle: 'Password', description: 'Password a squadre', color: 'bg-pink-600' },
  { type: 'password_prescelti', title: 'Password Prescelti', shortTitle: 'Prescelti', description: 'Password per i prescelti', color: 'bg-fuchsia-600' },
  { type: 'classifica_generale', title: 'Classifica Generale', shortTitle: 'Class. gen.', description: 'Tabellone finale', color: 'bg-emerald-600' },
];

export const FIELD_LABELS: Record<string, string> = {
  _note: 'Note di configurazione',
  sfondo: 'Sfondo',
  immagineSegreta: 'Immagine segreta',
  indizi: 'Indizi',
  soluzione: 'Soluzione',
  griglia: 'Griglia',
  titolo: 'Titolo',
  categoria: 'Categoria',
  anno: 'Anno',
  testo: 'Testo',
  colore: 'Colore',
  icona: 'Icona',
  step: 'Step',
  colonne: 'Colonne',
  righe: 'Righe',
  puntoFocale: 'Punto focale',
  colonna: 'Colonna',
  riga: 'Riga',
  manches: 'Manche',
  squadra1: 'Squadra 1',
  squadra2: 'Squadra 2',
  squadra3: 'Squadra 3',
  altre: 'Altre parole',
  suggerimenti_turni: 'Suggerimenti per turno',
  bussolotti: 'Bussolotti bonus',
  immagine_premio: 'Immagine premio',
  posizione_premio_2_posto: 'Posizione premio (2° posto)',
  posizione_premio_3_posto: 'Posizione premio (3° posto)',
  frasi: 'Frasi',
  parole: 'Parole',
  teams: 'Squadre',
  brani: 'Brani',
};

export function getGameMeta(type: SlideType): GameMeta | undefined {
  return GAME_OPTIONS.find((g) => g.type === type);
}

export function labelForKey(key: string): string {
  return FIELD_LABELS[key] ?? key.replace(/_/g, ' ');
}
