/**
 * This file is the entry point for the React app, it sets up the root
 * element and renders the App component to the DOM.
 *
 * It is referenced from `index.html`.
 */

import { type AuthClient, ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { ConvexReactClient } from "convex/react";
import { createRoot } from "react-dom/client";

import { App } from "./App.tsx";
import { authClient } from "./lib/auth-client.ts";

// expectAuth holds queries until the Better Auth token is attached, so nothing
// fires as an anonymous request during the sign-in handshake.
const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL, { expectAuth: true });

createRoot(document.getElementById("root")!).render(
  // @convex-dev/better-auth 0.12.5 declares AuthClient against better-auth 1.6
  // such that useSession().data resolves to never, so no real client is
  // assignable to it. The provider only needs the client's runtime shape,
  // which this is; the cast is confined to this one boundary.
  <ConvexBetterAuthProvider client={convex} authClient={authClient as unknown as AuthClient}>
    <App />
  </ConvexBetterAuthProvider>,
);
