import type { PuzzleDefinition, ValidatedPuzzle, ColorId, ClueRun } from '../types';
import { colorId } from '../types';
import { validatePuzzleDefinition } from '../engine/validation';

const B = colorId('black');
const run = (length: number, c: ColorId = B): ClueRun => ({ length, colorId: c });

/**
 * 5×5 B&W puzzle — a cross/plus shape.
 *
 * Solution:
 *   .X.X.
 *   XXXXX
 *   .X.X.
 *   XXXXX
 *   .X.X.
 */
// prettier-ignore
const crossDefinition: PuzzleDefinition = {
  id: 'sample-cross-5x5',
  name: 'Cross 5×5',
  kind: 'bw',
  rows: 5,
  cols: 5,
  palette: [{ id: B, name: 'Black', value: '#000000' }],
  solution: [
    [null, B, null, B, null],
    [B,    B, B,    B, B   ],
    [null, B, null, B, null],
    [B,    B, B,    B, B   ],
    [null, B, null, B, null],
  ],
  rowClues: [
    [run(1), run(1)],
    [run(5)],
    [run(1), run(1)],
    [run(5)],
    [run(1), run(1)],
  ],
  colClues: [
    [run(1), run(1)],
    [run(5)],
    [run(1), run(1)],
    [run(5)],
    [run(1), run(1)],
  ],
};

/**
 * 10×10 B&W puzzle — a heart shape.
 *
 * Solution (X = filled):
 *   .XX.XX....
 *   XXXXXXXXX.
 *   XXXXXXXXX.
 *   XXXXXXXXX.
 *   .XXXXXXXX.
 *   ..XXXXXXX.
 *   ...XXXXX..
 *   ....XXX...
 *   .....X....
 *   ..........
 */
// prettier-ignore
const heartDefinition: PuzzleDefinition = {
  id: 'sample-heart-10x10',
  name: 'Heart 10×10',
  kind: 'bw',
  rows: 10,
  cols: 10,
  palette: [{ id: B, name: 'Black', value: '#000000' }],
  solution: [
    [null, B,    B,    null, B,    B,    null, null, null, null],
    [B,    B,    B,    B,    B,    B,    B,    B,    B,    null],
    [B,    B,    B,    B,    B,    B,    B,    B,    B,    null],
    [B,    B,    B,    B,    B,    B,    B,    B,    B,    null],
    [null, B,    B,    B,    B,    B,    B,    B,    B,    null],
    [null, null, B,    B,    B,    B,    B,    B,    B,    null],
    [null, null, null, B,    B,    B,    B,    B,    null, null],
    [null, null, null, null, B,    B,    B,    null, null, null],
    [null, null, null, null, null, B,    null, null, null, null],
    [null, null, null, null, null, null, null, null, null, null],
  ],
  rowClues: [
    [run(2), run(2)],
    [run(9)],
    [run(9)],
    [run(9)],
    [run(8)],
    [run(7)],
    [run(5)],
    [run(3)],
    [run(1)],
    [],
  ],
  colClues: [
    [run(3)],
    [run(5)],
    [run(6)],
    [run(6)],
    [run(8)],
    [run(9)],
    [run(7)],
    [run(6)],
    [run(5)],
    [],
  ],
};

function assertValid(def: PuzzleDefinition): ValidatedPuzzle {
  const result = validatePuzzleDefinition(def);
  if (Array.isArray(result)) {
    throw new Error(
      `Sample puzzle "${def.id}" failed validation:\n${result.map((e) => `  - ${e.message}`).join('\n')}`,
    );
  }
  return result;
}

/** Validated 5×5 cross puzzle. */
export const crossPuzzle: ValidatedPuzzle = assertValid(crossDefinition);

/** Validated 10×10 heart puzzle. */
export const heartPuzzle: ValidatedPuzzle = assertValid(heartDefinition);

/** Returns all sample puzzles. */
export function getSamplePuzzles(): ValidatedPuzzle[] {
  return [crossPuzzle, heartPuzzle];
}
