import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';

// Long enough for the close animation to finish before the tree goes away.
const UNMOUNT_DELAY = 300;

// `BottomSheet.Portal` publishes its children from an effect, so the gorhom
// instance behind `ref` appears a commit or two after we mount the tree — and
// `expand()` does nothing until it has measured its container. How long that
// takes is not bounded: the press handlers that open these sheets also kick off
// network requests, so the JS thread can be busy right through it. Retry on an
// interval and stop on the sheet's own `onChange`, rather than guessing a
// deadline — guessing is what made sheets need two or three taps.
const OPEN_RETRY_INTERVAL = 80;
const OPEN_RETRY_TIMEOUT = 4000;

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
  // Set once the sheet reports a real snap point for this cycle. Retrying stops
  // there, so a swipe-down straight after opening can't be undone by a pending
  // retry re-expanding the sheet.
  const settledRef = useRef(false);

  useEffect(() => {
    if (shouldBeOpen) {
      settledRef.current = false;
      setCycle((c) => c + 1);
      setMounted(true);
      return undefined;
    }
    ref.current?.close();
    const timer = setTimeout(() => setMounted(false), UNMOUNT_DELAY);
    return () => clearTimeout(timer);
  }, [shouldBeOpen]);

  useEffect(() => {
    if (!mounted || !shouldBeOpen || settledRef.current) return undefined;
    // `expand()` goes to the highest snap point, so a sheet can never settle
    // half-open the way an index-based snap can. It is a no-op until the sheet
    // has measured itself, and a no-op once it is already there — so keep
    // asking until it takes.
    let interval = null;
    const attempt = () => {
      if (settledRef.current) {
        if (interval !== null) clearInterval(interval);
        return;
      }
      ref.current?.expand();
    };
    attempt();
    interval = setInterval(attempt, OPEN_RETRY_INTERVAL);
    const giveUp = setTimeout(() => clearInterval(interval), OPEN_RETRY_TIMEOUT);
    return () => {
      clearInterval(interval);
      clearTimeout(giveUp);
    };
  }, [mounted, shouldBeOpen, cycle]);

  // gorhom reports every settled position here. Index 0 or above means the
  // sheet is genuinely open and the retry loop above has done its job.
  const handleChange = useCallback((index) => {
    if (index >= 0) settledRef.current = true;
  }, []);

  const contentProps = useMemo(() => ({ onChange: handleChange }), [handleChange]);

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
    // Carries gorhom's `onChange` so the retry loop knows when to stop. Must be
    // spread onto `BottomSheet.Content`. Never put anything here that depends on
    // `isOpen`: changing `enableContentPanningGesture`, for one, makes gorhom
    // swap the wrapper around the content and remounts the sheet mid-open.
    contentProps,
  };
}
