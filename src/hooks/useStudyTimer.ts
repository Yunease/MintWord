import { useCallback, useEffect, useRef } from 'react';
import { recordStudyTime } from '../lib/api';

function localDateString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Tracks accumulated study time on this page.
 * No periodic writes — only flushes to DB on component unmount.
 *
 * Returns a control function:
 *   setTimerActive(true)  → resume counting  (no-op if already active)
 *   setTimerActive(false) → pause, save current segment
 *
 * For pages without pause (Library, ArticleView, CompositionView):
 *   just call `useStudyTimer()` — timer runs until unmount.
 */
export function useStudyTimer(): (active: boolean) => void {
  const startRef = useRef(0);
  const totalRef = useRef(0);

  useEffect(() => {
    startRef.current = Date.now();

    return () => {
      if (startRef.current > 0) {
        totalRef.current += Date.now() - startRef.current;
      }
      const totalSeconds = Math.floor(totalRef.current / 1000);
      if (totalSeconds >= 1) {
        recordStudyTime(localDateString(), totalSeconds).catch(() => {});
      }
    };
  }, []);

  const setActive = useCallback((active: boolean) => {
    if (active) {
      if (startRef.current === 0) {
        startRef.current = Date.now();
      }
    } else if (startRef.current > 0) {
      totalRef.current += Date.now() - startRef.current;
      startRef.current = 0;
    }
  }, []);

  return setActive;
}
