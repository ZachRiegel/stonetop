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
- Read any README.md in the scope's folders, as CLAUDE.md asks, and for anything under
  `convex/` read `convex/_generated/ai/guidelines.md` before judging it.
- Keep CLAUDE.md in mind throughout: functional style, map/reduce over loops, fat arrows, emotion,
  grid over flex, `border-radius: 999px`, no single-use variables, one React component per file,
  no new files unless necessary.

## 2. Audit

Audit as a stranger would, not as the author: the code's own comments explain its choices, they
do not justify them. List, before editing, everything found under these headings. Keep the list;
it becomes the report.

- **Bugs and edge cases**: wrong results, races, stale closures, missing null handling, things
  that only work in the happy path, events or listeners that leak.
- **Dead and duplicate code**: unused exports, props, state, imports, branches; the same logic
  written twice; the same value computed in two places; config or constants kept in step by hand.
- **Premises**: every deliberate duplication, workaround, special case and "has to be this way"
  comment in scope. For each, name what would remove it, or state why nothing can. A premise
  that holds is written down; one that falls becomes a change, structural or not.
- **Platform first**: for each mechanism built by hand, name the built-in that does the same
  job and say why it was not used: SVG `<use>`, `<clipPath>` and `<mask>` over copies; CSS
  transitions, `transform`, `clip-path` and custom properties over per-frame state; browser
  APIs such as `<dialog>`, pointer capture, `ResizeObserver` and `matchMedia` over hand-rolled
  equivalents; React derivation over mirrored state; a Convex index or validator over a filter
  or a check in code; an existing helper in this repo over a new one.
- **Shape**: state that could be derived; refs that mirror state; booleans that together encode
  a mode better named as one value; flags threaded through functions to switch behaviour, where
  two callers or two functions would be plainer; parallel structures that must be kept in step;
  special cases that could be data; abstractions with one user; helpers that belong in a pure
  module (geometry, maths, data) rather than a component; DOM work mixed into pure code.
- **Size**: more concepts, states, props or layers than the behaviour needs. Ask what the
  smallest design that produces the same behaviour is, and what the current one has beyond it.
- **Names and comments**: names that no longer say what the thing is; comments that are stale,
  narrate the obvious, or explain a decision wrongly. Grep for identifiers mentioned in comments
  to catch references to code that moved.
- **Accessibility and UX**: labels, keyboard paths, focus, reduced motion, cursors.
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

Make the smallest set of changes that resolve the audit, with one exception: when a premise
falls, the structural change that follows is in scope, and the report says it was one.

- Inline single-use variables; consume values where they are made.
- Delete dead code and redundant state; derive instead of storing; replace a copy with a
  reference.
- Collapse duplicate branches; share a helper only once it has two real users; turn a flag that
  switches a function's behaviour into two call sites or two functions when that reads plainer.
- Replace a hand-built mechanism with the platform's when the audit found one, and keep a
  one-line comment on anything the platform cannot do, so the next pass does not re-litigate it.
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
- A feature's design, decisions and verification notes belong in its folder's README.md, which
  comments may point at; keep CLAUDE.md to conventions and pointers.
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
and how (name the commands and the browser steps), the premises kept and why each holds, and
anything else found but deliberately left, with the reason. State the test count. Say that
nothing is committed: the user commits and deploys. Do not push to prod; `yarn convex dev --once`
is the only deployment this skill may run, and only when the Convex code changed.
