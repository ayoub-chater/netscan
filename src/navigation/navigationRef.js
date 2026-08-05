import { createNavigationContainerRef } from '@react-navigation/native';

// Shared with anything that navigates from outside a screen — push handlers in
// App.js and the app-wide menu, which is mounted above the navigator.
export const navigationRef = createNavigationContainerRef();

// Screens that live inside the bottom-tab navigator rather than the root stack.
// Navigating to one from the root ref needs the `Main` → `{ screen }` form.
const TAB_ROUTES = new Set([
  'Dashboard',
  'ScannerTab',
  'Plan',
  'Expos',
  'Exposants',
  'RDV',
  'Détails',
  'History',
]);

export function navigateFromRoot(route, params) {
  if (!navigationRef.isReady()) return;
  if (TAB_ROUTES.has(route)) {
    navigationRef.navigate('Main', { screen: route, params });
    return;
  }
  navigationRef.navigate(route, params);
}
