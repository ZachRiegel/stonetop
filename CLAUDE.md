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

## Frontend

The frontend is a React SPA bundled with **Vite** (config in `vite.config.ts`). Yarn is the package manager — run Vite through it (`yarn dev`, `yarn build`, `yarn preview`).

- Entry: `index.html` at the project root loads `/src/frontend.tsx`, which mounts `<App />` into `#root`.
- Dev server with HMR / React Fast Refresh: `yarn dev` (alias for `yarn vite`).
- Production build to `dist/`: `yarn build` (`yarn vite build`). Preview it with `yarn preview`.
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

