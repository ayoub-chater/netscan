import { useEffect, useRef, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';

// Long enough for the close animation to finish before the tree goes away.
const UNMOUNT_DELAY = 300;

// `BottomSheet.Portal` publishes its children from an effect, so the gorhom
// instance behind `ref` appears a commit or two after we mount the tree. Retry
// the imperative open across that window; snapping to an index the sheet is
// already at is a no-op, so extra attempts cost nothing.
const OPEN_RETRIES = [0, 50, 150, 300];

// Nothing to force on `BottomSheet.Content` any more — kept so call sites can
// keep spreading it, and so gesture props have one place to live if they are
// ever needed again. They must never depend on `isOpen`: changing
// `enableContentPanningGesture` makes gorhom swap the wrapper around the
// content, which remounts the whole sheet mid-open and strands it closed.
const SHEET_CONTENT_PROPS = {};

/**
 * Owns the lifecycle of a heroui `BottomSheet`.
 *
 * The sheet tree exists only while it should be visible. That matters because
 * `BottomSheet.Portal` registers into a module-level store rendered by one
 * app-wide `PortalHost`: a mounted-but-closed sheet is not inert. It parks a
 * strip at the bottom of the screen and keeps live pan handlers under the
 * portal's full-screen `pointerEvents="box-none"` view, so a swipe up from the
 * bottom edge — the Android home gesture, a fling over the floating tab bar —
 * drags it into view with empty data, over whatever screen is showing, and
 * unclosable, because `isOpen` never went true.
 *
 * Opening is driven imperatively rather than by prop transition.
 * `BottomSheetContentContainer` only calls `snapToIndex` on a false→true change
 * of `isOpen`, seeded from `useRef(isOpen)` at mount — so a container that
 * first mounts with `isOpen` already true sees no transition and sits at its
 * hardcoded `index={-1}` forever, which is exactly what made every trigger
 * button look dead. `ref.current.snapToIndex(0)` does not care about any of
 * that.
 *
 * `isOpen` is still passed through: the overlay renders off it, and it gives
 * the container the true→false transition it needs to close itself.
 *
 * Usage:
 *   const sheet = useSheetGuard(open, () => setOpen(false));
 *   {sheet.mounted ? (
 *     <BottomSheet key={sheet.key} isOpen={sheet.isOpen} onOpenChange={(o) => !o && sheet.close()}>
 *       <BottomSheet.Portal>
 *         <BottomSheet.Overlay />
 *         <BottomSheet.Content ref={sheet.ref} {...sheet.contentProps} …>
 *   ) : null}
 */
export default function useSheetGuard(open, onClose) {
  const isFocused = useIsFocused();
  // Scoped to the owning screen: leaving the tab closes the sheet with it.
  const shouldBeOpen = open && isFocused;

  const ref = useRef(null);
  // Read the latest callback at call time, not the one captured when the
  // effects below were set up.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const [mounted, setMounted] = useState(false);
  // Bumped on every open so the caller can key the sheet tree: each open cycle
  // gets a brand-new gorhom instance instead of reusing one whose internal
  // position state may have drifted, which is what left sheets refusing to
  // open a second time.
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    if (shouldBeOpen) {
      setCycle((c) => c + 1);
      setMounted(true);
      return undefined;
    }
    ref.current?.close();
    const timer = setTimeout(() => setMounted(false), UNMOUNT_DELAY);
    return () => clearTimeout(timer);
  }, [shouldBeOpen]);

  useEffect(() => {
    if (!mounted || !shouldBeOpen) return undefined;
    // `expand()` goes to the highest snap point, so a sheet can never settle
    // half-open the way an index-based snap can.
    const timers = OPEN_RETRIES.map((delay) =>
      setTimeout(() => ref.current?.expand(), delay)
    );
    return () => timers.forEach(clearTimeout);
  }, [mounted, shouldBeOpen, cycle]);

  // Blur force-closes the sheet above; tell the caller so the state driving
  // `open` matches reality instead of still claiming the sheet is open when the
  // tab is switched back to.
  useEffect(() => {
    if (!isFocused && open) onCloseRef.current?.();
  }, [isFocused]); // eslint-disable-line react-hooks/exhaustive-deps

  const close = () => {
    ref.current?.close();
    onCloseRef.current?.();
  };

  return {
    ref,
    mounted,
    isOpen: shouldBeOpen,
    close,
    key: cycle,
    contentProps: SHEET_CONTENT_PROPS,
  };
}
