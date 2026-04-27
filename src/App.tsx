import { useCallback, useEffect, useRef, useState } from 'react';
import { Grid, PaletteBar } from './components';
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
import { getSamplePuzzles } from './puzzles/samples';
import { saveGame, loadGame, restoreGameState } from './state/persistence';
import type { ValidatedPuzzle, CellChange, PlayerCellState, ColorId } from './types';
import './App.css';

const puzzles = getSamplePuzzles();

/** Try to load a saved state for a puzzle, or create a fresh one. */
function initGameState(puzzle: ValidatedPuzzle): GameState {
  const save = loadGame(puzzle.id);
  if (save) {
    return restoreGameState(save, puzzle.rows, puzzle.cols);
  }
  return createInitialGameState(puzzle);
}

type GameState = ReturnType<typeof createInitialGameState>;

function App() {
  const [puzzleIndex, setPuzzleIndex] = useState(0);
  const puzzle: ValidatedPuzzle = puzzles[puzzleIndex];
  const [gameState, setGameState] = useState(() => initGameState(puzzle));
  const solved = isSolved(gameState, puzzle);

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
      if (solved) return;
      setGameState((s) => cycleCell(s, row, col, puzzle));
    },
    [puzzle, solved],
  );

  const handleDragStart = useCallback(
    (row: number, col: number) => {
      if (solved) return;
      isDragging.current = true;
      // Determine what the drag will propagate based on the first cell's transition
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
    [gameState.board, solved],
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

      // Skip if already in the target state
      if (current.kind === next.kind) return;

      const change: CellChange = { row, col, prev: current, next };
      dragChanges.current.push(change);
      setGameState((s) => setCells(s, [change]));
    },
    [gameState.board, gameState.selectedColorId, solved],
  );

  const handleDragEnd = useCallback(() => {
    isDragging.current = false;
    dragTarget.current = null;
    dragChanges.current = [];
  }, []);

  const handleUndo = useCallback(() => setGameState(undo), []);
  const handleRedo = useCallback(() => setGameState(redo), []);
  const handleReset = useCallback(() => setGameState(resetBoard), []);
  const handleCheck = useCallback(() => setGameState((s) => checkErrors(s, puzzle)), [puzzle]);

  const handleSelectColor = useCallback((id: ColorId) => {
    setGameState((s) => ({ ...s, selectedColorId: id }));
  }, []);

  const handleSave = useCallback(() => {
    saveGame(gameState);
  }, [gameState]);

  const handlePuzzleChange = useCallback((index: number) => {
    setPuzzleIndex(index);
    setGameState(initGameState(puzzles[index]));
  }, []);

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
  }, [gameState.isValidationActive, gameState.cellValidation, announce]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Z — undo
      if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        e.preventDefault();
        setGameState(undo);
        return;
      }
      // Ctrl+Y or Ctrl+Shift+Z — redo
      if (
        (e.key === 'y' && (e.ctrlKey || e.metaKey)) ||
        (e.key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey) ||
        (e.key === 'Z' && (e.ctrlKey || e.metaKey) && e.shiftKey)
      ) {
        e.preventDefault();
        setGameState(redo);
        return;
      }
      // Number keys 1-9 — select palette color
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
    <div className="pap-app">
      <h1>Pix-a-Pix</h1>

      {/* Puzzle selector */}
      <div className="pap-puzzle-selector">
        {puzzles.map((p, i) => (
          <button
            key={p.id}
            type="button"
            className={i === puzzleIndex ? 'pap-btn pap-btn--active' : 'pap-btn'}
            onClick={() => handlePuzzleChange(i)}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Status (always rendered, invisible when not solved to avoid layout shift) */}
      <div className={`pap-solved${solved ? '' : ' pap-solved--hidden'}`}>🎉 Puzzle Solved!</div>

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
