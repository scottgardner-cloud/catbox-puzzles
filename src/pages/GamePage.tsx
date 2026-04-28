import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Grid, PaletteBar } from '../components';
import {
  createInitialGameState,
  cycleCell,
  setCells,
  undo,
  redo,
  resetBoard,
  checkErrors,
  isSolved,
  getHint,
} from '../engine';
import type { HintResult } from '../engine';
import { getEntryById } from '../puzzles/registry';
import type { PuzzleEntry } from '../puzzles/types';
import { saveGame, loadGame, restoreGameState } from '../state/persistence';
import type { ValidatedPuzzle, CellChange, PlayerCellState, ColorId } from '../types';
import { useLayoutContext } from './AppLayout';

type GameState = ReturnType<typeof createInitialGameState>;

/** Try to load a saved state for a puzzle entry, or create a fresh one. */
function initGameState(entry: PuzzleEntry): GameState {
  const save = loadGame(entry.entryId);
  if (save) {
    const restored = restoreGameState(save, entry.puzzle);
    if (restored) return restored;
  }
  return createInitialGameState(entry.puzzle);
}

/**
 * Route wrapper that resolves the entryId param and renders GamePage
 * keyed by entryId. Redirects to `/` if the entry is invalid.
 */
export function GameRoute(): React.JSX.Element {
  const { entryId } = useParams<{ entryId: string }>();
  const entry = entryId ? getEntryById(entryId) : undefined;

  if (!entry) {
    return <Navigate to="/" replace />;
  }

  return <GamePage key={entry.entryId} entry={entry} />;
}

// ── Save debounce interval (ms) ────────────────────────────────────
const SAVE_DEBOUNCE_MS = 2000;

/**
 * Game page component. Receives a resolved, valid puzzle entry.
 * Manages game state, drag interaction, keyboard shortcuts, and auto-save.
 */
function GamePage({ entry }: { readonly entry: PuzzleEntry }): React.JSX.Element {
  const puzzle: ValidatedPuzzle = entry.puzzle;
  const navigate = useNavigate();
  const { announce } = useLayoutContext();

  const [gameState, setGameState] = useState<GameState>(() => initGameState(entry));
  const solved = isSolved(gameState, puzzle);

  // Track whether the board has been modified since init/load
  const [isDirty, setIsDirty] = useState(false);

  // Keep a ref to latest game state for save-on-unmount (synced via effect, not render)
  const gameStateRef = useRef(gameState);
  const isDirtyRef = useRef(isDirty);
  useEffect(() => {
    gameStateRef.current = gameState;
    isDirtyRef.current = isDirty;
  });

  /** Wrap setGameState to also mark dirty. */
  const updateGameState = useCallback((updater: (s: GameState) => GameState) => {
    setGameState(updater);
    setIsDirty(true);
  }, []);

  // ── Auto-save on change (debounced, only if dirty) ──────────────
  useEffect(() => {
    if (!isDirty) return;
    const timer = setTimeout(() => {
      saveGame(gameStateRef.current, entry.entryId);
    }, SAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [gameState, isDirty, entry.entryId]);

  // ── Save on unmount (backup, only if dirty) ─────────────────────
  useEffect(() => {
    return () => {
      if (isDirtyRef.current) {
        saveGame(gameStateRef.current, entry.entryId);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry.entryId]);

  // ── Drag state (ephemeral UI concern) ───────────────────────────
  const isDragging = useRef(false);
  const dragTarget = useRef<PlayerCellState['kind'] | null>(null);
  const dragChanges = useRef<CellChange[]>([]);

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (solved) return;
      updateGameState((s) => cycleCell(s, row, col, puzzle));
    },
    [puzzle, solved, updateGameState],
  );

  const handleDragStart = useCallback(
    (row: number, col: number) => {
      if (solved) return;
      isDragging.current = true;
      const current = gameState.board[row][col];
      switch (current.kind) {
        case 'unknown':
          dragTarget.current = 'filled';
          break;
        case 'filled':
          dragTarget.current = 'empty';
          break;
        case 'empty':
          dragTarget.current = 'unknown';
          break;
      }
      dragChanges.current = [];
    },
    [gameState, solved],
  );

  const handleCellDragEnter = useCallback(
    (row: number, col: number) => {
      if (!isDragging.current || solved || !dragTarget.current) return;

      const current = gameState.board[row][col];
      let next: PlayerCellState;
      switch (dragTarget.current) {
        case 'filled':
          next = { kind: 'filled', colorId: gameState.selectedColorId };
          break;
        case 'empty':
          next = { kind: 'empty' };
          break;
        case 'unknown':
          next = { kind: 'unknown' };
          break;
      }

      if (current.kind === next.kind) return;

      const change: CellChange = { row, col, prev: current, next };
      dragChanges.current.push(change);

      // Drag-enter applies visual board update without undo stack (not dirty yet)
      setGameState((s) => {
        const newBoard = s.board.map((r, ri) =>
          ri === row ? r.map((c, ci) => (ci === col ? next : c)) : r,
        );
        return { ...s, board: newBoard, isValidationActive: false };
      });
    },
    [gameState, solved],
  );

  const handleDragEnd = useCallback(() => {
    if (isDragging.current && dragChanges.current.length > 0) {
      const changes = [...dragChanges.current];
      updateGameState((s) => setCells(s, changes, puzzle));
    }
    isDragging.current = false;
    dragTarget.current = null;
    dragChanges.current = [];
  }, [puzzle, updateGameState]);

  const handleUndo = useCallback(
    () => updateGameState((s) => undo(s, puzzle)),
    [puzzle, updateGameState],
  );
  const handleRedo = useCallback(
    () => updateGameState((s) => redo(s, puzzle)),
    [puzzle, updateGameState],
  );
  const handleReset = useCallback(
    () => updateGameState((s) => resetBoard(s, puzzle)),
    [puzzle, updateGameState],
  );
  const handleCheck = useCallback(
    () => updateGameState((s) => checkErrors(s, puzzle)),
    [puzzle, updateGameState],
  );

  const handleSelectColor = useCallback((id: ColorId) => {
    setGameState((s) => ({ ...s, selectedColorId: id }));
  }, []);

  const handleSave = useCallback(() => {
    saveGame(gameState, entry.entryId);
    setIsDirty(false);
  }, [gameState, entry.entryId]);

  const handleBack = useCallback(() => {
    if (isDirtyRef.current) {
      saveGame(gameStateRef.current, entry.entryId);
    }
    navigate('/');
  }, [entry.entryId, navigate]);

  // ── Hint state ──────────────────────────────────────────────────
  const [hintCells, setHintCells] = useState<ReadonlySet<string>>(new Set());

  /** Clear hints whenever the board changes. */
  useEffect(() => {
    if (hintCells.size > 0) {
      setHintCells(new Set());
    }
    // Only clear on board changes, not when hintCells itself changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.board]);

  const handleHint = useCallback(() => {
    if (solved) return;
    const result: HintResult = getHint(puzzle, gameState.board);
    switch (result.kind) {
      case 'hint': {
        const keys = new Set(result.cells.map((c) => `${c.row},${c.col}`));
        setHintCells(keys);
        const lineLabel = result.line === 'row' ? `row ${result.index + 1}` : `column ${result.index + 1}`;
        announce(`Hint: look at ${lineLabel} — ${result.cells.length} cell${result.cells.length === 1 ? '' : 's'} can be determined.`);
        break;
      }
      case 'error':
        announce('Your board has an error. Use Check to find mistakes.');
        break;
      case 'no-hint':
        announce('No hints available right now.');
        break;
    }
  }, [puzzle, gameState.board, solved, announce]);

  // ── Announce solved state ───────────────────────────────────────
  const prevSolvedRef = useRef(false);
  useEffect(() => {
    if (solved && !prevSolvedRef.current) {
      announce('Puzzle solved! Congratulations!');
    }
    prevSolvedRef.current = solved;
  }, [solved, announce]);

  // ── Announce validation results ─────────────────────────────────
  const prevValidationRef = useRef(false);
  useEffect(() => {
    if (gameState.isValidationActive && !prevValidationRef.current) {
      const wrongCount = gameState.cellValidation
        .flat()
        .filter((v) => v === 'wrong-filled' || v === 'wrong-empty' || v === 'wrong-color').length;
      if (wrongCount === 0) {
        announce('Validation: no errors found.');
      } else {
        announce(`Validation: ${wrongCount} error${wrongCount === 1 ? '' : 's'} found.`);
      }
    }
    prevValidationRef.current = gameState.isValidationActive;
  }, [gameState, announce]);

  // ── Global keyboard shortcuts ───────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        e.preventDefault();
        updateGameState((s) => undo(s, puzzle));
        return;
      }
      if (
        (e.key === 'y' && (e.ctrlKey || e.metaKey)) ||
        (e.key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey) ||
        (e.key === 'Z' && (e.ctrlKey || e.metaKey) && e.shiftKey)
      ) {
        e.preventDefault();
        updateGameState((s) => redo(s, puzzle));
        return;
      }
      if (e.key >= '1' && e.key <= '9' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const index = parseInt(e.key, 10) - 1;
        if (index < puzzle.palette.length) {
          const colorId = puzzle.palette[index].id;
          setGameState((s) => ({ ...s, selectedColorId: colorId }));
          announce(`Selected color: ${puzzle.palette[index].name}`);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [puzzle, announce]);

  return (
    <>
      <div className="pap-back-row">
        <button type="button" className="pap-btn" onClick={handleBack}>
          ← Back to puzzles
        </button>
      </div>

      <div className={`pap-solved${solved ? '' : ' pap-solved--hidden'}`}>
        🎉 Puzzle Solved!
      </div>

      <PaletteBar
        palette={puzzle.palette}
        selectedColorId={gameState.selectedColorId}
        onSelectColor={handleSelectColor}
      />

      <Grid
        board={gameState.board}
        cellValidation={gameState.cellValidation}
        rowValidation={gameState.rowValidation}
        colValidation={gameState.colValidation}
        rowClues={puzzle.rowClues}
        colClues={puzzle.colClues}
        palette={puzzle.palette}
        isValidationActive={gameState.isValidationActive}
        onCellClick={handleCellClick}
        onCellDragEnter={handleCellDragEnter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onAnnounce={announce}
        hintCells={hintCells}
      />

      <div className="pap-controls">
        <button
          type="button"
          className="pap-btn"
          onClick={handleUndo}
          disabled={gameState.undoStack.length === 0}
        >
          ↩ Undo
        </button>
        <button
          type="button"
          className="pap-btn"
          onClick={handleRedo}
          disabled={gameState.redoStack.length === 0}
        >
          ↪ Redo
        </button>
        <button type="button" className="pap-btn" onClick={handleCheck}>
          ✓ Check
        </button>
        <button type="button" className="pap-btn pap-btn--hint" onClick={handleHint} disabled={solved}>
          💡 Hint
        </button>
        <button type="button" className="pap-btn" onClick={handleSave}>
          💾 Save
        </button>
        <button type="button" className="pap-btn pap-btn--danger" onClick={handleReset}>
          ⟲ Reset
        </button>
      </div>
    </>
  );
}
