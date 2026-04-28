export { validatePuzzleDefinition } from './validation';
export type { ValidationError } from './validation';

export {
  createInitialGameState,
  cycleCell,
  setCells,
  undo,
  redo,
  resetBoard,
  checkErrors,
  isSolved,
  validateLine,
  computeLineValidation,
} from './game-logic';

export {
  solveLine,
  solvePuzzle,
  solvePuzzleLogic,
  solveStep,
  createSolverBoard,
} from './solver';
export type {
  SolverCell,
  SolverBoard,
  SolverResult,
  SolverOptions,
  SolveStepResult,
  CellDetermination,
} from './solver';
