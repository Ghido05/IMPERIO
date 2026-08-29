export interface FraseTempoItem {
  testo: string;
  sfondo?: string;
  lettereVisibili?: number[];
  indizio?: string;
  bonus?: string;
  punti?: number;
}

/** Restituisce la vocale/lettera base di un token, ignorando gli accenti. */
export function getPhraseLetter(token: string): string {
  const firstChar = token[0]?.toUpperCase() ?? '';
  return firstChar.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .match(/^[A-Z]$/)?.[0] ?? '';
}

export function isPhraseLetterToken(token: string): boolean {
  return getPhraseLetter(token) !== '';
}

export function parsePhraseTokens(frase: string): string[] {
  const upper = frase.toUpperCase();
  const targets: string[] = [];
  let i = 0;
  while (i < upper.length) {
    const c = upper[i];
    if (i + 1 < upper.length && upper[i + 1] === "'") {
      targets.push(c + "'");
      i += 2;
    } else {
      targets.push(c);
      i += 1;
    }
  }
  return targets;
}

export function normalizeFraseTempoItem(raw: string | FraseTempoItem): FraseTempoItem {
  if (typeof raw === 'string') {
    return { testo: raw, sfondo: '', lettereVisibili: [], indizio: '', bonus: '', punti: 1000 };
  }
  return {
    testo: raw.testo ?? '',
    sfondo: raw.sfondo ?? '',
    lettereVisibili: Array.isArray(raw.lettereVisibili) ? raw.lettereVisibili : [],
    indizio: raw.indizio ?? '',
    bonus: raw.bonus ?? '',
    punti: typeof raw.punti === 'number' ? raw.punti : 1000,
  };
}

export function normalizeFraseTempoList(raw: unknown): FraseTempoItem[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  return raw.map(normalizeFraseTempoItem);
}

export function createDefaultFraseTempoItem(testo = ''): FraseTempoItem {
  return { testo, sfondo: '', lettereVisibili: [] };
}
