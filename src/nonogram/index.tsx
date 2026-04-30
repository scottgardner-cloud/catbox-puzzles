import { Navigate } from 'react-router-dom';
import type { PuzzleTypeModule } from '../shared/types/puzzle-type';
import { getAllEntries } from './puzzles/registry';
import type { ValidatedPuzzle } from './types';
import { NonogramBrowserCard } from './components/NonogramBrowserCard';
import { BrowserPage } from './pages/BrowserPage';
import { GameRoute } from './pages/GamePage';
import { GeneratorPage } from './pages/GeneratorPage';
import { EditorPage } from './pages/EditorPage';

/** Nonogram puzzle type module for CatBox Puzzles. */
export const nonogramModule: PuzzleTypeModule = {
  id: 'nonogram',
  name: 'Nonogram',
  icon: '🧩',
  routes: [
    { index: true, element: <BrowserPage /> },
    { path: 'play/:entryId', element: <GameRoute /> },
    { path: 'generator', element: <GeneratorPage /> },
    { path: 'editor/:entryId?', element: <EditorPage /> },
    { path: '*', element: <Navigate to=".." replace /> },
  ],
  navItems: [
    { label: 'Puzzles', path: '' },
    { label: 'Generator', path: 'generator' },
    { label: 'Editor', path: 'editor' },
  ],
  browserFilters: [
    {
      label: 'B&W',
      value: 'bw',
      group: 'kind',
      test: (e) => (e.puzzle as ValidatedPuzzle).kind === 'bw',
    },
    {
      label: 'Color',
      value: 'color',
      group: 'kind',
      test: (e) => (e.puzzle as ValidatedPuzzle).kind === 'color',
    },
  ],
  getBrowserEntries: () => getAllEntries(),
  validateSave: (data) => {
    if (typeof data !== 'object' || data === null) return false;
    const obj = data as Record<string, unknown>;
    return obj.version === 1 && typeof obj.puzzleId === 'string' && Array.isArray(obj.board);
  },
  renderBrowserCard: NonogramBrowserCard,
};
