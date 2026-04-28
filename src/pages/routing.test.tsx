import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout, BrowserPage, GameRoute, GeneratorPage } from './index';
import { getAllEntries } from '../puzzles/registry';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Render the full route tree at a given initial path. */
function renderApp(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<BrowserPage />} />
          <Route path="/play/:entryId" element={<GameRoute />} />
          <Route path="/generator" element={<GeneratorPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

/** Get a known valid builtin entry for game route tests. */
function getFirstBuiltinEntry() {
  const entries = getAllEntries();
  const builtin = entries.find((e) => e.source === 'builtin');
  if (!builtin) throw new Error('No builtin puzzles found');
  return builtin;
}

// ---------------------------------------------------------------------------
// Mock persistence to isolate routing behavior
// ---------------------------------------------------------------------------

vi.mock('../state/persistence', () => ({
  saveGame: vi.fn(),
  loadGame: vi.fn(() => null),
  restoreGameState: vi.fn(() => null),
  hasSave: vi.fn(() => false),
  deleteSave: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe('Route rendering', () => {
  it('renders BrowserPage at /', () => {
    renderApp('/');
    // Section header "Puzzles" inside the browser component
    expect(screen.getByRole('heading', { level: 2, name: 'Puzzles' })).toBeInTheDocument();
    // Should show puzzle cards
    const entry = getFirstBuiltinEntry();
    expect(screen.getByText(entry.puzzle.name)).toBeInTheDocument();
  });

  it('renders GeneratorPage at /generator', () => {
    renderApp('/generator');
    expect(screen.getByRole('heading', { level: 2, name: 'Puzzle Generator' })).toBeInTheDocument();
  });

  it('renders GameRoute at /play/:entryId with a valid entry', () => {
    const entry = getFirstBuiltinEntry();
    renderApp(`/play/${encodeURIComponent(entry.entryId)}`);
    // Game page should render the puzzle grid
    expect(screen.getByRole('grid', { name: /puzzle grid/i })).toBeInTheDocument();
  });
});

describe('Redirects', () => {
  it('redirects unknown routes to /', () => {
    renderApp('/some/nonexistent/path');
    expect(screen.getByRole('heading', { level: 2, name: 'Puzzles' })).toBeInTheDocument();
  });

  it('redirects invalid entryId to /', () => {
    renderApp('/play/this-entry-does-not-exist');
    expect(screen.getByRole('heading', { level: 2, name: 'Puzzles' })).toBeInTheDocument();
  });
});

describe('Navigation', () => {
  it('header "Puzzles" link navigates to browser page', async () => {
    const user = userEvent.setup();
    renderApp('/generator');
    expect(screen.getByText('Puzzle Generator')).toBeInTheDocument();

    const puzzlesLink = screen.getByRole('link', { name: /puzzles/i });
    await user.click(puzzlesLink);

    expect(screen.getByRole('heading', { level: 2, name: 'Puzzles' })).toBeInTheDocument();
    const entry = getFirstBuiltinEntry();
    expect(screen.getByText(entry.puzzle.name)).toBeInTheDocument();
  });

  it('header "Generator" link navigates to generator page', async () => {
    const user = userEvent.setup();
    renderApp('/');

    const generatorLink = screen.getByRole('link', { name: /generator/i });
    await user.click(generatorLink);

    expect(screen.getByText('Puzzle Generator')).toBeInTheDocument();
  });

  it('clicking a puzzle card navigates to game page', async () => {
    const user = userEvent.setup();
    renderApp('/');

    const entry = getFirstBuiltinEntry();
    const card = screen.getByText(entry.puzzle.name).closest('button');
    expect(card).not.toBeNull();
    await user.click(card!);

    expect(screen.getByRole('grid', { name: /puzzle grid/i })).toBeInTheDocument();
  });

  it('"← Back to puzzles" button navigates back to browser', async () => {
    const user = userEvent.setup();
    const entry = getFirstBuiltinEntry();
    renderApp(`/play/${encodeURIComponent(entry.entryId)}`);

    expect(screen.getByRole('grid', { name: /puzzle grid/i })).toBeInTheDocument();

    const backButton = screen.getByRole('button', { name: /back to puzzles/i });
    await user.click(backButton);

    expect(screen.getByRole('heading', { level: 2, name: 'Puzzles' })).toBeInTheDocument();
  });
});

describe('Layout', () => {
  it('renders header with app title', () => {
    renderApp('/');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Pix-a-Pix');
  });

  it('renders navigation links', () => {
    renderApp('/');
    const nav = screen.getByRole('navigation');
    expect(within(nav).getByText('Puzzles')).toBeInTheDocument();
    expect(within(nav).getByText('Generator')).toBeInTheDocument();
  });

  it('renders ARIA live region for screen reader announcements', () => {
    renderApp('/');
    const liveRegion = screen.getByRole('status');
    expect(liveRegion).toHaveAttribute('aria-live', 'polite');
    expect(liveRegion).toHaveAttribute('aria-atomic', 'true');
  });

  it('renders main content area', () => {
    renderApp('/');
    expect(screen.getByRole('main')).toBeInTheDocument();
  });
});

describe('Puzzle remount on entryId change', () => {
  it('renders fresh state when navigating between puzzles', async () => {
    const user = userEvent.setup();
    const entries = getAllEntries().filter((e) => e.source === 'builtin');
    expect(entries.length).toBeGreaterThanOrEqual(2);

    const firstEntry = entries[0];
    const secondEntry = entries[1];

    // Start at first puzzle
    renderApp(`/play/${encodeURIComponent(firstEntry.entryId)}`);
    expect(screen.getByRole('grid', { name: /puzzle grid/i })).toBeInTheDocument();

    // Navigate back to browser
    const backButton = screen.getByRole('button', { name: /back to puzzles/i });
    await user.click(backButton);

    // Select second puzzle
    const secondCard = screen.getByText(secondEntry.puzzle.name).closest('button');
    expect(secondCard).not.toBeNull();
    await user.click(secondCard!);

    // Should render grid (remounted for new puzzle)
    expect(screen.getByRole('grid', { name: /puzzle grid/i })).toBeInTheDocument();
  });
});
