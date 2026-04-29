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
  getHint,
} from '../engine';
import type { HintResult } from '../engine';
import { getEntryById } from '../puzzles/registry';
import type { PuzzleEntry } from '../puzzles/types';
import { saveGame, loadGame, restoreGameState } from '../state/persistence';
import type { ValidatedPuzzle, CellChange, PlayerCellState, ColorId, TimerStatus } from '../types';
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

  // ── Timer state (refs for live tracking, state for display) ──────
  const runningSinceRef = useRef<number | null>(null);
  const baseElapsedRef = useRef(gameState.elapsedMs);
  const timerStatusRef = useRef<TimerStatus>(gameState.timerStatus);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [displayMs, setDisplayMs] = useState(gameState.elapsedMs);

  /** Flush timer: compute accurate elapsed time from wall-clock delta. */
  const flushTimer = useCallback((): number => {
    if (runningSinceRef.current === null) return baseElapsedRef.current;
    const now = Date.now();
    const delta = now - runningSinceRef.current;
    baseElapsedRef.current += delta;
    runningSinceRef.current = now;
    return baseElapsedRef.current;
  }, []);

  /** Start the display-refresh interval (does not touch gameState or dirty flag). */
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

  /** Start timer on first cell interaction. */
  const ensureTimerRunning = useCallback(() => {
    if (timerStatusRef.current !== 'idle') return;
    timerStatusRef.current = 'running';
    setGameState((s) => ({ ...s, timerStatus: 'running' }));
    startTimerInterval();
    setIsDirty(true);
  }, [startTimerInterval]);

  // Resume timer on mount if it was running and puzzle not solved
  useEffect(() => {
    if (timerStatusRef.current === 'running' && !solved) {
      startTimerInterval();
    }
    return () => stopTimerInterval();
    // Mount/unmount only — refs and solved are correct at mount time
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Wrap setGameState to also mark dirty. */
  const updateGameState = useCallback((updater: (s: GameState) => GameState) => {
    setGameState(updater);
    setIsDirty(true);
  }, []);

  // ── Auto-save on change (debounced, only if dirty) ──────────────
  useEffect(() => {
    if (!isDirty) return;
    const timer = setTimeout(() => {
      const flushedMs = flushTimer();
      saveGame(gameStateRef.current, entry.entryId, {
        elapsedMs: flushedMs,
        timerStatus: timerStatusRef.current,
      });
    }, SAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [gameState, isDirty, entry.entryId, flushTimer]);

  // ── Save on unmount (backup — fires if dirty or timer has unflushed time) ──
  useEffect(() => {
    return () => {
      if (isDirtyRef.current || runningSinceRef.current !== null) {
        const flushedMs = flushTimer();
        saveGame(gameStateRef.current, entry.entryId, {
          elapsedMs: flushedMs,
          timerStatus: timerStatusRef.current,
        });
      }
    };
  }, [entry.entryId, flushTimer]);

  // ── Drag state (ephemeral UI concern) ───────────────────────────
  const isDragging = useRef(false);
  const dragTarget = useRef<PlayerCellState['kind'] | null>(null);
  const dragChanges = useRef<CellChange[]>([]);

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (solved) return;
      ensureTimerRunning();
      updateGameState((s) => cycleCell(s, row, col, puzzle));
    },
    [puzzle, solved, updateGameState, ensureTimerRunning],
  );

  const handleDragStart = useCallback(
    (row: number, col: number) => {
      if (solved) return;
      ensureTimerRunning();
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
    [gameState, solved, ensureTimerRunning],
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
  const handleReset = useCallback(() => {
    stopTimerInterval();
    baseElapsedRef.current = 0;
    timerStatusRef.current = 'idle';
    setDisplayMs(0);
    updateGameState((s) => resetBoard(s, puzzle));
  }, [puzzle, updateGameState, stopTimerInterval]);
  const handleCheck = useCallback(
    () => updateGameState((s) => checkErrors(s, puzzle)),
    [puzzle, updateGameState],
  );

  const handleSelectColor = useCallback((id: ColorId) => {
    setGameState((s) => ({ ...s, selectedColorId: id }));
  }, []);

  const handleSave = useCallback(() => {
    const flushedMs = flushTimer();
    saveGame(gameState, entry.entryId, {
      elapsedMs: flushedMs,
      timerStatus: timerStatusRef.current,
    });
    setIsDirty(false);
  }, [gameState, entry.entryId, flushTimer]);

  const handleBack = useCallback(() => {
    if (isDirtyRef.current || runningSinceRef.current !== null) {
      const flushedMs = flushTimer();
      saveGame(gameStateRef.current, entry.entryId, {
        elapsedMs: flushedMs,
        timerStatus: timerStatusRef.current,
      });
    }
    navigate('/');
  }, [entry.entryId, navigate, flushTimer]);

  // ── Hint state ──────────────────────────────────────────────────
  const [hintCells, setHintCells] = useState<ReadonlySet<string>>(new Set());
  const [hintShake, setHintShake] = useState(false);
  const [checkPulse, setCheckPulse] = useState(false);

  // Clear hints whenever the board changes (render-time adjustment pattern).
  const [prevBoard, setPrevBoard] = useState(gameState.board);
  if (prevBoard !== gameState.board) {
    setPrevBoard(gameState.board);
    if (hintCells.size > 0) {
      setHintCells(new Set());
    }
  }

  const handleHint = useCallback(() => {
    if (solved) return;
    const result: HintResult = getHint(puzzle, gameState.board);
    switch (result.kind) {
      case 'hint': {
        const keys = new Set(result.cells.map((c) => `${c.row},${c.col}`));
        setHintCells(keys);
        const lineLabel =
          result.line === 'row' ? `row ${result.index + 1}` : `column ${result.index + 1}`;
        announce(
          `Hint: look at ${lineLabel} — ${result.cells.length} cell${result.cells.length === 1 ? '' : 's'} can be determined.`,
        );
        break;
      }
      case 'error':
        announce('Your board has an error. Use Check to find mistakes.');
        setHintShake(true);
        setCheckPulse(true);
        break;
      case 'no-hint':
        announce('No hints available right now.');
        setHintShake(true);
        break;
    }
  }, [puzzle, gameState.board, solved, announce]);

  // ── Announce solved state + timer transitions ────────────────────
  const prevSolvedRef = useRef(false);
  useEffect(() => {
    if (solved && !prevSolvedRef.current) {
      // Just solved — flush and stop timer
      const finalMs = flushTimer();
      stopTimerInterval();
      timerStatusRef.current = 'stopped';
      setGameState((s) => ({ ...s, timerStatus: 'stopped', elapsedMs: finalMs }));
      setDisplayMs(finalMs);
      setIsDirty(true);
      announce(`Puzzle solved in ${formatTime(finalMs)}! Congratulations!`);
    } else if (!solved && prevSolvedRef.current && timerStatusRef.current === 'stopped') {
      // Undo past solve — resume timer
      timerStatusRef.current = 'running';
      setGameState((s) => ({ ...s, timerStatus: 'running' }));
      startTimerInterval();
    }
    prevSolvedRef.current = solved;
  }, [solved, announce, flushTimer, stopTimerInterval, startTimerInterval]);

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
      <div className="pap-back-row">
        <button type="button" className="pap-btn" onClick={handleBack}>
          ← Back to puzzles
        </button>
      </div>

      <div className={`pap-solved${solved ? '' : ' pap-solved--hidden'}`}>
        🎉 Puzzle Solved! ({formatTime(displayMs)})
      </div>

      <div
        className={`pap-timer${gameState.timerStatus === 'idle' ? ' pap-timer--idle' : ''}`}
        aria-label="Solve timer"
      >
        ⏱ {formatTime(displayMs)}
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
        <button
          type="button"
          className={`pap-btn${checkPulse ? ' pap-btn--pulse' : ''}`}
          onClick={handleCheck}
          onAnimationEnd={() => setCheckPulse(false)}
        >
          ✓ Check
        </button>
        <button
          type="button"
          className={`pap-btn pap-btn--hint${hintShake ? ' pap-btn--shake' : ''}`}
          onClick={handleHint}
          onAnimationEnd={() => setHintShake(false)}
          disabled={solved}
        >
          💡 Hint
        </button>
        <button type="button" className="pap-btn" onClick={handleSave}>
          💾 Save
        </button>
        <button type="button" className="pap-btn pap-btn--danger" onClick={handleReset}>
          ⟲ Reset
        </button>
        <KeyboardShortcutHelp
          onOpenChange={(open) => {
            isHelpOpenRef.current = open;
          }}
        />
      </div>
    </>
  );
}
