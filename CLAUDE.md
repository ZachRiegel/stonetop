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

## Data layer (`src/amplify.ts`)

All live reads go through one module. Mutations use `getClient().models.X.create/update/delete` directly.

```ts
const playersQuery = defineQuery((campaignId: string | undefined) =>
  query({
    CampaignMember: {
      where: { campaignId },
      campaign: true,
      userProfile: { characters: { where: { campaignId } } },
    },
  }),
);
const members = useObserveQuery(playersQuery, campaignId); // undefined until the first snapshot
type Member = QueryResult<ReturnType<typeof playersQuery>>;
```

- A query is a tree of nodes with one shape: `where`, `select`, `orderBy`, `joins`, plus one entry per relationship to follow, keyed by its name in `amplify/data/resource.ts` (`true`, or a nested node). The root is keyed by model name and may add `limit`. The row type is derived from the same tree; unknown keys, fields and paths are compile errors.
- `where` is Amplify's filter input, with a bare scalar meaning `{ eq }`. An `undefined` value skips the query (no subscription, hook stays `undefined`) instead of matching everything.
- Relationship entries read foreign key, direction and cardinality from model introspection at runtime. Joined rows live-update; relationship paths in `select` such as `"characters.*"` do not. `joins` takes hand-written `{ from, match, query }` specs for anything the schema doesn't declare.
- `defineQuery` memoizes by args so the same args give the same query object, which keys the subscription. Call it at module level only.
- `limit` needs `orderBy` and is root-only. With a secondary index on (where field, orderBy field) the window is one index query plus item events; without one it is the full live set sorted and sliced client-side, with a console warning. The schema declares no indexes yet.
- Rows come from one normalized cache per model, so an edit seen by any query reaches every query showing that row. Queries differing only in one eq field's values share a subscription; past AppSync's 10-clause limit the subscription goes broad and narrows client-side. One unfiltered `onUpdate` per model catches edits that move a row into or out of a filter.
- Tests: `yarn test` runs `src/amplify.test.ts` against a fake client. Its `describe("typing")` block only bites under `yarn tsc --noEmit`.

## Frontend

The frontend is a React SPA bundled with **Vite** (config in `vite.config.ts`). Yarn is the package manager — run Vite through it (`yarn dev`, `yarn build`, `yarn preview`).

- Entry: `index.html` at the project root loads `/src/frontend.tsx`, which mounts `<App />` into `#root`.
- Dev server with HMR / React Fast Refresh: `yarn dev` (alias for `yarn vite`).
- Production build to `dist/`: `yarn build` (`yarn vite build`). Preview it with `yarn preview`.
- Vite handles `.tsx/.jsx/.ts/.js`, CSS, and asset imports (`.png`, `.svg` resolve to URL strings — see `src/vite-env.d.ts`).
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

`frontend.tsx` mounts the app:

```tsx#frontend.tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

