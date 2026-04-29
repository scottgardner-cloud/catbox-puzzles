/**
 * Solver-guided puzzle repair: auto-perturb ambiguous puzzles for unique solvability.
 *
 * Strategy:
 * 1. Run the solver to find cells it can't determine (unknowns from propagation)
 * 2. Find actual ambiguous cells by forcing unknowns to different values and comparing results
 * 3. Try single-cell edits on the highest-priority candidates (all palette values + null)
 * 4. If single-cell fails, try pairs of edits
 * 5. Return the first successful repair with minimal changes
 */
import type { ColorId, PuzzleDefinition, ValidatedPuzzle } from '../../types';
import { validatePuzzleDefinition } from '../../engine/validation';
import { solvePuzzle } from '../../engine/solver';
import type { SolverBoard } from '../../engine/solver';
import { deriveClues } from './clue-derivation';

/** A single cell change made during repair. */
export interface CellChange {
  readonly row: number;
  readonly col: number;
  readonly from: ColorId | null;
  readonly to: ColorId | null;
}

/** Result of a repair attempt. */
export interface RepairResult {
  readonly success: boolean;
  readonly puzzle?: ValidatedPuzzle;
  readonly changes: readonly CellChange[];
  readonly iterations: number;
  readonly reason?: 'already-unique' | 'budget-exceeded' | 'no-candidates' | 'not-ambiguous';
}

/** Options for the repair algorithm. */
export interface RepairOptions {
  /** Max solver invocations before giving up. Default: 50. */
  readonly maxIterations?: number;
  /** Max cells to change. Default: 4. */
  readonly maxChanges?: number;
}

/**
 * Attempt to repair an ambiguous puzzle by perturbing cells in the solution grid.
 * Modifies the pixel art minimally, re-derives clues, and re-validates.
 */
export function repairPuzzle(puzzle: ValidatedPuzzle, options?: RepairOptions): RepairResult {
  const maxIterations = options?.maxIterations ?? 50;

  // Step 1: Confirm ambiguity and get the stuck board
  const initial = solvePuzzle(puzzle, { maxNodes: 10_000 });
  if (initial.solved) {
    return { success: true, puzzle, changes: [], iterations: 0, reason: 'already-unique' };
  }
  if (initial.reason !== 'stuck') {
    return { success: false, changes: [], iterations: 0, reason: 'not-ambiguous' };
  }

  // Step 2: Find candidate cells — unknowns from propagation, then diff-based ranking
  const candidates = rankCandidates(initial.board, puzzle);
  if (candidates.length === 0) {
    return { success: false, changes: [], iterations: 1, reason: 'no-candidates' };
  }

  // Step 3: All possible values for each cell (null + each palette color)
  const possibleValues: (ColorId | null)[] = [null, ...puzzle.palette.map((c) => c.id)];

  let iterations = 1; // counted the initial solve

  // Phase 1: Single-cell edits
  for (const cell of candidates) {
    for (const newValue of possibleValues) {
      if (iterations >= maxIterations) {
        return { success: false, changes: [], iterations, reason: 'budget-exceeded' };
      }
      const original = puzzle.solution[cell.row][cell.col];
      if (newValue === original) continue;

      const result = tryEdit(puzzle, [
        { row: cell.row, col: cell.col, from: original, to: newValue },
      ]);
      iterations++;

      if (result) {
        return {
          success: true,
          puzzle: result,
          changes: [{ row: cell.row, col: cell.col, from: original, to: newValue }],
          iterations,
        };
      }
    }
  }

  // Phase 2: Pair edits on the top candidates (limited scope)
  const topCandidates = candidates.slice(0, 6);
  for (let i = 0; i < topCandidates.length; i++) {
    for (let j = i + 1; j < topCandidates.length; j++) {
      if (iterations >= maxIterations) {
        return { success: false, changes: [], iterations, reason: 'budget-exceeded' };
      }
      const c1 = topCandidates[i];
      const c2 = topCandidates[j];
      const orig1 = puzzle.solution[c1.row][c1.col];
      const orig2 = puzzle.solution[c2.row][c2.col];

      // Try flipping both (toggle fill state)
      const new1 = orig1 !== null ? null : getBestFillColor(puzzle, c1.row, c1.col);
      const new2 = orig2 !== null ? null : getBestFillColor(puzzle, c2.row, c2.col);
      if (new1 === orig1 && new2 === orig2) continue;

      const changes: CellChange[] = [];
      if (new1 !== orig1) changes.push({ row: c1.row, col: c1.col, from: orig1, to: new1 });
      if (new2 !== orig2) changes.push({ row: c2.row, col: c2.col, from: orig2, to: new2 });

      const result = tryEdit(puzzle, changes);
      iterations++;

      if (result) {
        return { success: true, puzzle: result, changes, iterations };
      }
    }
  }

  return { success: false, changes: [], iterations, reason: 'budget-exceeded' };
}

// ── Internal helpers ─────────────────────────────────────────────────

/** Rank candidate cells for repair. Unknowns first, then border cells of unknown regions. */
function rankCandidates(
  board: SolverBoard,
  puzzle: ValidatedPuzzle,
): { row: number; col: number }[] {
  const rows = puzzle.rows;
  const cols = puzzle.cols;
  const unknowns: { row: number; col: number; score: number }[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r][c] !== 'unknown') continue;

      // Score: prefer cells adjacent to known cells (border of ambiguous region)
      let knownNeighbors = 0;
      for (const [dr, dc] of [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ] as const) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr][nc] !== 'unknown') {
          knownNeighbors++;
        }
      }
      unknowns.push({ row: r, col: c, score: knownNeighbors });
    }
  }

  // Sort by score descending: border cells first (more constrained, more likely to help)
  unknowns.sort((a, b) => b.score - a.score);
  return unknowns.map(({ row, col }) => ({ row, col }));
}

/** Try applying edits to the puzzle. Returns the validated result if uniquely solvable, else null. */
function tryEdit(puzzle: ValidatedPuzzle, changes: readonly CellChange[]): ValidatedPuzzle | null {
  const newSolution = puzzle.solution.map((r) => [...r]);
  for (const change of changes) {
    newSolution[change.row][change.col] = change.to;
  }

  const { rowClues, colClues } = deriveClues(newSolution);
  const newPuzzle: PuzzleDefinition = {
    ...puzzle,
    solution: newSolution,
    rowClues,
    colClues,
  };

  const validated = validatePuzzleDefinition(newPuzzle);
  if (Array.isArray(validated)) return null;

  const solverResult = solvePuzzle(validated, { maxNodes: 10_000 });
  if (!solverResult.solved) return null;

  // Verify solver found the same solution as our modified grid
  for (let r = 0; r < puzzle.rows; r++) {
    for (let c = 0; c < puzzle.cols; c++) {
      if (solverResult.board[r][c] !== newSolution[r][c]) return null;
    }
  }

  return validated;
}

/** Pick the best fill color for an empty cell based on neighboring colors. */
function getBestFillColor(puzzle: ValidatedPuzzle, row: number, col: number): ColorId | null {
  const counts = new Map<string, number>();
  for (const [dr, dc] of [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ] as const) {
    const nr = row + dr;
    const nc = col + dc;
    if (nr >= 0 && nr < puzzle.rows && nc >= 0 && nc < puzzle.cols) {
      const val = puzzle.solution[nr][nc];
      if (val !== null) {
        counts.set(val as string, (counts.get(val as string) ?? 0) + 1);
      }
    }
  }

  let best: ColorId | null = puzzle.palette[0]?.id ?? null;
  let bestCount = 0;
  for (const [id, count] of counts) {
    if (count > bestCount) {
      best = id as ColorId;
      bestCount = count;
    }
  }
  return best;
}
