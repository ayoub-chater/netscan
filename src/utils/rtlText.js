/**
 * Make text alignment explicit, app-wide, on both platforms.
 *
 * `textAlign: 'auto'` — React Native's default — resolves to "natural", and
 * natural follows the *surface* direction: the native `I18nManager` flag, not
 * the Yoga `direction` the root sets. Android reaches that flag after the
 * restart on a language change and gets right-aligned Arabic for free; iOS in
 * Expo Go never does, so the same label hugs the left edge of its box while the
 * row around it mirrors — the gap between a label and the icon it belongs to.
 *
 * Rather than compensate on the platform that loses, this pins the alignment on
 * both, so what ships is one rendering path instead of two that happen to agree.
 * `writingDirection` comes with it: it is what puts a trailing `*` or `:` on the
 * correct end of an Arabic run, which the surface flag was also silently doing
 * on Android only.
 *
 * Fields whose content is Latin (phone, email) opt out with `ltrValue()` from
 * `./rtl` — see the note there on why they need the two halves separated.
 *
 * Import this once, before the app tree renders.
 */
import React from 'react';
import { isRTL } from './rtl';

// NOTE: this does *not* resolve to react-native. uniwind's Metro resolver
// rewrites every `react-native` import outside of RN itself to
// `uniwind/components` (see uniwind/dist/metro/index.cjs), so what we get — and
// what every screen, heroui-native component and uniwind wrapper gets — is
// uniwind's className-aware components. Patching here is what reaches all of
// them; patching `react-native/Libraries/Text/Text` reaches none, and throws
// besides ("Cannot assign to property 'default' which has only a getter"),
// because Metro compiles that module's `export default` to a getter-only
// property. `uniwind/components` is a plain object literal of lazy getters, so
// its properties are configurable and can be redefined.
//
// The one thing it does not reach is `Animated.Text` / `Animated.TextInput`:
// React Native's own `Animated/components/*` are resolved to the per-component
// entry `uniwind/components/Text`, a different module object from the index
// patched here. Nothing in the app renders form copy through those.
const Components = require('react-native');
const { StyleSheet, Platform } = Components;

/**
 * On `Text`, `textAlign` is *logical, not physical*, on both platforms — in an
 * RTL context `'left'` is the start (visually right) and `'right'` is the end.
 * Reading it as a physical side is the single mistake behind every "labels are
 * flush the wrong way" report, so the literals below are named for the edge
 * they produce, not for the word they contain.
 *
 * Each platform arrives there by its own route, which is worth recording
 * because the triggers differ:
 *
 * • Android — `TextLayoutManager.getTextAlignment`/`getTextGravity` resolve
 *   against the *script* of the run. For Arabic, `'right'` is ALIGN_OPPOSITE →
 *   `Gravity.LEFT`; anything that isn't `center`/`right` is ALIGN_NORMAL →
 *   `Gravity.RIGHT`.
 *
 * • iOS — `RCTAttributedTextUtils` swaps left↔right whenever the paragraph's
 *   `layoutDirection` is RTL, and `ParagraphShadowNode` takes that straight
 *   from `YGNodeLayoutGetDirection`, i.e. from the Yoga `direction` the root
 *   sets. So the swap is always on under our tree.
 *
 * `TextInput` is a different path on both and stays *physical*:
 * `ReactTextInputManager.setTextAlign` maps `'right'` → `Gravity.RIGHT`, and on
 * iOS the text-input attributes never set `layoutDirection`, so it defaults to
 * LeftToRight and the swap above never fires. Hence the separate table below.
 */
const TEXT_START = 'left';
const TEXT_END = 'right';

// `writingDirection` is what orders a trailing `*` or `:` at the correct end of
// an Arabic run, and on Android it is also what makes the paragraph RTL for the
// resolution described above.
const ALIGN_RTL = { textAlign: TEXT_START, writingDirection: 'rtl' };

/**
 * `TextInput` alignment, which is *not* the `Text` story above.
 *
 * Android maps it in `ReactTextInputManager.setTextAlign` to an **absolute**
 * gravity — `'right'` → `Gravity.RIGHT` — and an absolute gravity on an EditText
 * strands the hint's horizontal scroll offset the moment the field is dragged:
 * put a finger on an empty input, scroll, and the placeholder slides out and
 * stays out until the layout is rebuilt (type a character, delete it, and it is
 * back). Leaving the value unset gives `Gravity.NO_GRAVITY`, which is the
 * EditText's own START — direction-relative, so it already sits on the right
 * edge under RTL, and immune to the drag because nothing is pinned absolutely.
 *
 * iOS gets nothing from START: text-input attributes never carry a
 * `layoutDirection` (unlike the paragraph path used by `Text`), so natural
 * resolves against the LTR app direction and the field would sit left. It keeps
 * the explicit edge.
 *
 * `writingDirection` is set on both, but Android's `ReactTextInputManager` has
 * no prop for it at all, so there it is inert — see the note in `utils/rtl`
 * about phone placeholders still needing bidi isolation on Android.
 */
const inputAlign = (writingDirection) =>
  Platform.OS === 'android'
    ? { writingDirection }
    : { textAlign: 'right', writingDirection };

const ALIGN_RTL_INPUT = inputAlign('rtl');

// Same edge, opposite base direction: the box belongs to an Arabic form so it
// still starts on the right, but the string inside is left-to-right. Inheriting
// an RTL base is what renders `+212 6 00 00 00 00` as `00 00 00 00 6 212+` —
// the groups are separate bidi runs and an RTL paragraph lays them out
// right-to-left.
const ALIGN_RTL_LTR_VALUE = inputAlign('ltr');

// Keyboards that only ever produce Latin/ASCII data. Deciding this from the
// keyboard rather than at each call site is what keeps the rule from having to
// be remembered — a new phone or email field is correct the day it is written.
const LTR_KEYBOARDS = [
  'phone-pad',
  'number-pad',
  'numeric',
  'decimal-pad',
  'email-address',
  'url',
  'ascii-capable',
  'visible-password',
];

// Passwords are typed in Latin too, and their masked dots carry no direction.
const carriesLtrValue = (props) =>
  props.secureTextEntry === true || LTR_KEYBOARDS.includes(props.keyboardType);

// Arabic, Hebrew and the Arabic presentation forms — enough to tell whether a
// string carries its own right-to-left direction. Escapes, not literals:
// these characters are invisible or bidi-reordering in an editor, so a literal
// would be unreviewable and trivially mangled by a copy-paste.
const RTL_CHARS = /[֑-߿יִ-﷽ﹰ-ﻼ]/;

const RLM = '‏'; // RIGHT-TO-LEFT MARK
const LTR_ISOLATE = '⁦'; // LEFT-TO-RIGHT ISOLATE
const POP_ISOLATE = '⁩'; // POP DIRECTIONAL ISOLATE

/**
 * Pin an all-Latin placeholder to the start edge on Android.
 *
 * With no gravity set (see `inputAlign`), Android aligns an EditText's hint by
 * the *script* it detects — `TextDirectionHeuristics.FIRSTSTRONG`. An Arabic
 * hint resolves RTL and lands on the right, but `email@example.com` has no
 * strong RTL character in it, resolves LTR, and sits on the left of an
 * otherwise right-to-left form. Setting `Gravity.RIGHT` would fix the edge and
 * bring back the drag bug, and `writingDirection` is not a prop Android's
 * `ReactTextInputManager` reads at all — so the only lever left is the string.
 *
 * The leading mark gives the heuristic a strong RTL character to find, which
 * moves the hint to the right edge; the isolate around the text keeps the Latin
 * content itself rendering left-to-right as one run. Without the isolate a
 * space-separated value like `+212 6 00 00 00 00` would break into separate
 * runs and an RTL paragraph would lay them out backwards.
 *
 * Placeholders only — never values. These are invisible formatting characters,
 * and a value is what gets submitted.
 */
const pinPlaceholder = (placeholder) =>
  RLM + LTR_ISOLATE + placeholder + POP_ISOLATE;

const needsPin = (props) =>
  Platform.OS === 'android' &&
  typeof props.placeholder === 'string' &&
  props.placeholder !== '' &&
  !RTL_CHARS.test(props.placeholder);

const adaptInputProps = (props) =>
  needsPin(props) ? { ...props, placeholder: pinPlaceholder(props.placeholder) } : props;

// Alignment written as a *direction-aware* pair — heroui's `align` variant
// emits `text-left rtl:text-right` for "start" and the mirror for "end", and it
// is the default variant, so essentially every heroui `Text`, `Label`,
// `Alert.Title` and `Chip.Label` carries one. It resolves through uniwind's
// `rtl:` variant, which keys off `I18nManager.isRTL` — the native flag, false
// on iOS for the whole life of the process. Left alone, that is why an entire
// Arabic form renders flush left on iOS and flush right on Android from the
// same markup. The intent is unambiguous, so resolve it here instead, against
// `isRTL()`, which is live and platform-independent.
const DIRECTIONAL_CLASS = /(^|\s)rtl:text-(left|right|center|justify)(\s|$)/;

// Tailwind's own logical keywords. React Native's `textAlign` has no
// `start`/`end`, so uniwind passes them through and RN drops them.
const LOGICAL_CLASS = /(^|\s)text-(start|end)(\s|$)/;

// A physical alignment with no `rtl:` counterpart: the caller pinned a side and
// means it. So does a `textAlign` in `style`.
const PINNED_CLASS = /(^|\s)text-(left|right|center|justify)(\s|$)/;

const isPinned = (props) =>
  PINNED_CLASS.test(props.className ?? '') ||
  StyleSheet.flatten(props.style)?.textAlign != null;

/**
 * The alignment to inject, given what the caller already asked for.
 *
 * uniwind resolves `className` *inside* the component and merges it as
 * `[classStyle, props.style]`, so whatever comes back here lands after the
 * class and wins. Returning the direction without an alignment is how a pinned
 * caller keeps its own — `writingDirection` still has to be set either way,
 * since it is what orders a trailing `*` or `:` at the correct end of an Arabic
 * run, and the surface flag was quietly supplying it on Android only.
 */
function alignmentFor(props, edges) {
  const { base, end } = edges;
  const className = props.className ?? '';

  // heroui writes "start" as `text-left rtl:text-right` and "end" as the
  // mirror, so the `rtl:` half is the one that names the edge in an RTL UI.
  const directional = className.match(DIRECTIONAL_CLASS);
  if (directional) {
    const edge = directional[2];
    if (edge === 'center' || edge === 'justify') return { ...base, textAlign: edge };
    // `rtl:text-right` is the start edge, `rtl:text-left` the end.
    return edge === 'right' ? base : { ...base, textAlign: end };
  }

  const logical = className.match(LOGICAL_CLASS);
  if (logical) return logical[2] === 'start' ? base : { ...base, textAlign: end };

  if (isPinned(props)) return { writingDirection: base.writingDirection };

  return base;
}

// React reads these off the element type itself; copying them onto the wrapper
// would change what it *is* rather than what it renders.
const REACT_INTERNALS = ['$$typeof', 'render', 'contextType'];

/**
 * Replace `Components[name]` with a wrapper that fills in the alignment.
 *
 * Fast Refresh re-runs this module body. Reading `Components[name]` blindly
 * would then hand us the wrapper installed by the *previous* run, and every
 * element would recurse into itself until the stack blew — a reload-only crash
 * that never reproduces on a cold start. `rtlBase` is what breaks the chain.
 */
function patchDirectional(name, edgesFor, adaptProps) {
  const Base = Components[name].rtlBase ?? Components[name];

  function Directional(props) {
    if (!isRTL()) return React.createElement(Base, props);
    const adapted = adaptProps ? adaptProps(props) : props;
    const align = alignmentFor(adapted, edgesFor(adapted));
    return React.createElement(Base, { ...adapted, style: [align, adapted.style] });
  }

  // `Text.State`, `TextInput.State` and friends are reached off the component,
  // so losing them turns a working call site into an undefined-property crash.
  for (const [key, value] of Object.entries(Base)) {
    if (!REACT_INTERNALS.includes(key)) Directional[key] = value;
  }
  Directional.displayName = name;
  Directional.rtlBase = Base;

  Object.defineProperty(Components, name, {
    configurable: true,
    enumerable: true,
    get: () => Directional,
  });

  return Directional;
}

const TEXT_EDGES = { base: ALIGN_RTL, end: TEXT_END };
const INPUT_EDGES = { base: ALIGN_RTL_INPUT, end: 'left' };
const INPUT_LTR_EDGES = { base: ALIGN_RTL_LTR_VALUE, end: 'left' };

export const Text = patchDirectional('Text', () => TEXT_EDGES);
export const TextInput = patchDirectional(
  'TextInput',
  (props) => (carriesLtrValue(props) ? INPUT_LTR_EDGES : INPUT_EDGES),
  adaptInputProps
);
