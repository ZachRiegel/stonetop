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

## Data layer (Convex)

The backend is Convex. Server functions live in `convex/` (`campaigns.ts`, `users.ts`), the schema in `convex/schema.ts`, and the shared access helpers in `convex/lib/access.ts`.

- Read with `useQuery(api.x.y, args)` from `convex/react`: `undefined` while loading, and `"skip"` in place of args leaves it unsubscribed. Write with `useMutation(api.x.y)`, which returns an async function. Import `api` and `Id` by relative path (`../convex/_generated/api` from `src/`), never the bare `convex/_generated/...` specifier, since `paths` maps `*` to `src/` first.
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
- Non-relative imports resolve against `src/` via `paths: { "*": ["./src/*"] }` in `tsconfig.json`, wired into Vite via `vite-tsconfig-paths`.
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
