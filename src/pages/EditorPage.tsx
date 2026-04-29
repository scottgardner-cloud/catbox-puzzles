import { useCallback, useEffect, useReducer } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLayoutContext } from './AppLayout';
import {
  EditorGrid,
  EditorPalette,
  EditorToolbar,
  useEditorValidation,
  editorReducer,
  createInitialState,
  stateFromPuzzle,
  buildPuzzleFields,
} from '../generator/editor';
import { deriveClues } from '../generator/pipeline/clue-derivation';
import { getEntryById, saveCustomPuzzle, updateCustomPuzzle } from '../puzzles/registry';
import type { PuzzleDefinition } from '../types';
import './EditorPage.css';

/**
 * Puzzle editor page. Create new pixel-art puzzles or edit existing custom ones.
 * Progressive flow: configure → paint → validate → export.
 */
export function EditorPage(): React.JSX.Element {
  const navigate = useNavigate();
  const { announce } = useLayoutContext();
  const { entryId } = useParams<{ entryId?: string }>();

  const [state, dispatch] = useReducer(editorReducer, null, () => createInitialState('bw', 10, 10));

  // Load existing puzzle for editing, or reset to new state
  useEffect(() => {
    if (!entryId) {
      dispatch({ type: 'LOAD_PUZZLE', state: createInitialState('bw', 10, 10) });
      return;
    }
    const decoded = decodeURIComponent(entryId);
    const entry = getEntryById(decoded);
    if (!entry || entry.source !== 'custom') {
      announce('Puzzle not found or not editable.');
      navigate('/', { replace: true });
      return;
    }
    dispatch({ type: 'LOAD_PUZZLE', state: stateFromPuzzle(decoded, entry.puzzle) });
    announce(`Editing: ${entry.puzzle.name}`);
  }, [entryId, announce, navigate]);

  const validation = useEditorValidation(state, dispatch);

  const handleExport = useCallback(async () => {
    // Auto-validate if not already checked (S15)
    if (state.validationStatus !== 'valid') {
      const isValid = await validation.checkSolvability();
      if (!isValid) {
        announce('Puzzle failed validation. See errors above.');
        return;
      }
    }

    const fields = buildPuzzleFields(state);
    const { rowClues, colClues } = deriveClues(state.grid);
    const puzzle: PuzzleDefinition = { ...fields, rowClues, colClues };

    let result;
    if (state.mode === 'edit' && state.sourceEntryId) {
      result = updateCustomPuzzle(state.sourceEntryId, puzzle);
    } else {
      result = saveCustomPuzzle(puzzle);
    }

    if (result) {
      dispatch({ type: 'MARK_SAVED' });
      announce(`Puzzle "${state.name || 'Untitled'}" saved to library.`);
      navigate('/');
    } else {
      announce('Failed to save puzzle. Check validation.');
    }
  }, [state, validation, announce, navigate]);

  // Navigation guard for unsaved changes
  useEffect(() => {
    if (!state.isDirty) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [state.isDirty]);

  return (
    <div className="pap-editor">
      <h2>{state.mode === 'edit' ? 'Edit Puzzle' : 'Puzzle Editor'}</h2>
      <p className="pap-editor__subtitle">
        {state.mode === 'edit'
          ? 'Modify your puzzle and save changes.'
          : 'Paint pixel art, then export as a playable nonogram.'}
      </p>

      <div className="pap-editor__layout">
        {/* Left panel: toolbar + palette */}
        <div className="pap-editor__sidebar">
          <EditorToolbar
            state={state}
            dispatch={dispatch}
            onCheckSolvability={validation.checkSolvability}
            onExport={handleExport}
            isChecking={validation.isChecking}
          />
          <EditorPalette state={state} dispatch={dispatch} />
        </div>

        {/* Main: paint grid */}
        <div className="pap-editor__canvas">
          <EditorGrid
            state={state}
            dispatch={dispatch}
            rowClues={validation.rowClues}
            colClues={validation.colClues}
          />
        </div>
      </div>

      {/* Navigation hint */}
      {state.isDirty && (
        <p className="pap-editor__unsaved" role="status">
          You have unsaved changes.
        </p>
      )}
    </div>
  );
}
