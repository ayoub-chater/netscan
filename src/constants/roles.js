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

// Display-name overrides, for when the back office stores a name that doesn't
// read right to a participant. "Partenaire" is a role of its own now (see the
// `add_partenaire_participation_role` backend migration), so the organising
// committee keeps its own name and nothing is renamed here today.
const LABELS = {};

export function roleLabel(name) {
  if (!name) return name;
  return LABELS[roleKey(name)] || name;
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
