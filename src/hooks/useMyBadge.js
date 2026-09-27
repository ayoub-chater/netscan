import { useCallback, useRef, useState } from 'react';
import { Linking } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getMyBadge } from '../services/api';

/**
 * The signed-in user's printable badge (GET /badge/me).
 *
 * `badge.available` is true once the organiser has released badges and the
 * user has a badge number and a design. Otherwise `badge.reason` says why:
 * not_enabled | not_released | no_badge | no_design.
 *
 * Refreshed each time the screen gains focus, so releasing badges from the
 * back office shows up without restarting the app.
 */
export default function useMyBadge() {
  const [badge, setBadge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState(null);
  const alive = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const { data } = await getMyBadge();
      if (alive.current) {
        setBadge(data?.data ?? null);
        setError(null);
      }
      return data?.data ?? null;
    } catch (e) {
      if (alive.current) setError(e);
      return null;
    } finally {
      if (alive.current) setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      alive.current = true;
      refresh();
      return () => {
        alive.current = false;
      };
    }, [refresh])
  );

  /**
   * Opens the PDF in the phone's viewer (print / save / share from there).
   * Always asks for a fresh link: the previous one may have expired.
   */
  const open = useCallback(async () => {
    setOpening(true);
    try {
      const fresh = await refresh();
      if (!fresh?.available || !fresh.pdf_url) return false;
      await Linking.openURL(fresh.pdf_url);
      return true;
    } catch {
      return false;
    } finally {
      if (alive.current) setOpening(false);
    }
  }, [refresh]);

  return { badge, loading, opening, error, refresh, open };
}
