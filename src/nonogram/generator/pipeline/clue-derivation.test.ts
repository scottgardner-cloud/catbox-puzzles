import { describe, it, expect } from 'vitest';
import { deriveClues } from './clue-derivation';
import { colorId } from '../../types';

const B = colorId('black');
const R = colorId('red');
const G = colorId('green');

describe('deriveClues', () => {
  it('derives clues for a simple B&W row', () => {
    const solution = [[B, B, null, B, null]];
    const { rowClues, colClues } = deriveClues(solution);

    expect(rowClues).toHaveLength(1);
    expect(rowClues[0]).toEqual([
      { length: 2, colorId: B },
      { length: 1, colorId: B },
    ]);
    expect(colClues).toHaveLength(5);
  });

  it('derives empty clues for an empty row', () => {
    const solution = [[null, null, null]];
    const { rowClues } = deriveClues(solution);
    expect(rowClues[0]).toEqual([]);
  });

  it('derives clues for a full row', () => {
    const solution = [[B, B, B]];
    const { rowClues } = deriveClues(solution);
    expect(rowClues[0]).toEqual([{ length: 3, colorId: B }]);
  });

  it('handles color puzzles with adjacent different colors', () => {
    const solution = [[R, R, G, G, null]];
    const { rowClues } = deriveClues(solution);
    expect(rowClues[0]).toEqual([
      { length: 2, colorId: R },
      { length: 2, colorId: G },
    ]);
  });

  it('derives column clues correctly', () => {
    const solution = [
      [B, null],
      [B, null],
      [null, B],
    ];
    const { colClues } = deriveClues(solution);
    expect(colClues[0]).toEqual([{ length: 2, colorId: B }]);
    expect(colClues[1]).toEqual([{ length: 1, colorId: B }]);
  });

  it('handles 3×3 cross pattern', () => {
    const solution = [
      [null, B, null],
      [B, B, B],
      [null, B, null],
    ];
    const { rowClues, colClues } = deriveClues(solution);
    expect(rowClues[0]).toEqual([{ length: 1, colorId: B }]);
    expect(rowClues[1]).toEqual([{ length: 3, colorId: B }]);
    expect(rowClues[2]).toEqual([{ length: 1, colorId: B }]);
    expect(colClues[0]).toEqual([{ length: 1, colorId: B }]);
    expect(colClues[1]).toEqual([{ length: 3, colorId: B }]);
    expect(colClues[2]).toEqual([{ length: 1, colorId: B }]);
  });

  it('handles empty grid', () => {
    const { rowClues, colClues } = deriveClues([]);
    expect(rowClues).toEqual([]);
    expect(colClues).toEqual([]);
  });
});
