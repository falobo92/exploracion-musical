import type { MusicMix, SearchCriteria } from '@/types';
import { normalizeForCompare } from '@/lib/text';

function matchesContinent(mix: MusicMix, criteria: SearchCriteria): boolean {
  if (!criteria.continent) return true;
  return normalizeForCompare(mix.continent) === normalizeForCompare(criteria.continent);
}

function matchesCountry(mix: MusicMix, criteria: SearchCriteria): boolean {
  if (!criteria.country) return true;
  return normalizeForCompare(mix.country).includes(normalizeForCompare(criteria.country));
}

function matchesStyle(mix: MusicMix, criteria: SearchCriteria): boolean {
  if (!criteria.style) return true;
  return mix.style.toLowerCase().includes(criteria.style.toLowerCase());
}

function matchesYear(mix: MusicMix, criteria: SearchCriteria): boolean {
  if (!criteria.year) return true;

  const decadeMatch = criteria.year.match(/^(\d{4})/);
  if (!decadeMatch) return true;

  const decadeStart = Number.parseInt(decadeMatch[1], 10);
  const mixYear = Number.parseInt(mix.year, 10);
  if (Number.isNaN(mixYear)) return true;

  return mixYear >= decadeStart && mixYear <= decadeStart + 9;
}

function matchesBpm(mix: MusicMix, criteria: SearchCriteria): boolean {
  if (!criteria.bpm) return true;

  const [min, max] = criteria.bpm.split('-').map((value) => Number(value));
  if (Number.isNaN(min) || Number.isNaN(max)) return true;

  return mix.bpm >= min && mix.bpm <= max;
}

export function matchesCriteria(mix: MusicMix, criteria: SearchCriteria): boolean {
  return (
    matchesContinent(mix, criteria)
    && matchesCountry(mix, criteria)
    && matchesStyle(mix, criteria)
    && matchesYear(mix, criteria)
    && matchesBpm(mix, criteria)
  );
}
