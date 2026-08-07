import i18n from '../i18n';

// Participation types as the back office stores them, and how the app shows
// and orders them. The stored names never change — only their labels — so
// badges, B2B matching and the API keep working untouched.

// Accent/apostrophe-insensitive key for a stored name. Written by hand rather
// than with `String.prototype.normalize`, which Hermes does not implement.
export function roleKey(name) {
  return (name || '')
    .toLowerCase()
    .replace(/[àâä]/g, 'a')
    .replace(/[éèêë]/g, 'e')
    .replace(/[îï]/g, 'i')
    .replace(/[ôö]/g, 'o')
    .replace(/[ùûü]/g, 'u')
    .replace(/ç/g, 'c')
    .replace(/[’`´']/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

// Role names are typed by the organiser and stored in French, and every
// payload carrying a role sends that stored name — the logged-in user's own
// role, a scanned badge, the networking history, a participation request. The
// backend serves their fr/en/ar wording once
// (GET /participation/role-labels, keyed by `roleKey`), and this registry
// holds it for the whole app so any of those strings can be shown in the
// reader's language.
//
// Kept as a module-level map on purpose: `roleLabel` is called from render
// bodies all over the app, not through a hook. `AuthContext` loads the map
// (from its cache first, then the network) and re-renders the tree once it
// changes, so the callers do not each need to subscribe.
let TRANSLATIONS = {};

export function setRoleTranslations(labels) {
  TRANSLATIONS = labels && typeof labels === 'object' ? labels : {};
}

export function getRoleTranslations() {
  return TRANSLATIONS;
}

// Merge one role's translations in, without dropping the rest — used by the
// "Participer" picker, whose own payload already carries them.
export function addRoleTranslations(labels) {
  if (!labels || typeof labels !== 'object') return;
  TRANSLATIONS = { ...TRANSLATIONS, ...labels };
}

export function roleLabel(name, language) {
  if (!name) return name;
  const entry = TRANSLATIONS[roleKey(name)];
  if (!entry) return name;
  // `i18n.language` can carry a region ("en-US"); the map is keyed by the
  // bare language, which is what SUPPORTED_LANGUAGES lists.
  const lang = (language || i18n.language || '').split('-')[0];
  const label = entry[lang];
  return typeof label === 'string' && label.trim() ? label : name;
}

// Order the organiser asked for. Anything the back office adds later that is
// not listed keeps its own order, after these.
//
// "Comité d'organisation" is listed last but never actually reaches the
// picker: the API hides it (Api\ParticipationController::NON_APPLYABLE_ROLES)
// because the organiser's own team is created in the back office. They still
// log in and carry the role, which is why `roleIcon` and `roleLabel` below
// keep handling it — the entry here only matters if the organiser ever opens
// it up again.
const ORDER = [
  'partenaire',
  'sponsor',
  'partenaire institutionnel',
  'exposant',
  'intervenant',
  'presse',
  'participant',
  "comite d'organisation",
];

const rank = (name) => {
  const index = ORDER.indexOf(roleKey(name));
  return index === -1 ? ORDER.length : index;
};

export function sortRoles(roles = []) {
  // Index-keyed tiebreaker keeps the back-office order for unlisted entries,
  // since Array#sort is only stable for small arrays on some engines.
  return roles
    .map((role, index) => ({ role, index }))
    .sort((a, b) => rank(a.role?.name) - rank(b.role?.name) || a.index - b.index)
    .map(({ role }) => role);
}

// Icon per participation type, keyed the same accent-insensitive way.
export const ROLE_ICONS = {
  participant: 'people-circle-outline',
  exposant: 'storefront-outline',
  intervenant: 'mic-outline',
  sponsor: 'diamond-outline',
  presse: 'newspaper-outline',
  partenaire: 'people-outline',
  'partenaire institutionnel': 'business-outline',
  "comite d'organisation": 'briefcase-outline',
};

export const roleIcon = (name) => ROLE_ICONS[roleKey(name)] || 'ribbon-outline';

// The "Participer" flow's own icon — a pass into the event. Shared by the
// dashboard call to action and the menu row so the action is recognisable
// from both entry points.
export const PARTICIPATE_ICON = 'ticket';
