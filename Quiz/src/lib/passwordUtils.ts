export type WordType = 'team1' | 'team2' | 'team3' | 'bomb' | 'neutral';

export interface WordItem {
  word: string;
  type: WordType;
  guessed: boolean;
  guessedBy?: number;
}

/**
 * Generates a deterministic grid disposition for a specific manche.
 * This guarantees that every window (Relatore, Public Screen, iPad)
 * and every re-visit to the manche has the exact same tile layout.
 */
export function getInitialPasswordGrid(mancheData: any, mancheIndex: number): WordItem[] {
  if (!mancheData) return [];

  const squadra1: string[] = mancheData.squadra1 || [];
  const squadra2: string[] = mancheData.squadra2 || [];
  const squadra3: string[] = mancheData.squadra3 || [];
  const altre: string[] = mancheData.altre || [];

  const allWords: WordItem[] = [
    ...squadra1.map((w: string) => ({ word: w.toUpperCase(), type: 'team1' as WordType, guessed: false })),
    ...squadra2.map((w: string) => ({ word: w.toUpperCase(), type: 'team2' as WordType, guessed: false })),
    ...squadra3.map((w: string) => ({ word: w.toUpperCase(), type: 'team3' as WordType, guessed: false })),
    ...altre.map((w: string, i: number) => ({ word: w.toUpperCase(), type: (i === 0 ? 'bomb' : 'neutral') as WordType, guessed: false }))
  ];

  // Deterministic pseudo-random shuffle based on mancheIndex and word contents
  let seed = (mancheIndex + 1) * 2654435761;
  const wordsWithSortKey = allWords.map((item, idx) => {
    for (let c = 0; c < item.word.length; c++) {
      seed = (seed * 9301 + 49297 + item.word.charCodeAt(c)) % 233280;
    }
    return { item, sortKey: (seed / 233280) + (idx * 0.0001) };
  });

  wordsWithSortKey.sort((a, b) => a.sortKey - b.sortKey);
  return wordsWithSortKey.map(w => ({ ...w.item }));
}
