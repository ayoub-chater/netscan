import React from 'react';
import { SearchField } from 'heroui-native';

/**
 * heroui's `SearchField`, with its geometry restated on logical edges.
 *
 * The component overlays its two affordances on the input with physical edges
 * — `absolute left-3` for the magnifier, `absolute right-3` for the clear
 * button — and reserves room for them with physical padding (`pl-9 pr-12`).
 * Android's surface swap silently rewrites all four to logical edges in RTL and
 * iOS leaves them alone, so the identical markup comes out mirrored on one
 * platform and untouched on the other: the magnifier on the right with the
 * caret starting under it, or on the left with a 48px hole on the wrong side.
 *
 * The overrides go through `style` rather than `className` on purpose.
 * tailwind-merge treats `left-3` and `start-3` as separate properties, so a
 * className override leaves *both* applied and Yoga picks; `style` wins over
 * `className` in uniwind, and a key set to `undefined` in a later style object
 * clears an earlier one (`flattenStyle` assigns straight through), which is the
 * only way to actually remove the physical edge.
 */
const ICON_START = { left: undefined, insetInlineStart: 12 };
const CLEAR_END = { right: undefined, insetInlineEnd: 12 };
// Same 36 / 48 heroui reserves with `pl-9 pr-12`, on the edges that mirror.
const INPUT_ROOM = {
  paddingLeft: undefined,
  paddingRight: undefined,
  paddingStart: 36,
  paddingEnd: 48,
};

export default function SearchBar({ value, onChange, placeholder, ...props }) {
  return (
    <SearchField value={value} onChange={onChange} {...props}>
      <SearchField.Group>
        <SearchField.SearchIcon style={ICON_START} />
        <SearchField.Input placeholder={placeholder} style={INPUT_ROOM} />
        <SearchField.ClearButton style={CLEAR_END} />
      </SearchField.Group>
    </SearchField>
  );
}
