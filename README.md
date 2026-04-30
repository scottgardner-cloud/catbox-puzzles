# CatBox Puzzles

A web-based puzzle collection starting with [nonogram](https://en.wikipedia.org/wiki/Nonogram) puzzles, built with React, TypeScript, and Vite.

Supports both **black-and-white** and **color** puzzles with full keyboard navigation and screen reader accessibility.

## Features

- 🧩 22 built-in puzzles (5×5 to 20×20, B&W and color)
- 🎨 Color palette support — B&W is just single-color
- 🖱️ Click-to-cycle and drag interaction
- ⌨️ Full keyboard navigation (arrows, Space/Enter, Tab, Home/End)
- ♿ ARIA accessibility (grid roles, live region announcements, focus indicators)
- ↩️ Undo / redo / reset
- ✓ Player-triggered error checking with cell and line validation
- 💾 Auto-save game progress (localStorage)
- 📂 Custom puzzle import via the registry API
- 🔍 Constraint-based solver for puzzle validation (proves logic solvability)

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Scripts

| Command                | Description                         |
| ---------------------- | ----------------------------------- |
| `npm run dev`          | Start dev server with hot reload    |
| `npm run build`        | Type-check and build for production |
| `npm run test`         | Run tests (Vitest)                  |
| `npm run test:watch`   | Run tests in watch mode             |
| `npm run lint`         | Lint with ESLint                    |
| `npm run format`       | Format with Prettier                |
| `npm run format:check` | Check formatting without writing    |

## Architecture

Three-layer design with clear separation of concerns:

```
src/
├── engine/        Pure game logic (no React). All functions are pure/immutable.
│   ├── validation.ts   Puzzle definition validation (branded ValidatedPuzzle type)
│   ├── game-logic.ts   Game state transitions (cycle, undo, redo, reset, check)
│   └── solver.ts       Constraint-based nonogram solver
├── state/         Session state and persistence (localStorage)
├── components/    React UI (Grid, Cell, PaletteBar, PuzzleBrowser)
├── pages/         Route-level page components (BrowserPage, GamePage, GeneratorPage)
├── puzzles/       Puzzle registry, sample definitions, types
└── types/         Domain model (PuzzleDefinition, GameState, etc.)
```

**Key design decisions:**

- `ValidatedPuzzle` branded type — only validated puzzles enter the system
- `isSolved` is derived, never stored
- Validation state is ephemeral (cleared on undo/redo/reset)
- Color support from day one (B&W is just single-color)

## Tech Stack

- [React 19](https://react.dev/) + [TypeScript 6](https://www.typescriptlang.org/)
- [Vite 8](https://vite.dev/) (dev server and bundler)
- [React Router](https://reactrouter.com/) (HashRouter for static hosting)
- [Vitest](https://vitest.dev/) + [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)

## License

[MIT](LICENSE)
