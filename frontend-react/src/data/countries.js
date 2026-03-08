/**
 * Country list for dropdowns (ISO 3166-1 alpha-2 codes + English names).
 * Sorted by name. Source: country-list npm package.
 */
import countryList from 'country-list';

const raw = countryList.getData();
export const COUNTRY_LIST = [...raw].sort((a, b) => a.name.localeCompare(b.name));

/** Get country name from code (e.g. 'US' -> 'United States of America'). */
export function getCountryName(code) {
  if (!code || typeof code !== 'string') return '';
  return countryList.getName(code) || code;
}
