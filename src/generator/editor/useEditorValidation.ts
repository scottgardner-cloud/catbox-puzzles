import { useCallback, useMemo, useRef } from 'react';
import type { PuzzleDefinition } from '../../types';
import { validatePuzzleDefinition } from '../../engine/validation';
import { validatePuzzleUniqueness } from '../../engine/validation';
import { deriveClues } from '../pipeline/clue-derivation';
import { repairPuzzle } from '../pipeline/repair';
import type { EditorAction, EditorState } from './types';
import { buildPuzzleFields } from './reducer';
import type { LineClue } from '../../types';

/** Return type of useEditorValidation. */
export interface EditorValidation {
  /** Memoized row clues derived from the current grid. */
  readonly rowClues: readonly LineClue[];
  /** Memoized column clues derived from the current grid. */
  readonly colClues: readonly LineClue[];
  /** Run full validation + uniqueness check. Returns true if valid. */
  readonly checkSolvability: () => Promise<boolean>;
  /** Attempt to repair an ambiguous puzzle. Proposes changes for user confirmation. */
  readonly attemptRepair: () => Promise<void>;
  /** Whether a check is currently in progress. */
  readonly isChecking: boolean;
}

/**
 * Map raw validation errors to user-friendly guidance.
 * Adds actionable suggestions alongside the technical message.
 */
function addGuidance(message: string): string {
  if (message.includes('ambiguous') || message.includes('multiple valid solutions')) {
    return `${message}. Try adding more filled cells to create unique row/column patterns.`;
  }
  if (message.includes('contradictory') || message.includes('no valid solution')) {
    return `${message}. Check that your clues match the grid — this usually means a bug in the puzzle data.`;
  }
  if (message.includes('budget-exceeded') || message.includes('too complex')) {
    return `${message}. Try simplifying the design or reducing the grid size.`;
  }
  if (message.includes('empty') && message.includes('solution')) {
    return `${message}. Paint some cells on the grid before checking.`;
  }
  if (message.includes('palette')) {
    return `${message}. Make sure at least one color is in the palette.`;
  }
  return message;
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
  const { rowClues, colClues } = useMemo(() => deriveClues(state.grid), [state.grid]);

  const checkSolvability = useCallback(async (): Promise<boolean> => {
    if (checkingRef.current) return false;
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
          errors: basicResult.map((e) => addGuidance(e.message)),
        });
        return false;
      }

      // Step 2: Uniqueness check (expensive)
      const uniqueResult = validatePuzzleUniqueness(basicResult);
      if (Array.isArray(uniqueResult)) {
        dispatch({
          type: 'VALIDATION_FAILURE',
          errors: uniqueResult.map((e) => addGuidance(e.message)),
        });
        return false;
      }

      dispatch({ type: 'VALIDATION_SUCCESS' });
      return true;
    } catch (err) {
      dispatch({
        type: 'VALIDATION_FAILURE',
        errors: [err instanceof Error ? err.message : 'Validation failed unexpectedly.'],
      });
      return false;
    } finally {
      checkingRef.current = false;
    }
  }, [state, rowClues, colClues, dispatch]);

  const attemptRepair = useCallback(async () => {
    if (checkingRef.current) return;
    checkingRef.current = true;
    dispatch({ type: 'VALIDATION_START' });

    try {
      // Build a validated puzzle for repair
      const fields = buildPuzzleFields(state);
      const puzzle: PuzzleDefinition = { ...fields, rowClues, colClues };

      const basicResult = validatePuzzleDefinition(puzzle);
      if (Array.isArray(basicResult)) {
        dispatch({
          type: 'VALIDATION_FAILURE',
          errors: basicResult.map((e) => addGuidance(e.message)),
        });
        return;
      }

      const result = repairPuzzle(basicResult);
      if (result.success && result.changes.length === 0) {
        // Already uniquely solvable
        dispatch({ type: 'VALIDATION_SUCCESS' });
        return;
      }
      if (result.success && result.changes.length > 0) {
        // Propose changes for user confirmation
        dispatch({
          type: 'PROPOSE_REPAIR',
          changes: result.changes.map((c) => ({
            row: c.row,
            col: c.col,
            from: c.from,
            to: c.to,
          })),
        });
        dispatch({ type: 'VALIDATION_SUCCESS' });
        return;
      }
      // Repair failed — give context-aware guidance
      const filledCount = state.grid.flat().filter((c) => c !== null).length;
      const totalCells = state.rows * state.cols;
      const fillRatio = filledCount / totalCells;

      let guidance: string;
      if (fillRatio < 0.2) {
        guidance =
          'Too few filled cells to create unique clues. Add more detail to your design — the solver needs enough filled cells to distinguish each row and column.';
      } else if (fillRatio > 0.8) {
        guidance =
          'Too few empty cells to create unique clues. Add more empty space to your design to give the solver enough constraints.';
      } else {
        guidance =
          'Could not auto-repair this puzzle. Try breaking symmetry by adding or removing a few cells in repetitive areas.';
      }

      dispatch({
        type: 'VALIDATION_FAILURE',
        errors: [guidance],
      });
    } catch (err) {
      dispatch({
        type: 'VALIDATION_FAILURE',
        errors: [err instanceof Error ? err.message : 'Repair failed unexpectedly.'],
      });
    } finally {
      checkingRef.current = false;
    }
  }, [state, rowClues, colClues, dispatch]);

  return { rowClues, colClues, checkSolvability, attemptRepair, isChecking };
}
