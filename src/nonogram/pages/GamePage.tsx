import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Grid, PaletteBar, KeyboardShortcutHelp } from '../components';
import {
  createInitialGameState,
  cycleCell,
  setCells,
  undo,
  redo,
  resetBoard,
  checkErrors,
  isSolved,
  getHintWithExplanations,
} from '../engine';
import type { HintResult, DeductionReason } from '../engine';
import { useAutoSave } from '../../shared/hooks/useAutoSave';
import { useTimer } from '../../shared/hooks/useTimer';
import { getEntryById } from '../puzzles/registry';
import type { PuzzleEntry } from '../puzzles/types';
import { saveGame, loadGame, restoreGameState } from '../state/persistence';
import type { ValidatedPuzzle, CellChange, PlayerCellState, ColorId } from '../types';
import { useLayoutContext } from '../../pages/AppLayout';

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
    return <Navigate to="/nonogram" replace />;
  }

  return <GamePage key={entry.entryId} entry={entry} />;
}

/** Format milliseconds as MM:SS or H:MM:SS. */
function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/** Build a human-readable explanation from per-cell deduction reasons. */
function buildExplanation(reasons: readonly (DeductionReason | undefined)[]): string {
  const counts: Record<string, number> = {};
  for (const r of reasons) {
    if (!r) continue;
    counts[r.kind] = (counts[r.kind] ?? 0) + 1;
  }

  const s = (n: number) => (n === 1 ? '' : 's');
  const parts: string[] = [];
  if (counts['overlap']) {
    const n = counts['overlap'];
    parts.push(`${n} cell${s(n)} must be filled — the run is too long to avoid them`);
  }
  if (counts['single-placement']) {
    const n = counts['single-placement'];
    parts.push(`${n} cell${s(n)} determined — this group can only fit in one spot`);
  }
  if (counts['intersection']) {
    const n = counts['intersection'];
    parts.push(`${n} cell${s(n)} — multiple clues agree on this`);
  }
  if (counts['unreachable']) {
    const n = counts['unreachable'];
    parts.push(`${n} cell${s(n)} must be empty — no clue can reach them`);
  }
  if (counts['forced-separator']) {
    const n = counts['forced-separator'];
    parts.push(`${n} cell${s(n)} must be empty — gap required between groups`);
  }
  if (counts['elimination']) {
    const n = counts['elimination'];
    parts.push(`${n} cell${s(n)} must be empty — can't belong to any group`);
  }

  return parts.length > 0 ? parts.join('. ') + '.' : '';
}

/**
 * Interpolate cells between last drag position and current position.
 * Uses Bresenham's line algorithm to fill gaps from fast mouse movement.
 * Returns cells to process (excludes the `from` cell, includes `to`).
 */
function interpolateCells(
  from: { row: number; col: number } | null,
  toRow: number,
  toCol: number,
): [number, number][] {
  if (!from || (from.row === toRow && from.col === toCol)) {
    return [[toRow, toCol]];
  }

  const cells: [number, number][] = [];
  let r0 = from.row;
  let c0 = from.col;
  const r1 = toRow;
  const c1 = toCol;
  const dr = Math.abs(r1 - r0);
  const dc = Math.abs(c1 - c0);
  const sr = r0 < r1 ? 1 : -1;
  const sc = c0 < c1 ? 1 : -1;
  let err = dr - dc;

  // Skip the starting cell (already processed on previous enter)
  while (r0 !== r1 || c0 !== c1) {
    const e2 = 2 * err;
    if (e2 > -dc) {
      err -= dc;
      r0 += sr;
    }
    if (e2 < dr) {
      err += dr;
      c0 += sc;
    }
    cells.push([r0, c0]);
  }

  return cells;
}

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

  // Track whether help modal is open (suppress global shortcuts)
  const isHelpOpenRef = useRef(false);

  // Keep a ref to latest game state for save-on-unmount (synced via effect, not render)
  const gameStateRef = useRef(gameState);
  const isDirtyRef = useRef(isDirty);
  useEffect(() => {
    gameStateRef.current = gameState;
    isDirtyRef.current = isDirty;
  });

  // ── Timer (via useTimer hook) ─────────────────────────────────────
  const timer = useTimer({
    externalMs: gameState.elapsedMs,
    externalStatus: gameState.timerStatus,
    isSolved: solved,
    onStart: () => {
      setGameState((s) => ({ ...s, timerStatus: 'running' }));
      setIsDirty(true);
    },
    onSolved: (finalMs) => {
      setGameState((s) => ({ ...s, timerStatus: 'stopped', elapsedMs: finalMs }));
      setIsDirty(true);
      announce(`Puzzle solved in ${formatTime(finalMs)}! Congratulations!`);
    },
    onUndoPastSolve: () => {
      setGameState((s) => ({ ...s, timerStatus: 'running' }));
    },
  });

  /** Wrap setGameState to also mark dirty. */
  const updateGameState = useCallback((updater: (s: GameState) => GameState) => {
    setGameState(updater);
    setIsDirty(true);
  }, []);

  // ── Auto-save (debounced + unmount + crash-safety) ───────────────
  const performSave = useCallback(() => {
    const flushedMs = timer.flushTimer();
    saveGame(gameStateRef.current, entry.entryId, {
      elapsedMs: flushedMs,
      timerStatus: gameStateRef.current.timerStatus,
    });
  }, [entry.entryId, timer.flushTimer]);

  useAutoSave({
    save: performSave,
    entryId: entry.entryId,
    isDirty,
    trigger: gameState,
    shouldSave: timer.hasUnflushedTime,
  });

  // ── Drag state (ephemeral UI concern) ───────────────────────────
  const isDragging = useRef(false);
  const dragTarget = useRef<PlayerCellState['kind'] | null>(null);
  const dragChanges = useRef<CellChange[]>([]);
  const lastDragCell = useRef<{ row: number; col: number } | null>(null);

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (solved) return;
      timer.ensureRunning();
      updateGameState((s) => cycleCell(s, row, col, puzzle));
    },
    [puzzle, solved, updateGameState, timer.ensureRunning],
  );

  const handleDragStart = useCallback(
    (row: number, col: number) => {
      if (solved) return;
      timer.ensureRunning();
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
      lastDragCell.current = { row, col };
    },
    [gameState, solved, timer.ensureRunning],
  );

  const handleCellDragEnter = useCallback(
    (row: number, col: number) => {
      if (!isDragging.current || solved || !dragTarget.current) return;

      // Interpolate from last drag cell to fill any skipped cells
      const cells = interpolateCells(lastDragCell.current, row, col);
      lastDragCell.current = { row, col };

      for (const [cr, cc] of cells) {
        const current = gameState.board[cr][cc];
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

        if (current.kind === next.kind) continue;

        const change: CellChange = { row: cr, col: cc, prev: current, next };
        dragChanges.current.push(change);

        setGameState((s) => {
          const newBoard = s.board.map((r, ri) =>
            ri === cr ? r.map((c, ci) => (ci === cc ? next : c)) : r,
          );
          return { ...s, board: newBoard, isValidationActive: false };
        });
      }
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
    lastDragCell.current = null;
  }, [puzzle, updateGameState]);

  const handleUndo = useCallback(
    () => updateGameState((s) => undo(s, puzzle)),
    [puzzle, updateGameState],
  );
  const handleRedo = useCallback(
    () => updateGameState((s) => redo(s, puzzle)),
    [puzzle, updateGameState],
  );
  const handleReset = useCallback(() => {
    timer.resetTimer();
    updateGameState((s) => resetBoard(s, puzzle));
  }, [puzzle, updateGameState, timer.resetTimer]);
  const handleCheck = useCallback(
    () => updateGameState((s) => checkErrors(s, puzzle)),
    [puzzle, updateGameState],
  );

  const handleSelectColor = useCallback((id: ColorId) => {
    setGameState((s) => ({ ...s, selectedColorId: id }));
  }, []);

  const handleSave = useCallback(() => {
    const flushedMs = timer.flushTimer();
    saveGame(gameState, entry.entryId, {
      elapsedMs: flushedMs,
      timerStatus: gameState.timerStatus,
    });
    setIsDirty(false);
  }, [gameState, entry.entryId, timer.flushTimer]);

  const handleBack = useCallback(() => {
    if (isDirtyRef.current || timer.hasUnflushedTime()) {
      const flushedMs = timer.flushTimer();
      saveGame(gameStateRef.current, entry.entryId, {
        elapsedMs: flushedMs,
        timerStatus: gameStateRef.current.timerStatus,
      });
    }
    navigate('/nonogram');
  }, [entry.entryId, navigate, timer.flushTimer, timer.hasUnflushedTime]);

  // ── Hint state ──────────────────────────────────────────────────
  const [hintCells, setHintCells] = useState<ReadonlySet<string>>(new Set());
  const [hintExplanation, setHintExplanation] = useState('');
  const [hintShake, setHintShake] = useState(false);
  const [checkPulse, setCheckPulse] = useState(false);

  // Clear hints whenever the board changes (render-time adjustment pattern).
  const [prevBoard, setPrevBoard] = useState(gameState.board);
  if (prevBoard !== gameState.board) {
    setPrevBoard(gameState.board);
    if (hintCells.size > 0) {
      setHintCells(new Set());
      setHintExplanation('');
    }
  }

  const handleHint = useCallback(() => {
    if (solved) return;
    const result: HintResult = getHintWithExplanations(puzzle, gameState.board);
    switch (result.kind) {
      case 'hint': {
        const keys = new Set(result.cells.map((c) => `${c.row},${c.col}`));
        setHintCells(keys);
        const lineLabel =
          result.line === 'row' ? `row ${result.index + 1}` : `column ${result.index + 1}`;
        const reasons = result.cells.map((c) => c.reason);
        const explanation = buildExplanation(reasons);
        setHintExplanation(
          explanation
            ? `${lineLabel}: ${explanation}`
            : `${lineLabel}: ${result.cells.length} cell${result.cells.length === 1 ? '' : 's'} can be determined`,
        );
        announce(
          `Hint: look at ${lineLabel} — ${explanation || `${result.cells.length} cell${result.cells.length === 1 ? '' : 's'} can be determined`}.`,
        );
        break;
      }
      case 'error':
        announce('Your board has an error. Use Check to find mistakes.');
        setHintShake(true);
        setCheckPulse(true);
        setHintExplanation('');
        break;
      case 'no-hint':
        announce('No hints available right now.');
        setHintShake(true);
        setHintExplanation('');
        break;
    }
  }, [puzzle, gameState.board, solved, announce]);

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
      if (isHelpOpenRef.current) return;
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
  }, [puzzle, announce, updateGameState]);

  return (
    <>
      <div className="cb-back-row">
        <button type="button" className="cb-btn" onClick={handleBack}>
          ← Back to puzzles
        </button>
      </div>

      <div className={`cb-solved${solved ? '' : ' cb-solved--hidden'}`}>
        🎉 Puzzle Solved! ({formatTime(timer.displayMs)})
      </div>

      <div
        className={`cb-timer${timer.timerStatus === 'idle' ? ' cb-timer--idle' : ''}`}
        aria-label="Solve timer"
      >
        ⏱ {formatTime(timer.displayMs)}
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
        selectedColorId={gameState.selectedColorId}
      />

      <div className="cb-controls">
        <button
          type="button"
          className="cb-btn"
          onClick={handleUndo}
          disabled={gameState.undoStack.length === 0}
        >
          ↩ Undo
        </button>
        <button
          type="button"
          className="cb-btn"
          onClick={handleRedo}
          disabled={gameState.redoStack.length === 0}
        >
          ↪ Redo
        </button>
        <button
          type="button"
          className={`cb-btn${checkPulse ? ' cb-btn--pulse' : ''}`}
          onClick={handleCheck}
          onAnimationEnd={() => setCheckPulse(false)}
        >
          ✓ Check
        </button>
        <button
          type="button"
          className={`cb-btn cb-btn--hint${hintShake ? ' cb-btn--shake' : ''}`}
          onClick={handleHint}
          onAnimationEnd={() => setHintShake(false)}
          disabled={solved}
        >
          💡 Hint
        </button>
        <button type="button" className="cb-btn" onClick={handleSave}>
          💾 Save
        </button>
        <button type="button" className="cb-btn cb-btn--danger" onClick={handleReset}>
          ⟲ Reset
        </button>
        <KeyboardShortcutHelp
          onOpenChange={(open) => {
            isHelpOpenRef.current = open;
          }}
        />
      </div>

      {hintExplanation && (
        <div className="cb-hint-explanation" role="status">
          💡 {hintExplanation}
        </div>
      )}
    </>
  );
}
