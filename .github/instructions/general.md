# Pix-a-Pix — Copilot Instructions

## Project Overview

A web-based Pix-a-Pix (Nonogram/Picross) puzzle game built with React, TypeScript, and Vite.

## Architecture

Three-layer architecture:

- **`src/engine/`** — Pure game logic. NO React imports. All functions should be pure where possible.
- **`src/state/`** — Game session state, reducers, undo/redo, persistence. Uses React hooks/context but no direct DOM manipulation.
- **`src/components/`** — React UI components. Rendering and event handling only — delegate logic to engine/state.
- **`src/types/`** — Shared TypeScript interfaces. These are frozen contracts — changes here affect all layers.

## Coding Conventions

- Strict TypeScript: full type annotations, no `any`
- TSDoc comments on all exported declarations
- Pure functions preferred in `engine/`
- Use `const` assertions and discriminated unions where appropriate
- Single quotes, trailing commas, semicolons (Prettier enforced)

## Testing

- Use Vitest for unit tests
- Engine tests are highest priority — pure logic should have thorough coverage
- Colocate tests: `engine/validation.ts` → `engine/validation.test.ts`

## Game Rules (Nonogram / Pic-a-Pix)

- Grid puzzle where players fill cells to reveal a picture
- Clues on rows and columns indicate lengths of consecutive filled blocks
- **B&W:** At least one empty cell between adjacent filled blocks in same row/column
- **Color:** At least one empty cell between adjacent same-color blocks; different-color blocks may be adjacent
