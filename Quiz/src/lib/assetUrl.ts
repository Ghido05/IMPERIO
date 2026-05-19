/**
 * Risolve asset in public/ sia in dev (http) sia in IMPERIO.app (file://).
 * I path assoluti tipo "/Icone/..." non funzionano in Electron: servono path relativi a index.html.
 */
export function assetUrl(path: string | undefined | null): string {
  if (!path) return '';
  const trimmed = path.trim();
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }
  const base = import.meta.env.BASE_URL || './';
  const relative = trimmed.replace(/^\.?\//, '');
  return `${base}${relative}`;
}

/** Per background-image CSS (gestisce spazi nel path) */
export function assetUrlCss(path: string | undefined | null): string {
  const url = assetUrl(path);
  if (!url) return 'none';
  return `url("${url.replace(/"/g, '\\"')}")`;
}
