import { useCallback, useEffect, useRef, useState } from 'react';
import type { TimerStatus } from '../../nonogram/types';

/** Options for the {@link useTimer} hook. */
export interface UseTimerOptions {
  /** Current elapsed ms from game state (authoritative for external changes like undo/redo). */
  readonly externalMs: number;
  /** Current timer status from game state (authoritative for external changes). */
  readonly externalStatus: TimerStatus;
  /** Whether the puzzle is currently solved. The hook tracks transitions. */
  readonly isSolved: boolean;
  /** Called on idle→running transition. Consumer should update game state + dirty flag. */
  readonly onStart?: () => void;
  /** Called when solve is detected (running → stopped). Receives final flushed ms. */
  readonly onSolved?: (finalMs: number) => void;
  /** Called when undo-past-solve is detected (stopped → running). */
  readonly onUndoPastSolve?: () => void;
}

/** Return value of the {@link useTimer} hook. */
export interface UseTimerReturn {
  /** Current display time in ms (updated every ~1s while running). */
  readonly displayMs: number;
  /** Current timer status (idle/running/stopped). */
  readonly timerStatus: TimerStatus;
  /** Flush wall-clock delta into base elapsed. Returns accurate elapsed ms. */
  readonly flushTimer: () => number;
  /** Transition idle→running. No-op if already running/stopped. */
  readonly ensureRunning: () => void;
  /** Reset to idle/0ms. Stops interval. */
  readonly resetTimer: () => void;
  /** Whether timer has unflushed wall-clock time (for save-on-unmount checks). */
  readonly hasUnflushedTime: () => boolean;
}

/**
 * Manages a solve timer with wall-clock delta tracking.
 *
 * The timer uses refs for live tracking (immune to tab throttle) and React
 * state only for display refresh (~1s interval). External state changes
 * (e.g., undo/redo restoring timer fields) are detected via `externalMs`
 * and `externalStatus` and synced into internal refs.
 */
export function useTimer({
  externalMs,
  externalStatus,
  isSolved,
  onStart,
  onSolved,
  onUndoPastSolve,
}: UseTimerOptions): UseTimerReturn {
  const runningSinceRef = useRef<number | null>(null);
  const baseElapsedRef = useRef(externalMs);
  const timerStatusRef = useRef<TimerStatus>(externalStatus);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [displayMs, setDisplayMs] = useState(externalMs);
  // State mirror of timerStatusRef for render access (ref is for callbacks)
  const [statusState, setStatusState] = useState<TimerStatus>(externalStatus);

  // Stable refs for callbacks (avoids stale closures in effects)
  const onStartRef = useRef(onStart);
  const onSolvedRef = useRef(onSolved);
  const onUndoPastSolveRef = useRef(onUndoPastSolve);
  useEffect(() => {
    onStartRef.current = onStart;
    onSolvedRef.current = onSolved;
    onUndoPastSolveRef.current = onUndoPastSolve;
  });

  /** Flush timer: compute accurate elapsed time from wall-clock delta. */
  const flushTimer = useCallback((): number => {
    if (runningSinceRef.current === null) return baseElapsedRef.current;
    const now = Date.now();
    const delta = now - runningSinceRef.current;
    baseElapsedRef.current += delta;
    runningSinceRef.current = now;
    return baseElapsedRef.current;
  }, []);

  /** Start the display-refresh interval. */
  const startTimerInterval = useCallback(() => {
    if (timerIntervalRef.current !== null) return;
    runningSinceRef.current = Date.now();
    timerIntervalRef.current = setInterval(() => {
      if (runningSinceRef.current === null) return;
      setDisplayMs(baseElapsedRef.current + (Date.now() - runningSinceRef.current));
    }, 1000);
  }, []);

  /** Stop the display-refresh interval. */
  const stopTimerInterval = useCallback(() => {
    if (timerIntervalRef.current !== null) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    runningSinceRef.current = null;
  }, []);

  /** Transition idle→running on first cell interaction. */
  const ensureRunning = useCallback(() => {
    if (timerStatusRef.current !== 'idle') return;
    timerStatusRef.current = 'running';
    setStatusState('running');
    startTimerInterval();
    onStartRef.current?.();
  }, [startTimerInterval]);

  /** Reset to idle/0ms. */
  const resetTimer = useCallback(() => {
    stopTimerInterval();
    baseElapsedRef.current = 0;
    timerStatusRef.current = 'idle';
    setStatusState('idle');
    setDisplayMs(0);
  }, [stopTimerInterval]);

  /** Whether timer has unflushed wall-clock time. */
  const hasUnflushedTime = useCallback((): boolean => {
    return runningSinceRef.current !== null;
  }, []);

  // Resume timer on mount if it was running and puzzle not solved
  useEffect(() => {
    if (timerStatusRef.current === 'running' && !isSolved) {
      startTimerInterval();
    }
    return () => stopTimerInterval();
    // Mount/unmount only — refs and isSolved are correct at mount time
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync timer refs when external state changes (e.g., undo/redo reset)
  useEffect(() => {
    if (baseElapsedRef.current !== externalMs || timerStatusRef.current !== externalStatus) {
      baseElapsedRef.current = externalMs;
      timerStatusRef.current = externalStatus;
      setStatusState(externalStatus);
      setDisplayMs(externalMs);
      if (externalStatus === 'running' && !isSolved) {
        startTimerInterval();
      } else if (externalStatus !== 'running') {
        stopTimerInterval();
      }
    }
  }, [externalMs, externalStatus, isSolved, startTimerInterval, stopTimerInterval]);

  // Track solved transitions for timer start/stop
  const prevSolvedRef = useRef(false);
  useEffect(() => {
    if (isSolved && !prevSolvedRef.current) {
      // Just solved — flush and stop timer
      const finalMs = flushTimer();
      stopTimerInterval();
      timerStatusRef.current = 'stopped';
      setStatusState('stopped');
      setDisplayMs(finalMs);
      onSolvedRef.current?.(finalMs);
    } else if (!isSolved && prevSolvedRef.current && timerStatusRef.current === 'stopped') {
      // Undo past solve — resume timer
      timerStatusRef.current = 'running';
      setStatusState('running');
      startTimerInterval();
      onUndoPastSolveRef.current?.();
    }
    prevSolvedRef.current = isSolved;
  }, [isSolved, flushTimer, stopTimerInterval, startTimerInterval]);

  return {
    displayMs,
    timerStatus: statusState,
    flushTimer,
    ensureRunning,
    resetTimer,
    hasUnflushedTime,
  };
}
