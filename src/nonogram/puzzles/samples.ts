import type { ValidatedPuzzle } from '../types';
import { colorId } from '../types';
import { buildSample } from './sample-builder';

const B = colorId('black');

/**
 * 5×5 B&W puzzle — a plus/cross shape.
 *
 * Solution:
 *   ..X..
 *   ..X..
 *   XXXXX
 *   ..X..
 *   ..X..
 */
// prettier-ignore
export const crossPuzzle: ValidatedPuzzle = buildSample({
  id: 'sample-cross-5x5',
  name: 'Cross 5×5',
  kind: 'bw',
  palette: [{ id: B, name: 'Black', value: '#000000' }],
  solution: [
    [null, null, B,    null, null],
    [null, null, B,    null, null],
    [B,    B,    B,    B,    B   ],
    [null, null, B,    null, null],
    [null, null, B,    null, null],
  ],
});

/** Raw definition export for tests that need a PuzzleDefinition (not ValidatedPuzzle). */
export { crossPuzzle as crossDefinition };

/**
 * 10×10 B&W puzzle — a heart shape.
 *
 * Solution (X = filled):
 *   ..XX..XX..
 *   .XXXX.XXXX
 *   XXXXXXXXXX
 *   XXXXXXXXXX
 *   XXXXXXXXXX
 *   .XXXXXXXX.
 *   ..XXXXXX..
 *   ...XXXX...
 *   ....XX....
 *   ..........
 */
// prettier-ignore
export const heartPuzzle: ValidatedPuzzle = buildSample({
  id: 'sample-heart-10x10',
  name: 'Heart 10×10',
  kind: 'bw',
  palette: [{ id: B, name: 'Black', value: '#000000' }],
  solution: [
    [null, null, B,    B,    null, null, B,    B,    null, null],
    [null, B,    B,    B,    B,    B,    B,    B,    B,    null],
    [B,    B,    B,    B,    B,    B,    B,    B,    B,    B   ],
    [B,    B,    B,    B,    B,    B,    B,    B,    B,    B   ],
    [B,    B,    B,    B,    B,    B,    B,    B,    B,    B   ],
    [null, B,    B,    B,    B,    B,    B,    B,    B,    null],
    [null, null, B,    B,    B,    B,    B,    B,    null, null],
    [null, null, null, B,    B,    B,    B,    null, null, null],
    [null, null, null, null, B,    B,    null, null, null, null],
    [null, null, null, null, null, null, null, null, null, null],
  ],
});

/**
 * 5×5 Color puzzle — a simple flower (red petals, green stem).
 *
 * Solution (R = red, G = green):
 *   .R.R.
 *   RRRRR
 *   .RGR.
 *   ..G..
 *   ..G..
 */
const R = colorId('red');
const G = colorId('green');

// prettier-ignore
export const flowerSmallPuzzle: ValidatedPuzzle = buildSample({
  id: 'sample-flower-5x5',
  name: 'Flower 5×5 (Color)',
  kind: 'color',
  palette: [
    { id: R, name: 'Red', value: '#e53935' },
    { id: G, name: 'Green', value: '#43a047' },
  ],
  solution: [
    [null, R,    null, R,    null],
    [R,    R,    R,    R,    R   ],
    [null, R,    G,    R,    null],
    [null, null, G,    null, null],
    [null, null, G,    null, null],
  ],
});

// Keep backward compat for tests that import flagPuzzle
export const flagPuzzle: ValidatedPuzzle = flowerSmallPuzzle;

import { getSamplePuzzles15x15 } from './samples-15x15';
import { getSamplePuzzles20x20 } from './samples-20x20';

/** Returns all sample puzzles. */
export function getSamplePuzzles(): ValidatedPuzzle[] {
  return [
    crossPuzzle,
    heartPuzzle,
    flowerSmallPuzzle,
    ...getSamplePuzzles15x15(),
    ...getSamplePuzzles20x20(),
  ];
}
