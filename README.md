# Stonetop

React + Vite SPA with a Convex backend, served by AWS Amplify Hosting. Yarn 4 is the package manager (pinned via `packageManager`).

## Setup

```bash
yarn install
```

## Development

Run the frontend and the Convex dev server in two terminals:

```bash
yarn dev          # Vite dev server at http://localhost:5173
yarn dev:convex   # pushes convex/ to your dev deployment and regenerates types
```

`.env.local` holds `CONVEX_DEPLOYMENT`, `VITE_CONVEX_URL` and `VITE_CONVEX_SITE_URL`; `npx convex dev` writes the first two on first run.

## Scripts

```bash
yarn build        # production bundle to dist/
yarn preview      # serve the production bundle
yarn test         # vitest, including the convex-test suites under convex/
yarn typecheck    # tsc --noEmit
yarn lint         # eslint
```

## Deploy

Pushing to `main` triggers Amplify Hosting (`amplify.yml`): the backend phase runs `npx convex deploy` with a deploy key read from SSM, then the frontend phase builds and serves `dist/`.

See `CLAUDE.md` for conventions and `convex/_generated/ai/guidelines.md` for Convex rules.
