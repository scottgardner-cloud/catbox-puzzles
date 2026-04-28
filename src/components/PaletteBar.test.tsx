import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PaletteBar } from './PaletteBar';
import { colorId } from '../types';
import type { PaletteColor } from '../types';

const R = colorId('red');
const G = colorId('green');
const B = colorId('black');

const colorPalette: PaletteColor[] = [
  { id: R, name: 'Red', value: '#ff0000' },
  { id: G, name: 'Green', value: '#00ff00' },
];

const bwPalette: PaletteColor[] = [{ id: B, name: 'Black', value: '#000000' }];

describe('PaletteBar', () => {
  it('renders swatches for each color', () => {
    render(<PaletteBar palette={colorPalette} selectedColorId={R} onSelectColor={vi.fn()} />);
    expect(screen.getByRole('button', { name: /select red/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /select green/i })).toBeInTheDocument();
  });

  it('marks the selected color as pressed', () => {
    render(<PaletteBar palette={colorPalette} selectedColorId={R} onSelectColor={vi.fn()} />);
    expect(screen.getByRole('button', { name: /select red/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /select green/i })).toHaveAttribute('aria-pressed', 'false');
  });

  it('fires onSelectColor when a swatch is clicked', async () => {
    const onSelect = vi.fn();
    render(<PaletteBar palette={colorPalette} selectedColorId={R} onSelectColor={onSelect} />);
    await userEvent.click(screen.getByRole('button', { name: /select green/i }));
    expect(onSelect).toHaveBeenCalledWith(G);
  });

  it('returns null for single-color (B&W) palette', () => {
    const { container } = render(
      <PaletteBar palette={bwPalette} selectedColorId={B} onSelectColor={vi.fn()} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('has toolbar role with label', () => {
    render(<PaletteBar palette={colorPalette} selectedColorId={R} onSelectColor={vi.fn()} />);
    expect(screen.getByRole('toolbar', { name: /color palette/i })).toBeInTheDocument();
  });
});
