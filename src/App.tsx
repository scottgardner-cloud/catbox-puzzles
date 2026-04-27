import { useCallback, useRef, useState } from 'react';
import { Grid } from './components';
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
import type { ValidatedPuzzle, CellChange, PlayerCellState } from './types';
import './App.css';

const puzzles = getSamplePuzzles();

function App() {
  const [puzzleIndex, setPuzzleIndex] = useState(0);
  const puzzle: ValidatedPuzzle = puzzles[puzzleIndex];
  const [gameState, setGameState] = useState(() => createInitialGameState(puzzle));
  const solved = isSolved(gameState, puzzle);

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

  const handlePuzzleChange = useCallback((index: number) => {
    setPuzzleIndex(index);
    setGameState(createInitialGameState(puzzles[index]));
  }, []);

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

      {/* Status */}
      {solved && <div className="pap-solved">🎉 Puzzle Solved!</div>}

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
        <button type="button" className="pap-btn pap-btn--danger" onClick={handleReset}>
          ⟲ Reset
        </button>
      </div>
    </div>
  );
}

export default App;
