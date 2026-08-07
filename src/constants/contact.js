// Organiser contact details, as published on the event site's footer. Kept here
// rather than in the locale files because none of it is translatable — the venue
// name, the phone numbers and the email read the same in every language.

export const SUPPORT_EMAIL = 'contact@logiterre-expo.com';
export const SUPPORT_WEBSITE = 'https://logiterre-expo.com';

export const SUPPORT_PHONES = [
  '+212 661 282 281',
  '+212 664 198 820',
  '+212 673 642 426',
];

export const VENUE_ADDRESS = [
  'La Foire Internationale De Casablanca - AMDIE EX (OFEC).',
  'Boulevard de Tiznit, Casablanca.',
  'Maroc.',
].join('\n');

// Shown as-is: the weekday name is the only translatable part, and spelling it
// out per locale for three fixed dates is not worth a translation key each.
export const EVENT_DAYS = [
  { dateKey: 'day1', date: '2026-10-20', hours: '09H00 – 19H00' },
  { dateKey: 'day2', date: '2026-10-21', hours: '09H00 – 19H00' },
  { dateKey: 'day3', date: '2026-10-22', hours: '09H00 – 19H00' },
];

// `tel:` refuses spaces.
export const dialable = (phone) => phone.replace(/[^\d+]/g, '');
