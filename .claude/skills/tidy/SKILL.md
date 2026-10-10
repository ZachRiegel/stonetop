---
name: tidy
description: "Read, audit, test, simplify and tighten the comments of a piece of this codebase. Use when asked to audit, inspect, clean up, simplify or clarify code, or to make comments concise."
---

# Tidy: read, audit, test, simplify, clarify

A full pass over a piece of code, ending with it verified. Arguments name the files, folder, or
feature; with none, take the files changed in the working tree (`git status --short`).

## 1. Read everything first

- Read every file in scope in full, not excerpts.
- Follow it outward: grep for the exports' names and read the callers, and read the modules it
  imports from this repo. Behaviour changes are judged against those call sites.
- For anything under `convex/`, read `convex/_generated/ai/guidelines.md` before judging it.
- Keep CLAUDE.md in mind throughout: functional style, map/reduce over loops, fat arrows, emotion,
  grid over flex, `border-radius: 999px`, no single-use variables, one React component per file,
  no new files unless necessary.

## 2. Audit

List, before editing, everything found under these headings. Keep the list; it becomes the
report.

- **Bugs and edge cases**: wrong results, races, stale closures, missing null handling, things
  that only work in the happy path, events or listeners that leak.
- **Dead and duplicate code**: unused exports, props, state, imports, branches; the same logic
  written twice.
- **Shape**: state that could be derived, abstractions with one user, helpers that belong in a
  pure module (geometry, maths, data) rather than a component, DOM work mixed into pure code.
- **Names and comments**: names that no longer say what the thing is; comments that are stale,
  narrate the obvious, or explain a decision wrongly. Grep for identifiers mentioned in comments
  to catch references to code that moved.
- **Accessibility and UX**: labels, keyboard paths, focus, reduced motion.
- **Convex specifics**: validators, indexes used by queries, auth and membership checks, OCC.

## 3. Test

- Run the suite first: `yarn test`. Note what already covers the scope.
- Add tests only where behaviour is pure and untested, by extending the nearest existing
  `*.test.ts`. Add a test file only for a DOM-free module that has none and whose behaviour is
  worth pinning (geometry, parsing, scoring). Never add a file just to have one.
- For UI, verify in the browser with the Claude in Chrome tools, against the dev server (check
  `http://localhost:5173` is up first; see `yarn dev`). If those tools are absent, say so and do
  not substitute another browser. Hidden tabs freeze CSS animations and transitions: read end
  states from the DOM, and take a screenshot to flush a stuck frame.
- Scratch harnesses go in `src/holding` (gitignored) and are deleted when done.

## 4. Simplify

Make the smallest set of changes that resolve the audit:

- Inline single-use variables; consume values where they are made.
- Delete dead code and redundant state; derive instead of storing.
- Collapse duplicate branches; share a helper only once it has two real users.
- Move pure logic out of components into a plain `.ts` module when it has grown past a few
  helpers or needs testing, keeping React, emotion, and DOM out of it.
- Keep the public API (exports, props, Convex function signatures) unless the request says
  otherwise. Behaviour the caller can see must not change without saying so.

## 5. Clarify comments

- Every file opens with one or two lines saying what the module is for.
- Each non-trivial helper, styled component or constant gets one or two lines on what it is
  for or why it is this way. Obvious code gets nothing.
- Comments say _why_, or state the invariant or the trade-off; they do not restate the code.
  Decisions made in chat (a user's choice, a measured result, a rejected alternative) are worth
  one line, since nothing else records them.
- Block comments for the genuinely non-obvious: geometry, protocols, ordering constraints,
  browser quirks worked around.
- Concise: no more than two or three lines in a row, wrapped at the project's 100 columns,
  no headings or decoration inside code.

## 6. Verify

Run all of these and fix what they raise:

```
yarn typecheck
yarn lint
yarn prettier --check src convex vite.config.ts
yarn test
yarn build
```

(`yarn format:check` is broken; call prettier directly.) Then the browser check from step 3
for anything visible.

## 7. Report

Final message, in this order: what the audit found, what changed and why, what was verified
and how (name the commands and the browser steps), and anything found but deliberately left,
with the reason. State the test count. Say that nothing is committed: the user commits and
deploys. Do not push to prod; `yarn convex dev --once` is the only deployment this skill may run,
and only when the Convex code changed.
