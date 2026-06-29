Default to a functional programming style. Prefer map reduce to for loops.
Prefer fat arrow functions when possible.
Use emotion for styling.

When writing a typescript component template them as so:
const Foo = {propName}: {propName: string} => {
    return <div>Hello</div>
}

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- The frontend is bundled with **Vite** (see the Frontend section). Use `vite build` for the production build, not `bun build`, `webpack`, or `esbuild`.
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Use `bunx <package> <command>` instead of `npx <package> <command>`
- Bun automatically loads .env, so don't use dotenv.

## APIs

- `Bun.serve()` supports WebSockets, HTTPS, and routes. Don't use `express`.
- `bun:sqlite` for SQLite. Don't use `better-sqlite3`.
- `Bun.redis` for Redis. Don't use `ioredis`.
- `Bun.sql` for Postgres. Don't use `pg` or `postgres.js`.
- `WebSocket` is built-in. Don't use `ws`.
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- Bun.$`ls` instead of execa.

## Testing

Use `bun test` to run tests.

```ts#index.test.ts
import { test, expect } from "bun:test";

test("hello world", () => {
  expect(1).toBe(1);
});
```

## Frontend

The frontend is a React SPA bundled with **Vite** (config in `vite.config.ts`). Bun stays the package manager / runtime — run Vite through it (`bun run dev`, `bun run build`, `bun run preview`).

- Entry: `index.html` at the project root loads `/src/frontend.tsx`, which mounts `<App />` into `#root`.
- Dev server with HMR / React Fast Refresh: `bun run dev` (alias for `vite`).
- Production build to `dist/`: `bun run build` (`vite build`). Preview it with `bun run preview`.
- Vite handles `.tsx/.jsx/.ts/.js`, CSS, and asset imports (`.png`, `.svg` resolve to URL strings — see `src/vite-env.d.ts`).
- Non-relative imports resolve against `baseUrl: "./src/"` and the `@/*` alias from `tsconfig.json`, wired into Vite via `vite-tsconfig-paths`.
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

For more information, read the Bun API docs in `node_modules/bun-types/docs/**.mdx`.
