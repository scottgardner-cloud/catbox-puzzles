import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './AppLayout';
import { EditorPage } from './EditorPage';
import { BrowserPage } from './BrowserPage';
import { saveCustomPuzzle, deleteCustomPuzzle, getAllEntries } from '../puzzles/registry';
import type { PuzzleDefinition, ColorId } from '../types';
import { colorId } from '../types';

// ── Mocks ───────────────────────────────────────────────────────────

vi.mock('../state/persistence', () => ({
  saveGame: vi.fn(),
  loadGame: vi.fn(() => null),
  restoreGameState: vi.fn(() => null),
  hasSave: vi.fn(() => false),
  deleteSave: vi.fn(),
}));

// ── Helpers ─────────────────────────────────────────────────────────

function renderEditor(path = '/editor') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<BrowserPage />} />
          <Route path="/editor/:entryId?" element={<EditorPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

/** Create a minimal valid 5×5 B&W puzzle for edit tests. */
function createTestPuzzle(): PuzzleDefinition {
  const black = colorId('black');
  // Simple cross pattern
  const solution: (ColorId | null)[][] = [
    [null, null, black, null, null],
    [null, null, black, null, null],
    [black, black, black, black, black],
    [null, null, black, null, null],
    [null, null, black, null, null],
  ];
  return {
    id: 'test-edit-puzzle',
    name: 'Test Cross',
    kind: 'bw',
    rows: 5,
    cols: 5,
    palette: [{ id: black, name: 'Black', value: '#000000' }],
    rowClues: [
      [{ length: 1, colorId: black }],
      [{ length: 1, colorId: black }],
      [{ length: 5, colorId: black }],
      [{ length: 1, colorId: black }],
      [{ length: 1, colorId: black }],
    ],
    colClues: [
      [{ length: 1, colorId: black }],
      [{ length: 1, colorId: black }],
      [{ length: 5, colorId: black }],
      [{ length: 1, colorId: black }],
      [{ length: 1, colorId: black }],
    ],
    solution,
  };
}

// ── Cleanup ─────────────────────────────────────────────────────────

beforeEach(() => {
  // Clean up any custom puzzles from previous tests
  const entries = getAllEntries();
  for (const entry of entries) {
    if (entry.source === 'custom') {
      deleteCustomPuzzle(entry.entryId);
    }
  }
});

// ── Tests ───────────────────────────────────────────────────────────

describe('EditorPage', () => {
  describe('routing', () => {
    it('renders at /editor', () => {
      renderEditor();
      expect(screen.getByText('Puzzle Editor')).toBeInTheDocument();
    });

    it('shows edit mode heading when loading existing puzzle', () => {
      const entry = saveCustomPuzzle(createTestPuzzle());
      expect(entry).not.toBeNull();
      renderEditor(`/editor/${encodeURIComponent(entry!.entryId)}`);
      expect(screen.getByText('Edit Puzzle')).toBeInTheDocument();
    });

    it('redirects to / when editing non-existent puzzle', () => {
      renderEditor('/editor/custom%3Anonexistent');
      // Should redirect to BrowserPage
      expect(screen.queryByText('Puzzle Editor')).not.toBeInTheDocument();
    });
  });

  describe('toolbar', () => {
    it('has name input, row/col selectors, and tool buttons', () => {
      renderEditor();
      expect(screen.getByLabelText('Puzzle name')).toBeInTheDocument();
      expect(screen.getByLabelText('Rows')).toBeInTheDocument();
      expect(screen.getByLabelText('Cols')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /paint/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /erase/i })).toBeInTheDocument();
    });

    it('can set puzzle name', async () => {
      const user = userEvent.setup();
      renderEditor();
      const nameInput = screen.getByLabelText('Puzzle name');
      await user.type(nameInput, 'My Test Puzzle');
      expect(nameInput).toHaveValue('My Test Puzzle');
    });

    it('has check solvability and save buttons', () => {
      renderEditor();
      expect(screen.getByRole('button', { name: /check solvability/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save to library/i })).toBeInTheDocument();
    });

    it('save button is disabled initially', () => {
      renderEditor();
      expect(screen.getByRole('button', { name: /save to library/i })).toBeDisabled();
    });
  });

  describe('grid', () => {
    it('renders a grid with correct number of cells', () => {
      renderEditor();
      const grid = screen.getByRole('grid', { name: /puzzle editor grid/i });
      // Default 10×10 grid
      const cells = within(grid).getAllByRole('gridcell');
      expect(cells.length).toBe(100);
    });

    it('can paint cells with click', async () => {
      const user = userEvent.setup();
      renderEditor();
      const cells = screen.getAllByRole('gridcell');
      // Click first cell to paint
      await user.click(cells[0]);
      // Cell should now have a background color
      expect(cells[0]).toHaveClass('pap-editor-grid__cell--filled');
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      renderEditor();
      const grid = screen.getByRole('grid', { name: /puzzle editor grid/i });

      // Focus the grid
      await user.click(grid);

      // Navigate with arrow keys
      await user.keyboard('{ArrowRight}');
      await user.keyboard('{ArrowDown}');

      // Paint with Space
      await user.keyboard(' ');

      // The cell at (1,1) should be filled
      const cells = screen.getAllByRole('gridcell');
      expect(cells[11]).toHaveClass('pap-editor-grid__cell--filled');
    });

    it('can erase cells with Delete key', async () => {
      const user = userEvent.setup();
      renderEditor();
      const grid = screen.getByRole('grid', { name: /puzzle editor grid/i });
      const cells = screen.getAllByRole('gridcell');

      // Click to paint
      await user.click(cells[0]);
      expect(cells[0]).toHaveClass('pap-editor-grid__cell--filled');

      // Focus grid, navigate to cell, and delete
      await user.click(grid);
      await user.keyboard('{Delete}');
      expect(cells[0]).not.toHaveClass('pap-editor-grid__cell--filled');
    });
  });

  describe('grid resize', () => {
    it('can change grid dimensions', async () => {
      const user = userEvent.setup();
      renderEditor();

      const rowSelect = screen.getByLabelText('Rows');
      await user.selectOptions(rowSelect, '5');

      const colSelect = screen.getByLabelText('Cols');
      await user.selectOptions(colSelect, '5');

      const cells = screen.getAllByRole('gridcell');
      expect(cells.length).toBe(25);
    });
  });

  describe('clear and fill', () => {
    it('clear all empties the grid', async () => {
      const user = userEvent.setup();
      renderEditor();

      // Paint a cell first
      const cells = screen.getAllByRole('gridcell');
      await user.click(cells[0]);
      expect(cells[0]).toHaveClass('pap-editor-grid__cell--filled');

      // Clear all
      await user.click(screen.getByRole('button', { name: /clear all/i }));
      const updatedCells = screen.getAllByRole('gridcell');
      const filledCells = updatedCells.filter((c) =>
        c.classList.contains('pap-editor-grid__cell--filled'),
      );
      expect(filledCells.length).toBe(0);
    });

    it('fill all fills the grid', async () => {
      const user = userEvent.setup();
      renderEditor();

      // Resize to 5×5 for manageable test
      await user.selectOptions(screen.getByLabelText('Rows'), '5');
      await user.selectOptions(screen.getByLabelText('Cols'), '5');

      await user.click(screen.getByRole('button', { name: /fill all/i }));
      const cells = screen.getAllByRole('gridcell');
      const filledCells = cells.filter((c) =>
        c.classList.contains('pap-editor-grid__cell--filled'),
      );
      expect(filledCells.length).toBe(25);
    });
  });

  describe('unsaved changes indicator', () => {
    it('shows unsaved indicator after painting', async () => {
      const user = userEvent.setup();
      renderEditor();
      const cells = screen.getAllByRole('gridcell');
      await user.click(cells[0]);
      expect(screen.getByText('You have unsaved changes.')).toBeInTheDocument();
    });
  });

  describe('edit existing puzzle', () => {
    it('loads puzzle data into the editor', () => {
      const entry = saveCustomPuzzle(createTestPuzzle());
      expect(entry).not.toBeNull();

      renderEditor(`/editor/${encodeURIComponent(entry!.entryId)}`);

      // Name should be populated
      expect(screen.getByLabelText('Puzzle name')).toHaveValue('Test Cross');

      // Grid should have filled cells
      const cells = screen.getAllByRole('gridcell');
      const filledCells = cells.filter((c) =>
        c.classList.contains('pap-editor-grid__cell--filled'),
      );
      // Cross pattern: 5 (middle row) + 4 (middle col minus center) = 9
      expect(filledCells.length).toBe(9);
    });
  });
});
