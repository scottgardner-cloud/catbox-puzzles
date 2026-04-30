import { useEffect, useRef } from 'react';

const DEFAULT_DEBOUNCE_MS = 2000;

/** Options for the {@link useAutoSave} hook. */
export interface UseAutoSaveOptions {
  /**
   * Performs the save. Called at save-time (not render-time) so the
   * implementation can capture the latest state via refs.
   */
  readonly save: () => void;
  /** Storage key (e.g., puzzle entry ID). Resets debounce when it changes. */
  readonly entryId: string;
  /** Whether the board has been modified since init/load. */
  readonly isDirty: boolean;
  /**
   * Trigger value that changes when game state changes. Used to re-arm the
   * debounce timer. Typically the game state object itself.
   */
  readonly trigger: unknown;
  /**
   * Live check: should we save on unmount/tab-close even if not dirty?
   * E.g., returns true when the timer has unflushed wall-clock time.
   */
  readonly shouldSave?: () => boolean;
  /** Debounce interval in ms. Default: 2000. */
  readonly debounceMs?: number;
}

/**
 * Auto-saves game progress via three mechanisms:
 * 1. **Debounced save** — saves after a delay when dirty + state changes.
 * 2. **Unmount save** — saves when the component unmounts (if dirty or shouldSave).
 * 3. **beforeunload save** — crash-safety save on tab close/refresh.
 *
 * This hook performs a **silent save** for crash safety. It does NOT prompt
 * the user to confirm navigation — for that, use {@link useNavigationGuard}.
 */
export function useAutoSave({
  save,
  entryId,
  isDirty,
  trigger,
  shouldSave,
  debounceMs = DEFAULT_DEBOUNCE_MS,
}: UseAutoSaveOptions): void {
  // Keep stable refs for cleanup/event callbacks
  const saveRef = useRef(save);
  const isDirtyRef = useRef(isDirty);
  const shouldSaveRef = useRef(shouldSave);
  useEffect(() => {
    saveRef.current = save;
    isDirtyRef.current = isDirty;
    shouldSaveRef.current = shouldSave;
  });

  // Debounced save on dirty + state change
  useEffect(() => {
    if (!isDirty) return;
    const timer = setTimeout(() => {
      saveRef.current();
    }, debounceMs);
    return () => clearTimeout(timer);
    // Re-arm on state changes (trigger) and dirty flag
  }, [trigger, isDirty, entryId, debounceMs]);

  // Save on unmount
  useEffect(() => {
    return () => {
      if (isDirtyRef.current || shouldSaveRef.current?.()) {
        saveRef.current();
      }
    };
  }, [entryId]);

  // Crash-safety save on tab close / browser crash
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isDirtyRef.current || shouldSaveRef.current?.()) {
        saveRef.current();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [entryId]);
}
