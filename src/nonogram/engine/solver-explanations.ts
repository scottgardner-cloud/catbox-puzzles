/**
 * Hint explanation module — classifies solver deductions into human-readable categories.
 *
 * Separate from solver.ts to minimize merge surface and keep explanation logic
 * isolated from the core solving algorithm.
 *
 * @module
 */

import type { LineClue, ColorId, ValidatedPuzzle, PlayerCellState } from '../types';
import type {
  SolverCell,
  LineDPData,
  DeductionReason,
  CellDetermination,
  HintResult,
} from './solver';
import { solveLineCore, solveStep, playerBoardToSolverBoard } from './solver';

/** Result of solving a line with deduction reasons. */
export interface LineWithReasons {
  /** The determined cell states. */
  readonly cells: readonly SolverCell[];
  /** Per-cell deduction reason (parallel to cells, only for newly determined cells). */
  readonly reasons: readonly (DeductionReason | undefined)[];
}

/**
 * Solve a single line and classify the reason for each determination.
 *
 * Uses `solveLineCore()` for the DP computation, then derives reasons from
 * `validStarts[r][p]` (per-run valid placements), not `canBeColor` (per-color).
 *
 * @returns Line results with per-cell reasons, or `null` on contradiction.
 */
export function solveLineWithReasons(
  clue: LineClue,
  cells: readonly SolverCell[],
  isBW: boolean,
): LineWithReasons | null {
  const data = solveLineCore(clue, cells, isBW);
  if (!data) return null;

  const reasons = classifyReasons(clue, cells, data, isBW);
  return { cells: data.result, reasons };
}

/**
 * Classify deduction reasons for each cell in a solved line.
 *
 * Only cells that were unknown and are now determined get a reason.
 */
function classifyReasons(
  clue: LineClue,
  cells: readonly SolverCell[],
  data: LineDPData,
  isBW: boolean,
): (DeductionReason | undefined)[] {
  const n = cells.length;
  const runs = clue;
  const numRuns = runs.length;
  const reasons: (DeductionReason | undefined)[] = new Array(n).fill(undefined);

  // No runs — all cells are unreachable (forced empty)
  if (numRuns === 0) {
    for (let i = 0; i < n; i++) {
      if (cells[i] === 'unknown') {
        reasons[i] = { kind: 'unreachable' };
      }
    }
    return reasons;
  }

  // Precompute per-run valid starting positions
  const validStarts: number[][] = [];
  for (let r = 0; r < numRuns; r++) {
    const starts: number[] = [];
    for (let p = 0; p <= n - runs[r].length; p++) {
      if (data.fdp[r][p] && data.bdp[r][p]) {
        starts.push(p);
      }
    }
    validStarts.push(starts);
  }

  // Precompute per-run reach (min/max cell covered)
  const runMinReach: number[] = [];
  const runMaxReach: number[] = [];
  for (let r = 0; r < numRuns; r++) {
    if (validStarts[r].length === 0) {
      runMinReach.push(n);
      runMaxReach.push(-1);
    } else {
      runMinReach.push(validStarts[r][0]);
      runMaxReach.push(validStarts[r][validStarts[r].length - 1] + runs[r].length - 1);
    }
  }

  // Global reach: earliest and latest cell any run can cover
  const globalMinReach = Math.min(...runMinReach);
  const globalMaxReach = Math.max(...runMaxReach);

  for (let i = 0; i < n; i++) {
    // Only classify newly determined cells
    if (cells[i] !== 'unknown') continue;
    const determined = data.result[i];
    if (determined === 'unknown') continue;

    if (determined === null) {
      // Empty cell — classify why
      reasons[i] = classifyEmpty(
        i,
        numRuns,
        runs,
        validStarts,
        runMaxReach,
        runMinReach,
        globalMinReach,
        globalMaxReach,
        isBW,
      );
    } else {
      // Filled cell — classify why
      reasons[i] = classifyFilled(i, numRuns, runs, validStarts, determined);
    }
  }

  return reasons;
}

/** Classify why an empty cell was determined. */
function classifyEmpty(
  i: number,
  numRuns: number,
  runs: LineClue,
  validStarts: number[][],
  runMaxReach: number[],
  runMinReach: number[],
  globalMinReach: number,
  globalMaxReach: number,
  isBW: boolean,
): DeductionReason {
  // Before first or after last valid run placement
  if (i < globalMinReach || i > globalMaxReach) {
    return { kind: 'unreachable' };
  }

  // Check if cell is between consecutive runs (forced separator)
  for (let r = 0; r < numRuns - 1; r++) {
    const needGap = isBW || runs[r].colorId === runs[r + 1].colorId;
    if (!needGap) continue;

    // Cell is after run r's max reach and before run r+1's min reach
    if (i > runMaxReach[r] && i < runMinReach[r + 1]) {
      return { kind: 'forced-separator' };
    }

    // Cell is in the mandatory gap: between the latest end of run r
    // and earliest start of run r+1, where all valid placements agree
    // this cell must be empty as a separator.
    // Check: is cell i always between run r and run r+1?
    const rAlwaysEndsBefore = validStarts[r].every((p) => p + runs[r].length <= i);
    const rPlusOneAlwaysStartsAfter = validStarts[r + 1].every((p) => p > i);
    if (rAlwaysEndsBefore && rPlusOneAlwaysStartsAfter) {
      return { kind: 'forced-separator' };
    }
  }

  // Empty by elimination — all covering runs are placed elsewhere
  return { kind: 'elimination' };
}

/** Classify why a filled cell was determined. */
function classifyFilled(
  i: number,
  numRuns: number,
  runs: LineClue,
  validStarts: number[][],
  color: ColorId,
): DeductionReason {
  // Find which runs can cover cell i with the determined color
  const coveringRuns: number[] = [];
  for (let r = 0; r < numRuns; r++) {
    if (runs[r].colorId !== color) continue;
    // Does any valid placement of run r cover cell i?
    const covers = validStarts[r].some((p) => p <= i && i < p + runs[r].length);
    if (covers) {
      coveringRuns.push(r);
    }
  }

  if (coveringRuns.length === 1) {
    const r = coveringRuns[0];
    const starts = validStarts[r];

    // Single-placement: run has exactly one valid position
    if (starts.length === 1) {
      return {
        kind: 'single-placement',
        runIndex: r,
        runLength: runs[r].length,
        runColor: runs[r].colorId,
      };
    }

    // Overlap: all valid positions for this run cover cell i
    const allCover = starts.every((p) => p <= i && i < p + runs[r].length);
    if (allCover) {
      return {
        kind: 'overlap',
        runIndex: r,
        runLength: runs[r].length,
        runColor: runs[r].colorId,
      };
    }
  }

  // Multiple runs or partial coverage — general intersection
  return { kind: 'intersection' };
}

// ---------------------------------------------------------------------------
// Two-pass hint with explanations
// ---------------------------------------------------------------------------

/**
 * Get a hint with deduction explanations.
 *
 * Two-pass approach:
 * 1. `solveStep()` finds the first line with deducible progress (cheap).
 * 2. `solveLineWithReasons()` runs only on that target line to classify reasons.
 */
export function getHintWithExplanations(
  puzzle: ValidatedPuzzle,
  board: readonly (readonly PlayerCellState[])[],
): HintResult {
  const solverBoard = playerBoardToSolverBoard(board);
  const step = solveStep(puzzle, solverBoard);

  if (step.progress) {
    const isBW = puzzle.kind === 'bw';
    let lineCells: readonly SolverCell[];
    let lineClue: LineClue;

    if (step.line === 'row') {
      lineCells = solverBoard[step.index];
      lineClue = puzzle.rowClues[step.index];
    } else {
      // Extract column
      lineCells = solverBoard.map((row) => row[step.index]);
      lineClue = puzzle.colClues[step.index];
    }

    const detailed = solveLineWithReasons(lineClue, lineCells, isBW);

    if (detailed) {
      const cellsWithReasons: CellDetermination[] = step.cells.map((cell) => {
        const linePos = step.line === 'row' ? cell.col : cell.row;
        return { ...cell, reason: detailed.reasons[linePos] };
      });

      return {
        kind: 'hint',
        line: step.line,
        index: step.index,
        cells: cellsWithReasons,
      };
    }

    // Fallback without reasons
    return {
      kind: 'hint',
      line: step.line,
      index: step.index,
      cells: step.cells,
    };
  }

  if (step.reason === 'contradiction') {
    return { kind: 'error' };
  }

  return { kind: 'no-hint' };
}
