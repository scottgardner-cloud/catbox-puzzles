import type { ValidatedPuzzle } from '../../types';

export interface PreviewGridProps {
  readonly puzzle: ValidatedPuzzle;
}

/**
 * Visual preview of a generated puzzle solution.
 * Shows a colored grid with clue numbers along edges.
 * Non-interactive — for visual verification only.
 */
export function PreviewGrid({ puzzle }: PreviewGridProps): React.JSX.Element {
  const paletteMap = new Map(puzzle.palette.map((c) => [c.id, c.value]));
  const cellSize = Math.max(12, Math.min(32, Math.floor(400 / Math.max(puzzle.rows, puzzle.cols))));

  return (
    <section className="pap-gen-preview" aria-label="Puzzle preview">
      <h3>Preview</h3>
      <div
        className="pap-gen-preview__grid"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${puzzle.cols}, ${cellSize}px)`,
          gap: '1px',
          backgroundColor: '#ccc',
          border: '1px solid #ccc',
          width: 'fit-content',
        }}
        role="img"
        aria-label={`${puzzle.rows}×${puzzle.cols} ${puzzle.kind} puzzle preview`}
      >
        {puzzle.solution.flatMap((row, r) =>
          row.map((cell, c) => {
            const color = cell ? (paletteMap.get(cell) ?? '#000') : '#fff';
            return (
              <div
                key={`${r}-${c}`}
                style={{
                  width: cellSize,
                  height: cellSize,
                  backgroundColor: color,
                }}
              />
            );
          }),
        )}
      </div>
      <div className="pap-gen-preview__info">
        <p>
          {puzzle.rows}×{puzzle.cols} •{' '}
          {puzzle.kind === 'bw' ? 'B&W' : `${puzzle.palette.length} colors`}
        </p>
        {puzzle.kind === 'color' && (
          <div className="pap-gen-preview__palette" aria-label="Color palette">
            {puzzle.palette.map((c) => (
              <span
                key={c.id}
                className="pap-gen-preview__swatch"
                style={{ backgroundColor: c.value }}
                title={c.name}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
