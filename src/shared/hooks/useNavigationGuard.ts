import { useEffect } from 'react';

/**
 * Registers a `beforeunload` handler that prompts the user to confirm
 * navigation when there are unsaved changes.
 *
 * This is a **confirmation prompt** — it does NOT save data. For silent
 * crash-safety saves on tab close, see `useAutoSave`.
 */
export function useNavigationGuard(isDirty: boolean): void {
  useEffect(() => {
    if (!isDirty) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);
}
