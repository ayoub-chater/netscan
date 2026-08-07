import axios from 'axios';
import { COUNTRIES } from '../constants/countries';
import { CITY_NAMES } from '../constants/cities';

// Countries ship with the app (fr / en / ar names) instead of being fetched:
// REST Countries retired its keyless API, and every remaining free country API
// returns English only — which would break the "follows the app language"
// requirement. Cities are fetched, they depend on the country picked.
const CITIES_URL = 'https://countriesnow.space/api/v0.1/countries/cities';
const COUNTRY_NAMES_URL = 'https://countriesnow.space/api/v0.1/countries/positions';

const TIMEOUT = 15000;

// Cities are re-picked often enough (back and forth between two countries) to
// be worth keeping for the session.
const citiesCache = new Map();
// ISO2 → the exact English spelling the city API expects ("Congo, The
// Democratic Republic of the"), which is not always the CLDR one we display.
let cityApiNames = null;

/** Flag emoji from an ISO 3166-1 alpha-2 code, no lookup table needed. */
function flagOf(code) {
  try {
    return String.fromCodePoint(
      ...code
        .toUpperCase()
        .split('')
        .map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)
    );
  } catch {
    return '';
  }
}

/** All countries: [{ code, flag, names: { en, fr, ar } }] */
export function getCountries() {
  return COUNTRIES.map((c) => ({
    code: c.code,
    flag: flagOf(c.code),
    names: { en: c.en, fr: c.fr, ar: c.ar },
  }));
}

// Accent/case-insensitive compare, so "Emirats arabes unis" read back from the
// API still matches the stored "Émirats arabes unis".
const COMBINING_MARKS = new RegExp(
  '[' + String.fromCharCode(0x300) + '-' + String.fromCharCode(0x36f) + ']',
  'g'
);

function fold(value) {
  const lower = String(value ?? '').trim().toLowerCase();
  try {
    return lower.normalize('NFD').replace(COMBINING_MARKS, '');
  } catch {
    return lower;
  }
}

/**
 * Country matching a stored value — an ISO2 code or a name in any of the three
 * languages. Profiles store the French name, but older rows may hold anything.
 * Returns null when nothing matches, so callers can keep the raw text.
 */
export function findCountry(value) {
  const needle = fold(value);
  if (!needle) return null;
  return (
    getCountries().find(
      (c) =>
        fold(c.code) === needle ||
        fold(c.names.fr) === needle ||
        fold(c.names.en) === needle ||
        fold(c.names.ar) === needle
    ) || null
  );
}

/** Country name in the app's current language ('fr-FR' reads as 'fr'). */
export function countryLabel(country, language) {
  if (!country) return '';
  const key = String(language || 'en').split('-')[0];
  return country.names[key] || country.names.en;
}

/** Countries sorted for display in the given language. */
export function sortCountries(countries, language) {
  return [...countries].sort((a, b) =>
    countryLabel(a, language).localeCompare(countryLabel(b, language))
  );
}

async function cityApiNameFor(country) {
  if (!cityApiNames) {
    try {
      const res = await axios.get(COUNTRY_NAMES_URL, {
        timeout: TIMEOUT,
        headers: { Accept: 'application/json' },
      });
      cityApiNames = {};
      (res.data?.data || []).forEach((c) => {
        if (c?.iso2 && c?.name) cityApiNames[c.iso2] = c.name;
      });
    } catch {
      cityApiNames = {};
    }
  }
  return cityApiNames[country.code] || country.names.en;
}

/**
 * City name in the app's current language, falling back to the English spelling
 * the API gave when there is no entry for it — see `constants/cities` for why
 * the mapping is bundled rather than fetched, and why it is deliberately partial.
 *
 * `city` stays the canonical value throughout: only what is *displayed* changes
 * with the language, never what is stored or submitted.
 */
export function cityLabel(city, countryCode, language) {
  if (!city) return '';
  const key = String(language || 'en').split('-')[0];
  if (key === 'en') return city;
  return CITY_NAMES[countryCode]?.[city]?.[key] || city;
}

/**
 * Cities of a country as `{ value, label }`, localised and sorted for display.
 *
 * The API's list carries the same place under several spellings — `Fes`/`Fès`,
 * `Marrakesh`/`Marrakech`, `Al Hoceima`/`Al Hoceïma`/`Al-Hoceima` — which all
 * resolve to one Arabic name. Deduping on the *label* is what stops the picker
 * showing that name three times over; the first spelling wins, so the canonical
 * value stays stable for a given label.
 */
export function cityOptions(cities, countryCode, language) {
  const seen = new Map();
  for (const city of cities) {
    const label = cityLabel(city, countryCode, language);
    if (!seen.has(label)) seen.set(label, { value: city, label });
  }
  return [...seen.values()].sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * Cities of a country, from CountriesNow (English spellings only — no free
 * localised city list exists). Returns [] when the country is unknown to it.
 */
export async function fetchCities(country) {
  if (!country) return [];
  const cached = citiesCache.get(country.code);
  if (cached) return cached;

  const apiName = await cityApiNameFor(country);
  const res = await axios.post(
    CITIES_URL,
    { country: apiName },
    { timeout: TIMEOUT, headers: { Accept: 'application/json' } }
  );
  const data = Array.isArray(res.data?.data) ? res.data.data : [];
  const list = Array.from(new Set(data.filter(Boolean))).sort((a, b) => a.localeCompare(b));
  citiesCache.set(country.code, list);
  return list;
}
