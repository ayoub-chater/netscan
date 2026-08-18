import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Countdown before a verification code may be sent again.
 *
 * The backend enforces the same delay (Api\Concerns\ThrottlesVerificationCodes)
 * and answers 429 with `retry_after` — this only mirrors it on screen, so the
 * resend button says how long is left instead of failing when tapped.
 *
 * `start()` after a code goes out; `start(retryAfter)` when the server rejects
 * a resend, so the timer matches what the server is actually holding.
 */
export const RESEND_COOLDOWN_SECONDS = 60;

export default function useResendCooldown(defaultSeconds = RESEND_COOLDOWN_SECONDS) {
  const [remaining, setRemaining] = useState(0);
  // Absolute deadline, not a decrementing counter: a plain interval drifts and
  // stops being decremented while the app is backgrounded.
  const deadlineRef = useRef(0);

  useEffect(() => {
    if (remaining <= 0) return undefined;

    const id = setInterval(() => {
      const left = Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) clearInterval(id);
    }, 1000);

    return () => clearInterval(id);
  }, [remaining > 0]);

  const start = useCallback(
    (seconds = defaultSeconds) => {
      const value = Math.max(0, Math.ceil(Number(seconds) || 0));
      if (!value) return;
      deadlineRef.current = Date.now() + value * 1000;
      setRemaining(value);
    },
    [defaultSeconds]
  );

  const reset = useCallback(() => {
    deadlineRef.current = 0;
    setRemaining(0);
  }, []);

  return { remaining, isCoolingDown: remaining > 0, start, reset };
}
