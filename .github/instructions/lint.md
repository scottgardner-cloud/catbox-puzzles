# Lint & Formatting

## Rule: Keep the repo lint-clean

Before every commit, run `npm run lint` and fix all reported issues.

- `npm run lint` — runs ESLint + Prettier check (must exit 0)
- `npm run lint:fix` — auto-fix what's possible, then manually fix the rest

## Known exception

`src/pages/AppLayout.tsx` triggers `react-refresh/only-export-components` because
it exports both a component and a `useLayoutContext` hook. This file is frozen —
do not modify it to suppress the warning. The warning is accepted.

## What the tools check

- **ESLint** — TypeScript errors, React hooks rules, unused variables
- **Prettier** — Formatting (single quotes, trailing commas, semicolons, 110 print width)

## If you introduce a new lint error

Fix it in the same commit. Do not add `eslint-disable` comments unless the
disable is justified and explained in an inline comment.
