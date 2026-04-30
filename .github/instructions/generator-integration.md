# Puzzle Generator Integration

## Overview

A puzzle generator tool is planned for this project. It will live under `src/generator/` and provide a browser-based UI to convert images into `PuzzleDefinition` JSON.

## What the generator depends on (keep stable)

The generator will import directly from these modules:

- **`src/types/index.ts`** — `PuzzleDefinition`, `ColorId`, `ClueRun`, `LineClue`, `PaletteColor`, `ValidatedPuzzle`, `colorId()`
- **`src/engine/validation.ts`** — `validatePuzzleDefinition()`

If you need to change these interfaces, that's fine — but be aware the generator will need to be updated to match.

## What the generator adds (no conflicts expected)

All generator code lives in `src/generator/`:

```
src/generator/
├── GeneratorPage.tsx              # Top-level page component
├── pipeline/
│   ├── resize.ts                  # Canvas-based image resize to grid
│   ├── quantize-bw.ts             # B&W thresholding
│   ├── quantize-color.ts          # Color quantization (median-cut)
│   ├── clue-derivation.ts         # Row/col clue computation
│   └── puzzle-builder.ts          # Assembles PuzzleDefinition
├── components/
│   ├── UploadPanel.tsx
│   ├── SettingsPanel.tsx
│   ├── PreviewGrid.tsx
│   └── ExportPanel.tsx
└── hooks/
    └── usePuzzleGenerator.ts
```

## Routing

The generator will need a route to be accessible. The preferred approach is:

- Add a router (e.g., React Router) if one doesn't exist yet
- Mount the generator at `/generator`
- The game stays at `/` (or `/play`)

If you're adding routing to the app, please keep this in mind. If you'd prefer to defer routing, the generator can alternatively use a separate Vite entry point (`generator.html`).

## No new dependencies

The generator uses only the Canvas API for image processing. No additional npm packages are required beyond what the project already has.
