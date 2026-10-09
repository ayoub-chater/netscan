import i18n from '../i18n';

// Bare language code ("en-US" → "en"), the key the API's translations use.
export const currentLanguage = () => (i18n.language || 'fr').split('-')[0];

/**
 * Pick a field in the user's language from an API object shaped like
 * `{ name: 'Panel', translations: { name: { fr, en, ar } } }`.
 *
 * Falls back to the plain field, which the backend always fills with French —
 * so a missing translation shows French rather than nothing.
 */
export function tr(item, field, language) {
  if (!item) return '';
  const lang = language || currentLanguage();
  const value = item.translations?.[field]?.[lang];
  if (typeof value === 'string' && value.trim()) return value;
  return item[field] ?? '';
}

// Locale for dates. `ar-MA` keeps Latin digits, matching how times and the
// rest of the app's numbers are written in Morocco.
export const dateLocale = (language) =>
  ({ fr: 'fr-FR', en: 'en-GB', ar: 'ar-MA' }[language || currentLanguage()] || 'fr-FR');
