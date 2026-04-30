import { Navigate } from 'react-router-dom';
import type { PuzzleTypeModule } from '../shared/types/puzzle-type';
import { getAllEntries } from './puzzles/registry';
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
  getBrowserEntries: () => getAllEntries(),
  validateSave: () => false, // Stub — full validation wired in P1-7
};
