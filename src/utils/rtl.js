import { I18nManager } from 'react-native';
import i18n, { RTL_LANGUAGES } from '../i18n';

/**
 * ─── How direction works in this app ────────────────────────────────────────
 *
 * There are two independent RTL mechanisms in React Native, and the whole
 * class of "Android is right, iOS is wrong" bugs comes from them disagreeing.
 *
 * 1. The *surface* direction, set natively by `I18nManager.forceRTL` + a real
 *    relaunch. Android reaches it (`LanguageProvider` restarts on a language
 *    change). iOS in Expo Go does not: `forceRTL` needs a genuine process
 *    relaunch, and the dev reload keeps the process alive, so the surface stays
 *    left-to-right there.
 *
 * 2. The Yoga `direction` style, which mirrors flex rows and resolves the
 *    logical edges (`start`/`end`) for a subtree. This is pure layout, it works
 *    identically on both platforms, and `LanguageProvider` sets it at the root.
 *
 * The trap is that React Native quietly rewrites *physical* edges to logical
 * ones — `left`→`start`, `marginRight`→`marginEnd`, and so on — but only when
 * the **surface** is RTL (`YogaLayoutableShadowNode::swapStyleLeftAndRight`,
 * gated on `layoutConstraints.layoutDirection`). A Yoga `direction` style does
 * not trigger it. So on Android `mr-4` silently means "margin-end" while on iOS
 * it stays a literal right margin — same class, mirrored result. That is the
 * root cause of the icon sides, the padding overlaps and the stray gaps between
 * labels and icons.
 *
 * ─── The rules that follow from it ──────────────────────────────────────────
 *
 * • Never use a physical edge for anything that should mirror. No `ml/mr/pl/pr`,
 *   no `left-*`/`right-*`, no `marginLeft`/`right: n` in a style object. Use the
 *   logical ones — `ms/me/ps/pe`, `start-*`/`end-*`, `marginStart`, `insetInlineEnd`
 *   — or, better, put `gap-*` on the row and delete the margin entirely. Yoga
 *   resolves logical edges from the *node's* direction, so they land on the same
 *   side on both platforms. Physical edges are still fine when they are
 *   symmetric (`left: 0, right: 0`) or genuinely physical (a full-bleed overlay).
 *
 * • Never branch on `isRTL()` to pick a side. `isRTL() ? 'left-3' : 'right-3'`
 *   is the bug twice over: it hardcodes what `end-3` already does, and on
 *   Android the swap then flips it back, so the two platforms end up mirrored
 *   from each other. Use the logical edge and let Yoga decide.
 *
 * • Never rely on `textAlign: 'auto'`. It resolves against the *surface*, so
 *   Arabic lands right on Android and left on iOS. `utils/rtlText` makes the
 *   alignment explicit on every `Text` and `TextInput` for both platforms; use
 *   `ltrValue()` below for the fields whose content is Latin.
 *
 * `isRTL()` stays the one signal to read, and only for content decisions —
 * which icon glyph points "back", whether letter-spacing makes sense — never
 * for which side something sits on.
 */

/**
 * Is the UI right-to-left right now?
 *
 * Driven by the selected language first, and only then by the native flag.
 * `I18nManager.isRTL` alone is unreliable: `forceRTL` needs a genuine native
 * restart to take effect, and `LanguageProvider` applies the saved language
 * from an effect on mount without one (only an explicit language *change*
 * restarts). So the flag lags — on some devices it reports the direction the
 * app booted with, which is why arrows flipped on one phone and not another.
 * The language is known immediately and means the same thing here, since
 * Arabic is the only RTL locale the app ships.
 *
 * Call this per render, never hoist the result to module scope: `i18next` and
 * the native flag both settle after module bodies have run. Components re-render
 * on `languageChanged` via `useTranslation`, so a fresh read is always current.
 */
export const isRTL = () =>
  RTL_LANGUAGES.includes(i18n.language) || I18nManager.isRTL;

// Yoga `direction` for the app root. Applied on both platforms: on iOS it is
// the only thing carrying the direction, and on Android it restates what the
// native surface already says, which costs nothing and keeps the mirroring
// identical even when the native flag hasn't caught up yet (first launch after
// a language change, a reload without a relaunch).
export const direction = () => (isRTL() ? 'rtl' : 'ltr');

/**
 * Text style for a field whose *content* is Latin inside an RTL UI — phone
 * numbers, emails, URLs, badge numbers.
 *
 * These need the two halves of "direction" pulled apart. The box still belongs
 * to an Arabic form, so it aligns to the start (the right edge). The string
 * inside is left-to-right, and letting it inherit an RTL base direction is what
 * turns the placeholder `+212 6 00 00 00 00` into `00 00 00 00 6 212+` — the
 * leading `+` is bidi-neutral, so an RTL paragraph parks it at the far end.
 * Pinning `writingDirection` keeps the number readable while the field itself
 * stays mirrored.
 */
export const ltrValue = () => ({
  writingDirection: 'ltr',
  textAlign: isRTL() ? 'right' : 'left',
});

// Only icon *names* need this. For placement, prefer flex: `flexDirection` is
// direction-aware, so a row lays its children out from the correct edge on its
// own. Physical `left`/`right` are never mirrored — and an absolutely positioned
// box with no width anchored to one edge cannot be placed until its child has
// measured, so it renders on the wrong side for a frame and then jumps.

// A back arrow points the way the user came from — the opposite side in Arabic.
export const backIcon = () => (isRTL() ? 'chevron-forward' : 'chevron-back');

// "Go deeper" affordance: the chevron on a list row, a disclosure arrow.
export const forwardIcon = () => (isRTL() ? 'chevron-back' : 'chevron-forward');

// Same idea for the heavier arrow glyphs.
export const arrowBackIcon = () => (isRTL() ? 'arrow-forward' : 'arrow-back');
export const arrowForwardIcon = () => (isRTL() ? 'arrow-back' : 'arrow-forward');

/**
 * Class fragment for the small all-caps section labels ("IDENTITY", "APPEARANCE").
 *
 * Arabic script is cursive: letter-spacing pulls the glyphs apart and breaks the
 * joins between them, so `هويتي` renders as `هو يتي` and `المظهر` as `ا لمظهر`.
 * Capitalisation has no meaning in Arabic either. Both treatments are dropped.
 */
export const latinLabel = (tracking = 'tracking-widest') =>
  (isRTL() ? '' : `uppercase ${tracking}`);

// Letter-spacing on its own, for labels that were never uppercased.
export const latinTracking = (tracking = 'tracking-widest') =>
  (isRTL() ? '' : tracking);
