export const YEAR_PICKER_MIN = 1970;
export const YEAR_PICKER_MAX = 2100;
export const YEAR_GRID_SIZE = 12;

export function yearGridStart(year: number): number {
  return Math.floor(year / YEAR_GRID_SIZE) * YEAR_GRID_SIZE;
}

export function addYearGrid(start: number, deltaPages: number): number {
  return start + deltaPages * YEAR_GRID_SIZE;
}

export function yearGridYears(start: number): number[] {
  return Array.from({ length: YEAR_GRID_SIZE }, (_, i) => start + i);
}

export function isYearInRange(
  year: number,
  min = YEAR_PICKER_MIN,
  max = YEAR_PICKER_MAX,
): boolean {
  if (year < min) return false;
  if (year > max) return false;
  return true;
}

export function nextAvailableYear(
  preferred: number,
  taken: number[],
  min = YEAR_PICKER_MIN,
  max = YEAR_PICKER_MAX,
): number {
  const blocked = new Set(taken);
  const start = Math.min(max, Math.max(min, preferred));
  for (let year = start; year <= max; year += 1) {
    if (!blocked.has(year)) return year;
  }
  for (let year = start - 1; year >= min; year -= 1) {
    if (!blocked.has(year)) return year;
  }
  return start;
}
