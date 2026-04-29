import type { ValidatedPuzzle } from '../types';
import { colorId } from '../types';
import { buildSample } from './sample-builder';

const B = colorId('black');
const Bl = colorId('blue');
const Br = colorId('brown');
const G = colorId('green');
const O = colorId('orange');
const Pk = colorId('pink');
const R = colorId('red');
const S = colorId('silver');
const W = colorId('white');
const Y = colorId('yellow');

/** B&W 20×20 puzzle: Castle 20×20. */
// prettier-ignore
export const castlePuzzle: ValidatedPuzzle = buildSample({
  id: 'bw-castle-20x20',
  name: 'Castle 20×20',
  kind: 'bw',
  palette: [{ id: B, name: 'Black', value: '#000000' }],
  solution: [
    [null, B, null, B, null, null, null, null, null, null, null, null, null, null, null, null, null, B, null, B],
    [null, B, null, B, null, null, null, null, null, null, null, null, null, null, null, null, null, B, null, B],
    [B, B, B, B, B, null, null, null, null, null, null, null, null, null, null, B, B, B, B, B],
    [B, B, B, B, B, null, null, null, null, null, null, null, null, null, null, B, B, B, B, B],
    [B, B, B, B, B, null, null, null, B, null, null, B, null, null, null, B, B, B, B, B],
    [B, B, B, B, B, null, null, null, B, null, null, B, null, null, null, B, B, B, B, B],
    [B, B, B, B, B, null, null, B, B, B, B, B, B, null, null, B, B, B, B, B],
    [B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B],
    [B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B],
    [B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B],
    [B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B],
    [B, B, B, B, B, null, null, B, B, B, B, null, null, B, B, B, B, B, B, B],
    [B, B, B, B, B, null, null, B, B, B, B, null, null, B, B, B, B, B, B, B],
    [B, B, B, B, B, null, null, B, B, B, B, null, null, B, B, B, B, B, B, B],
    [B, B, B, B, B, null, null, B, B, B, B, null, null, B, B, B, B, B, B, B],
    [B, B, B, B, B, null, null, null, null, null, null, null, null, B, B, B, B, B, B, B],
    [B, B, B, B, B, null, null, null, null, null, null, null, null, B, B, B, B, B, B, B],
    [B, B, B, B, B, null, null, null, null, null, null, null, null, B, B, B, B, B, B, B],
    [B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B],
    [B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B],
  ],
});

/** B&W 20×20 puzzle: Dog 20×20. */
// prettier-ignore
export const dogPuzzle: ValidatedPuzzle = buildSample({
  id: 'bw-dog-20x20',
  name: 'Dog 20×20',
  kind: 'bw',
  palette: [{ id: B, name: 'Black', value: '#000000' }],
  solution: [
    [null, null, B, B, B, B, B, null, null, null, null, null, null, null, null, null, null, null, null, null],
    [null, B, B, B, B, B, B, B, null, null, null, null, null, null, null, null, null, null, null, null],
    [B, B, B, B, B, B, B, B, B, null, null, null, null, null, null, null, null, null, null, null],
    [B, B, B, B, B, B, B, B, B, null, null, null, null, null, null, null, null, null, null, null],
    [null, B, B, B, B, B, B, B, null, B, B, B, B, B, B, B, B, B, null, null],
    [null, null, B, B, B, B, B, null, B, B, B, B, B, B, B, B, B, B, null, null],
    [null, null, null, null, null, null, null, null, B, B, B, B, B, B, B, B, B, B, B, B],
    [null, null, null, null, null, null, null, B, B, B, B, B, B, B, B, B, B, B, B, B],
    [null, null, null, null, null, null, null, B, B, B, B, B, B, B, B, B, B, B, B, B],
    [null, null, null, null, null, null, null, B, B, B, null, B, B, B, B, null, B, B, B, B],
    [null, null, null, null, null, null, null, B, B, B, null, B, B, B, B, null, B, B, B, B],
    [null, null, null, null, null, null, null, B, B, B, B, B, B, B, B, B, B, B, B, B],
    [null, null, null, null, null, null, null, B, B, B, B, B, B, B, B, B, B, B, B, B],
    [null, null, null, null, null, null, null, B, B, B, B, B, B, null, B, B, B, B, B, B],
    [null, null, null, null, null, null, null, null, B, B, B, B, B, B, B, B, B, B, B, B],
    [null, null, null, null, null, null, null, null, B, B, B, B, null, null, B, B, B, B, null, null],
    [null, null, null, null, null, null, null, null, B, B, B, B, null, null, B, B, B, B, null, null],
    [null, null, null, null, null, null, null, null, B, B, B, B, null, null, B, B, B, B, null, null],
    [null, null, null, null, null, null, null, null, B, B, null, B, null, null, B, B, null, B, null, null],
    [null, null, null, null, null, null, null, null, B, B, null, B, null, null, B, B, null, B, null, null],
  ],
});

/** B&W 20×20 puzzle: Guitar 20×20. */
// prettier-ignore
export const guitarPuzzle: ValidatedPuzzle = buildSample({
  id: 'bw-guitar-20x20',
  name: 'Guitar 20×20',
  kind: 'bw',
  palette: [{ id: B, name: 'Black', value: '#000000' }],
  solution: [
    [null, null, null, null, null, null, null, null, B, B, B, B, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, B, B, B, B, B, B, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, B, null, null, null, null, B, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, B, null, null, null, null, B, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, B, B, B, B, B, B, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, B, B, B, B, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null, B, B, null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null, B, B, null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null, B, B, null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null, B, B, null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null, B, B, null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null, B, B, null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, B, B, B, B, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, B, B, B, B, B, B, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, B, B, B, B, B, B, B, B, null, null, null, null, null, null],
    [null, null, null, null, null, B, B, B, B, B, B, B, B, B, B, null, null, null, null, null],
    [null, null, null, null, null, B, B, B, B, B, B, B, B, B, B, null, null, null, null, null],
    [null, null, null, null, null, null, B, B, B, B, B, B, B, B, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, B, B, B, B, B, B, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, B, B, B, B, null, null, null, null, null, null, null, null],
  ],
});

/** B&W 20×20 puzzle: Lighthouse 20×20. */
// prettier-ignore
export const lighthousePuzzle: ValidatedPuzzle = buildSample({
  id: 'bw-lighthouse-20x20',
  name: 'Lighthouse 20×20',
  kind: 'bw',
  palette: [{ id: B, name: 'Black', value: '#000000' }],
  solution: [
    [null, null, null, null, null, null, null, null, null, B, B, null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, B, B, B, B, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, B, B, B, B, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, B, B, B, B, B, B, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, B, B, B, B, B, B, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, B, null, B, B, null, B, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, B, B, B, B, B, B, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, B, null, B, B, null, B, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, B, B, B, B, B, B, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, B, B, B, B, B, B, B, B, null, null, null, null, null, null],
    [null, null, null, null, null, B, B, B, B, B, B, B, B, B, B, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null, B, B, null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null, B, B, null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null, B, B, null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null, B, B, null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null, B, B, null, null, null, null, null, null, null, null, null],
    [B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B],
    [B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B],
    [null, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, null],
    [null, null, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, null, null],
  ],
});

/** B&W 20×20 puzzle: Rocket 20×20. */
// prettier-ignore
export const rocketPuzzle: ValidatedPuzzle = buildSample({
  id: 'bw-rocket-20x20',
  name: 'Rocket 20×20',
  kind: 'bw',
  palette: [{ id: B, name: 'Black', value: '#000000' }],
  solution: [
    [null, null, null, null, null, null, null, null, null, B, B, null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, B, B, B, B, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, B, B, B, B, B, B, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, B, B, B, B, B, B, B, B, null, null, null, null, null, null],
    [null, null, null, null, null, null, B, B, B, B, B, B, B, B, null, null, null, null, null, null],
    [null, null, null, null, null, null, B, B, null, B, B, null, B, B, null, null, null, null, null, null],
    [null, null, null, null, null, null, B, B, B, B, B, B, B, B, null, null, null, null, null, null],
    [null, null, null, null, null, null, B, B, B, B, B, B, B, B, null, null, null, null, null, null],
    [null, null, null, null, null, null, B, B, B, B, B, B, B, B, null, null, null, null, null, null],
    [null, null, null, null, null, null, B, B, B, B, B, B, B, B, null, null, null, null, null, null],
    [null, null, null, null, null, null, B, B, B, B, B, B, B, B, null, null, null, null, null, null],
    [null, null, null, null, null, null, B, B, B, B, B, B, B, B, null, null, null, null, null, null],
    [null, null, null, null, null, null, B, B, B, B, B, B, B, B, null, null, null, null, null, null],
    [null, null, null, null, null, B, B, B, B, B, B, B, B, B, B, null, null, null, null, null],
    [null, null, null, null, B, B, B, B, B, B, B, B, B, B, B, B, null, null, null, null],
    [null, null, null, B, B, null, B, B, B, B, B, B, B, B, null, B, B, null, null, null],
    [null, null, B, B, null, null, B, B, B, B, B, B, B, B, null, null, B, B, null, null],
    [null, B, B, null, null, null, B, B, B, null, null, B, B, B, null, null, null, B, B, null],
    [null, null, null, null, null, null, B, B, B, null, null, B, B, B, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, B, B, null, null, B, B, null, null, null, null, null, null, null],
  ],
});

/** Color 20×20 puzzle: Cactus 20×20. */
// prettier-ignore
export const cactusPuzzle: ValidatedPuzzle = buildSample({
  id: 'color-cactus-20x20',
  name: 'Cactus 20×20',
  kind: 'color',
  palette: [{ id: G, name: 'Green', value: '#43a047' }, { id: Y, name: 'Yellow', value: '#fdd835' }, { id: Br, name: 'Brown', value: '#795548' }, { id: R, name: 'Red', value: '#e53935' }],
  solution: [
    [null, null, null, null, null, null, null, null, null, G, G, null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null, G, G, null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null, G, G, null, null, null, null, null, null, null, null, null],
    [null, null, null, G, G, null, null, null, null, G, G, null, null, null, null, null, null, null, null, null],
    [null, null, null, G, G, null, null, null, null, G, G, null, null, null, null, G, G, null, null, null],
    [null, null, null, G, G, null, null, null, null, G, G, null, null, null, null, G, G, null, null, null],
    [null, null, null, G, G, null, null, null, null, G, G, null, null, null, null, G, G, null, null, null],
    [null, null, null, G, G, G, G, G, G, G, G, null, null, null, null, G, G, null, null, null],
    [null, null, null, null, null, null, null, null, null, G, G, G, G, G, G, G, G, null, null, null],
    [null, null, null, null, null, null, null, null, null, G, G, null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null, G, G, null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null, G, G, null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, R, Y, R, R, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, R, Y, Y, R, R, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, R, Y, R, R, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null, G, G, null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null, G, G, null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, Br, Br, Br, Br, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, Br, Br, Br, Br, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, Br, Br, Br, Br, Br, Br, null, null, null, null, null, null, null],
  ],
});

/** Color 20×20 puzzle: Cupcake 20×20. */
// prettier-ignore
export const cupcakePuzzle: ValidatedPuzzle = buildSample({
  id: 'color-cupcake-20x20',
  name: 'Cupcake 20×20',
  kind: 'color',
  palette: [{ id: R, name: 'Red', value: '#e53935' }, { id: Pk, name: 'Pink', value: '#e91e9f' }, { id: W, name: 'White', value: '#ffffff' }, { id: Br, name: 'Brown', value: '#795548' }, { id: Y, name: 'Yellow', value: '#fdd835' }],
  solution: [
    [null, null, null, null, null, null, null, null, Y, Y, Y, Y, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, Y, Y, Y, Y, Y, Y, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, R, R, R, R, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, R, R, R, R, R, R, null, null, null, null, null, null, null],
    [null, null, null, null, null, Pk, Pk, Pk, Pk, Pk, Pk, Pk, Pk, Pk, Pk, null, null, null, null, null],
    [null, null, null, null, Pk, Pk, W, Pk, Pk, W, Pk, Pk, W, Pk, Pk, Pk, null, null, null, null],
    [null, null, null, Pk, Pk, Pk, W, Pk, Pk, W, Pk, Pk, W, Pk, Pk, Pk, Pk, null, null, null],
    [null, null, Pk, Pk, Pk, Pk, Pk, Pk, Pk, Pk, Pk, Pk, Pk, Pk, Pk, Pk, Pk, Pk, null, null],
    [null, null, Pk, Pk, Pk, Pk, Pk, Pk, Pk, Pk, Pk, Pk, Pk, Pk, Pk, Pk, Pk, Pk, null, null],
    [null, null, null, Pk, Pk, Pk, Pk, Pk, Pk, Pk, Pk, Pk, Pk, Pk, Pk, Pk, Pk, null, null, null],
    [null, null, null, null, Br, Br, Br, Br, Br, Br, Br, Br, Br, Br, Br, Br, null, null, null, null],
    [null, null, null, null, Br, Br, Br, Br, Br, Br, Br, Br, Br, Br, Br, Br, null, null, null, null],
    [null, null, null, null, Br, Br, Br, Br, Br, Br, Br, Br, Br, Br, Br, Br, null, null, null, null],
    [null, null, null, null, Br, Br, Br, Br, Br, Br, Br, Br, Br, Br, Br, Br, null, null, null, null],
    [null, null, null, null, Br, Br, Br, Br, Br, Br, Br, Br, Br, Br, Br, Br, null, null, null, null],
    [null, null, null, null, Br, Br, Br, Br, Br, Br, Br, Br, Br, Br, Br, Br, null, null, null, null],
    [null, null, null, null, Br, Br, Br, Br, Br, Br, Br, Br, Br, Br, Br, Br, null, null, null, null],
    [null, null, null, null, Br, Br, Br, Br, Br, Br, Br, Br, Br, Br, Br, Br, null, null, null, null],
    [null, null, null, null, null, Br, Br, Br, Br, Br, Br, Br, Br, Br, Br, null, null, null, null, null],
    [null, null, null, null, null, null, Br, Br, Br, Br, Br, Br, Br, Br, null, null, null, null, null, null],
  ],
});

/** Color 20×20 puzzle: Parrot 20×20. */
// prettier-ignore
export const parrotPuzzle: ValidatedPuzzle = buildSample({
  id: 'color-parrot-20x20',
  name: 'Parrot 20×20',
  kind: 'color',
  palette: [{ id: R, name: 'Red', value: '#e53935' }, { id: G, name: 'Green', value: '#43a047' }, { id: Bl, name: 'Blue', value: '#1e88e5' }, { id: B, name: 'Black', value: '#212121' }, { id: W, name: 'White', value: '#ffffff' }],
  solution: [
    [null, null, null, null, null, null, null, null, R, R, R, R, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, R, R, R, R, R, R, R, R, null, null, null, null, null, null],
    [null, null, null, null, null, R, R, R, R, R, R, R, R, R, R, null, null, null, null, null],
    [null, null, null, null, R, R, R, R, R, R, R, R, R, R, R, R, null, null, null, null],
    [null, null, null, R, R, R, R, W, W, R, R, R, R, R, R, R, null, null, null, null],
    [null, null, null, R, R, R, W, W, W, R, R, R, R, R, R, R, null, null, null, null],
    [null, null, null, R, R, R, B, B, R, R, R, R, R, R, R, R, null, null, null, null],
    [null, null, null, R, R, R, R, R, R, R, R, R, R, R, R, R, null, null, null, null],
    [null, null, null, null, R, R, R, R, R, R, R, R, R, R, R, R, null, null, null, null],
    [null, null, null, null, null, R, R, R, R, R, R, R, R, R, R, null, null, null, null, null],
    [null, null, null, null, null, null, G, G, G, G, G, G, G, R, null, null, null, null, null, null],
    [null, null, null, null, null, G, G, G, G, G, G, G, G, null, null, null, null, null, null, null],
    [null, null, null, null, G, G, G, G, G, G, G, G, null, null, null, null, null, null, null, null],
    [null, null, null, G, G, G, G, G, G, G, G, G, null, null, null, null, null, null, null, null],
    [null, null, G, G, G, G, G, G, G, G, G, null, null, null, null, null, null, null, null, null],
    [null, G, G, G, G, G, G, G, G, G, G, null, null, null, null, null, null, null, null, null],
    [G, G, G, G, null, null, null, null, Bl, Bl, Bl, Bl, null, null, null, null, null, null, null, null],
    [G, G, G, null, null, null, null, null, null, Bl, Bl, Bl, null, null, null, null, null, null, null, null],
    [G, G, null, null, null, null, null, null, null, null, Bl, Bl, null, null, null, null, null, null, null, null],
    [G, null, null, null, null, null, null, null, null, null, null, Bl, null, null, null, null, null, null, null, null],
  ],
});

/** Color 20×20 puzzle: Rainbow 20×20. */
// prettier-ignore
export const rainbowPuzzle: ValidatedPuzzle = buildSample({
  id: 'color-rainbow-20x20',
  name: 'Rainbow 20×20',
  kind: 'color',
  palette: [{ id: R, name: 'Red', value: '#e53935' }, { id: O, name: 'Orange', value: '#ff9800' }, { id: Y, name: 'Yellow', value: '#fdd835' }, { id: G, name: 'Green', value: '#43a047' }, { id: Bl, name: 'Blue', value: '#1e88e5' }],
  solution: [
    [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, R, R, R, R, R, R, null, null, null, null, null, null, null],
    [null, null, null, null, R, R, R, R, R, R, R, R, R, R, R, R, null, null, null, null],
    [null, null, null, R, R, O, O, O, O, O, O, O, O, O, O, R, R, R, null, null],
    [null, null, R, R, O, O, O, O, O, O, O, O, O, O, O, O, R, R, R, null],
    [null, null, R, O, O, Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, O, O, R, null],
    [null, R, R, O, O, Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, O, O, R, R],
    [null, R, O, O, Y, Y, G, G, G, G, G, G, G, G, Y, Y, O, R, null, null],
    [null, R, O, O, Y, G, G, G, G, G, G, G, G, G, G, Y, O, R, null, null],
    [null, R, O, O, Y, G, G, Bl, Bl, Bl, Bl, Bl, Bl, G, G, Y, O, R, null, null],
    [null, R, O, O, Y, G, G, Bl, Bl, Bl, Bl, Bl, Bl, G, G, Y, O, R, null, null],
    [null, R, O, O, Y, G, G, G, G, G, G, G, G, G, G, Y, O, R, null, null],
    [null, R, O, O, Y, Y, G, G, G, G, G, G, G, G, Y, Y, O, R, null, null],
    [null, R, R, O, O, Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, O, O, R, R],
    [null, null, R, O, O, Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, O, O, R, null],
    [null, null, R, R, O, O, O, O, O, O, O, O, O, O, O, O, R, R, R, null],
    [null, null, null, R, R, O, O, O, O, O, O, O, O, O, O, R, R, R, null, null],
    [null, null, null, null, R, R, R, R, R, R, R, R, R, R, R, R, null, null, null, null],
    [null, null, null, null, null, null, null, R, R, R, R, R, R, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
  ],
});

/** Color 20×20 puzzle: Robot 20×20. */
// prettier-ignore
export const robotPuzzle: ValidatedPuzzle = buildSample({
  id: 'color-robot-20x20',
  name: 'Robot 20×20',
  kind: 'color',
  palette: [{ id: S, name: 'Silver', value: '#90a4ae' }, { id: R, name: 'Red', value: '#e53935' }, { id: Bl, name: 'Blue', value: '#1e88e5' }, { id: Y, name: 'Yellow', value: '#fdd835' }],
  solution: [
    [null, null, null, null, null, null, S, S, S, S, S, S, S, S, null, null, null, null, null, null],
    [null, null, null, null, null, S, S, S, S, S, S, S, S, S, S, null, null, null, null, null],
    [null, null, null, null, S, S, S, S, S, S, S, S, S, S, S, S, null, null, null, null],
    [null, null, null, null, S, S, null, R, R, R, R, null, S, S, S, S, null, null, null, null],
    [null, null, null, null, S, S, null, R, R, R, R, null, S, S, S, S, null, null, null, null],
    [null, null, null, null, S, S, S, S, S, S, S, S, S, S, S, S, null, null, null, null],
    [null, null, null, null, S, S, S, S, Y, Y, Y, S, S, S, S, S, null, null, null, null],
    [null, null, null, null, null, S, S, S, S, S, S, S, S, S, S, null, null, null, null, null],
    [null, null, null, null, null, null, S, S, S, S, S, S, S, S, null, null, null, null, null, null],
    [null, null, null, null, Bl, Bl, Bl, Bl, Bl, Bl, Bl, Bl, Bl, Bl, Bl, Bl, null, null, null, null],
    [null, null, null, Bl, Bl, Bl, Bl, Bl, Bl, Bl, Bl, Bl, Bl, Bl, Bl, Bl, Bl, null, null, null],
    [null, null, null, Bl, Bl, null, Bl, Bl, Bl, Bl, Bl, Bl, Bl, Bl, null, Bl, Bl, null, null, null],
    [null, null, null, Bl, Bl, null, Bl, Bl, Bl, Bl, Bl, Bl, Bl, Bl, null, Bl, Bl, null, null, null],
    [null, null, null, Bl, Bl, null, Bl, Bl, Bl, Bl, Bl, Bl, Bl, Bl, null, Bl, Bl, null, null, null],
    [null, null, null, Bl, Bl, Bl, Bl, Bl, Bl, Bl, Bl, Bl, Bl, Bl, Bl, Bl, Bl, null, null, null],
    [null, null, null, null, Bl, Bl, Bl, Bl, Bl, Bl, Bl, Bl, Bl, Bl, Bl, Bl, null, null, null, null],
    [null, null, null, null, null, Bl, Bl, null, null, null, null, null, null, Bl, Bl, null, null, null, null, null],
    [null, null, null, null, null, Bl, Bl, null, null, null, null, null, null, Bl, Bl, null, null, null, null, null],
    [null, null, null, null, S, S, S, S, null, null, null, null, S, S, S, S, null, null, null, null],
    [null, null, null, null, S, S, S, S, null, null, null, null, S, S, S, S, null, null, null, null],
  ],
});

/** Returns all 20x20 sample puzzles. */
export function getSamplePuzzles20x20(): ValidatedPuzzle[] {
  return [
    castlePuzzle,
    dogPuzzle,
    guitarPuzzle,
    lighthousePuzzle,
    rocketPuzzle,
    cactusPuzzle,
    cupcakePuzzle,
    parrotPuzzle,
    rainbowPuzzle,
    robotPuzzle,
  ];
}
