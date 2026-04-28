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
/** Raw 5×5 cross puzzle definition. */
export const crossDefinition: PuzzleDefinition = {
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
/** Raw 10×10 heart puzzle definition. */
// prettier-ignore
export const heartDefinition: PuzzleDefinition = {
  id: 'sample-heart-10x10',
  name: 'Heart 10×10',
  kind: 'bw',
  rows: 10,
  cols: 10,
  palette: [{ id: B, name: 'Black', value: '#000000' }],
  solution: [
    [null, B,    B,    null, null, null, null, B,    B,    null],
    [B,    B,    B,    B,    null, null, B,    B,    B,    B   ],
    [B,    B,    B,    B,    B,    B,    B,    B,    B,    B   ],
    [B,    B,    B,    B,    B,    B,    B,    B,    B,    B   ],
    [B,    B,    B,    B,    B,    B,    B,    B,    B,    B   ],
    [null, B,    B,    B,    B,    B,    B,    B,    B,    null],
    [null, null, B,    B,    B,    B,    B,    B,    null, null],
    [null, null, null, B,    B,    B,    B,    null, null, null],
    [null, null, null, null, B,    B,    null, null, null, null],
    [null, null, null, null, null, null, null, null, null, null],
  ],
  rowClues: [
    [run(2), run(2)],
    [run(4), run(4)],
    [run(10)],
    [run(10)],
    [run(10)],
    [run(8)],
    [run(6)],
    [run(4)],
    [run(2)],
    [],
  ],
  colClues: [
    [run(4)],
    [run(6)],
    [run(7)],
    [run(7)],
    [run(7)],
    [run(7)],
    [run(7)],
    [run(7)],
    [run(6)],
    [run(4)],
  ],
};

/**
 * 5×5 Color puzzle — a simple flag (red and blue stripes).
 *
 * Solution (R = red, B = blue):
 *   RRRRR
 *   BBBBB
 *   RRRRR
 *   BBBBB
 *   RRRRR
 */
const R = colorId('red');
const BL = colorId('blue');

/** Raw 5×5 color flag puzzle definition. */
// prettier-ignore
export const flagDefinition: PuzzleDefinition = {
  id: 'sample-flag-5x5',
  name: 'Flag 5×5 (Color)',
  kind: 'color',
  rows: 5,
  cols: 5,
  palette: [
    { id: R, name: 'Red', value: '#e53935' },
    { id: BL, name: 'Blue', value: '#1e88e5' },
  ],
  solution: [
    [R,  R,  R,  R,  R ],
    [BL, BL, BL, BL, BL],
    [R,  R,  R,  R,  R ],
    [BL, BL, BL, BL, BL],
    [R,  R,  R,  R,  R ],
  ],
  rowClues: [
    [{ length: 5, colorId: R }],
    [{ length: 5, colorId: BL }],
    [{ length: 5, colorId: R }],
    [{ length: 5, colorId: BL }],
    [{ length: 5, colorId: R }],
  ],
  colClues: [
    [{ length: 1, colorId: R }, { length: 1, colorId: BL }, { length: 1, colorId: R }, { length: 1, colorId: BL }, { length: 1, colorId: R }],
    [{ length: 1, colorId: R }, { length: 1, colorId: BL }, { length: 1, colorId: R }, { length: 1, colorId: BL }, { length: 1, colorId: R }],
    [{ length: 1, colorId: R }, { length: 1, colorId: BL }, { length: 1, colorId: R }, { length: 1, colorId: BL }, { length: 1, colorId: R }],
    [{ length: 1, colorId: R }, { length: 1, colorId: BL }, { length: 1, colorId: R }, { length: 1, colorId: BL }, { length: 1, colorId: R }],
    [{ length: 1, colorId: R }, { length: 1, colorId: BL }, { length: 1, colorId: R }, { length: 1, colorId: BL }, { length: 1, colorId: R }],
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

/** Validated 5×5 color flag puzzle. */
export const flagPuzzle: ValidatedPuzzle = assertValid(flagDefinition);

import { getSamplePuzzles15x15 } from './samples-15x15';
import { getSamplePuzzles20x20 } from './samples-20x20';

/** Returns all sample puzzles. */
export function getSamplePuzzles(): ValidatedPuzzle[] {
  return [crossPuzzle, heartPuzzle, flagPuzzle, ...getSamplePuzzles15x15(), ...getSamplePuzzles20x20()];
}
