import type { ValidatedPuzzle } from '../types';
import { colorId } from '../types';
import { buildSample } from './sample-builder';

const B = colorId('black');
const Bl = colorId('blue');
const Br = colorId('brown');
const G = colorId('green');
const O = colorId('orange');
const R = colorId('red');
const W = colorId('white');
const Y = colorId('yellow');

/** B&W 15×15 puzzle: Anchor 15×15. */
// prettier-ignore
export const anchorPuzzle: ValidatedPuzzle = buildSample({
  id: 'bw-anchor-15x15',
  name: 'Anchor 15×15',
  kind: 'bw',
  palette: [{ id: B, name: 'Black', value: '#000000' }],
  solution: [
    [null, null, null, null, null, null, B, B, B, null, null, null, null, null, null],
    [null, null, null, null, null, B, B, B, B, B, null, null, null, null, null],
    [null, null, null, null, null, B, B, null, B, B, null, null, null, null, null],
    [null, null, null, null, null, B, B, B, B, B, null, null, null, null, null],
    [null, null, null, null, null, null, B, B, B, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, B, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, B, null, null, null, null, null, null, null],
    [B, B, null, null, null, null, null, B, null, null, null, null, null, B, B],
    [B, B, B, null, null, null, null, B, null, null, null, null, B, B, B],
    [null, B, B, B, null, null, null, B, null, null, null, B, B, B, null],
    [null, null, B, B, B, B, null, B, null, B, B, B, B, null, null],
    [null, null, null, B, B, B, B, B, B, B, B, B, null, null, null],
    [null, null, null, null, B, B, B, B, B, B, B, null, null, null, null],
    [null, null, null, null, null, B, B, B, B, B, null, null, null, null, null],
    [null, null, null, null, null, null, B, B, B, null, null, null, null, null, null],
  ],
});

/** B&W 15×15 puzzle: Cat 15×15. */
// prettier-ignore
export const catPuzzle: ValidatedPuzzle = buildSample({
  id: 'bw-cat-15x15',
  name: 'Cat 15×15',
  kind: 'bw',
  palette: [{ id: B, name: 'Black', value: '#000000' }],
  solution: [
    [B,    null, null, null, null, null, null, null, null, null, null, null, null, null, B   ],
    [B,    B,    null, null, null, null, null, null, null, null, null, null, null, B,    B   ],
    [B,    B,    B,    null, null, null, null, null, null, null, null, null, B,    B,    B   ],
    [B,    B,    B,    B,    null, null, null, null, null, null, null, B,    B,    B,    B   ],
    [B,    B,    B,    B,    B,    B,    B,    B,    B,    B,    B,    B,    B,    B,    B   ],
    [B,    B,    B,    null, null, B,    B,    B,    null, null, B,    B,    B,    B,    B   ],
    [B,    B,    B,    null, null, B,    B,    B,    null, null, B,    B,    B,    B,    B   ],
    [B,    B,    B,    B,    B,    B,    B,    B,    B,    B,    B,    B,    B,    B,    B   ],
    [B,    B,    B,    B,    B,    B,    null, B,    null, B,    B,    B,    B,    B,    B   ],
    [B,    B,    B,    B,    B,    null, null, B,    null, null, B,    B,    B,    B,    B   ],
    [null, B,    B,    B,    null, null, null, null, null, null, null, B,    B,    B,    null],
    [null, null, B,    null, null, null, null, null, null, null, null, null, B,    null, null],
    [B,    null, null, null, null, null, null, null, null, null, null, null, null, null, B   ],
    [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
    [B,    null, null, null, null, null, null, null, null, null, null, null, null, null, B   ],
  ],
});

/** B&W 15×15 puzzle: House 15×15. */
// prettier-ignore
export const housePuzzle: ValidatedPuzzle = buildSample({
  id: 'bw-house-15x15',
  name: 'House 15×15',
  kind: 'bw',
  palette: [{ id: B, name: 'Black', value: '#000000' }],
  solution: [
    [null, null, null, null, null, null, null, B, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, B, B, B, null, null, null, null, null, null],
    [null, null, null, null, null, B, B, B, B, B, null, null, null, null, null],
    [null, null, null, null, B, B, B, B, B, B, B, null, null, null, null],
    [null, null, null, B, B, B, B, B, B, B, B, B, null, null, null],
    [null, null, B, B, B, B, B, B, B, B, B, B, B, null, null],
    [null, B, B, B, B, B, B, B, B, B, B, B, B, B, null],
    [null, B, B, null, null, null, null, null, null, null, null, null, B, B, null],
    [null, B, B, null, B, B, B, B, B, null, B, null, B, B, null],
    [null, B, B, null, B, B, B, B, B, null, B, null, B, B, null],
    [null, B, B, null, B, B, B, B, B, null, B, null, B, B, null],
    [null, B, B, null, B, B, B, B, B, null, null, null, B, B, null],
    [null, B, B, null, B, B, B, B, B, null, B, B, B, B, null],
    [null, B, B, null, null, null, null, null, null, null, B, B, B, B, null],
    [null, B, B, B, B, B, B, B, B, B, B, B, B, B, null],
  ],
});

/** B&W 15×15 puzzle: Skull 15×15. */
// prettier-ignore
export const skullPuzzle: ValidatedPuzzle = buildSample({
  id: 'bw-skull-15x15',
  name: 'Skull 15×15',
  kind: 'bw',
  palette: [{ id: B, name: 'Black', value: '#000000' }],
  solution: [
    [null, null, null, null, B,    B,    B,    B,    B,    B,    B,    null, null, null, null],
    [null, null, B,    B,    B,    B,    B,    B,    B,    B,    B,    B,    B,    null, null],
    [null, B,    B,    B,    B,    B,    B,    B,    B,    B,    B,    B,    B,    B,    null],
    [null, B,    B,    B,    B,    B,    B,    B,    B,    B,    B,    B,    B,    B,    null],
    [null, B,    B,    null, null, B,    B,    B,    B,    B,    null, null, B,    B,    null],
    [null, B,    B,    null, null, B,    B,    B,    B,    B,    null, null, B,    B,    null],
    [null, B,    B,    B,    B,    B,    B,    B,    B,    B,    B,    B,    B,    B,    null],
    [null, B,    B,    B,    B,    B,    B,    B,    B,    B,    B,    B,    B,    B,    null],
    [null, null, B,    B,    B,    B,    null, B,    null, B,    B,    B,    B,    null, null],
    [null, null, B,    B,    B,    B,    B,    B,    B,    B,    B,    B,    B,    null, null],
    [null, null, null, B,    B,    B,    B,    B,    B,    B,    B,    B,    null, null, null],
    [null, null, null, B,    B,    B,    B,    B,    B,    B,    B,    B,    null, null, null],
    [null, null, null, null, B,    null, B,    null, B,    null, B,    null, null, null, null],
    [null, null, null, null, null, B,    B,    B,    B,    B,    null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
  ],
});

/** B&W 15×15 puzzle: Tree 15×15. */
// prettier-ignore
export const treePuzzle: ValidatedPuzzle = buildSample({
  id: 'bw-tree-15x15',
  name: 'Tree 15×15',
  kind: 'bw',
  palette: [{ id: B, name: 'Black', value: '#000000' }],
  solution: [
    [null, null, null, null, null, null, null, B, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, B, B, B, null, null, null, null, null, null],
    [null, null, null, null, null, B, B, B, B, B, null, null, null, null, null],
    [null, null, null, null, B, B, B, B, B, B, B, null, null, null, null],
    [null, null, null, B, B, B, B, B, B, B, B, B, null, null, null],
    [null, null, null, null, null, null, B, B, B, null, null, null, null, null, null],
    [null, null, null, null, null, B, B, B, B, B, null, null, null, null, null],
    [null, null, null, null, B, B, B, B, B, B, B, null, null, null, null],
    [null, null, null, B, B, B, B, B, B, B, B, B, null, null, null],
    [null, null, B, B, B, B, B, B, B, B, B, B, B, null, null],
    [null, B, B, B, B, B, B, B, B, B, B, B, B, B, null],
    [null, null, null, null, null, null, B, B, B, null, null, null, null, null, null],
    [null, null, null, null, null, null, B, B, B, null, null, null, null, null, null],
    [null, null, null, null, null, null, B, B, B, null, null, null, null, null, null],
    [null, null, null, null, null, null, B, B, B, null, null, null, null, null, null],
  ],
});

/** Color 15×15 puzzle: Sailboat 15×15. */
// prettier-ignore
export const boatPuzzle: ValidatedPuzzle = buildSample({
  id: 'color-boat-15x15',
  name: 'Sailboat 15×15',
  kind: 'color',
  palette: [{ id: W, name: 'White', value: '#ffffff' }, { id: Bl, name: 'Blue', value: '#1e88e5' }, { id: R, name: 'Red', value: '#e53935' }, { id: Br, name: 'Brown', value: '#795548' }],
  solution: [
    [null, null, null, null, null, null, null, W, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, W, W, null, null, null, null, null, null, null],
    [null, null, null, null, null, W, W, W, null, null, null, null, null, null, null],
    [null, null, null, null, W, W, W, W, null, null, null, null, null, null, null],
    [null, null, null, W, W, W, W, W, null, null, null, null, null, null, null],
    [null, null, W, W, W, W, W, W, W, null, null, null, null, null, null],
    [null, W, W, W, W, W, W, W, W, W, null, null, null, null, null],
    [null, null, Br, Br, Br, Br, Br, Br, Br, Br, Br, null, null, null, null],
    [null, null, Br, R, R, R, R, R, R, R, R, Br, null, null, null],
    [null, null, Br, R, R, R, R, R, R, R, R, Br, null, null, null],
    [null, null, Br, Br, Br, Br, Br, Br, Br, Br, Br, Br, null, null, null],
    [Bl, Bl, Bl, Bl, Bl, Bl, Bl, Bl, Bl, Bl, Bl, Bl, Bl, Bl, Bl],
    [Bl, Bl, Bl, Bl, Bl, Bl, Bl, Bl, Bl, Bl, Bl, Bl, Bl, Bl, Bl],
    [Bl, Bl, Bl, Bl, Bl, Bl, Bl, Bl, Bl, Bl, Bl, Bl, Bl, Bl, Bl],
    [Bl, Bl, Bl, Bl, Bl, Bl, Bl, Bl, Bl, Bl, Bl, Bl, Bl, Bl, Bl],
  ],
});

/** Color 15×15 puzzle: Cherry 15×15. */
// prettier-ignore
export const cherryPuzzle: ValidatedPuzzle = buildSample({
  id: 'color-cherry-15x15',
  name: 'Cherry 15×15',
  kind: 'color',
  palette: [{ id: R, name: 'Red', value: '#e53935' }, { id: G, name: 'Green', value: '#43a047' }],
  solution: [
    [null, null, null, null, null, null, null, null, null, null, G,    G,    null, null, null],
    [null, null, null, null, null, null, null, null, null, G,    G,    null, null, null, null],
    [null, null, null, null, null, null, null, null, G,    G,    null, null, null, null, null],
    [null, null, null, null, null, null, null, G,    G,    null, null, null, null, null, null],
    [null, null, null, null, null, null, G,    G,    null, null, null, null, null, null, null],
    [null, null, null, null, null, G,    G,    G,    G,    null, null, null, null, null, null],
    [null, null, null, null, G,    G,    null, null, G,    G,    null, null, null, null, null],
    [null, null, null, G,    G,    null, null, null, null, G,    G,    null, null, null, null],
    [null, R,    R,    R,    null, null, null, null, R,    R,    R,    R,    null, null, null],
    [R,    R,    R,    R,    R,    null, null, R,    R,    R,    R,    R,    R,    null, null],
    [R,    R,    R,    R,    R,    null, null, R,    R,    R,    R,    R,    R,    null, null],
    [R,    R,    R,    R,    R,    null, null, R,    R,    R,    R,    R,    R,    null, null],
    [R,    R,    R,    R,    R,    null, null, null, R,    R,    R,    R,    null, null, null],
    [null, R,    R,    R,    null, null, null, null, null, R,    R,    null, null, null, null],
    [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
  ],
});

/** Color 15×15 puzzle: Flower 15×15. */
// prettier-ignore
export const flowerPuzzle: ValidatedPuzzle = buildSample({
  id: 'color-flower-15x15',
  name: 'Flower 15×15',
  kind: 'color',
  palette: [{ id: R, name: 'Red', value: '#e53935' }, { id: Y, name: 'Yellow', value: '#fdd835' }, { id: G, name: 'Green', value: '#43a047' }],
  solution: [
    [null, null, null, null, null, null, null, R, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, R, R, R, null, null, null, null, null, null],
    [null, null, null, null, null, R, R, R, R, R, null, null, null, null, null],
    [null, null, null, null, R, R, null, Y, null, R, R, null, null, null, null],
    [null, null, null, R, R, null, Y, Y, Y, null, R, R, null, null, null],
    [null, null, null, R, R, R, R, Y, R, R, R, R, R, null, null],
    [null, null, null, null, R, R, null, Y, null, R, R, null, null, null, null],
    [null, null, null, null, null, R, R, R, R, R, null, null, null, null, null],
    [null, null, null, null, null, null, R, R, R, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, G, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, G, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, G, G, G, null, null, null, null, null, null],
    [null, null, null, null, null, G, G, null, G, G, null, null, null, null, null],
    [null, null, null, null, null, G, null, null, null, G, null, null, null, null, null],
    [null, null, null, null, G, G, null, null, null, G, G, null, null, null, null],
  ],
});

/** Color 15×15 puzzle: Mushroom 15×15. */
// prettier-ignore
export const mushroomPuzzle: ValidatedPuzzle = buildSample({
  id: 'color-mushroom-15x15',
  name: 'Mushroom 15×15',
  kind: 'color',
  palette: [{ id: R, name: 'Red', value: '#e53935' }, { id: W, name: 'White', value: '#fdd835' }, { id: G, name: 'Green', value: '#43a047' }, { id: Br, name: 'Brown', value: '#795548' }],
  solution: [
    [null, null, null, null, null, null, R, R, R, R, R, null, null, null, null],
    [null, null, null, null, R, R, R, R, R, R, R, R, R, null, null],
    [null, null, null, R, R, W, R, R, R, W, R, R, R, R, null],
    [null, null, R, R, R, W, R, R, R, W, R, R, R, R, R],
    [null, null, R, R, R, R, R, R, R, R, R, R, R, R, R],
    [null, null, R, R, R, R, R, R, R, R, R, R, R, R, R],
    [null, null, null, R, R, R, R, R, R, R, R, R, R, R, null],
    [null, null, null, null, null, Br, Br, Br, Br, Br, null, null, null, null, null],
    [null, null, null, null, Br, Br, Br, Br, Br, Br, Br, null, null, null, null],
    [null, null, null, null, Br, Br, null, null, null, Br, Br, null, null, null, null],
    [null, null, null, Br, Br, Br, null, null, null, Br, Br, Br, null, null, null],
    [null, null, null, Br, Br, null, null, null, null, null, Br, Br, null, null, null],
    [null, null, null, Br, Br, null, null, null, null, null, Br, Br, null, null, null],
    [null, null, Br, Br, Br, null, null, null, null, null, Br, Br, Br, null, null],
    [G, G, G, G, G, G, G, G, G, G, G, G, G, G, G],
  ],
});

/** Color 15×15 puzzle: Sunset 15×15. */
// prettier-ignore
export const sunsetPuzzle: ValidatedPuzzle = buildSample({
  id: 'color-sunset-15x15',
  name: 'Sunset 15×15',
  kind: 'color',
  palette: [{ id: O, name: 'Orange', value: '#ff9800' }, { id: Y, name: 'Yellow', value: '#fdd835' }, { id: Bl, name: 'Blue', value: '#1e88e5' }, { id: R, name: 'Red', value: '#e53935' }],
  solution: [
    [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, O,    O,    O,    null, null, null, null, null, null],
    [null, null, null, null, O,    O,    Y,    Y,    Y,    O,    O,    null, null, null, null],
    [null, null, null, O,    Y,    Y,    Y,    Y,    Y,    Y,    Y,    O,    null, null, null],
    [null, null, O,    Y,    Y,    Y,    Y,    Y,    Y,    Y,    Y,    Y,    O,    null, null],
    [null, null, O,    Y,    Y,    Y,    Y,    Y,    Y,    Y,    Y,    Y,    O,    null, null],
    [null, null, null, O,    Y,    Y,    Y,    Y,    Y,    Y,    Y,    O,    null, null, null],
    [null, null, null, null, O,    O,    Y,    Y,    Y,    O,    O,    null, null, null, null],
    [R,    R,    R,    R,    R,    R,    O,    O,    O,    R,    R,    R,    R,    R,    R   ],
    [R,    R,    R,    R,    R,    R,    R,    R,    R,    R,    R,    R,    R,    R,    R   ],
    [Bl,   Bl,   Bl,   null, Bl,   Bl,   Bl,   Bl,   null, Bl,   Bl,   Bl,   Bl,   null, Bl  ],
    [Bl,   Bl,   null, Bl,   Bl,   Bl,   null, Bl,   Bl,   Bl,   null, Bl,   Bl,   Bl,   Bl  ],
    [Bl,   Bl,   Bl,   Bl,   Bl,   null, Bl,   Bl,   Bl,   Bl,   Bl,   null, Bl,   Bl,   Bl  ],
    [null, Bl,   Bl,   Bl,   Bl,   Bl,   Bl,   null, Bl,   Bl,   Bl,   Bl,   Bl,   Bl,   null],
    [Bl,   Bl,   null, Bl,   Bl,   Bl,   Bl,   Bl,   Bl,   null, Bl,   Bl,   Bl,   Bl,   Bl  ],
  ],
});

/** Returns all 15x15 sample puzzles. */
export function getSamplePuzzles15x15(): ValidatedPuzzle[] {
  return [
    anchorPuzzle,
    catPuzzle,
    housePuzzle,
    skullPuzzle,
    treePuzzle,
    boatPuzzle,
    cherryPuzzle,
    flowerPuzzle,
    mushroomPuzzle,
    sunsetPuzzle,
  ];
}
