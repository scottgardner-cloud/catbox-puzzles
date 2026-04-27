import { useCallback, useEffect, useRef, useState } from 'react';
import { Grid, PaletteBar, PuzzleBrowser } from './components';
import {
  createInitialGameState,
  cycleCell,
  setCells,
  undo,
  redo,
  resetBoard,
  checkErrors,
  isSolved,
} from './engine';
import { getAllEntries, deleteCustomPuzzle } from './puzzles/registry';
import type { PuzzleEntry } from './puzzles/types';
import { saveGame, loadGame, restoreGameState } from './state/persistence';
import type { ValidatedPuzzle, CellChange, PlayerCellState, ColorId } from './types';
import './App.css';

/** Try to load a saved state for a puzzle entry, or create a fresh one. */
function initGameState(entry: PuzzleEntry): GameState {
  const save = loadGame(entry.entryId);
  if (save) {
    return restoreGameState(save, entry.puzzle.rows, entry.puzzle.cols);
  }
  return createInitialGameState(entry.puzzle);
}

type GameState = ReturnType<typeof createInitialGameState>;

function App() {
  const [view, setView] = useState<'browser' | 'game'>('browser');
  const [entries, setEntries] = useState(() => getAllEntries());
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);

  const currentEntry: PuzzleEntry | undefined = selectedEntryId
    ? entries.find((e) => e.entryId === selectedEntryId)
    : undefined;
  const puzzle: ValidatedPuzzle | undefined = currentEntry?.puzzle;

  const [gameState, setGameState] = useState<GameState | null>(() =>
    currentEntry ? initGameState(currentEntry) : null,
  );
  const solved = gameState && puzzle ? isSolved(gameState, puzzle) : false;

  // Screen reader live region announcement
  const liveRegionRef = useRef<HTMLDivElement>(null);
  const announceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Push a message to the screen reader live region. */
  const announce = useCallback((message: string) => {
    if (!liveRegionRef.current) return;
    // Clear then set to ensure repeated identical messages are announced
    liveRegionRef.current.textContent = '';
    if (announceTimeoutRef.current) clearTimeout(announceTimeoutRef.current);
    announceTimeoutRef.current = setTimeout(() => {
      if (liveRegionRef.current) liveRegionRef.current.textContent = message;
    }, 50);
  }, []);

  // Drag state (not part of game state — ephemeral UI concern)
  const isDragging = useRef(false);
  const dragTarget = useRef<PlayerCellState['kind'] | null>(null);
  const dragChanges = useRef<CellChange[]>([]);

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (solved || !puzzle) return;
      setGameState((s) => (s ? cycleCell(s, row, col, puzzle) : s));
    },
    [puzzle, solved, setGameState],
  );

  const handleDragStart = useCallback(
    (row: number, col: number) => {
      if (solved || !gameState) return;
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
      if (!isDragging.current || solved || !dragTarget.current || !gameState) return;

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

      // Skip if already in the target state
      if (current.kind === next.kind) return;

      const change: CellChange = { row, col, prev: current, next };
      dragChanges.current.push(change);
      setGameState((s) => (s && puzzle ? setCells(s, [change], puzzle) : s));
    },
    [gameState, puzzle, solved, setGameState],
  );

  const handleDragEnd = useCallback(() => {
    isDragging.current = false;
    dragTarget.current = null;
    dragChanges.current = [];
  }, []);

  const handleUndo = useCallback(
    () => setGameState((s) => (s && puzzle ? undo(s, puzzle) : s)),
    [puzzle, setGameState],
  );
  const handleRedo = useCallback(
    () => setGameState((s) => (s && puzzle ? redo(s, puzzle) : s)),
    [puzzle, setGameState],
  );
  const handleReset = useCallback(
    () => setGameState((s) => (s && puzzle ? resetBoard(s, puzzle) : s)),
    [puzzle, setGameState],
  );
  const handleCheck = useCallback(
    () => setGameState((s) => (s && puzzle ? checkErrors(s, puzzle) : s)),
    [puzzle, setGameState],
  );

  const handleSelectColor = useCallback(
    (id: ColorId) => {
      setGameState((s) => (s ? { ...s, selectedColorId: id } : s));
    },
    [setGameState],
  );

  const handleSave = useCallback(() => {
    if (gameState && selectedEntryId) {
      saveGame(gameState, selectedEntryId);
    }
  }, [gameState, selectedEntryId]);

  const handlePuzzleChange = useCallback(
    (entryId: string) => {
      const entry = entries.find((e) => e.entryId === entryId);
      if (!entry) return;
      setSelectedEntryId(entryId);
      setGameState(initGameState(entry));
      setView('game');
    },
    [entries, setGameState],
  );

  const handleDeletePuzzle = useCallback(
    (entryId: string) => {
      deleteCustomPuzzle(entryId);
      const refreshed = getAllEntries();
      setEntries(refreshed);
      if (selectedEntryId === entryId) {
        setSelectedEntryId(null);
        setGameState(null);
        setView('browser');
      }
    },
    [selectedEntryId, setGameState],
  );

  const handleBackToBrowser = useCallback(() => {
    if (gameState && selectedEntryId) {
      saveGame(gameState, selectedEntryId);
    }
    setView('browser');
  }, [gameState, selectedEntryId]);

  // Announce solved state
  const prevSolvedRef = useRef(false);
  useEffect(() => {
    if (solved && !prevSolvedRef.current) {
      announce('Puzzle solved! Congratulations!');
    }
    prevSolvedRef.current = solved;
  }, [solved, announce]);

  // Announce validation results
  const prevValidationRef = useRef(false);
  useEffect(() => {
    if (!gameState) return;
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
    prevValidationRef.current = gameState?.isValidationActive ?? false;
  }, [gameState, announce]);

  // Global keyboard shortcuts (only active in game view)
  useEffect(() => {
    if (view !== 'game' || !puzzle) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Z — undo
      if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        e.preventDefault();
        setGameState((s) => (s ? undo(s, puzzle) : s));
        return;
      }
      // Ctrl+Y or Ctrl+Shift+Z — redo
      if (
        (e.key === 'y' && (e.ctrlKey || e.metaKey)) ||
        (e.key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey) ||
        (e.key === 'Z' && (e.ctrlKey || e.metaKey) && e.shiftKey)
      ) {
        e.preventDefault();
        setGameState((s) => (s ? redo(s, puzzle) : s));
        return;
      }
      // Number keys 1-9 — select palette color
      if (e.key >= '1' && e.key <= '9' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const index = parseInt(e.key, 10) - 1;
        if (index < puzzle.palette.length) {
          const colorId = puzzle.palette[index].id;
          setGameState((s) => (s ? { ...s, selectedColorId: colorId } : s));
          announce(`Selected color: ${puzzle.palette[index].name}`);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [view, puzzle, announce]);

  return (
    <div className="pap-app">
      <h1>Pix-a-Pix</h1>

      {view === 'browser' ? (
        <PuzzleBrowser
          entries={entries}
          onSelectPuzzle={handlePuzzleChange}
          onDeletePuzzle={handleDeletePuzzle}
        />
      ) : puzzle && gameState ? (
        <>
          {/* Back button */}
          <div className="pap-back-row">
            <button type="button" className="pap-btn" onClick={handleBackToBrowser}>
              ← Back to puzzles
            </button>
          </div>

          {/* Status (always rendered, invisible when not solved to avoid layout shift) */}
          <div className={`pap-solved${solved ? '' : ' pap-solved--hidden'}`}>
            🎉 Puzzle Solved!
          </div>

          {/* Color palette (hidden for B&W puzzles) */}
          <PaletteBar
            palette={puzzle.palette}
            selectedColorId={gameState.selectedColorId}
            onSelectColor={handleSelectColor}
          />

          {/* Grid */}
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
          />

          {/* Controls */}
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
            <button type="button" className="pap-btn" onClick={handleSave}>
              💾 Save
            </button>
            <button type="button" className="pap-btn pap-btn--danger" onClick={handleReset}>
              ⟲ Reset
            </button>
          </div>
        </>
      ) : null}

      {/* Visually hidden live region for screen reader announcements */}
      <div
        ref={liveRegionRef}
        className="pap-sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      />
    </div>
  );
}

export default App;
