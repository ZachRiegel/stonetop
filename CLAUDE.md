Default to a functional programming style. Prefer map reduce to for loops.
Prefer fat arrow functions when possible.
Use emotion for styling.

When writing a typescript component template them as so:
const Foo = {propName}: {propName: string} => {
return <div>Hello</div>
}

Do not create new files unless they are absolutely necessary or explicitly asked for.
Note: there should be no more than one React component per file, adding a new component justfies a new file.

When making round borders use border-radius: 999px instead of 50%.

When applicable, use grid layouts over flex for aligning sets of items.
If testing, first check if a build is already running at http://localhost:5173

Single use variables should be consumed at their one use and not lifted to a named var.

```
//correct
func(30 * 60)

//incorrect
const thirtyMinutesInSeconds = 30 * 60
func(thirtyMinutesInSeconds)
```

Every piece of text goes through the typography in `src/components/Font.tsx`: a `Font.X`
component, or a styled rule that spreads `FontCSS.X`, `TITLE`, `TITLE_CAPS` or `EYEBROW` and then
adjusts size, weight or colour. Never type `font-family` into a component and never leave an
element to inherit its face from `body`; that fallback exists only so a miss shows as DM Sans
instead of the browser's serif, not as a way to set type. If no entry fits, add one to Font.tsx.

Write markup as markup. Do not build arrays of React elements and pick or reorder them by
index; name each element once and write each arrangement out in JSX. An array of elements is
only for mapping a set whose members are not known when the code is written.

Let CSS do what CSS can. Before writing JavaScript that shapes how something looks or moves,
ask whether a rule does it: `::first-letter` or `text-transform` over a string helper,
`:has()`, `:empty` and attribute selectors over a class toggled in code, transitions,
animations and `clip-path` over per-frame state, `aspect-ratio`, `clamp()`, container queries
and `@media` over measuring the window, `scroll-snap` and `overflow` over scroll handlers.
JavaScript is for what CSS cannot see: data, time, the network, and attributes such as `title`
and `alt`. When a rule nearly fits, say in one line why it did not.

Memoization is mandatory, not a nicety. A function or object handed to a child, a DOM element
(event handlers, refs), a context, or an effect's dependencies keeps one identity for the life of
the component: `useCallback`/`useMemo` with honest dependencies, or define it outside the
component and pass what it needs as arguments. Never pass a freshly made function down the tree.

Before working on a file, look for a README.md in its folder (and the folders above it, up to
`src/` or `convex/`) and read it first: a feature's design, decisions and verification notes
live there, next to the code, not in this file.

## Data layer (Convex)

The backend is Convex. Server functions live in `convex/` (`campaigns.ts`, `users.ts`), the schema in `convex/schema.ts`, and the shared access helpers in `convex/lib/access.ts`.

- Read with `useQuery(api.x.y, args)` from `convex/react`: `undefined` while loading, and `"skip"` in place of args leaves it unsubscribed. Write with `useMutation(api.x.y)`, which returns an async function. Import `api` and `Id` as `convex/_generated/api` and `convex/_generated/dataModel`. All imports are bare: `paths` resolves a name against `src/` first and `convex/` second, in both tsconfigs, so pages write `components/Font.tsx` and Convex functions write `_generated/server`, `lib/access`, `schema` and `pages/dice/dice`. Keep file paths unique across the two trees, since the first match wins.
- Auth is Better Auth with Discord via `@convex-dev/better-auth`: `convex/auth.ts` (triggers upsert one `users` row per auth user; `picture` is always set because the Discord provider supplies a default avatar), routes in `convex/http.ts`, client in `src/lib/auth-client.ts`, provider in `src/frontend.tsx`. Server functions resolve the caller with `currentUser` / `requireUser` from `convex/lib/access.ts`, which maps the JWT subject to the `users` row.
- Membership is `campaignMembers` rows, one per (campaign, user) with `isOwner`; the Game Master has a row too, so "who is in it" and "who runs it" are answered from one place (`membershipOf`, `requireGameMaster`). Every campaign read (`campaigns.list`, `campaigns.get`) returns the same card: the campaign plus `isOwner`, `members` (public profile, `isOwner`, `character`), `myCharacter`, and `inviteToken` for the Game Master only. The token lives on the campaign row; `campaigns.join` looks it up and `campaigns.regenerateInvite` rotates it. The URL form is `${origin}/?inviteLinkId=<token>`.
- Dev: run `yarn dev:convex` (`convex dev`) alongside `yarn dev`; it pushes functions to the dev deployment and regenerates `convex/_generated`.
- Tests: `yarn test` runs the `convex-test` suites in `convex/*.test.ts` (vitest, `edge-runtime` environment, configured in `vite.config.ts`).
- Env: `SITE_URL`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET` and `BETTER_AUTH_SECRET` are set on the Convex deployments (dev and prod). `VITE_CONVEX_URL` and `VITE_CONVEX_SITE_URL` live in `.env.local` locally and in Amplify Hosting's environment variables for the build; Hosting deploys the backend with `npx convex deploy` using a `CONVEX_DEPLOY_KEY` read from SSM (see `amplify.yml`).

## Frontend

The frontend is a React SPA bundled with **Vite** (config in `vite.config.ts`). Yarn is the package manager — run Vite through it (`yarn dev`, `yarn build`, `yarn preview`).

- Entry: `index.html` at the project root loads `/src/frontend.tsx`, which mounts `<App />` into `#root`.
- Dev server with HMR / React Fast Refresh: `yarn dev` (alias for `yarn vite`).
- Production build to `dist/`: `yarn build` (`yarn vite build`). Preview it with `yarn preview`.
- Vite handles `.tsx/.jsx/.ts/.js`, CSS, and asset imports (`.png`, `.svg` resolve to URL strings — see `vite-env.d.ts` at the project root).
- Non-relative imports resolve against `src/` via `paths` in `tsconfig.json` (`"*"` to `./src/*`, and `convex/_generated/*` to the generated Convex folder), wired into Vite via `vite-tsconfig-paths` for the app and, through `worker.plugins`, for the physics worker bundle.
- Browser-exposed env vars use the `VITE_` prefix and are read via `import.meta.env.VITE_*`.

Emotion is the styling library and is configured in `vite.config.ts` through `@vitejs/plugin-react`:

```ts#vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    react({
      jsxImportSource: "@emotion/react",
      babel: { plugins: ["@emotion/babel-plugin"] },
    }),
    tsconfigPaths(),
  ],
});
```

This enables the emotion `css` prop (`jsxImportSource`) and `@emotion/babel-plugin` (component labels + source maps for `styled`). Use `@emotion/styled` and `@emotion/react` (`Global`, `css`) for styling.

`frontend.tsx` mounts the app inside the Convex + Better Auth provider (`expectAuth` holds queries until the token is attached):

```tsx#frontend.tsx
import { type AuthClient, ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { ConvexReactClient } from "convex/react";
import { createRoot } from "react-dom/client";

import { App } from "./App.tsx";
import { authClient } from "./lib/auth-client.ts";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL, { expectAuth: true });

createRoot(document.getElementById("root")!).render(
  // the cast works around @convex-dev/better-auth 0.12.5's AuthClient type, which
  // no real better-auth 1.6 client satisfies; see the comment in src/frontend.tsx
  <ConvexBetterAuthProvider client={convex} authClient={authClient as unknown as AuthClient}>
    <App />
  </ConvexBetterAuthProvider>,
);
```

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->

Holding pages are static HTML mocks in `src/holding/`. Vite serves them from the project root,
so when you create or change one, end your final message with its link:
`http://localhost:5173/src/holding/<name>.html` (start `yarn dev` first if it is not running).

## Checks and verification

The checks every change must pass, in this order; fix what they raise:

```
yarn typecheck
yarn lint
yarn prettier --check src convex vite.config.ts
yarn test
yarn build
```

`yarn format:check` is broken (it points at a prettier outside the project); call prettier
directly as above. `yarn test` runs the `convex-test` suites in `convex/*.test.ts` and the unit
tests under `src/` (vitest, `edge-runtime`). Tests are added only for pure, untested behaviour,
by extending the nearest existing test file; a new test file is for a DOM-free module worth
pinning (geometry, parsing, scoring), never just to have one.

Anything visible is verified in the browser with the Claude in Chrome tools against the dev
server at `http://localhost:5173` (check it is already up before starting `yarn dev`). Without
those tools, say so rather than substitute another browser. Scratch harnesses go in
`src/holding/` (gitignored) and are deleted when done.

Under `convex/`, audit validators, the indexes queries use, auth and membership checks
(`convex/lib/access.ts`) and OCC, after reading `convex/_generated/ai/guidelines.md`.

Nothing is committed or deployed by the assistant: the user commits and deploys (Amplify
Hosting runs `npx convex deploy` from `amplify.yml`). `yarn convex dev --once` is the only
deployment that may be run, and only when Convex code changed.
