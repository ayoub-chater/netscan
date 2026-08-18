/**
 * Turning an axios error into something safe to show a user.
 *
 * Screens used to render `e.response.data.message` as-is. When the backend
 * answered with an unhandled exception, that string was the raw server error —
 * a signup once printed the failing INSERT statement, the table and column
 * names, the DB host and the database name straight into the form. The backend
 * no longer sends those (sanitised in bootstrap/app.php), but the app must not
 * depend on that: older API builds are still deployed, and a leak on screen is
 * worse than a generic message.
 *
 * So a server message is only shown when it looks like a sentence written for
 * a human. Anything that smells like an exception, or is too long to be a UI
 * string, falls back to the screen's own translated text.
 */

// Fingerprints of a server exception rather than a message meant for a user.
const TECHNICAL = /SQLSTATE|SQL:|Connection:\s|Illuminate\\|Symfony\\|Exception|Stack trace|\.php\b|vendor\//i;

const MAX_LENGTH = 200;

/**
 * The server's own message when it is presentable, otherwise null.
 */
export function serverMessage(error) {
  const data = error?.response?.data;
  if (!data) return null;

  const fromErrors = data.errors
    ? Object.values(data.errors)?.[0]?.[0]
    : null;

  const message = data.message || fromErrors;

  if (typeof message !== 'string') return null;

  const trimmed = message.trim();
  if (!trimmed || trimmed.length > MAX_LENGTH || TECHNICAL.test(trimmed)) {
    return null;
  }

  return trimmed;
}

/**
 * `apiErrorMessage(e, t('login.errorInvalidCredentials'))` — the server's
 * message if it is safe, the given fallback otherwise.
 */
export function apiErrorMessage(error, fallback) {
  return serverMessage(error) || fallback;
}
