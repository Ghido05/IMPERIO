/**
 * Formats a number with Italian dot separators for thousands (e.g. 7000 -> 7.000, 10000 -> 10.000).
 */
export function formatScoreNumber(val: number | string | undefined | null): string {
  if (val === undefined || val === null || val === '') return '0';
  const num = typeof val === 'number' ? val : parseInt(val, 10);
  if (isNaN(num)) return '0';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Helper to get the custom team name from configuration or fallback to 'SQUADRA {n}'.
 */
export function getTeamName(teamNames: string[] | undefined | null, teamNum: number): string {
  if (teamNames && teamNames[teamNum - 1] && teamNames[teamNum - 1].trim() !== '') {
    return teamNames[teamNum - 1];
  }
  return `SQUADRA ${teamNum}`;
}
