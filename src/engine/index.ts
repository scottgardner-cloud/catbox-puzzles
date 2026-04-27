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
} from './game-logic';
