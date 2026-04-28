import { useCallback, useMemo, useRef } from 'react';
import type { PuzzleDefinition } from '../../types';
import { validatePuzzleDefinition } from '../../engine/validation';
import { validatePuzzleUniqueness } from '../../engine/validation';
import { deriveClues } from '../pipeline/clue-derivation';
import type { EditorAction, EditorState } from './types';
import { buildPuzzleFields } from './reducer';
import type { LineClue } from '../../types';

/** Return type of useEditorValidation. */
export interface EditorValidation {
  /** Memoized row clues derived from the current grid. */
  readonly rowClues: readonly LineClue[];
  /** Memoized column clues derived from the current grid. */
  readonly colClues: readonly LineClue[];
  /** Run full validation + uniqueness check. Dispatches validation actions. */
  readonly checkSolvability: () => Promise<void>;
  /** Whether a check is currently in progress. */
  readonly isChecking: boolean;
}

/**
 * Hook that provides memoized clue derivation and on-demand solvability validation.
 * Clues are recomputed via useMemo whenever the grid changes (cheap).
 * Solvability checking is explicit and user-triggered (expensive).
 */
export function useEditorValidation(
  state: EditorState,
  dispatch: React.Dispatch<EditorAction>,
): EditorValidation {
  const isChecking = state.validationStatus === 'checking';
  const checkingRef = useRef(false);

  // Memoize clues — deriveClues is pure and cheap
  const { rowClues, colClues } = useMemo(
    () => deriveClues(state.grid),
    [state.grid],
  );

  const checkSolvability = useCallback(async () => {
    if (checkingRef.current) return;
    checkingRef.current = true;
    dispatch({ type: 'VALIDATION_START' });

    try {
      // Build a full PuzzleDefinition for validation
      const fields = buildPuzzleFields(state);
      const puzzle: PuzzleDefinition = {
        ...fields,
        rowClues,
        colClues,
      };

      // Step 1: Basic validation
      const basicResult = validatePuzzleDefinition(puzzle);
      if (Array.isArray(basicResult)) {
        dispatch({
          type: 'VALIDATION_FAILURE',
          errors: basicResult.map((e) => e.message),
        });
        return;
      }

      // Step 2: Uniqueness check (expensive)
      const uniqueResult = validatePuzzleUniqueness(basicResult);
      if (Array.isArray(uniqueResult)) {
        dispatch({
          type: 'VALIDATION_FAILURE',
          errors: uniqueResult.map((e) => e.message),
        });
        return;
      }

      dispatch({ type: 'VALIDATION_SUCCESS' });
    } catch (err) {
      dispatch({
        type: 'VALIDATION_FAILURE',
        errors: [err instanceof Error ? err.message : 'Validation failed unexpectedly.'],
      });
    } finally {
      checkingRef.current = false;
    }
  }, [state, rowClues, colClues, dispatch]);

  return { rowClues, colClues, checkSolvability, isChecking };
}
