/**
 * Nonogram constraint-based solver.
 *
 * Proves puzzles are solvable by pure logic (no guessing) using
 * line-by-line constraint propagation. Each line is solved via a
 * DP-based feasibility algorithm that considers all valid placements.
 *
 * Supports both B&W and color puzzles.
 *
 * @module
 */

import type { ValidatedPuzzle, LineClue, ColorId, PlayerCellState } from '../types';
import { solveLineWithReasons } from './solver-explanations';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Solver cell state.
 * - `'unknown'` — not yet determined
 * - `null` — definitively empty
 * - `ColorId` — definitively filled with that color
 */
export type SolverCell = ColorId | null | 'unknown';

/** A 2D solver board indexed as `board[row][col]`. */
export type SolverBoard = SolverCell[][];

/** Result of solving a complete puzzle. */
export type SolverResult =
  | { readonly solved: true; readonly board: SolverBoard }
  | {
      readonly solved: false;
      readonly board: SolverBoard;
      readonly reason: 'stuck' | 'contradiction' | 'budget-exceeded';
    };

/** Options for the full solver (with search/backtracking). */
export interface SolverOptions {
  /** Maximum number of search nodes to explore before giving up. Default: 10_000. */
  readonly maxNodes?: number;
}

/** A single cell determination made by the solver. */
export interface CellDetermination {
  readonly row: number;
  readonly col: number;
  readonly value: ColorId | null;
  /** Why this cell was determined. Present when explanation is requested. */
  readonly reason?: DeductionReason;
}

/** Why a cell was determined during line solving. */
export type DeductionReason =
  | { readonly kind: 'unreachable' }
  | { readonly kind: 'forced-separator' }
  | { readonly kind: 'elimination' }
  | {
      readonly kind: 'overlap';
      readonly runIndex: number;
      readonly runLength: number;
      readonly runColor: ColorId;
    }
  | {
      readonly kind: 'single-placement';
      readonly runIndex: number;
      readonly runLength: number;
      readonly runColor: ColorId;
    }
  | { readonly kind: 'intersection' };

/** Result of a single solve step (for hint system). */
export type SolveStepResult =
  | {
      readonly progress: true;
      readonly line: 'row' | 'col';
      readonly index: number;
      readonly cells: readonly CellDetermination[];
    }
  | { readonly progress: false; readonly reason: 'no-progress' | 'contradiction' };

// ---------------------------------------------------------------------------
// Line solver — DP-based feasibility
// ---------------------------------------------------------------------------

/**
 * Intermediate DP data from line solving.
 * Exposed for the explanation module — not part of the public API.
 */
export interface LineDPData {
  /** Forward DP: fdp[r][p] = can runs[0..r] be placed with run r at position p. */
  readonly fdp: readonly (readonly boolean[])[];
  /** Backward DP: bdp[r][p] = can runs[r..end] be placed with run r at position p. */
  readonly bdp: readonly (readonly boolean[])[];
  /** Per-cell: can this cell be empty in some valid placement? */
  readonly canBeEmpty: readonly boolean[];
  /** Per-cell: which colors can appear here in some valid placement? */
  readonly canBeColor: readonly ReadonlyMap<string, true>[];
  /** The determined cell states. */
  readonly result: readonly SolverCell[];
}

/**
 * Core DP computation for a single line. Computes all valid run placements
 * and derives per-cell possible values.
 *
 * @returns Structured DP data including result cells, or `null` on contradiction.
 */
export function solveLineCore(
  clue: LineClue,
  cells: readonly SolverCell[],
  isBW: boolean,
): LineDPData | null {
  const n = cells.length;
  const runs = clue;
  const numRuns = runs.length;

  // Empty clue: every cell must be empty
  if (numRuns === 0) {
    const result: SolverCell[] = [];
    for (let i = 0; i < n; i++) {
      if (cells[i] !== 'unknown' && cells[i] !== null) {
        return null; // Contradiction: cell is filled but clue says all empty
      }
      result.push(null);
    }
    return {
      fdp: [],
      bdp: [],
      canBeEmpty: result.map(() => true),
      canBeColor: result.map(() => new Map()),
      result,
    };
  }

  // For each cell, track which values are possible across all valid placements.
  // We use two arrays:
  //   canBeEmpty[i] — can cell i be empty in some valid placement?
  //   canBeColor[i] — Map of colorId -> true for colors cell i can be in some valid placement
  const canBeEmpty: boolean[] = new Array(n).fill(false);
  const canBeColor: Map<string, true>[] = [];
  for (let i = 0; i < n; i++) {
    canBeColor.push(new Map());
  }

  // DP approach: try to place runs using recursive enumeration with memoization.
  // State: (runIndex, cellPos) — place run[runIndex] starting at or after cellPos.
  //
  // We track which cells get which values in valid completions.
  // For efficiency on large puzzles, we use a two-pass approach:
  // 1. Forward pass: compute leftmost valid placement for each run
  // 2. Backward pass: compute rightmost valid placement for each run
  // 3. Feasibility DP: for each cell, determine which values are possible

  // --- Feasibility DP ---
  // canPlaceRun(runIdx, pos): can we place run[runIdx] at position pos,
  // given that cells pos..pos+len-1 must be compatible with run's color,
  // and the gap before (if needed) must be compatible with empty?

  // Forward DP: f[r][p] = can we place runs[r..numRuns-1] starting at or after position p?
  // We also need to track the actual positions to determine cell values.

  // More efficient approach: compute for each (run, position) whether placing
  // that run there is compatible, then use DP to find all valid placement combos.
  // From that, derive per-cell possible values.

  // Step 1: Precompute compatibility
  // canFill(start, len, colorId): can cells[start..start+len-1] all be colorId?
  function canFill(start: number, len: number, color: ColorId): boolean {
    for (let i = start; i < start + len; i++) {
      if (i >= n) return false;
      const c = cells[i];
      if (c !== 'unknown' && c !== color) return false;
    }
    return true;
  }

  // canEmpty(pos): can cell at pos be empty?
  function canEmpty(pos: number): boolean {
    if (pos < 0 || pos >= n) return true;
    const c = cells[pos];
    return c === 'unknown' || c === null;
  }

  // canEmptyRange(start, end): can cells[start..end-1] all be empty?
  function canEmptyRange(start: number, end: number): boolean {
    for (let i = start; i < end; i++) {
      if (!canEmpty(i)) return false;
    }
    return true;
  }

  // Step 2: DP to find all valid placements
  // We enumerate: for each run r, what positions can it start at?
  // forward[r][p] = true if runs[0..r] can be validly placed with run r starting at p
  // backward[r][p] = true if runs[r..numRuns-1] can be validly placed with run r starting at p

  // Actually, let's use a cleaner DP:
  // fwd[r] = set of valid (startPos) for run r, given runs[0..r-1] are placed optimally before
  // But we need to know what space runs[0..r-1] consume.

  // Better: DP on (runIndex, startPosition) -> boolean
  // dp[runIndex][startPos] = can we place all runs from runIndex..end starting with
  //                          run[runIndex] at startPos, and fill remaining after last run with empties?

  // Forward DP: fdp[r][p] = can runs[0..r] be placed with run r starting at p?
  // Meaning: runs 0..r-1 are placed before position p with proper gaps, and run r at p is compatible.

  // We'll compute two DPs:
  // fdp[r][p] = true if we can place runs[0..r] such that run r starts at position p
  // bdp[r][p] = true if we can place runs[r..numRuns-1] such that run r starts at position p

  const fdp: boolean[][] = [];
  const bdp: boolean[][] = [];
  for (let r = 0; r < numRuns; r++) {
    fdp.push(new Array(n).fill(false));
    bdp.push(new Array(n).fill(false));
  }

  // Forward pass: fdp[0][p] — run 0 can start at p if:
  //   - cells[0..p-1] can all be empty
  //   - cells[p..p+len-1] can all be runs[0].colorId
  for (let p = 0; p <= n - runs[0].length; p++) {
    if (canEmptyRange(0, p) && canFill(p, runs[0].length, runs[0].colorId)) {
      fdp[0][p] = true;
    }
  }

  // fdp[r][p] for r > 0: run r starts at p if:
  //   - cells[p..p+len-1] can be runs[r].colorId
  //   - there exists some q < p where fdp[r-1][q] is true
  //   - the gap between end of run r-1 and start of run r is valid:
  //     * if isBW or same color: need at least 1 empty cell between
  //     * if different color in color mode: runs can be adjacent
  //   - cells between end of run r-1 (q + runs[r-1].length) and p must be empty
  for (let r = 1; r < numRuns; r++) {
    const needGap = isBW || runs[r].colorId === runs[r - 1].colorId;
    const minGap = needGap ? 1 : 0;

    for (let p = 0; p <= n - runs[r].length; p++) {
      if (!canFill(p, runs[r].length, runs[r].colorId)) continue;

      // Check if any previous placement of run r-1 allows run r at p
      const prevRunLen = runs[r - 1].length;
      // Run r-1 must end before p - minGap, so q + prevRunLen - 1 <= p - minGap - 1
      // i.e., q <= p - minGap - prevRunLen
      const maxQ = p - minGap - prevRunLen;

      for (let q = 0; q <= maxQ && q < n; q++) {
        if (!fdp[r - 1][q]) continue;
        // Check cells between end of run r-1 and start of run r are empty
        const gapStart = q + prevRunLen;
        if (canEmptyRange(gapStart, p)) {
          fdp[r][p] = true;
          break;
        }
      }
    }
  }

  // Backward pass: bdp[numRuns-1][p] — last run starts at p if:
  //   - cells[p..p+len-1] can be runs[numRuns-1].colorId
  //   - cells[p+len..n-1] can all be empty
  const lastRun = numRuns - 1;
  for (let p = 0; p <= n - runs[lastRun].length; p++) {
    if (
      canFill(p, runs[lastRun].length, runs[lastRun].colorId) &&
      canEmptyRange(p + runs[lastRun].length, n)
    ) {
      bdp[lastRun][p] = true;
    }
  }

  // bdp[r][p] for r < numRuns-1: run r starts at p if:
  //   - cells[p..p+len-1] can be runs[r].colorId
  //   - there exists some q > p where bdp[r+1][q] is true
  //   - gap between end of run r and start of run r+1 is valid
  //   - cells between end of run r and q must be empty
  for (let r = numRuns - 2; r >= 0; r--) {
    const needGap = isBW || runs[r].colorId === runs[r + 1].colorId;
    const minGap = needGap ? 1 : 0;
    const runLen = runs[r].length;

    for (let p = 0; p <= n - runLen; p++) {
      if (!canFill(p, runLen, runs[r].colorId)) continue;

      const nextMinStart = p + runLen + minGap;

      for (let q = nextMinStart; q < n; q++) {
        if (!bdp[r + 1][q]) continue;
        // Check cells between end of run r and start of run r+1 are empty
        const gapStart = p + runLen;
        if (canEmptyRange(gapStart, q)) {
          bdp[r][p] = true;
          break;
        }
      }
    }
  }

  // Step 3: Combine forward and backward DPs
  // A placement of run r at position p is globally valid iff fdp[r][p] && bdp[r][p]
  // From globally valid placements, determine per-cell possible values.

  let anyValidPlacement = false;

  for (let r = 0; r < numRuns; r++) {
    const runLen = runs[r].length;
    for (let p = 0; p <= n - runLen; p++) {
      if (fdp[r][p] && bdp[r][p]) {
        anyValidPlacement = true;
        // Cells p..p+runLen-1 can be runs[r].colorId
        for (let i = p; i < p + runLen; i++) {
          canBeColor[i].set(runs[r].colorId as string, true);
        }
      }
    }
  }

  if (!anyValidPlacement) {
    return null; // Contradiction: no valid placement exists
  }

  // Determine which cells can be empty:
  // A cell is empty in a valid placement if it's not covered by any run in that placement.
  // We need to check: for each cell i, does there exist a complete valid placement
  // where cell i is not covered by any run?
  //
  // Efficient approach: a cell i can be empty if there exists a valid placement of ALL runs
  // that doesn't cover cell i. We check this by looking at whether all runs can be placed
  // without covering cell i.
  //
  // Simpler approach using the DP: for each cell i, check if there's a "gap" valid configuration.
  // A cell can be empty if:
  //   - It can be in a gap before run 0: exists valid fdp[0][p] with p > i, and bdp[0][p]
  //   - It can be in a gap after run numRuns-1: exists valid fdp[lastRun][p] with p+runLen <= i, and bdp[lastRun][p]
  //   - It can be in a gap between run r and run r+1:
  //     exists p where fdp[r][p] && (p + runs[r].length <= i)
  //     AND exists q where bdp[r+1][q] && (q > i)
  //     AND the gap cells between p+runs[r].length and q can be empty

  // For simplicity and correctness, let's compute this differently:
  // For each cell i, determine if every valid complete placement fills it.
  // If so, it must be filled. If some leave it empty, it can be empty.
  //
  // We'll use an auxiliary DP to track which cells are "always filled" across all valid placements.
  // Actually, the simplest correct approach: for each cell i that has no canBeColor entries,
  // it must be empty (no run covers it in any valid placement). For cells with canBeColor
  // entries, we need to check if there's also a valid placement where it's empty.

  // Let me use a different approach: compute canBeEmpty via the "gap" positions.

  // Gap before first run: cells 0..p-1 where fdp[0][p] && bdp[0][p]
  for (let p = 0; p < n; p++) {
    if (fdp[0][p] && bdp[0][p]) {
      for (let i = 0; i < p; i++) {
        canBeEmpty[i] = true;
      }
    }
  }

  // Gap after last run: cells p+len..n-1 where fdp[lastRun][p] && bdp[lastRun][p]
  for (let p = 0; p < n; p++) {
    if (fdp[lastRun][p] && bdp[lastRun][p]) {
      const end = p + runs[lastRun].length;
      for (let i = end; i < n; i++) {
        canBeEmpty[i] = true;
      }
    }
  }

  // Gap between runs r and r+1
  for (let r = 0; r < numRuns - 1; r++) {
    const needGap = isBW || runs[r].colorId === runs[r + 1].colorId;
    const minGap = needGap ? 1 : 0;
    const runLen = runs[r].length;
    const nextRunLen = runs[r + 1].length;

    // For each valid placement of run r at p, and run r+1 at q:
    // cells between p+runLen and q-1 are empty in that placement.
    // We need fdp[r][p] AND bdp[r+1][q] AND the gap is valid AND
    // the placement of runs between r and r+1 (there are none — they're consecutive) works.
    // Actually fdp[r][p] means runs 0..r can be placed with r at p.
    // bdp[r+1][q] means runs r+1..end can be placed with r+1 at q.
    // We need: the gap between p+runLen and q is all emptiable, and q >= p+runLen+minGap.

    for (let p = 0; p < n; p++) {
      if (!fdp[r][p]) continue;
      const gapStart = p + runLen;

      for (let q = gapStart + minGap; q <= n - nextRunLen; q++) {
        if (!bdp[r + 1][q]) continue;
        if (!canEmptyRange(gapStart, q)) continue;

        // Cells gapStart..q-1 are empty in this placement
        for (let i = gapStart; i < q; i++) {
          canBeEmpty[i] = true;
        }
      }
    }
  }

  // Cells with no canBeColor entries and not canBeEmpty => contradiction already caught above
  // Cells with no canBeColor entries => must be empty
  for (let i = 0; i < n; i++) {
    if (canBeColor[i].size === 0) {
      canBeEmpty[i] = true; // Must be empty since no run covers it
    }
  }

  // Step 4: Build result
  const result: SolverCell[] = [];
  for (let i = 0; i < n; i++) {
    const colors = canBeColor[i];
    const empty = canBeEmpty[i];

    if (colors.size === 0 && !empty) {
      // Should not happen — caught by anyValidPlacement check
      return null;
    }

    if (colors.size === 0 && empty) {
      // Must be empty
      result.push(null);
    } else if (colors.size === 1 && !empty) {
      // Must be this color
      const [colorStr] = colors.keys();
      result.push(colorStr as ColorId);
    } else {
      // Multiple possibilities or could be empty — still unknown
      // But respect existing known state
      result.push(cells[i] === 'unknown' ? 'unknown' : cells[i]);
    }
  }

  return { fdp, bdp, canBeEmpty, canBeColor, result };
}

/**
 * Solve a single line: given its clue and current cell states, determine
 * which unknown cells can be definitively resolved.
 *
 * Thin wrapper around solveLineCore — discards DP intermediates.
 *
 * @param clue - The line's clue runs.
 * @param cells - Current cell states (length = line length).
 * @param isBW - Whether gaps are required between ALL adjacent runs (B&W mode).
 * @returns Updated cell states with any new determinations, or `null` if contradicted.
 */
export function solveLine(
  clue: LineClue,
  cells: readonly SolverCell[],
  isBW: boolean,
): SolverCell[] | null {
  const data = solveLineCore(clue, cells, isBW);
  return data ? [...data.result] : null;
}

// ---------------------------------------------------------------------------
// Puzzle solver — constraint propagation
// ---------------------------------------------------------------------------

/**
 * Create an empty solver board for a puzzle.
 */
export function createSolverBoard(rows: number, cols: number): SolverBoard {
  const board: SolverBoard = [];
  for (let r = 0; r < rows; r++) {
    board.push(new Array(cols).fill('unknown' as SolverCell));
  }
  return board;
}

/**
 * Extract a column from the solver board.
 */
function getColumn(board: SolverBoard, col: number): SolverCell[] {
  return board.map((row) => row[col]);
}

/**
 * Write a column back to the solver board.
 */
function setColumn(board: SolverBoard, col: number, cells: SolverCell[]): void {
  for (let r = 0; r < cells.length; r++) {
    board[r][col] = cells[r];
  }
}

/**
 * Run constraint propagation on a board until no more progress.
 * @returns 'solved' if fully determined, 'stuck' if stalled, 'contradiction' if invalid.
 */
function propagate(
  board: SolverBoard,
  rows: number,
  cols: number,
  rowClues: readonly LineClue[],
  colClues: readonly LineClue[],
  isBW: boolean,
): 'solved' | 'stuck' | 'contradiction' {
  let changed = true;
  while (changed) {
    changed = false;

    for (let r = 0; r < rows; r++) {
      const result = solveLine(rowClues[r], board[r], isBW);
      if (result === null) return 'contradiction';
      for (let c = 0; c < cols; c++) {
        if (board[r][c] !== result[c]) {
          board[r][c] = result[c];
          changed = true;
        }
      }
    }

    for (let c = 0; c < cols; c++) {
      const col = getColumn(board, c);
      const result = solveLine(colClues[c], col, isBW);
      if (result === null) return 'contradiction';
      let colChanged = false;
      for (let r = 0; r < rows; r++) {
        if (col[r] !== result[r]) {
          colChanged = true;
          break;
        }
      }
      if (colChanged) {
        setColumn(board, c, result);
        changed = true;
      }
    }
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r][c] === 'unknown') return 'stuck';
    }
  }
  return 'solved';
}

/** Deep-copy a solver board. */
function cloneBoard(board: SolverBoard): SolverBoard {
  return board.map((row) => [...row]);
}

/** Mutable counter shared across recursive search calls. */
interface SearchBudget {
  remaining: number;
}

/**
 * Solve a puzzle using constraint propagation only (no backtracking).
 *
 * This is the appropriate solver for the hint system — it finds deductions
 * that a human could make by examining one line at a time.
 */
export function solvePuzzleLogic(puzzle: ValidatedPuzzle): SolverResult {
  const { rows, cols, rowClues, colClues, kind } = puzzle;
  const isBW = kind === 'bw';
  const board = createSolverBoard(rows, cols);

  const status = propagate(board, rows, cols, rowClues, colClues, isBW);

  if (status === 'solved') return { solved: true, board };
  if (status === 'contradiction') return { solved: false, board, reason: 'contradiction' };
  return { solved: false, board, reason: 'stuck' };
}

/**
 * Solve a puzzle using constraint propagation with backtracking search.
 *
 * Proves unique solvability: returns `solved: true` only when exactly one
 * valid solution exists. A `stuck` result from a subtree is conservatively
 * treated as "possibly multiple solutions" — the solver never falsely
 * claims uniqueness.
 *
 * Use this for puzzle validation and generator uniqueness checks.
 * For the hint system, prefer `solvePuzzleLogic()`.
 */
export function solvePuzzle(puzzle: ValidatedPuzzle, options?: SolverOptions): SolverResult {
  const { rows, cols, rowClues, colClues, kind } = puzzle;
  const isBW = kind === 'bw';
  const board = createSolverBoard(rows, cols);
  const budget: SearchBudget = { remaining: options?.maxNodes ?? 10_000 };

  return solveWithSearch(board, rows, cols, rowClues, colClues, isBW, puzzle.palette, budget);
}

/**
 * Recursive search: propagate, then branch on an unknown cell.
 *
 * Returns solved:true only when exactly one complete solution is found.
 * Stuck subtrees are treated as potentially containing multiple solutions
 * (conservative — never falsely claims uniqueness).
 */
function solveWithSearch(
  board: SolverBoard,
  rows: number,
  cols: number,
  rowClues: readonly LineClue[],
  colClues: readonly LineClue[],
  isBW: boolean,
  palette: ValidatedPuzzle['palette'],
  budget: SearchBudget,
): SolverResult {
  if (budget.remaining <= 0) {
    return { solved: false, board, reason: 'budget-exceeded' };
  }
  budget.remaining--;

  const status = propagate(board, rows, cols, rowClues, colClues, isBW);

  if (status === 'solved') return { solved: true, board };
  if (status === 'contradiction') return { solved: false, board, reason: 'contradiction' };

  // Propagation stalled — find first unknown cell and branch
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r][c] !== 'unknown') continue;

      const candidates: (ColorId | null)[] = [null];
      for (const p of palette) {
        candidates.push(p.id);
      }

      let solutionBoard: SolverBoard | null = null;
      let solutionCount = 0;

      for (const value of candidates) {
        if (budget.remaining <= 0 || solutionCount > 1) break;

        const trial = cloneBoard(board);
        trial[r][c] = value;
        const result = solveWithSearch(
          trial,
          rows,
          cols,
          rowClues,
          colClues,
          isBW,
          palette,
          budget,
        );

        if (result.solved) {
          solutionCount++;
          solutionBoard = result.board;
        } else if (result.reason !== 'contradiction') {
          // stuck or budget-exceeded: subtree may contain multiple solutions
          // Conservatively treat as ambiguous
          solutionCount = 2;
        }
        // contradiction: this branch is dead, continue to next candidate
      }

      if (budget.remaining <= 0) {
        return { solved: false, board, reason: 'budget-exceeded' };
      }

      if (solutionCount === 1 && solutionBoard) {
        return { solved: true, board: solutionBoard };
      }

      if (solutionCount === 0) {
        return { solved: false, board, reason: 'contradiction' };
      }

      // solutionCount > 1 — ambiguous
      return { solved: false, board, reason: 'stuck' };
    }
  }

  // Should not reach here
  return { solved: false, board, reason: 'stuck' };
}

/**
 * Perform a single solve step: find one line that yields new deductions.
 *
 * Useful for the hint system — tells the player which line to look at
 * and what can be deduced.
 *
 * Scans all lines for contradictions first (early detection of broken boards),
 * then does a second pass looking for lines with deducible progress.
 *
 * @param puzzle - The validated puzzle definition.
 * @param board - The current solver board state.
 * @returns The first line with deducible progress, or a no-progress/contradiction indicator.
 */
export function solveStep(puzzle: ValidatedPuzzle, board: SolverBoard): SolveStepResult {
  const { rows, cols, rowClues, colClues, kind } = puzzle;
  const isBW = kind === 'bw';

  // Pass 1: check all lines for contradictions
  const rowResults: (SolverCell[] | null)[] = [];
  for (let r = 0; r < rows; r++) {
    const result = solveLine(rowClues[r], board[r], isBW);
    if (result === null) return { progress: false, reason: 'contradiction' };
    rowResults.push(result);
  }

  const colResults: (SolverCell[] | null)[] = [];
  for (let c = 0; c < cols; c++) {
    const col = getColumn(board, c);
    const result = solveLine(colClues[c], col, isBW);
    if (result === null) return { progress: false, reason: 'contradiction' };
    colResults.push(result);
  }

  // Pass 2: find first line with deducible progress
  for (let r = 0; r < rows; r++) {
    const result = rowResults[r]!;
    const determinations: CellDetermination[] = [];
    for (let c = 0; c < cols; c++) {
      if (board[r][c] === 'unknown' && result[c] !== 'unknown') {
        determinations.push({ row: r, col: c, value: result[c] as ColorId | null });
      }
    }
    if (determinations.length > 0) {
      return { progress: true, line: 'row', index: r, cells: determinations };
    }
  }

  for (let c = 0; c < cols; c++) {
    const result = colResults[c]!;
    const determinations: CellDetermination[] = [];
    for (let r = 0; r < rows; r++) {
      if (board[r][c] === 'unknown' && result[r] !== 'unknown') {
        determinations.push({ row: r, col: c, value: result[r] as ColorId | null });
      }
    }
    if (determinations.length > 0) {
      return { progress: true, line: 'col', index: c, cells: determinations };
    }
  }

  return { progress: false, reason: 'no-progress' };
}

// ---------------------------------------------------------------------------
// Board conversion — bridge between player state and solver
// ---------------------------------------------------------------------------

/**
 * Convert a player board (PlayerCellState[][]) to a solver board (SolverBoard).
 *
 * - `filled` cells → their ColorId
 * - `empty` cells → null
 * - `unknown` cells → 'unknown'
 */
export function playerBoardToSolverBoard(
  board: readonly (readonly PlayerCellState[])[],
): SolverBoard {
  return board.map((row) =>
    row.map((cell): SolverCell => {
      switch (cell.kind) {
        case 'filled':
          return cell.colorId;
        case 'empty':
          return null;
        case 'unknown':
          return 'unknown';
      }
    }),
  );
}

/** Result of requesting a hint from the player's perspective. */
export type HintResult =
  | {
      readonly kind: 'hint';
      readonly line: 'row' | 'col';
      readonly index: number;
      readonly cells: readonly CellDetermination[];
    }
  | { readonly kind: 'no-hint' }
  | { readonly kind: 'error' };

/**
 * Get a hint for the current player board state.
 *
 * Two-pass approach:
 * 1. solveStep() finds the first line with deducible progress (cheap, no reasons).
 * 2. solveLineWithReasons() runs only on that target line to classify deductions.
 *
 * This avoids computing expensive explanations for every line.
 */
export function getHint(
  puzzle: ValidatedPuzzle,
  board: readonly (readonly PlayerCellState[])[],
): HintResult {
  const solverBoard = playerBoardToSolverBoard(board);
  const step = solveStep(puzzle, solverBoard);

  if (step.progress) {
    // Pass 2: re-solve the target line with explanation support
    const isBW = puzzle.kind === 'bw';
    let lineCells: readonly SolverCell[];
    let lineClue: LineClue;

    if (step.line === 'row') {
      lineCells = solverBoard[step.index];
      lineClue = puzzle.rowClues[step.index];
    } else {
      lineCells = getColumn(solverBoard, step.index);
      lineClue = puzzle.colClues[step.index];
    }

    const detailed = solveLineWithReasons(lineClue, lineCells, isBW);

    if (detailed) {
      // Map reasons onto the determinations from step
      const cellsWithReasons: CellDetermination[] = step.cells.map((cell) => {
        const linePos = step.line === 'row' ? cell.col : cell.row;
        return {
          ...cell,
          reason: detailed.reasons[linePos],
        };
      });

      return {
        kind: 'hint',
        line: step.line,
        index: step.index,
        cells: cellsWithReasons,
      };
    }

    // Fallback: return without reasons if detailed solve fails
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
