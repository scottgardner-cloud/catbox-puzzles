import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './AppLayout';
import { nonogramModule } from '../nonogram';
import { getAllEntries } from '../nonogram/puzzles/registry';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Render the full route tree at a given initial path. */
function renderApp(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to={`/${nonogramModule.id}`} replace />} />
          <Route path={`${nonogramModule.id}/*`}>
            {nonogramModule.routes.map((route, i) => (
              <Route key={i} {...route} />
            ))}
          </Route>
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

vi.mock('../nonogram/state/persistence', () => ({
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
  it('redirects / to /nonogram (single-type redirect)', () => {
    renderApp('/');
    // Should land on the nonogram browser
    expect(screen.getByRole('button', { name: 'Puzzles' })).toBeInTheDocument();
  });

  it('renders BrowserPage at /nonogram', () => {
    renderApp('/nonogram');
    expect(screen.getByRole('button', { name: 'Puzzles' })).toBeInTheDocument();
    const entry = getFirstBuiltinEntry();
    expect(screen.getByText(entry.puzzle.name)).toBeInTheDocument();
  });

  it('renders GeneratorPage at /nonogram/generator', () => {
    renderApp('/nonogram/generator');
    expect(screen.getByRole('heading', { level: 2, name: 'Puzzle Generator' })).toBeInTheDocument();
  });

  it('renders GameRoute at /nonogram/play/:entryId with a valid entry', () => {
    const entry = getFirstBuiltinEntry();
    renderApp(`/nonogram/play/${encodeURIComponent(entry.entryId)}`);
    expect(screen.getByRole('grid', { name: /puzzle grid/i })).toBeInTheDocument();
  });
});

describe('Redirects', () => {
  it('redirects unknown routes to /nonogram', () => {
    renderApp('/some/nonexistent/path');
    expect(screen.getByRole('button', { name: 'Puzzles' })).toBeInTheDocument();
  });

  it('redirects invalid entryId to /nonogram', () => {
    renderApp('/nonogram/play/this-entry-does-not-exist');
    expect(screen.getByRole('button', { name: 'Puzzles' })).toBeInTheDocument();
  });

  it('redirects unknown nonogram subroute to /nonogram', () => {
    renderApp('/nonogram/garbage');
    expect(screen.getByRole('button', { name: 'Puzzles' })).toBeInTheDocument();
  });
});

describe('Navigation', () => {
  it('header "Puzzles" link navigates to browser page', async () => {
    const user = userEvent.setup();
    renderApp('/nonogram/generator');
    expect(screen.getByText('Puzzle Generator')).toBeInTheDocument();

    const nav = screen.getByRole('navigation');
    const puzzlesLink = within(nav).getByRole('link', { name: /puzzles/i });
    await user.click(puzzlesLink);

    expect(screen.getByRole('button', { name: 'Puzzles' })).toBeInTheDocument();
    const entry = getFirstBuiltinEntry();
    expect(screen.getByText(entry.puzzle.name)).toBeInTheDocument();
  });

  it('header "Generator" link navigates to generator page', async () => {
    const user = userEvent.setup();
    renderApp('/nonogram');

    const generatorLink = screen.getByRole('link', { name: /generator/i });
    await user.click(generatorLink);

    expect(screen.getByText('Puzzle Generator')).toBeInTheDocument();
  });

  it('clicking a puzzle card navigates to game page', async () => {
    const user = userEvent.setup();
    renderApp('/nonogram');

    const entry = getFirstBuiltinEntry();
    const card = screen.getByText(entry.puzzle.name).closest('button');
    expect(card).not.toBeNull();
    await user.click(card!);

    expect(screen.getByRole('grid', { name: /puzzle grid/i })).toBeInTheDocument();
  });

  it('"← Back to puzzles" button navigates back to browser', async () => {
    const user = userEvent.setup();
    const entry = getFirstBuiltinEntry();
    renderApp(`/nonogram/play/${encodeURIComponent(entry.entryId)}`);

    expect(screen.getByRole('grid', { name: /puzzle grid/i })).toBeInTheDocument();

    const backButton = screen.getByRole('button', { name: /back to puzzles/i });
    await user.click(backButton);

    expect(screen.getByRole('button', { name: 'Puzzles' })).toBeInTheDocument();
  });
});

describe('Layout', () => {
  it('renders header with app title', () => {
    renderApp('/nonogram');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('CatBox Puzzles');
  });

  it('renders navigation links', () => {
    renderApp('/nonogram');
    const nav = screen.getByRole('navigation');
    expect(within(nav).getByText('Puzzles')).toBeInTheDocument();
    expect(within(nav).getByText('Generator')).toBeInTheDocument();
  });

  it('renders ARIA live region for screen reader announcements', () => {
    renderApp('/nonogram');
    const liveRegion = screen.getByRole('status');
    expect(liveRegion).toHaveAttribute('aria-live', 'polite');
    expect(liveRegion).toHaveAttribute('aria-atomic', 'true');
  });

  it('renders main content area', () => {
    renderApp('/nonogram');
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

    renderApp(`/nonogram/play/${encodeURIComponent(firstEntry.entryId)}`);
    expect(screen.getByRole('grid', { name: /puzzle grid/i })).toBeInTheDocument();

    const backButton = screen.getByRole('button', { name: /back to puzzles/i });
    await user.click(backButton);

    const secondCard = screen.getByText(secondEntry.puzzle.name).closest('button');
    expect(secondCard).not.toBeNull();
    await user.click(secondCard!);

    expect(screen.getByRole('grid', { name: /puzzle grid/i })).toBeInTheDocument();
  });
});
